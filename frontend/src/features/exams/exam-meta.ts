import { FileText, Layers3, Mic } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ExamDetail, ExamStatus, ScoringScale, Skill } from '@/api/generated';
import { PART_RULES, type PartRule } from '@/features/question-bank/toeic';

/** Giá trị form tạo/sửa thông tin đề (đã chuyển sang số, sẵn sàng gửi API) */
export interface ExamFormValues {
  title: string;
  description: string;
  scoringScale: ScoringScale;
  durationMinutes: number;
  maxAttempts: number | null;
  allowPartPractice: boolean;
  shuffleQuestions: boolean;
}

/** Số câu mỗi Part của đề TOEIC chuẩn (khớp backend exam-structure.ts) */
export const TOEIC_QUOTAS: Record<string, number> = {
  'LISTENING-1': 6,
  'LISTENING-2': 25,
  'LISTENING-3': 39,
  'LISTENING-4': 30,
  'READING-5': 30,
  'READING-6': 16,
  'READING-7': 54,
  'SPEAKING-1': 2,
  'SPEAKING-2': 2,
  'SPEAKING-3': 3,
  'SPEAKING-4': 3,
  'SPEAKING-5': 1,
  'WRITING-1': 5,
  'WRITING-2': 2,
  'WRITING-3': 1,
};

export function quotaOf(scale: ScoringScale, skill: Skill, part: number): number | null {
  return scale === 'PERCENT' ? null : (TOEIC_QUOTAS[`${skill}-${part}`] ?? null);
}

interface ExamTypeMeta {
  /** Nhãn ngắn trên pill */
  label: string;
  /** Tên trên thẻ chọn loại đề */
  title: string;
  hint: string;
  icon: LucideIcon;
  pill: string;
  skills: readonly Skill[];
  defaultMinutes: number;
}

/** Giáo viên chọn "loại đề"; thang điểm của backend suy ra từ đây */
export const EXAM_TYPE_META: Record<ScoringScale, ExamTypeMeta> = {
  TOEIC_990: {
    label: 'LR 990',
    title: 'Đề LR đầy đủ',
    hint: '7 Part · 200 câu · 120 phút',
    icon: FileText,
    pill: 'bg-skill-reading/12 text-brand',
    skills: ['LISTENING', 'READING'],
    defaultMinutes: 120,
  },
  TOEIC_SW: {
    label: 'Speaking & Writing',
    title: 'Đề Speaking / Writing',
    hint: 'Speaking 11 câu · Writing 8 câu',
    icon: Mic,
    pill: 'bg-skill-speaking/12 text-violet-700',
    skills: ['SPEAKING', 'WRITING'],
    defaultMinutes: 60,
  },
  PERCENT: {
    label: 'Luyện tập',
    title: 'Luyện tập theo Part',
    hint: 'Chọn Part tùy ý, chấm theo %',
    icon: Layers3,
    pill: 'bg-slate-100 text-slate-600',
    skills: ['LISTENING', 'READING', 'SPEAKING', 'WRITING'],
    defaultMinutes: 20,
  },
};

export const SCALES: readonly ScoringScale[] = ['TOEIC_990', 'TOEIC_SW', 'PERCENT'];

export const EXAM_STATUS_META: Record<ExamStatus, { label: string; pill: string }> = {
  DRAFT: { label: 'Nháp', pill: 'bg-slate-100 text-slate-600' },
  PUBLISHED: { label: 'Đang xuất bản', pill: 'bg-emerald-50 text-emerald-700' },
  UNPUBLISHED: {
    label: 'Đã gỡ',
    pill: 'bg-slate-100 text-slate-500 line-through decoration-slate-400/60',
  },
};

export const EXAM_STATUSES: readonly ExamStatus[] = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'];

/** Part hợp lệ với loại đề, theo thứ tự chuẩn L1…L4, R5…R7, S1…S5, W1…W3 */
export function partsOfScale(scale: ScoringScale): PartRule[] {
  return PART_RULES.filter((rule) => EXAM_TYPE_META[scale].skills.includes(rule.skill));
}

export function partOrder(skill: Skill, part: number): number {
  return PART_RULES.findIndex((rule) => rule.skill === skill && rule.part === part);
}

/** "Reading · Part 5" */
export function sectionTitle(skill: Skill, part: number): string {
  return `${skill.charAt(0)}${skill.slice(1).toLowerCase()} · Part ${part}`;
}

/**
 * Tổng số câu chuẩn của đề: LR 200; SW tính theo kỹ năng đã có trong đề (Speaking 11, Writing 8);
 * luyện tập không có chuẩn (null). Danh sách đề không có phần thi nên đề SW trả null.
 */
export function expectedTotal(
  exam: Pick<ExamDetail, 'scoringScale'> & { sections?: Pick<ExamDetail, 'sections'>['sections'] },
): number | null {
  if (exam.scoringScale === 'PERCENT') return null;
  if (exam.scoringScale === 'TOEIC_SW' && !exam.sections) return null;
  const skills =
    exam.scoringScale === 'TOEIC_990'
      ? EXAM_TYPE_META.TOEIC_990.skills
      : EXAM_TYPE_META.TOEIC_SW.skills.filter((skill) =>
          exam.sections?.some((s) => s.skill === skill),
        );
  return partsOfScale(exam.scoringScale)
    .filter((rule) => skills.includes(rule.skill))
    .reduce((sum, rule) => sum + (quotaOf(exam.scoringScale, rule.skill, rule.part) ?? 0), 0);
}
