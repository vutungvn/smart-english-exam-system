import { describe, expect, it } from 'vitest';
import { AssessmentStatus } from '../../generated/prisma/enums.js';
import { toQuestionAssessment } from './assessments.service.js';
import {
  FAKE_FAIL_SECONDS,
  FAKE_SPEAKING_FAIL_TRIES,
  fakeSpeakingResult,
  recordingSeconds,
  SPEAKING_RUBRICS,
  speakingPrompt,
  speakingResultSchema,
  speakingScore,
  speakingSubScores,
} from './speaking-grading.js';

const base = {
  transcript: 'I go to the cinema twice a month with my friends.',
  criteria: {
    pronunciation: 4,
    intonation: 3,
    fluency: 4,
    grammar: 5,
    vocabulary: 4,
    task: 5,
  },
  feedback: 'Trả lời đủ ý, phát âm rõ.',
  improvedAnswer: 'I usually go to the cinema twice a month with my close friends.',
};

describe('Kiểm tra kết quả AI chấm Speaking', () => {
  it('Part 2–5: một điểm theo thang của dạng câu', () => {
    expect(speakingResultSchema(3, 3).safeParse({ ...base, score: 3 }).success).toBe(true);
    expect(speakingResultSchema(5, 5).safeParse({ ...base, score: 5 }).success).toBe(true);
    expect(speakingResultSchema(3, 3).safeParse({ ...base, score: 4 }).success).toBe(false);
    expect(speakingResultSchema(5, 5).safeParse({ ...base, score: 2.5 }).success).toBe(false);
  });

  it('Part 1: bắt buộc 2 điểm con 0–3, điểm câu là tổng', () => {
    const schema = speakingResultSchema(1, 6);
    const ok = schema.safeParse({ ...base, pronunciationScore: 2, intonationScore: 3 });
    expect(ok.success).toBe(true);
    expect(speakingScore(ok.data!)).toBe(5);
    expect(speakingSubScores(ok.data!)).toEqual({ pronunciation: 2, intonation: 3 });

    expect(schema.safeParse({ ...base, score: 6 }).success).toBe(false);
    expect(schema.safeParse({ ...base, pronunciationScore: 4, intonationScore: 0 }).success).toBe(
      false,
    );
  });

  it('thiếu tiêu chí, tiêu chí ngoài 0–5 hoặc thiếu nhận xét bị loại; transcript rỗng được (im lặng)', () => {
    const schema = speakingResultSchema(2, 3);
    expect(schema.safeParse({ ...base, score: 0, transcript: '' }).success).toBe(true);
    expect(
      schema.safeParse({ ...base, score: 2, criteria: { ...base.criteria, fluency: 6 } }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...base, score: 2, criteria: { grammar: 3 } }).success).toBe(false);
    expect(schema.safeParse({ ...base, score: 2, feedback: ' ' }).success).toBe(false);
  });
});

describe('Rubric và prompt Speaking', () => {
  it('đủ rubric cho 5 Part, mỗi Part có ví dụ chấm sẵn', () => {
    for (const part of [1, 2, 3, 4, 5] as const) {
      expect(SPEAKING_RUBRICS[part].levels.length).toBeGreaterThan(3);
      expect(SPEAKING_RUBRICS[part].examples.length).toBeGreaterThan(0);
    }
  });

  it('prompt có đề, bảng thông tin, thời lượng, vị trí tệp ghi âm; không có thông tin định danh', () => {
    const prompt = speakingPrompt({
      part: 4,
      content: 'What time does the workshop start?',
      passage: 'Monday 9:30 Workshop, Room 204',
      sampleAnswer: 'It starts at 9:30.',
      responseSeconds: 15,
      seconds: 12.4,
      imageCount: 1,
    });
    expect(prompt).toContain('TOEIC Speaking Part 4');
    expect(prompt).toContain('What time does the workshop start?');
    expect(prompt).toContain('Information provided');
    expect(prompt).toContain('Monday 9:30 Workshop, Room 204');
    expect(prompt).toContain('about 12 seconds, time limit 15 seconds');
    expect(prompt).toContain('LAST attachment is the audio');
    expect(prompt).toContain('first attachment is the picture');
  });

  it('thời lượng ước theo dung lượng MP3 32 kbps', () => {
    expect(recordingSeconds(4000 * 15)).toBe(15);
    expect(recordingSeconds(0)).toBe(0);
  });
});

describe('Kết quả mẫu Speaking của FakeAiProvider', () => {
  const input = { part: 3, maxScore: 3, responseSeconds: 15, sampleAnswer: 'Sample.', tries: 1 };

  it('điểm tăng theo thời lượng, không vượt thang và qua được bước kiểm tra', () => {
    const schema = speakingResultSchema(3, 3);
    const short = schema.parse(fakeSpeakingResult({ ...input, seconds: 5 }));
    const full = schema.parse(fakeSpeakingResult({ ...input, seconds: 15 }));
    expect(speakingScore(full)).toBe(3);
    expect(speakingScore(short)).toBeLessThan(3);
  });

  it('Part 1 trả 2 điểm con, câu trả lời gợi ý rỗng', () => {
    const result = fakeSpeakingResult({
      ...input,
      part: 1,
      maxScore: 6,
      seconds: 45,
      responseSeconds: 45,
    });
    const parsed = speakingResultSchema(1, 6).safeParse(result);
    expect(parsed.success).toBe(true);
    expect(speakingScore(parsed.data!)).toBe(6);
    expect(parsed.data!.improvedAnswer).toBe('');
  });

  it(`bài nói dưới ${FAKE_FAIL_SECONDS} giây: lỗi ${FAKE_SPEAKING_FAIL_TRIES} lần đầu, lần chấm lại thì được`, () => {
    const schema = speakingResultSchema(3, 3);
    for (let tries = 1; tries <= FAKE_SPEAKING_FAIL_TRIES; tries++) {
      expect(schema.safeParse(fakeSpeakingResult({ ...input, seconds: 1, tries })).success).toBe(
        false,
      );
    }
    const retried = fakeSpeakingResult({
      ...input,
      seconds: 1,
      tries: FAKE_SPEAKING_FAIL_TRIES + 1,
    });
    expect(schema.safeParse(retried).success).toBe(true);
  });
});

describe('Hiển thị phiếu chấm Speaking', () => {
  const row = {
    id: 'a',
    grader: 'AI' as const,
    status: AssessmentStatus.DONE,
    score: 5 as unknown as never,
    maxScore: 6 as unknown as never,
    criteria: { ...base.criteria, subScores: { pronunciation: 2, intonation: 3 } },
    feedback: 'Tốt',
    transcript: 'Welcome to the store.',
    corrections: null,
    improvedAnswer: null,
    errorMessage: null,
    nextRunAt: null,
    regradeCount: 0,
    gradedAt: new Date(),
    updatedAt: new Date(),
    reviewer: null,
  };

  it('6 tiêu chí theo thứ tự cố định, điểm con Part 1, transcript', () => {
    const view = toQuestionAssessment(row);
    expect(view.criteria.map((c) => c.key)).toEqual([
      'pronunciation',
      'intonation',
      'fluency',
      'grammar',
      'vocabulary',
      'task',
    ]);
    expect(view.subScores).toEqual([
      { key: 'pronunciation', label: 'Phát âm', max: 3, score: 2 },
      { key: 'intonation', label: 'Ngữ điệu, trọng âm', max: 3, score: 3 },
    ]);
    expect(view.transcript).toBe('Welcome to the store.');
    expect(view.corrections).toEqual([]);
  });

  it('Writing giữ 4 tiêu chí, không có điểm con', () => {
    const view = toQuestionAssessment({
      ...row,
      criteria: { grammar: 4, vocabulary: 3, coherence: 4, task: 5 },
      transcript: null,
    });
    expect(view.criteria.map((c) => c.key)).toEqual(['grammar', 'vocabulary', 'coherence', 'task']);
    expect(view.subScores).toEqual([]);
  });
});
