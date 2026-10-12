import type { Skill } from '@/api/generated';
import { cn } from '@/lib/utils';
import { useSkillCount } from '../hooks/use-question-counts';
import { SKILL_META, SKILLS } from '../toeic';

interface SkillStatCardsProps {
  selected?: Skill;
  onSelect: (skill: Skill | undefined) => void;
}

// Số câu theo kỹ năng; bấm thẻ để lọc nhanh, bấm lại thẻ đang chọn để bỏ lọc
export function SkillStatCards({ selected, onSelect }: SkillStatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {SKILLS.map((skill) => (
        <SkillStatCard
          key={skill}
          skill={skill}
          active={selected === skill}
          onClick={() => onSelect(selected === skill ? undefined : skill)}
        />
      ))}
    </div>
  );
}

function SkillStatCard({
  skill,
  active,
  onClick,
}: {
  skill: Skill;
  active: boolean;
  onClick: () => void;
}) {
  const { total, isLoading } = useSkillCount(skill);
  const meta = SKILL_META[skill];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-white p-4 text-left transition-all outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-primary/30',
        active ? 'border-primary bg-accent shadow-sm' : 'border-border shadow-2xs',
      )}
    >
      <span
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', meta.tile)}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wider text-subtle uppercase">
          {meta.label}
        </span>
        <span className="mt-0.5 flex items-baseline gap-1">
          {isLoading ? (
            <span className="mt-1 block h-6 w-10 animate-pulse rounded bg-slate-100" />
          ) : (
            <>
              <span className="text-xl font-bold text-foreground">{total ?? 0}</span>
              <span className="text-xs text-subtle">câu</span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}
