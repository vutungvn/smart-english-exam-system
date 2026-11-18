import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import type {
  OpenPartProgress,
  OpenSkillProgress,
  PartProgress,
  SkillProgress,
} from '@/api/generated';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { formatPercent } from '../progress-meta';

interface PartAccuracyCardProps {
  skills: SkillProgress[];
  parts: PartProgress[];
  openSkills: OpenSkillProgress[];
  openParts: OpenPartProgress[];
}

/** 2.4, 3 */
const formatScore = (value: number) => `${Number(value.toFixed(1))}`;

/**
 * Năng lực theo Part, gom theo kỹ năng. Listening, Reading: tỉ lệ câu trắc nghiệm đúng. Speaking,
 * Writing: điểm chấm (AI hoặc giáo viên) so với điểm tối đa. Thanh ngang đọc trực tiếp được giá trị
 * (không cần hover); một màu cho mọi thanh vì cùng là %, độ dài đã thể hiện mức cao thấp
 */
export function PartAccuracyCard({ skills, parts, openSkills, openParts }: PartAccuracyCardProps) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-2xs">
      <h2 className="text-lg font-bold text-foreground">Năng lực theo Part</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Listening, Reading: tỉ lệ câu đúng, bỏ trống tính là sai. Speaking, Writing: điểm chấm so
        với điểm tối đa, bỏ trống 0 điểm.
      </p>

      <div className="mt-5 space-y-6">
        {skills.map((skill) => (
          <SkillGroup
            key={skill.skill}
            header={<SkillPill skill={skill.skill} />}
            summary={formatPercent(skill.accuracy)}
            summaryNote={`${skill.correct}/${skill.total} câu đúng`}
          >
            {parts
              .filter((part) => part.skill === skill.skill)
              .map((part) => (
                <PartBar
                  key={`${part.skill}-${part.part}`}
                  part={part.part}
                  name={part.name}
                  percent={part.accuracy}
                  value={formatPercent(part.accuracy)}
                  detail={`${part.correct}/${part.total}`}
                />
              ))}
          </SkillGroup>
        ))}

        {openSkills.map((skill) => (
          <SkillGroup
            key={skill.skill}
            header={
              <>
                <SkillPill skill={skill.skill} />
                <AiBadge />
              </>
            }
            summary={formatPercent(skill.percent)}
            summaryNote={`${skill.scored} câu đã chấm`}
            note={
              skill.pending > 0
                ? `${skill.pending} câu đang chờ AI chấm, chưa tính vào điểm.`
                : undefined
            }
          >
            {openParts
              .filter((part) => part.skill === skill.skill)
              .map((part) => (
                <PartBar
                  key={`${part.skill}-${part.part}`}
                  part={part.part}
                  name={part.name}
                  percent={part.percent}
                  value={
                    part.average === null
                      ? 'Chờ chấm'
                      : `${formatScore(part.average)} / ${part.maxScore}`
                  }
                  detail={part.percent === null ? undefined : formatPercent(part.percent)}
                />
              ))}
          </SkillGroup>
        ))}
      </div>
    </section>
  );
}

function SkillGroup({
  header,
  summary,
  summaryNote,
  note,
  children,
}: {
  header: ReactNode;
  summary: string;
  summaryNote: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">{header}</span>
        <span className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">{summary}</span> · {summaryNote}
        </span>
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      <ul className="mt-3 space-y-3">{children}</ul>
    </div>
  );
}

function PartBar({
  part,
  name,
  percent,
  value,
  detail,
}: {
  part: number;
  name: string;
  percent: number | null;
  value: string;
  detail?: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-slate-700">
          <span className="font-semibold text-foreground">Part {part}</span> · {name}
        </span>
        <span className="shrink-0 font-semibold text-foreground tabular-nums">
          {value}
          {detail && <span className="font-normal text-subtle"> ({detail})</span>}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`Part ${part}: ${value}`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent ?? 0}%` }} />
      </div>
    </li>
  );
}

function AiBadge() {
  return (
    <span
      title="Điểm do AI chấm theo tiêu chí, không phải điểm thi chính thức"
      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-brand"
    >
      <Sparkles className="size-3" />
      AI ước lượng
    </span>
  );
}
