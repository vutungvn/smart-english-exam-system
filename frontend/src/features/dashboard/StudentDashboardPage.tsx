import { useState } from 'react';
import { CloudOff } from 'lucide-react';
import { useGetProgressSkillsQuery, useGetScoreTrendQuery } from '@/api/generated';
import { ScoreTrendCard } from '@/features/progress/components/ScoreTrendCard';
import { WeakTopicsCard } from '@/features/progress/components/WeakTopicsCard';
import type { ProgressRange } from '@/features/progress/progress-meta';
import { useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { ActiveCoursesCard } from './components/ActiveCoursesCard';
import { FlashcardTodayCard } from './components/FlashcardTodayCard';
import { InProgressExamCard } from './components/InProgressExamCard';
import { SkillScoreCards } from './components/SkillScoreCards';
import { WelcomeCard } from './components/WelcomeCard';

// Cột phải cố định 360px từ xl (≥ 1280px); nhỏ hơn thì các khối xếp dọc
const ROW = 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]';
const CHART_RANGES: readonly ProgressRange[] = ['30d', '90d', 'all'];

/**
 * Trang chủ học viên `/app` (theo Stitch, màn "Trang chủ học viên"). Điểm, bài làm dở, biểu đồ,
 * gợi ý luyện tập lấy từ API tiến độ; khóa học, flashcard còn dữ liệu mẫu (chưa có chức năng)
 */
export function StudentDashboardPage() {
  const user = useAppSelector(selectCurrentUser);
  const [range, setRange] = useState<ProgressRange>('90d');
  // Toàn bộ thời gian: điểm gần nhất, điểm kỹ năng, chủ đề yếu không phụ thuộc khoảng của biểu đồ
  const trendQuery = useGetScoreTrendQuery('all');
  const skillsQuery = useGetProgressSkillsQuery('all');
  const trend = trendQuery.data?.data;
  const skills = skillsQuery.data?.data;
  const failed = (trendQuery.isError && !trend) || (skillsQuery.isError && !skills);

  return (
    <div className="space-y-6">
      <title>Trang chủ – Smart English Exam</title>
      {failed && (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
        >
          <CloudOff className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Không tải được số liệu tiến độ. Kiểm tra mạng rồi thử lại.
          </span>
          <button
            type="button"
            onClick={() => {
              void trendQuery.refetch();
              void skillsQuery.refetch();
            }}
            className="font-semibold underline-offset-4 hover:underline"
          >
            Thử lại
          </button>
        </p>
      )}
      <div className={ROW}>
        <WelcomeCard
          fullName={user?.fullName}
          trend={trend}
          overview={skills?.overview}
          failed={failed}
        />
        <InProgressExamCard />
      </div>
      {!failed && <SkillScoreCards trend={trend} skills={skills} />}
      <div className={ROW}>
        <ScoreTrendCard
          title="Tiến độ điểm số"
          description="Điểm qua các lần nộp bài"
          range={range}
          ranges={CHART_RANGES}
          onRangeChange={setRange}
          fill
        />
        {skills ? (
          <WeakTopicsCard data={skills} title="Gợi ý luyện tập" limit={3} />
        ) : (
          !failed && (
            <div
              aria-busy
              className="h-80 animate-pulse rounded-3xl border border-border bg-white"
            />
          )
        )}
      </div>
      <div className={ROW}>
        <ActiveCoursesCard />
        <FlashcardTodayCard />
      </div>
    </div>
  );
}
