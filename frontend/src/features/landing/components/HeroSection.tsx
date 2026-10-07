import { Link } from 'react-router';
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Headphones,
  Layers,
  ListChecks,
  Library,
  Mic,
  PenLine,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import heroImage from '@/assets/landing/hero-student.jpg';
import { cn } from '@/lib/utils';
import { BrandPattern } from '@/components/brand/BrandPattern';

const HIGHLIGHTS = [
  'Miễn phí cho học viên',
  'Chấm Speaking & Writing bằng AI',
  'Lộ trình theo mục tiêu điểm',
];

// Báo cáo minh họa (không phải dữ liệu thật); thanh màu nhạt để nổi trên nền gradient
const REPORT_SKILLS = [
  { icon: Headphones, label: 'Listening', percent: 88, bar: 'bg-highlight' },
  { icon: BookOpen, label: 'Reading', percent: 76, bar: 'bg-blue-200' },
  { icon: Mic, label: 'Speaking', percent: 64, bar: 'bg-violet-300' },
  { icon: PenLine, label: 'Writing', percent: 58, bar: 'bg-amber-300' },
];

// Số liệu theo kế hoạch: đề TOEIC LR 7 Part, SW 19 câu (11 Speaking + 8 Writing);
// ngân hàng 300 câu LR + 76 đề bài SW (Ke_hoach_soan_cau_hoi.md)
const STATS = [
  { icon: Layers, value: '4 kỹ năng', label: 'Listening, Reading, Speaking, Writing' },
  { icon: ListChecks, value: '7 Part + 19 câu', label: 'Đúng cấu trúc đề TOEIC LR và SW' },
  { icon: Library, value: '376 câu & đề', label: '300 câu LR, 76 đề bài SW có đáp án mẫu' },
  { icon: Zap, value: 'Chấm tức thì', label: 'Trắc nghiệm có điểm ngay, AI chấm Speaking/Writing' },
];

export function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden">
        {/* Quầng sáng và lưới chấm rất mờ phía sau */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 size-120 rounded-full bg-primary-light/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 size-120 rounded-full bg-highlight/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(66_99_235/0.08)_1px,transparent_1px)] bg-size-[22px_22px]"
        />

        <div className="relative mx-auto grid w-full max-w-300 grid-cols-1 items-center gap-14 px-4 pt-14 pb-28 sm:px-6 lg:pt-20 lg:pb-36 xl:grid-cols-[1.2fr_1fr] xl:gap-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent px-3.5 py-1.5 text-xs font-semibold text-brand">
              <span className="size-1.5 rounded-full bg-primary" />
              Luyện thi TOEIC 4 kỹ năng · Chuẩn cấu trúc đề ETS
            </span>

            <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[52px]">
              Chinh phục TOEIC
              <br />
              <span className="bg-linear-to-r from-skill-listening to-highlight bg-clip-text whitespace-nowrap text-transparent">
                4 kỹ năng
              </span>{' '}
              cùng trợ lý AI
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Làm đề Listening, Reading theo cấu trúc chuẩn với đồng hồ tính giờ như thi thật. AI
              chấm bài Speaking, Writing theo tiêu chí, phân tích điểm yếu và gợi ý bài luyện riêng
              cho bạn.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-brand px-7 font-semibold whitespace-nowrap text-white shadow-lg shadow-primary/30 transition hover:brightness-95 active:scale-[0.99]"
              >
                Bắt đầu luyện thi
                <ArrowRight className="size-4" />
              </Link>
              {/* TẠM: chưa có trang đề thi công khai, dẫn tới phần giới thiệu 4 kỹ năng */}
              <a
                href="#ky-nang"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-border bg-white px-7 font-semibold whitespace-nowrap text-foreground shadow-2xs transition hover:bg-accent"
              >
                <Play className="size-4 fill-primary text-primary" />
                Xem đề thi mẫu
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
              {HIGHLIGHTS.map((text) => (
                <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="size-4 shrink-0 text-skill-listening" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* Dải số liệu đè lên mép dưới Hero */}
      <div className="relative z-10 mx-auto -mt-16 w-full max-w-300 px-4 sm:px-6 lg:-mt-20">
        <ul className="grid grid-cols-1 gap-6 rounded-3xl border border-border bg-white p-6 shadow-xl shadow-slate-900/5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:divide-x xl:divide-border xl:p-8">
          {STATS.map(({ icon: Icon, value, label }) => (
            <li key={value} className="flex items-start gap-3.5 xl:px-6 xl:first:pl-0 xl:last:pr-0">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xl font-extrabold tracking-tight whitespace-nowrap text-foreground">
                  {value}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{label}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

// Ảnh học viên làm khung chính. Các thẻ đặt ở phía màn hình hologram (bên trái ảnh) để không che
// học viên; thẻ báo cáo chỉ hiện từ sm vì màn hẹp sẽ che gần hết ảnh.
// sm:pb chừa chỗ cho thẻ báo cáo tràn xuống dưới ảnh, không chạm dải số liệu
function HeroVisual() {
  return (
    <div className="mx-auto w-full max-w-130 sm:pb-10 xl:mr-0">
      <div className="relative">
        <div className="relative aspect-4/3 overflow-hidden rounded-[28px] shadow-2xl shadow-primary/25 ring-1 ring-white">
          <img
            src={heroImage}
            alt="Học viên đeo tai nghe luyện thi TOEIC cùng giao diện trợ lý AI"
            className="size-full object-cover object-[72%_center]"
            fetchPriority="high"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-brand/45 via-transparent to-transparent"
          />
        </div>

        {/* Thẻ báo cáo minh họa (số liệu mẫu) */}
        <div className="absolute -bottom-10 -left-10 hidden w-60 overflow-hidden rounded-2xl bg-linear-to-br from-brand via-primary to-primary-light p-4 text-white shadow-2xl shadow-primary/40 ring-1 ring-white/30 sm:block">
          <BrandPattern />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider text-blue-100 uppercase">
                Báo cáo năng lực
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/40 bg-emerald-400/25 px-1.5 py-0.5 text-xs font-bold">
                <TrendingUp className="size-3.5 text-highlight" />
                +45
              </span>
            </div>
            <p className="mt-2">
              <span className="text-3xl font-extrabold tracking-tight">785</span>
              <span className="text-sm font-medium text-blue-100"> / 990 điểm ước tính</span>
            </p>

            <ul className="mt-3 space-y-2">
              {REPORT_SKILLS.map(({ icon: Icon, label, percent, bar }) => (
                <li key={label}>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 text-blue-50">
                      <Icon className="size-3" />
                      {label}
                    </span>
                    <span className="font-bold">{percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div
                      className={cn('h-full rounded-full', bar)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Thẻ nổi góc trên trái */}
        <div className="absolute -top-5 -left-3 flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-xl ring-1 ring-border sm:-left-8">
          <span className="relative flex size-10 items-center justify-center rounded-xl bg-skill-listening/12 text-skill-listening">
            {/* Sóng lan ra như radar ngắm mục tiêu; tắt khi người dùng chọn giảm chuyển động */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl bg-skill-listening/30 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] motion-reduce:hidden"
            />
            <Target className="relative size-5 motion-safe:animate-heartbeat" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Mục tiêu 850+</p>
            <p className="text-xs text-subtle">Còn 65 điểm</p>
          </div>
        </div>

        <span className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-lg ring-1 ring-border backdrop-blur-sm">
          <Sparkles className="size-3.5" />
          AI vừa chấm Speaking
        </span>
      </div>
    </div>
  );
}
