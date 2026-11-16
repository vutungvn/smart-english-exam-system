import type { PartProgress, SkillProgress } from '@/api/generated';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { formatPercent } from '../progress-meta';

/**
 * Tỉ lệ đúng theo Part, gom theo kỹ năng. Thanh ngang đọc trực tiếp được giá trị (không cần hover);
 * một màu cho mọi thanh vì cùng một thước đo, độ dài đã thể hiện mức cao thấp
 */
export function PartAccuracyCard({
  skills,
  parts,
}: {
  skills: SkillProgress[];
  parts: PartProgress[];
}) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-2xs">
      <h2 className="text-lg font-bold text-foreground">Tỉ lệ đúng theo Part</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Trên câu trắc nghiệm đã làm; câu bỏ trống tính là sai.
      </p>

      <div className="mt-5 space-y-6">
        {skills.map((skill) => (
          <div key={skill.skill}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SkillPill skill={skill.skill} />
              <span className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground tabular-nums">
                  {formatPercent(skill.accuracy)}
                </span>{' '}
                · {skill.correct}/{skill.total} câu đúng
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {parts
                .filter((part) => part.skill === skill.skill)
                .map((part) => (
                  <li key={`${part.skill}-${part.part}`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-700">
                        <span className="font-semibold text-foreground">Part {part.part}</span> ·{' '}
                        {part.name}
                      </span>
                      <span className="shrink-0 font-semibold text-foreground tabular-nums">
                        {formatPercent(part.accuracy)}
                        <span className="font-normal text-subtle">
                          {' '}
                          ({part.correct}/{part.total})
                        </span>
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
                      role="img"
                      aria-label={`Part ${part.part}: đúng ${formatPercent(part.accuracy)}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${part.accuracy ?? 0}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
