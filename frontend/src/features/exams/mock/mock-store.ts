import { useSyncExternalStore } from 'react';
import type { QuestionSummary, Skill } from '@/api/generated';
import { findPartRule } from '@/features/question-bank/toeic';
import { partOrder } from '../exam-meta';
import type { ExamDetail, ExamFormValues, ExamSectionItem } from '../types';
import { bankOf, QUESTION_INDEX } from './mock-bank';

/**
 * TẠM (lượt 1): danh sách đề giữ trong bộ nhớ trình duyệt để bấm thử các màn hình.
 * Tải lại trang là về dữ liệu mẫu ban đầu. Lượt 2 thay bằng hook RTK Query sinh từ /teacher/exams.
 */

const SUBJECT = { id: 'mock-toeic', code: 'TOEIC', name: 'TOEIC 4 kỹ năng' };
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${(++seq).toString(36).padStart(4, '0')}`;

function section(skill: Skill, part: number, questions: QuestionSummary[]): ExamSectionItem {
  return {
    id: nextId('s'),
    skill,
    part,
    name: findPartRule(skill, part)?.name ?? `Part ${part}`,
    questionCount: questions.length,
    questions: questions.map((question, orderIndex) => ({
      id: nextId('eq'),
      orderIndex,
      question,
    })),
  };
}

const singles = (skill: Skill, part: number, from: number, count: number) =>
  bankOf(skill, part).singles.slice(from, from + count);
const groups = (skill: Skill, part: number, indexes: number[]) =>
  indexes.flatMap((i) => bankOf(skill, part).groups[i]?.questions ?? []);
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

function exam(
  values: Partial<ExamDetail> & Pick<ExamDetail, 'title' | 'scoringScale' | 'durationMinutes'>,
  sections: ExamSectionItem[],
): ExamDetail {
  return withCounts({
    id: nextId('exam'),
    subject: SUBJECT,
    kind: 'STANDARD',
    description: null,
    maxAttempts: null,
    allowPartPractice: true,
    status: 'DRAFT',
    publishedAt: null,
    sectionCount: 0,
    questionCount: 0,
    createdAt: '2026-10-10T02:00:00.000Z',
    updatedAt: '2026-10-13T03:20:00.000Z',
    ...values,
    sections,
  });
}

function withCounts(detail: ExamDetail): ExamDetail {
  const sections = [...detail.sections]
    .sort((a, b) => partOrder(a.skill, a.part) - partOrder(b.skill, b.part))
    .map((s) => ({ ...s, questionCount: s.questions.length }));
  return {
    ...detail,
    sections,
    sectionCount: sections.length,
    questionCount: sections.reduce((sum, s) => sum + s.questionCount, 0),
  };
}

function initialExams(): ExamDetail[] {
  return [
    exam(
      {
        title: 'TOEIC LR – Đề số 1',
        description: 'Đề thi thử Listening & Reading đầy đủ 7 Part theo định dạng mới.',
        scoringScale: 'TOEIC_990',
        durationMinutes: 120,
        updatedAt: '2026-10-13T03:20:00.000Z',
      },
      [
        section('LISTENING', 1, singles('LISTENING', 1, 0, 6)),
        section('LISTENING', 2, singles('LISTENING', 2, 0, 20)),
        section('LISTENING', 3, groups('LISTENING', 3, range(0, 13))),
        section('LISTENING', 4, groups('LISTENING', 4, range(0, 10))),
        // 29 câu, có câu Nháp ở vị trí thứ 4
        section('READING', 5, singles('READING', 5, 0, 29)),
        section('READING', 6, groups('READING', 6, range(0, 4))),
        section('READING', 7, groups('READING', 7, range(0, 14))),
      ],
    ),
    exam(
      {
        title: 'TOEIC Speaking – Đề số 1',
        description: 'Đủ 5 phần thi nói, có thời gian chuẩn bị và trả lời theo chuẩn.',
        scoringScale: 'TOEIC_SW',
        durationMinutes: 20,
        status: 'PUBLISHED',
        publishedAt: '2026-10-12T09:00:00.000Z',
        updatedAt: '2026-10-12T09:00:00.000Z',
      },
      [
        section('SPEAKING', 1, singles('SPEAKING', 1, 0, 2)),
        section('SPEAKING', 2, singles('SPEAKING', 2, 0, 2)),
        section('SPEAKING', 3, singles('SPEAKING', 3, 0, 3)),
        section('SPEAKING', 4, groups('SPEAKING', 4, [0])),
        section('SPEAKING', 5, singles('SPEAKING', 5, 0, 1)),
      ],
    ),
    exam(
      {
        title: 'TOEIC Writing – Đề số 1',
        description: 'Đề viết 3 phần: tả tranh, trả lời email, bài luận quan điểm.',
        scoringScale: 'TOEIC_SW',
        durationMinutes: 60,
        status: 'PUBLISHED',
        publishedAt: '2026-10-11T08:00:00.000Z',
        updatedAt: '2026-10-11T08:00:00.000Z',
      },
      [
        section('WRITING', 1, singles('WRITING', 1, 0, 5)),
        section('WRITING', 2, singles('WRITING', 2, 0, 2)),
        section('WRITING', 3, singles('WRITING', 3, 0, 1)),
      ],
    ),
    exam(
      {
        title: 'Luyện Part 5 – Ngữ pháp',
        description: '30 câu hoàn thành câu về thì, từ loại và giới từ.',
        scoringScale: 'PERCENT',
        durationMinutes: 15,
        updatedAt: '2026-10-09T07:30:00.000Z',
      },
      [section('READING', 5, singles('READING', 5, 10, 30))],
    ),
    exam(
      {
        title: 'Luyện Part 7 – Email & thông báo',
        description: 'Đoạn văn đơn, xử lý tình huống công sở.',
        scoringScale: 'PERCENT',
        durationMinutes: 20,
        status: 'UNPUBLISHED',
        publishedAt: '2026-10-05T07:30:00.000Z',
        updatedAt: '2026-10-08T07:30:00.000Z',
      },
      [section('READING', 7, groups('READING', 7, [6, 7, 8]))],
    ),
  ];
}

let state: ExamDetail[] = initialExams();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: ExamDetail[]) {
  state = next;
  listeners.forEach((listener) => listener());
}

function change(id: string, update: (exam: ExamDetail) => ExamDetail) {
  commit(
    state.map((item) =>
      item.id === id ? withCounts({ ...update(item), updatedAt: new Date().toISOString() }) : item,
    ),
  );
}

export function useMockExams(): ExamDetail[] {
  return useSyncExternalStore(subscribe, () => state);
}

export function useMockExam(id: string): ExamDetail | undefined {
  return useSyncExternalStore(subscribe, () => state.find((item) => item.id === id));
}

export const mockExams = {
  create(values: ExamFormValues): ExamDetail {
    const created = exam({ ...values, description: values.description || null }, []);
    commit([created, ...state]);
    return created;
  },
  update(id: string, values: ExamFormValues) {
    change(id, (item) => ({ ...item, ...values, description: values.description || null }));
  },
  remove(id: string) {
    commit(state.filter((item) => item.id !== id));
  },
  publish(id: string) {
    change(id, (item) => ({ ...item, status: 'PUBLISHED', publishedAt: new Date().toISOString() }));
  },
  unpublish(id: string) {
    change(id, (item) => ({ ...item, status: 'UNPUBLISHED' }));
  },
  addSection(id: string, skill: Skill, part: number): string {
    const created = section(skill, part, []);
    change(id, (item) => ({ ...item, sections: [...item.sections, created] }));
    return created.id;
  },
  removeSection(id: string, sectionId: string) {
    change(id, (item) => ({ ...item, sections: item.sections.filter((s) => s.id !== sectionId) }));
  },
  /** Câu đơn theo id; nhóm thì thêm mọi câu của nhóm theo thứ tự trong nhóm */
  addQuestions(id: string, sectionId: string, ids: { questionIds: string[]; groupIds: string[] }) {
    change(id, (item) => ({
      ...item,
      sections: item.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const groupQuestions = ids.groupIds.flatMap(
          (groupId) =>
            bankOf(s.skill, s.part).groups.find((g) => g.group.id === groupId)?.questions ?? [],
        );
        const added = [
          ...ids.questionIds.flatMap((qid) => QUESTION_INDEX.get(qid) ?? []),
          ...groupQuestions,
        ];
        const start = s.questions.length;
        return {
          ...s,
          questions: [
            ...s.questions,
            ...added.map((question, i) => ({
              id: nextId('eq'),
              orderIndex: start + i,
              question,
            })),
          ],
        };
      }),
    }));
  },
  /** Câu thuộc nhóm thì gỡ cả nhóm, giống backend */
  removeQuestion(id: string, sectionId: string, examQuestionId: string) {
    change(id, (item) => ({
      ...item,
      sections: item.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const target = s.questions.find((q) => q.id === examQuestionId);
        const groupId = target?.question.groupId;
        return {
          ...s,
          questions: s.questions.filter((q) =>
            groupId ? q.question.groupId !== groupId : q.id !== examQuestionId,
          ),
        };
      }),
    }));
  },
};
