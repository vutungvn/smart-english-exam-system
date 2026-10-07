import { useAppSelector } from '@/hooks/hooks';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { ActiveCoursesCard } from './components/ActiveCoursesCard';
import { AiSuggestionsCard } from './components/AiSuggestionsCard';
import { FlashcardTodayCard } from './components/FlashcardTodayCard';
import { InProgressExamCard } from './components/InProgressExamCard';
import { ScoreProgressChart } from './components/ScoreProgressChart';
import { SkillScoreCards } from './components/SkillScoreCards';
import { WelcomeCard } from './components/WelcomeCard';

// Cột phải cố định 360px từ xl (≥ 1280px); nhỏ hơn thì các khối xếp dọc
const ROW = 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]';

// Trang chủ học viên `/app` (theo Stitch, màn "Trang chủ học viên")
export function StudentDashboardPage() {
  const user = useAppSelector(selectCurrentUser);

  return (
    <div className="space-y-6">
      <title>Trang chủ – Smart English Exam</title>
      <div className={ROW}>
        <WelcomeCard fullName={user?.fullName} />
        <InProgressExamCard />
      </div>
      <SkillScoreCards />
      <div className={ROW}>
        <ScoreProgressChart />
        <AiSuggestionsCard />
      </div>
      <div className={ROW}>
        <ActiveCoursesCard />
        <FlashcardTodayCard />
      </div>
    </div>
  );
}
