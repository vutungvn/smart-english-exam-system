import { useState } from 'react';
import { Link } from 'react-router';
import { Minus, Play, TrendingDown, TrendingUp } from 'lucide-react';
import type { ProgressOverview, ScoreTrend } from '@/api/generated';
import { BrandPattern } from '@/components/brand/BrandPattern';
import { formatPercent, PROFILE_PATH, PROGRESS_PATH } from '@/features/progress/progress-meta';
import { PRACTICE_PATH } from '@/features/practice/practice-meta';
import { toeicSummary } from '../dashboard-progress';

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

interface WelcomeCardProps {
  fullName?: string;
  /** undefined khi đang tải */
  trend?: ScoreTrend;
  overview?: ProgressOverview;
  /** Không tải được số liệu: ẩn ô điểm thay vì để khung chờ mãi */
  failed?: boolean;
}

export function WelcomeCard({ fullName, trend, overview, failed }: WelcomeCardProps) {
  // Tính một lần khi mở trang, không đổi theo từng lần render
  const [greeting] = useState(getGreeting);
  const target = trend?.targetScore ?? null;

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
            {target ? (
              `Cùng tiến gần hơn tới mục tiêu ${target} điểm hôm nay nhé!`
            ) : (
              <>
                Đặt điểm mục tiêu để theo dõi tiến độ.{' '}
                <Link
                  to={PROFILE_PATH}
                  className="font-semibold text-white underline underline-offset-4"
                >
                  Đặt mục tiêu
                </Link>
              </>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={PRACTICE_PATH}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-brand shadow-lg shadow-black/10 transition hover:bg-blue-50"
            >
              <Play className="size-4 fill-current" />
              Làm bài thi thử
            </Link>
            <Link
              to={PROGRESS_PATH}
              className="inline-flex h-11 items-center rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold transition hover:bg-white/20"
            >
              Xem tiến độ
            </Link>
          </div>
        </div>

        {!failed && <ScoreBox trend={trend} overview={overview} target={target} />}
      </div>
    </section>
  );
}

/**
 * Có bài TOEIC LR: điểm gần nhất, tiến độ tới mục tiêu, tăng giảm so với lần trước. Chưa có (chỉ làm
 * đề luyện tập): tỉ lệ câu trắc nghiệm đúng. Chưa nộp bài nào: lời nhắc.
 */
function ScoreBox({
  trend,
  overview,
  target,
}: {
  trend?: ScoreTrend;
  overview?: ProgressOverview;
  target: number | null;
}) {
  const box =
    'w-full shrink-0 rounded-2xl border border-white/22 bg-white/12 p-5 backdrop-blur-lg @xl:w-64';
  if (!trend || !overview) {
    return <div aria-busy className={`${box} h-40 animate-pulse`} />;
  }

  const { latest, previous } = toeicSummary(trend.points);
  if (latest?.scaledScore != null) {
    const score = latest.scaledScore;
    const delta = previous?.scaledScore != null ? score - previous.scaledScore : null;
    const progress = target ? Math.min(100, Math.round((score / target) * 100)) : null;
    const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
    return (
      <div className={box}>
        <p className="text-[11px] font-bold tracking-wider text-blue-100 uppercase">
          Điểm TOEIC LR gần nhất
        </p>
        <p className="mt-1">
          <span className="text-4xl font-extrabold tracking-tight">{score}</span>
          <span className="text-sm font-medium text-blue-100"> / 990</span>
        </p>
        {progress !== null && (
          <>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-highlight" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-blue-100">
              <span>Mục tiêu {target}</span>
              <span className="font-semibold text-white">{progress}%</span>
            </div>
          </>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-highlight">
          <DeltaIcon className="size-4" />
          {delta === null
            ? 'Lần đầu làm đề TOEIC LR'
            : `${delta > 0 ? '+' : ''}${delta} điểm so với lần trước`}
        </p>
      </div>
    );
  }

  return (
    <div className={box}>
      <p className="text-[11px] font-bold tracking-wider text-blue-100 uppercase">
        Tỉ lệ đúng trắc nghiệm
      </p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">
        {formatPercent(overview.accuracy)}
      </p>
      <p className="mt-2 text-xs text-blue-100">
        {overview.submittedCount === 0
          ? 'Nộp bài đầu tiên để bắt đầu theo dõi tiến độ.'
          : `${overview.choiceCorrect}/${overview.choiceTotal} câu đúng qua ${overview.submittedCount} bài. Làm một đề TOEIC LR đầy đủ để có điểm quy đổi.`}
      </p>
    </div>
  );
}
