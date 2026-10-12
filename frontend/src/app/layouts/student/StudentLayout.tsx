import { AppShell } from '../shared/AppShell';
import { AppTopbar } from '../shared/AppTopbar';
import { AiAssistantFab } from './AiAssistantFab';
import { StudentSidebar } from './StudentSidebar';

// Khung khu vực học viên `/app/*`
export function StudentLayout() {
  return (
    <AppShell
      ariaLabel="Menu học viên"
      renderSidebar={(props) => <StudentSidebar {...props} />}
      renderTopbar={(onOpenSidebar) => (
        <AppTopbar
          homePath="/app"
          searchPlaceholder="Tìm khóa học, đề thi..."
          onOpenSidebar={onOpenSidebar}
        />
      )}
      // pb chừa chỗ cho nút trợ giảng AI nổi ở góc dưới
      mainClassName="pb-28"
    >
      <AiAssistantFab />
    </AppShell>
  );
}
