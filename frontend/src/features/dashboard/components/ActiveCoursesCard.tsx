import { Link } from 'react-router';
import { ArrowRight, BookOpen, Headphones, Mic, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVE_COURSES } from '../mock-data';

// Giao diện theo kỹ năng của khóa học (Grammar không thuộc 4 kỹ năng, dùng màu chính)
const COURSE_STYLES = {
  GRAMMAR: {
    icon: BookOpen,
    cover: 'from-brand to-primary-light',
    text: 'text-brand',
    bar: 'bg-primary',
    button: 'bg-accent text-brand hover:bg-primary/15',
  },
  LISTENING: {
    icon: Headphones,
    cover: 'from-emerald-600 to-highlight',
    text: 'text-emerald-700',
    bar: 'bg-skill-listening',
    button: 'bg-skill-listening/12 text-emerald-700 hover:bg-skill-listening/20',
  },
  READING: {
    icon: BookOpen,
    cover: 'from-brand to-primary-light',
    text: 'text-brand',
    bar: 'bg-skill-reading',
    button: 'bg-accent text-brand hover:bg-primary/15',
  },
  SPEAKING: {
    icon: Mic,
    cover: 'from-violet-700 to-violet-400',
    text: 'text-violet-700',
    bar: 'bg-skill-speaking',
    button: 'bg-skill-speaking/12 text-violet-700 hover:bg-skill-speaking/20',
  },
  WRITING: {
    icon: PenLine,
    cover: 'from-amber-500 to-amber-300',
    text: 'text-amber-700',
    bar: 'bg-skill-writing',
    button: 'bg-skill-writing/15 text-amber-700 hover:bg-skill-writing/25',
  },
};

// TẠM: dữ liệu mẫu; nối API khóa học đã ghi danh (SPRINT-39/42), thêm trạng thái chưa ghi danh khóa nào
export function ActiveCoursesCard() {
  return (
    <section className="@container rounded-3xl border border-border bg-white p-6 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Khóa học đang học</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tiếp tục hoàn thành bài giảng theo lộ trình của bạn
          </p>
        </div>
        <Link
          to="/app/courses"
          className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary hover:text-brand"
        >
          Xem tất cả
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-4 @xl:grid-cols-3">
        {ACTIVE_COURSES.map(({ title, teacher, tag, skill, lesson, totalLessons }) => {
          const style = COURSE_STYLES[skill];
          const Icon = style.icon;
          const percent = Math.round((lesson / totalLessons) * 100);

          return (
            <li key={title} className="flex flex-col rounded-2xl border border-border p-3">
              <div
                className={cn(
                  'relative h-24 overflow-hidden rounded-xl bg-linear-to-br',
                  style.cover,
                )}
              >
                <span className="absolute top-3 left-3 rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
                  {tag}
                </span>
                <Icon aria-hidden className="absolute -right-2 -bottom-3 size-20 text-white/25" />
              </div>

              <div className="flex flex-1 flex-col px-1 pt-3">
                <h3 className="line-clamp-2 font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-subtle">{teacher}</p>

                <div className="mt-auto pt-4">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">
                      Bài {lesson}/{totalLessons}
                    </span>
                    <span className={cn('font-bold', style.text)}>{percent}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', style.bar)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <Link
                    to="/app/courses"
                    className={cn(
                      'mt-4 flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                      style.button,
                    )}
                  >
                    Học tiếp
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
