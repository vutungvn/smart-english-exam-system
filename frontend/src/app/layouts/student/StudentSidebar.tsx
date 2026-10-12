import { Link } from 'react-router';
import {
  BookOpen,
  Bot,
  BrainCircuit,
  ChartNoAxesColumn,
  ChevronRight,
  CircleCheck,
  FileText,
  House,
  Layers,
} from 'lucide-react';
import { useGetProfileQuery } from '@/api/generated';
import { AppSidebar, type SidebarSection } from '../shared/AppSidebar';
import type { SidebarSlotProps } from '../shared/AppShell';

// TẠM: badge "24" là dữ liệu mẫu, lấy từ API flashcard khi có
const SECTIONS: SidebarSection[] = [
  [
    { to: '/app', label: 'Trang chủ', icon: House, end: true },
    { to: '/app/courses', label: 'Khóa học của tôi', icon: BookOpen },
    { to: '/app/exams', label: 'Luyện đề thi', icon: FileText },
    { to: '/app/results', label: 'Kết quả & xem lại', icon: CircleCheck },
    { to: '/app/progress', label: 'Tiến độ học tập', icon: ChartNoAxesColumn },
    { to: '/app/ai-analysis', label: 'Phân tích AI', icon: BrainCircuit },
    { to: '/app/assistant', label: 'Trợ giảng AI', icon: Bot, badge: 'AI', badgeTone: 'ai' },
    { to: '/app/flashcards', label: 'Flashcard', icon: Layers, badge: '24' },
  ],
];

export function StudentSidebar(props: SidebarSlotProps) {
  return (
    <AppSidebar
      {...props}
      homePath="/app"
      ariaLabel="Khu vực học viên"
      sections={SECTIONS}
      footer={<TargetScoreCard onNavigate={props.onNavigate} />}
    />
  );
}

function TargetScoreCard({ onNavigate }: { onNavigate?: () => void }) {
  // Dùng chung cache với trang Hồ sơ: lưu mục tiêu xong (tag Me) thì thẻ này cập nhật theo
  const { data } = useGetProfileQuery();
  const targetScore = data?.data.student?.targetScore ?? null;
  const currentScore = data?.data.student?.currentScore ?? null;
  const progress =
    targetScore && currentScore !== null
      ? Math.min(100, Math.round((currentScore / targetScore) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-primary/20 bg-accent p-4">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="tracking-wider text-brand uppercase">Mục tiêu của bạn</span>
        <span className="text-sm text-primary">
          {targetScore ? `${targetScore}+ điểm` : 'Chưa đặt'}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <Link
        to="/app/profile"
        onClick={onNavigate}
        className="mt-3 flex items-center justify-between text-xs font-semibold text-brand hover:underline"
      >
        {targetScore ? 'Chỉnh mục tiêu' : 'Đặt mục tiêu ngay'}
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
