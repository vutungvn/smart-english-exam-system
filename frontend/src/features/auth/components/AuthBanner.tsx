import { BookOpen, Check, MapIcon, Mic, Monitor, Pencil, TrendingUp, Volume2 } from 'lucide-react';
import heroImage from '@/assets/auth/banner-hero.jpg';
import speakingImage from '@/assets/auth/banner-speaking.jpg';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';

// Báo cáo mẫu minh họa, không phải dữ liệu thật. Dùng đúng thang điểm TOEIC (D13):
// Listening/Reading 5–495 (cộng lại thành tổng 990), Speaking/Writing 0–200
const SKILLS = [
  { icon: Volume2, label: 'Listening', score: 420, max: 495, bar: 'bg-highlight' },
  { icon: BookOpen, label: 'Reading', score: 365, max: 495, bar: 'bg-blue-300' },
  { icon: Mic, label: 'Speaking', score: 150, max: 200, bar: 'bg-emerald-400' },
  { icon: Pencil, label: 'Writing', score: 140, max: 200, bar: 'bg-amber-400' },
];

// Tổng L&R tính từ dữ liệu mẫu để luôn khớp với 2 thanh Listening, Reading
const LR_TOTAL = SKILLS.slice(0, 2).reduce((sum, s) => sum + s.score, 0);

const FEATURES = [
  {
    icon: Mic,
    title: 'AI chấm Speaking & Writing',
    description: 'Nhận xét, sửa lỗi theo từng tiêu chí chấm',
  },
  {
    icon: MapIcon,
    title: 'Lộ trình học cá nhân hóa',
    description: 'Tối ưu hóa theo mục tiêu điểm và thời gian',
  },
  {
    icon: Monitor,
    title: 'Trợ giảng AI 24/7',
    description: 'Giải đề chi tiết mọi lúc, phân tích bẫy đề thi',
  },
];

/**
 * Banner bên trái các màn auth (theo Stitch), chỉ hiện từ màn hình lg (≥ 1024px).
 * Cao đúng bằng màn hình: khối giữa co giãn theo chỗ còn lại, mặc định bố cục gọn,
 * `tall:` (cao ≥ 821px) nới rộng, `tiny:` (cao ≤ 700px) ẩn khối giữa.
 */
export function AuthBanner() {
  return (
    <aside className="relative z-10 hidden overflow-hidden bg-linear-to-br from-brand via-primary to-primary-light px-10 py-8 text-white shadow-2xl gap-5 lg:flex lg:h-dvh lg:flex-col lg:justify-between xl:px-12 tall:gap-6 tall:py-10">
      {/* Họa tiết nền: lưới chấm và quầng sáng */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.18)_1.5px,transparent_1.5px)] bg-size-[24px_24px] opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-blue-300 opacity-30 mix-blend-screen blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-10 bottom-10 size-96 rounded-full bg-indigo-400 opacity-25 mix-blend-screen blur-3xl"
      />

      {/* Thương hiệu, nhãn và thông điệp chính */}
      <div className="relative shrink-0 space-y-4 tall:space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-lg shadow-black/10 transition-transform duration-300 hover:scale-105">
            <img src={logo} alt="" className="size-full rounded-lg object-contain" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">Smart English Exam</p>
            <p className="text-xs font-medium tracking-wide text-blue-100">
              Luyện thi TOEIC thông minh cùng AI
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-blue-50 shadow-sm backdrop-blur-sm">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />✨ Nền tảng
          luyện thi TOEIC ứng dụng AI • Theo cấu trúc đề hiện hành
        </span>

        <div className="max-w-2xl space-y-3">
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight tall:xl:text-5xl">
            Chinh phục TOEIC <br />
            <span className="font-black text-highlight drop-shadow-sm">đủ 4 kỹ năng</span> cùng trợ
            lý AI
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-blue-100 tall:text-base">
            Luyện Listening, Reading, Speaking, Writing theo cấu trúc đề TOEIC. AI chấm bài, nhận
            xét chi tiết, phân tích năng lực và gợi ý lộ trình riêng cho bạn.
          </p>
        </div>
      </div>

      {/* Ảnh minh họa và thẻ báo cáo năng lực: chiếm phần cao còn lại, tối đa 340px */}
      <div className="relative grid max-h-[340px] min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-5 tiny:hidden xl:grid-cols-12">
        <div className="flex min-h-0 flex-col gap-3.5 xl:col-span-7">
          <div className="group relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/25 bg-blue-900/30 shadow-2xl">
            <img
              src={heroImage}
              alt="Học viên luyện thi TOEIC cùng giao diện AI"
              className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-blue-950/70 via-transparent to-transparent" />
            <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-sm">
              <span className="size-2 animate-pulse rounded-full bg-highlight" />
              TOEIC 900+ Target
            </span>
            <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-xs backdrop-blur-md">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <span className="size-2 animate-ping rounded-full bg-emerald-400" />
                Mô phỏng phòng thi 4 kỹ năng
              </span>
              <span className="font-medium text-blue-200">Giáo viên có thể chấm lại</span>
            </div>
          </div>

          <div className="group flex shrink-0 items-center gap-3 rounded-xl border border-white/15 bg-white/8 p-2.5 shadow-lg backdrop-blur-md transition duration-300 hover:border-white/35">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/20">
              <img
                src={speakingImage}
                alt=""
                className="size-full object-cover transition duration-500 group-hover:scale-110"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold">Hệ thống luyện 4 kỹ năng AI</span>
                <span className="rounded border border-emerald-400/30 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Speaking &amp; Writing
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-blue-100/90">
                Nhận xét phát âm, ngữ điệu, từ vựng theo từng tiêu chí
              </p>
            </div>
            <div className="shrink-0 pr-1 text-right">
              <span className="block text-xs font-extrabold text-highlight">6</span>
              <span className="text-[10px] text-blue-200">tiêu chí</span>
            </div>
          </div>
        </div>

        {/* Từ xl mới đủ ngang cho thẻ báo cáo nằm cạnh ảnh */}
        <div className="hidden min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/25 bg-white/12 p-4 shadow-xl backdrop-blur-lg xl:col-span-5 xl:flex tall:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2.5">
            <span className="text-[11px] font-bold tracking-wider text-blue-200 uppercase">
              Báo cáo mẫu
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <Check className="size-3" strokeWidth={2.5} />
              AI vừa chấm Speaking
            </span>
          </div>

          <div className="my-2 flex items-baseline justify-between gap-2 tall:my-3">
            <div>
              <span className="text-3xl font-extrabold tracking-tight">{LR_TOTAL}</span>
              <span className="text-xs font-medium text-blue-200">
                {' '}
                / 990 Listening &amp; Reading
              </span>
            </div>
            <span className="flex items-center gap-0.5 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-bold text-emerald-300 shadow-sm">
              <TrendingUp className="size-3.5" strokeWidth={2.5} />
              +45
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {SKILLS.map(({ icon: Icon, label, score, max, bar }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between font-medium text-blue-100">
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-blue-200" />
                    {label}
                  </span>
                  <span>
                    <span className="font-bold text-white">{score}</span>
                    <span className="text-blue-200">/{max}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className={cn('h-full rounded-full', bar)}
                    style={{ width: `${(score / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[10px] text-blue-200/80">
            Số liệu minh họa · Điểm Speaking/Writing là điểm ước lượng do AI chấm
          </p>
        </div>
      </div>

      {/* Tính năng nổi bật: dòng mô tả chỉ hiện khi màn hình đủ cao */}
      <ul className="relative grid shrink-0 grid-cols-3 gap-3.5">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 p-3 backdrop-blur-md transition-all duration-200 hover:border-white/30 hover:bg-white/15 tall:block tall:p-3.5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/20 tall:mb-2">
              <Icon className="size-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold">{title}</h3>
              <p className="mt-0.5 hidden text-[11px] text-blue-100/80 tall:block">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
