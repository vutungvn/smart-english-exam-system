import { Link } from 'react-router';
import {
  ChartColumn,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FileUp,
  Layers,
  ListChecks,
  UserRound,
} from 'lucide-react';
import { useMyBankCounts } from '@/features/question-bank/hooks/use-question-counts';
import { AppShell, type SidebarSlotProps } from '../shared/AppShell';
import { AppSidebar, type SidebarSection } from '../shared/AppSidebar';
import { AppTopbar } from '../shared/AppTopbar';

const SECTIONS: SidebarSection[] = [
  [
    { to: '/teacher/questions', label: 'Ngân hàng câu hỏi', icon: ListChecks },
    { to: '/teacher/question-groups', label: 'Nhóm câu hỏi', icon: Layers },
    { to: '/teacher/import', label: 'Nhập từ tệp', icon: FileUp },
    { to: '/teacher/exams', label: 'Đề thi', icon: FileText },
    { to: '/teacher/assessments', label: 'Chấm lại bài', icon: ClipboardCheck },
    { to: '/teacher/assessments/agreement', label: 'Độ lệch AI chấm', icon: ChartColumn },
  ],
  [{ to: '/teacher/profile', label: 'Hồ sơ cá nhân', icon: UserRound }],
];

// Khung khu vực giáo viên `/teacher/*`
export function TeacherLayout() {
  return (
    <AppShell
      ariaLabel="Menu giáo viên"
      renderSidebar={(props) => <TeacherSidebar {...props} />}
      renderTopbar={(onOpenSidebar) => (
        <AppTopbar
          homePath="/teacher"
          searchPlaceholder="Tìm câu hỏi, nhóm câu…"
          onOpenSidebar={onOpenSidebar}
        />
      )}
    />
  );
}

function TeacherSidebar(props: SidebarSlotProps) {
  return (
    <AppSidebar
      {...props}
      homePath="/teacher"
      subtitle="Khu vực giáo viên"
      ariaLabel="Khu vực giáo viên"
      sections={SECTIONS}
      footer={<MyBankCard onNavigate={props.onNavigate} />}
    />
  );
}

function MyBankCard({ onNavigate }: { onNavigate?: () => void }) {
  const { questions, groups } = useMyBankCounts();

  return (
    <div className="rounded-2xl border border-primary/20 bg-accent p-4">
      <p className="text-xs font-bold tracking-wider text-brand uppercase">Ngân hàng của bạn</p>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: 'Câu hỏi', value: questions },
          { label: 'Nhóm câu', value: groups },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white px-3 py-2">
            <dt className="text-[11px] text-subtle">{label}</dt>
            <dd className="text-lg font-bold text-foreground">{value ?? '–'}</dd>
          </div>
        ))}
      </dl>
      <Link
        to="/teacher/questions/new"
        onClick={onNavigate}
        className="mt-3 flex items-center justify-between text-xs font-semibold text-brand hover:underline"
      >
        Tạo câu hỏi mới
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
