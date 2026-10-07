import { ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SKILL_SCORES } from '../mock-data';
import { SKILL_META } from '../skill-meta';

export function SkillScoreCards() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
      {SKILL_SCORES.map(({ skill, score, max, delta }) => {
        const meta = SKILL_META[skill];
        const Icon = meta.icon;
        const percent = Math.round((score / max) * 100);

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
              <span className="inline-flex items-center gap-0.5 rounded-full bg-skill-listening/12 px-2 py-0.5 text-xs font-bold text-emerald-700">
                <ChevronUp className="size-3.5" />+{delta}
              </span>
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
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {score}
              </span>
              <span className="text-sm font-medium text-subtle"> / {max}</span>
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', meta.bar)}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Đạt {percent}% mức điểm tối đa</p>
          </li>
        );
      })}
    </ul>
  );
}
