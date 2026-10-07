import { useState } from 'react';
import { Link } from 'react-router';
import { Play, TrendingUp } from 'lucide-react';
import { BrandPattern } from '@/components/brand/BrandPattern';
import { LR_PREDICTION } from '../mock-data';

// Lời chào theo giờ Việt Nam
function getGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date()),
  );
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// Tên gọi: 2 từ cuối của họ tên ("Nguyễn Minh Anh" → "Minh Anh")
function getCallName(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(-2).join(' ');
}

export function WelcomeCard({ fullName }: { fullName?: string }) {
  // Tính một lần khi mở trang, không đổi theo từng lần render
  const [greeting] = useState(getGreeting);
  const { score, max, target, weeklyDelta } = LR_PREDICTION;
  const progress = Math.min(100, Math.round((score / target) * 100));

  return (
    <section className="@container relative overflow-hidden rounded-3xl bg-linear-to-br from-brand via-primary to-primary-light p-6 text-white shadow-xl shadow-primary/20 sm:p-8">
      <BrandPattern />

      <div className="relative flex flex-col gap-8 @xl:flex-row @xl:items-center @xl:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold">
            <span className="size-1.5 rounded-full bg-highlight" />
            Luyện thi TOEIC 4 kỹ năng
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {greeting}
            {fullName ? `, ${getCallName(fullName)}` : ''} 👋
          </h1>
          <p className="mt-2 max-w-md text-blue-100">
            Cùng tiến gần hơn tới mục tiêu {target} điểm hôm nay nhé!
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/app/exams"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-brand shadow-lg shadow-black/10 transition hover:bg-blue-50"
            >
              <Play className="size-4 fill-current" />
              Làm bài thi thử
            </Link>
            <Link
              to="/app/courses"
              className="inline-flex h-11 items-center rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold transition hover:bg-white/20"
            >
              Tiếp tục học
            </Link>
          </div>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-white/22 bg-white/12 p-5 backdrop-blur-lg @xl:w-64">
          <p className="text-[11px] font-bold tracking-wider text-blue-100 uppercase">
            Điểm dự đoán LR
          </p>
          <p className="mt-1">
            <span className="text-4xl font-extrabold tracking-tight">{score}</span>
            <span className="text-sm font-medium text-blue-100"> / {max}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-highlight" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-blue-100">
            <span>Mục tiêu {target}</span>
            <span className="font-semibold text-white">{progress}%</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-highlight">
            <TrendingUp className="size-4" />+{weeklyDelta} điểm so với tuần trước
          </p>
        </div>
      </div>
    </section>
  );
}
