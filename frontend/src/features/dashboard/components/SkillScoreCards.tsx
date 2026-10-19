import { ChevronDown, ChevronUp, Minus, Sparkles } from 'lucide-react';
import type { ProgressSkills, ScoreTrend, Skill } from '@/api/generated';
import { formatPercent } from '@/features/progress/progress-meta';
import { cn } from '@/lib/utils';
import { skillScaled, toeicSummary } from '../dashboard-progress';
import { SKILL_META } from '../skill-meta';

const SKILLS: readonly Skill[] = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];

interface SkillCard {
  value: string;
  max?: string;
  /** % để vẽ thanh tiến độ */
  percent: number;
  note: string;
  delta: number | null;
}

/**
 * Listening, Reading: điểm quy đổi của bài TOEIC LR gần nhất (5–495), chưa có thì tỉ lệ câu đúng.
 * Speaking, Writing: chờ AI chấm (Sprint 6).
 */
function cardOf(skill: Skill, trend: ScoreTrend, skills: ProgressSkills): SkillCard {
  if (skill === 'SPEAKING' || skill === 'WRITING') {
    return { value: '—', max: '200', percent: 0, note: 'Chấm bằng AI, sắp có', delta: null };
  }
  const { latest, previous } = toeicSummary(trend.points);
  const scaled = skillScaled(latest, skill);
  if (scaled !== null) {
    const before = skillScaled(previous, skill);
    return {
      value: `${scaled}`,
      max: '495',
      percent: Math.round((scaled / 495) * 100),
      note: 'Điểm quy đổi bài TOEIC LR gần nhất',
      delta: before === null ? null : scaled - before,
    };
  }
  const stat = skills.skills.find((item) => item.skill === skill);
  return {
    value: formatPercent(stat?.accuracy),
    percent: stat?.accuracy ?? 0,
    note: stat ? `Tỉ lệ đúng · ${stat.correct}/${stat.total} câu` : 'Chưa làm câu nào',
    delta: null,
  };
}

export function SkillScoreCards({
  trend,
  skills,
}: {
  trend?: ScoreTrend;
  skills?: ProgressSkills;
}) {
  if (!trend || !skills) {
    return (
      <ul aria-busy className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {SKILLS.map((skill) => (
          <li
            key={skill}
            className="h-48 animate-pulse rounded-[20px] border border-border bg-white"
          />
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
      {SKILLS.map((skill) => {
        const meta = SKILL_META[skill];
        const Icon = meta.icon;
        const card = cardOf(skill, trend, skills);

        return (
          <li key={skill} className="rounded-[20px] border border-border bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl',
                  meta.soft,
                  meta.iconColor,
                )}
              >
                <Icon className="size-5" />
              </span>
              {card.delta !== null && <DeltaBadge delta={card.delta} />}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{meta.label}</h3>
              {meta.aiScored && (
                <span
                  title="Điểm do AI chấm theo tiêu chí, không phải điểm thi chính thức"
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-brand"
                >
                  <Sparkles className="size-3" />
                  AI ước lượng
                </span>
              )}
            </div>
            <p className="mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {card.value}
              </span>
              {card.max && <span className="text-sm font-medium text-subtle"> / {card.max}</span>}
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', meta.bar)}
                style={{ width: `${card.percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{card.note}</p>
          </li>
        );
      })}
    </ul>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ChevronUp : delta < 0 ? ChevronDown : Minus;
  return (
    <span
      title="So với bài TOEIC LR trước"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
        delta > 0
          ? 'bg-emerald-50 text-emerald-700'
          : delta < 0
            ? 'bg-danger-soft text-destructive'
            : 'bg-slate-100 text-slate-600',
      )}
    >
      <Icon className="size-3.5" />
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}
