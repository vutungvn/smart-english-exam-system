import { Link } from 'react-router';
import { ArrowRight, AudioLines, BookOpen, PenLine, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Section, SectionHeading } from './Section';

// TẠM: dữ liệu mẫu. Khi có API khóa học công khai (SPRINT-39) thì lấy các khóa nổi bật từ server,
// thêm trạng thái loading/empty. Chưa có trang chi tiết công khai nên link dẫn tới Đăng ký.
const COURSES = [
  {
    title: 'Ngữ pháp TOEIC nền tảng',
    teacher: 'Cô Mai Phương',
    lessons: 20,
    tag: 'Grammar',
    icon: BookOpen,
    cover: 'from-brand to-primary-light',
  },
  {
    title: 'Chiến thuật Listening Part 3–4',
    teacher: 'Thầy Hoàng Nam',
    lessons: 18,
    tag: 'Listening',
    icon: AudioLines,
    cover: 'from-emerald-600 to-highlight',
  },
  {
    title: 'Writing: viết email & bài luận',
    teacher: 'Cô Thu Trang',
    lessons: 16,
    tag: 'Writing',
    icon: PenLine,
    cover: 'from-violet-700 to-violet-400',
  },
];

export function CoursesSection() {
  return (
    <Section id="khoa-hoc">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          align="left"
          eyebrow="Khóa học"
          title="Khóa học từ giáo viên"
          description="Chương trình luyện thi chuyên sâu do giáo viên trên hệ thống biên soạn."
        />
        <Link
          to="/register"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-primary hover:text-brand"
        >
          Xem tất cả khóa học
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {COURSES.map(({ title, teacher, lessons, tag, icon: Icon, cover }) => (
          <li
            key={title}
            className="group overflow-hidden rounded-[20px] border border-border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
          >
            <div className={cn('relative h-40 overflow-hidden bg-linear-to-br', cover)}>
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.18)_1.5px,transparent_1.5px)] bg-size-[20px_20px]"
              />
              <span className="absolute top-4 left-4 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {tag}
              </span>
              <Icon
                aria-hidden
                className="absolute -right-2 -bottom-3 size-28 text-white/25 transition duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserRound className="size-4" />
                {teacher} · {lessons} bài học
              </p>
              <Link
                to="/register"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-brand"
              >
                Xem chi tiết
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
