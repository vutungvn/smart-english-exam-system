import type { Difficulty, QuestionStatus, Skill } from '@/api/generated';
import { cn } from '@/lib/utils';
import { DIFFICULTY_META, SKILL_META, STATUS_META } from '../toeic';

const pillBase =
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

export function SkillPill({ skill, className }: { skill: Skill; className?: string }) {
  return (
    <span className={cn(pillBase, SKILL_META[skill].pill, className)}>
      {SKILL_META[skill].label}
    </span>
  );
}

export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  const meta = DIFFICULTY_META[difficulty];
  return <span className={cn(pillBase, meta.pill)}>{meta.label}</span>;
}

export function StatusPill({ status }: { status: QuestionStatus }) {
  const meta = STATUS_META[status];
  return <span className={cn(pillBase, meta.pill)}>{meta.label}</span>;
}
