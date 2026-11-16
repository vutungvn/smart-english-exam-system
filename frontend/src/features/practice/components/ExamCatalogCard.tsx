import { Link } from 'react-router';
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Clock,
  Infinity as InfinityIcon,
  Layers,
} from 'lucide-react';
import type { ExamCatalogItem } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { cn } from '@/lib/utils';
import { attemptPath, practiceExamPath, SCALE_META } from '../practice-meta';

/** Thẻ đề trong trang Luyện đề thi */
export function ExamCatalogCard({ exam }: { exam: ExamCatalogItem }) {
  const inProgress = exam.inProgress;
  const noFullAttempts = exam.attemptsLeft === 0;
  const scale = SCALE_META[exam.scoringScale];

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xs transition-shadow hover:shadow-md">
      <div className="flex-1 p-5">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', scale.pill)}>
            {scale.label}
          </span>
          {inProgress ? (
            <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Đang làm dở
            </span>
          ) : (
            noFullAttempts && (
              <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Hết lượt
              </span>
            )
          )}
        </div>

        <Link
          to={practiceExamPath(exam.id)}
          className="mt-4 line-clamp-2 text-lg font-bold text-foreground hover:text-brand"
        >
          {exam.title}
        </Link>
        {exam.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {exam.skills.map((skill) => (
            <SkillPill key={skill} skill={skill} />
          ))}
        </div>

        <dl className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-4 text-subtle" />
              {exam.sectionCount} Part · {exam.questionCount} câu
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-subtle" />
              {exam.durationMinutes} phút
            </span>
          </div>
          <AttemptsLine exam={exam} />
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-slate-50/70 px-5 py-3">
        <Link
          to={practiceExamPath(exam.id)}
          className="text-sm font-semibold text-slate-600 hover:text-brand"
        >
          Chi tiết
        </Link>
        {inProgress ? (
          <ButtonLink to={attemptPath(inProgress.id)} className="h-10 w-auto px-4">
            Làm tiếp
            <ArrowRight />
          </ButtonLink>
        ) : (
          // Hết lượt làm cả đề vẫn vào chi tiết để luyện theo Part
          <ButtonLink
            to={practiceExamPath(exam.id)}
            variant={noFullAttempts ? 'secondary' : 'default'}
            className={cn('h-10 w-auto px-4', noFullAttempts && 'bg-white ring-1 ring-border')}
          >
            {noFullAttempts ? 'Luyện theo Part' : 'Bắt đầu'}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}

function AttemptsLine({ exam }: { exam: ExamCatalogItem }) {
  if (exam.maxAttempts === null) {
    return (
      <p className="inline-flex items-center gap-1.5">
        <InfinityIcon className="size-4 text-subtle" />
        Không giới hạn lượt
      </p>
    );
  }
  const left = exam.attemptsLeft ?? 0;
  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5',
        left > 0 ? 'text-success' : 'text-destructive',
      )}
    >
      {left > 0 ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
      {left > 0
        ? `Còn ${left}/${exam.maxAttempts} lượt làm cả đề`
        : `Đã dùng ${exam.maxAttempts}/${exam.maxAttempts} lượt`}
    </p>
  );
}
