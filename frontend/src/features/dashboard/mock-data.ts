// TẠM: dữ liệu mẫu theo thiết kế Stitch (màn "Trang chủ học viên"). Thay bằng API khi backend có:
// tiến độ/điểm (progress, attempts), gợi ý AI, khóa học đã ghi danh, flashcard.
// Thang điểm theo D13: Listening/Reading 5–495, Speaking/Writing 0–200.

export type SkillKey = 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';

export const SKILL_SCORES: { skill: SkillKey; score: number; max: number; delta: number }[] = [
  { skill: 'LISTENING', score: 340, max: 495, delta: 20 },
  { skill: 'READING', score: 280, max: 495, delta: 15 },
  { skill: 'SPEAKING', score: 140, max: 200, delta: 10 },
  { skill: 'WRITING', score: 130, max: 200, delta: 5 },
];

// Điểm dự đoán LR = Listening + Reading
export const LR_PREDICTION = { score: 620, max: 990, target: 750, weeklyDelta: 35 };

export const IN_PROGRESS_EXAM = {
  title: 'Đề thi thử TOEIC LR – Đề số 3',
  meta: 'Listening & Reading · 200 câu · 120 phút',
  answered: 58,
  total: 200,
  remainingSeconds: 72 * 60 + 15, // server tính từ expires_at
};

export type ScoreRange = '4w' | '3m';

export const SCORE_HISTORY: Record<ScoreRange, { label: string; score: number }[]> = {
  '4w': [
    { label: 'Tuần 1', score: 500 },
    { label: 'Tuần 2', score: 540 },
    { label: 'Tuần 3', score: 585 },
    { label: 'Tuần 4', score: 620 },
  ],
  '3m': [
    { label: 'Tháng 8', score: 455 },
    { label: 'Tháng 9', score: 540 },
    { label: 'Tháng 10', score: 620 },
  ],
};

export const AI_SUGGESTIONS = [
  {
    title: 'Part 5 – Ngữ pháp',
    description: 'Đúng 54%, nên luyện thêm thì động từ & mệnh đề quan hệ.',
  },
  {
    title: 'Part 3 – Hội thoại',
    description: 'Hay sai câu hỏi suy luận và ngữ cảnh ngụ ý.',
  },
  {
    title: 'Speaking câu 11 – Nêu quan điểm',
    description: 'Thiếu ví dụ minh họa và từ nối chuyển ý logic.',
  },
];

export const ACTIVE_COURSES: {
  title: string;
  teacher: string;
  tag: string;
  skill: SkillKey | 'GRAMMAR';
  lesson: number;
  totalLessons: number;
}[] = [
  {
    title: 'Ngữ pháp TOEIC nền tảng',
    teacher: 'Cô Mai Phương',
    tag: 'Grammar',
    skill: 'GRAMMAR',
    lesson: 8,
    totalLessons: 20,
  },
  {
    title: 'Chiến thuật Listening Part 3–4',
    teacher: 'Thầy Hoàng Nam',
    tag: 'Listening',
    skill: 'LISTENING',
    lesson: 12,
    totalLessons: 20,
  },
  {
    title: 'Writing: viết email & bài luận',
    teacher: 'Cô Thu Trang',
    tag: 'Writing',
    skill: 'WRITING',
    lesson: 5,
    totalLessons: 20,
  },
];

export const FLASHCARD_STATS = { due: 24, remembered: 312 };
