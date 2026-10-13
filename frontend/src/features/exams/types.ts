import type { QuestionSummary, Skill } from '@/api/generated';

/**
 * TẠM (lượt 1, chưa nối API): kiểu dữ liệu chép đúng hình dạng response của backend
 * (backend/src/modules/exams/exams.types.ts). Lượt 2 chạy `npm run api:gen` rồi đổi sang
 * kiểu sinh trong `@/api/generated`, các component giữ nguyên.
 */

export type ScoringScale = 'TOEIC_990' | 'TOEIC_SW' | 'PERCENT';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

export interface ExamSummary {
  id: string;
  subject: { id: string; code: string; name: string };
  kind: 'STANDARD' | 'AI_PRACTICE';
  title: string;
  description: string | null;
  scoringScale: ScoringScale;
  durationMinutes: number;
  maxAttempts: number | null;
  allowPartPractice: boolean;
  status: ExamStatus;
  publishedAt: string | null;
  sectionCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionItem {
  /** Id của câu trong đề (dùng khi gỡ câu) */
  id: string;
  orderIndex: number;
  question: QuestionSummary;
}

export interface ExamSectionItem {
  id: string;
  skill: Skill;
  part: number;
  name: string;
  questionCount: number;
  questions: ExamQuestionItem[];
}

export interface ExamDetail extends ExamSummary {
  sections: ExamSectionItem[];
}

export type ExamIssueLevel = 'ERROR' | 'WARNING';

export interface ExamIssue {
  level: ExamIssueLevel;
  code: string;
  message: string;
  sectionId: string | null;
  questionId: string | null;
}

export interface ExamPartCheck {
  skill: Skill;
  part: number;
  name: string;
  expected: number | null;
  actual: number;
}

export interface ExamValidation {
  publishable: boolean;
  totalQuestions: number;
  parts: ExamPartCheck[];
  issues: ExamIssue[];
}

export interface ExamFormValues {
  title: string;
  description: string;
  scoringScale: ScoringScale;
  durationMinutes: number;
  maxAttempts: number | null;
  allowPartPractice: boolean;
}
