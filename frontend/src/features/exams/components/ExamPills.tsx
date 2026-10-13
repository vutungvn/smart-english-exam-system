import { cn } from '@/lib/utils';
import { EXAM_STATUS_META, EXAM_TYPE_META } from '../exam-meta';
import type { ExamStatus, ScoringScale } from '../types';

const pillBase =
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

export function ExamTypePill({ scale }: { scale: ScoringScale }) {
  const meta = EXAM_TYPE_META[scale];
  return <span className={cn(pillBase, meta.pill)}>{meta.label}</span>;
}

export function ExamStatusPill({ status }: { status: ExamStatus }) {
  const meta = EXAM_STATUS_META[status];
  return <span className={cn(pillBase, meta.pill)}>{meta.label}</span>;
}
