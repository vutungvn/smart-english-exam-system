import { Link } from 'react-router';
import { ArrowRight, CircleCheckBig, Target } from 'lucide-react';
import type { ProgressSkills } from '@/api/generated';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { PRACTICE_PATH } from '@/features/practice/practice-meta';
import { cn } from '@/lib/utils';
import { formatPercent } from '../progress-meta';

interface WeakTopicsCardProps {
  data: Pick<ProgressSkills, 'weakTopics' | 'minTopicQuestions' | 'weakAccuracy'>;
  title?: string;
  /** Số chủ đề hiện tối đa (Trang chủ hiện ít hơn) */
  limit?: number;
  className?: string;
}

/** Chủ đề làm sai nhiều (tính bằng số liệu, chưa phải AI); "Luyện ngay" mở danh sách đề theo kỹ năng */
export function WeakTopicsCard({
  data,
  title = 'Chủ đề cần luyện thêm',
  limit,
  className,
}: WeakTopicsCardProps) {
  const topics = data.weakTopics.slice(0, limit);

  return (
    <section
      className={cn(
        'flex flex-col rounded-3xl border border-border bg-white p-6 shadow-2xs',
        className,
      )}
    >
      <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Target className="size-5" />
        </span>
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Chủ đề đã làm từ {data.minTopicQuestions} câu trở lên và đúng dưới {data.weakAccuracy}%.
      </p>

      {topics.length === 0 ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <CircleCheckBig className="size-7 text-success" />
          <p className="font-semibold text-foreground">Chưa có chủ đề nào cần lo</p>
          <p className="text-sm text-muted-foreground">
            Làm thêm bài để có đủ số liệu, hoặc bạn đang làm tốt mọi chủ đề đã luyện.
          </p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-1 flex-col gap-3">
          {topics.map((topic) => (
            <li key={topic.topicId} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <SkillPill skill={topic.skill} />
                <span className="text-xs text-subtle">Part {topic.parts.join(', ')}</span>
              </div>
              <h3 className="mt-2 font-semibold text-foreground">{topic.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Đúng{' '}
                <span className="font-bold text-destructive tabular-nums">
                  {formatPercent(topic.accuracy)}
                </span>{' '}
                · {topic.correct}/{topic.total} câu
                {topic.skipped > 0 && ` · bỏ trống ${topic.skipped}`}
              </p>
              <Link
                to={`${PRACTICE_PATH}?skill=${topic.skill}`}
                className="mt-2 flex items-center justify-end gap-1 text-sm font-semibold text-primary hover:text-brand"
              >
                Luyện ngay
                <ArrowRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
