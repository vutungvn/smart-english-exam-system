import { Link } from 'react-router';
import { ArrowRight, BookOpen, FileText, Headphones, Mic, PenLine } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useListPublishedExamsQuery, type ExamCatalogItem, type Skill } from '@/api/generated';
import { attemptPath, practiceExamPath, PRACTICE_PATH } from '@/features/practice/practice-meta';
import { cn } from '@/lib/utils';

const NEW_EXAM_LIMIT = 3;

interface CoverStyle {
  icon: typeof BookOpen;
  cover: string;
  button: string;
}

// Bìa thẻ theo kỹ năng đầu tiên của đề (đề TOEIC LR, SW có màu riêng theo thang điểm)
const SKILL_STYLES: Record<Skill, CoverStyle> = {
  LISTENING: {
    icon: Headphones,
    cover: 'from-emerald-600 to-highlight',
    button: 'bg-skill-listening/12 text-emerald-700 hover:bg-skill-listening/20',
  },
  READING: {
    icon: BookOpen,
    cover: 'from-brand to-primary-light',
    button: 'bg-accent text-brand hover:bg-primary/15',
  },
  SPEAKING: {
    icon: Mic,
    cover: 'from-violet-700 to-violet-400',
    button: 'bg-skill-speaking/12 text-violet-700 hover:bg-skill-speaking/20',
  },
  WRITING: {
    icon: PenLine,
    cover: 'from-amber-500 to-amber-300',
    button: 'bg-skill-writing/15 text-amber-700 hover:bg-skill-writing/25',
  },
};

const SCALE_TAGS: Record<ExamCatalogItem['scoringScale'], string> = {
  TOEIC_990: 'TOEIC LR',
  TOEIC_SW: 'TOEIC SW',
  PERCENT: 'Luyện tập',
};

function coverStyle(exam: ExamCatalogItem): CoverStyle {
  if (exam.scoringScale === 'TOEIC_990') return { ...SKILL_STYLES.READING, icon: Headphones };
  if (exam.scoringScale === 'TOEIC_SW') return SKILL_STYLES.SPEAKING;
  return SKILL_STYLES[exam.skills[0] ?? 'READING'];
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/**
 * Trang chủ học viên: 3 đề vừa xuất bản (danh sách đề công khai đã xếp mới nhất trước), thay cho
 * khối "Khóa học đang học" vì hệ thống không làm chức năng khóa học
 */
export function NewExamsCard() {
  const { data, error, isLoading, refetch } = useListPublishedExamsQuery({
    page: 1,
    limit: NEW_EXAM_LIMIT,
  });
  const exams = data?.data ?? [];

  return (
    <section className="@container rounded-3xl border border-border bg-white p-6 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Đề thi mới</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Đề vừa được giáo viên xuất bản, luyện ngay khi còn mới
          </p>
        </div>
        <Link
          to={PRACTICE_PATH}
          className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary hover:text-brand"
        >
          Xem tất cả
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <ul aria-hidden className="mt-5 grid grid-cols-1 gap-4 @xl:grid-cols-3">
          {Array.from({ length: NEW_EXAM_LIMIT }, (_, index) => (
            <li key={index} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </ul>
      ) : error && !data ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-slate-50 px-6 py-10 text-center text-sm text-muted-foreground">
          {toApiError(error).message}
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-semibold text-primary hover:text-brand"
          >
            Thử lại
          </button>
        </div>
      ) : exams.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <FileText className="size-8 text-subtle" />
          <p className="font-semibold text-foreground">Chưa có đề thi nào được xuất bản</p>
          <p className="text-sm text-muted-foreground">
            Giáo viên xuất bản đề mới thì đề sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-4 @xl:grid-cols-3">
          {exams.map((exam) => (
            <NewExamTile key={exam.id} exam={exam} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NewExamTile({ exam }: { exam: ExamCatalogItem }) {
  const style = coverStyle(exam);
  const Icon = style.icon;

  return (
    <li className="flex flex-col rounded-2xl border border-border p-3">
      <div className={cn('relative h-24 overflow-hidden rounded-xl bg-linear-to-br', style.cover)}>
        <span className="absolute top-3 left-3 rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
          {SCALE_TAGS[exam.scoringScale]}
        </span>
        <Icon aria-hidden className="absolute -right-2 -bottom-3 size-20 text-white/25" />
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3">
        <Link
          to={practiceExamPath(exam.id)}
          className="line-clamp-2 font-semibold text-foreground hover:text-brand"
        >
          {exam.title}
        </Link>
        <p className="mt-1 text-sm text-subtle">
          {exam.sectionCount} Part · {exam.questionCount} câu · {exam.durationMinutes} phút
        </p>
        {exam.publishedAt && (
          <p className="mt-0.5 text-xs text-subtle">
            Xuất bản {dateFormat.format(new Date(exam.publishedAt))}
          </p>
        )}

        <div className="mt-auto pt-4">
          <Link
            to={exam.inProgress ? attemptPath(exam.inProgress.id) : practiceExamPath(exam.id)}
            className={cn(
              'flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
              style.button,
            )}
          >
            {exam.inProgress ? 'Làm tiếp' : 'Vào luyện đề'}
          </Link>
        </div>
      </div>
    </li>
  );
}
