import { Link } from 'react-router';
import { Archive, ArrowRight, Check, CircleCheck, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Section, SectionHeading } from './Section';

const BENEFITS = [
  'Ngân hàng câu hỏi phân loại theo kỹ năng và Part',
  'Nhập câu hỏi từ tệp Excel kèm audio, hình ảnh',
  'Dựng đề thi theo từng Part linh hoạt',
  'Xem lại, nhận xét và chỉnh điểm do AI chấm',
];

// Minh họa giao diện ngân hàng câu hỏi (không phải dữ liệu thật)
const SAMPLE_QUESTIONS = [
  {
    badge: 'P1',
    title: 'Mô tả tranh văn phòng',
    meta: 'Đã duyệt · Audio + hình ảnh',
    tone: 'bg-skill-listening/12 text-emerald-700',
  },
  {
    badge: 'P5',
    title: 'Điền từ: thì hiện tại hoàn thành',
    meta: 'Đã duyệt · Trắc nghiệm',
    tone: 'bg-accent text-brand',
  },
  {
    badge: 'SW',
    title: 'Speaking: mô tả bức ảnh',
    meta: 'Đã duyệt · Có tiêu chí chấm AI',
    tone: 'bg-skill-speaking/12 text-violet-700',
  },
];

export function TeacherSection() {
  return (
    <Section id="giao-vien" className="bg-white">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Giáo viên"
            title="Tạo khóa học và đề thi dễ dàng"
            description="Công cụ trực quan giúp thầy cô số hóa kho đề, tạo khóa học và theo dõi kết quả của học viên."
          />
          <ul className="mt-8 space-y-3.5">
            {BENEFITS.map((text) => (
              <li key={text} className="flex items-start gap-3 text-foreground">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-skill-listening" />
                {text}
              </li>
            ))}
          </ul>
          {/* TẠM: trang đăng ký giáo viên kèm minh chứng làm ở SPRINT-36 */}
          <Link
            to="/register"
            className="mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-linear-to-r from-primary to-brand px-6 font-semibold text-white shadow-lg shadow-primary/30 transition hover:brightness-95"
          >
            Đăng ký làm giáo viên
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div
          role="img"
          aria-label="Minh họa giao diện ngân hàng câu hỏi dành cho giáo viên"
          className="rounded-3xl border border-border bg-background p-5 shadow-xl shadow-slate-900/5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-bold text-foreground">
              <Archive className="size-5 text-primary" />
              Kho đề & Câu hỏi
            </p>
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand">
              128 câu đã tạo
            </span>
          </div>

          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-border bg-white px-4 py-3 text-sm text-subtle">
            <Search className="size-4 shrink-0" />
            <span className="truncate">Tìm theo Part, từ khóa hoặc chủ đề...</span>
          </div>

          <ul className="mt-4 space-y-3">
            {SAMPLE_QUESTIONS.map(({ badge, title, meta, tone }) => (
              <li
                key={badge}
                className="flex items-center gap-3.5 rounded-xl border border-border bg-white p-3.5"
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    tone,
                  )}
                >
                  {badge}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-subtle">{meta}</p>
                </div>
                <Check className="size-4 shrink-0 text-skill-listening" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
