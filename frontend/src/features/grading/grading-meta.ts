import type { ReviewReason, Skill } from '@/api/generated';

export const GRADING_PATH = '/teacher/assessments';
export const gradingDetailPath = (answerId: string) => `${GRADING_PATH}/${answerId}`;
export const GRADING_AGREEMENT_PATH = `${GRADING_PATH}/agreement`;

export const GRADING_PAGE_SIZES = [10, 20, 50] as const;

export type GradingTab = 'WAITING' | 'REVIEWED';
export type GradingScope = 'ALL' | 'MINE';
export type OpenSkill = Extract<Skill, 'SPEAKING' | 'WRITING'>;

export const REASON_META: Record<ReviewReason, { label: string; className: string }> = {
  AI_FAILED: { label: 'AI chấm lỗi', className: 'bg-danger-soft text-destructive' },
  STUDENT_REQUEST: { label: 'Học viên yêu cầu', className: 'bg-violet-50 text-violet-700' },
};

export const SKILL_LABELS: Record<OpenSkill, string> = {
  SPEAKING: 'Speaking',
  WRITING: 'Writing',
};

/** "Speaking · Part 3 · Câu 2" */
export function questionLabel(skill: Skill, part: number, number: number): string {
  const name = skill === 'SPEAKING' || skill === 'WRITING' ? SKILL_LABELS[skill] : skill;
  return `${name} · Part ${part} · Câu ${number}`;
}
