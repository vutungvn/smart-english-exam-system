import { ClipboardCheck, FileText, Sparkles, TriangleAlert, Users } from 'lucide-react';
import type { DashboardOverview, DashboardUsersByRole } from '@/api/generated';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercent } from '../dashboard-meta';
import { StatCard, StatCardSkeleton, StatRow } from './StatCard';

/**
 * Màu từng vai trò trên thanh tỉ lệ. Thứ tự đoạn cố định để xanh và tím không đứng cạnh nhau
 * (người mù màu đỏ khó phân biệt, đã kiểm tra bằng validate_palette của skill dataviz); hổ phách
 * tương phản thấp với nền trắng nên luôn kèm nhãn và số ở chú thích bên dưới
 */
const ROLE_SEGMENTS: { role: keyof DashboardUsersByRole; label: string; color: string }[] = [
  { role: 'STUDENT', label: 'Học viên', color: '#4263eb' },
  { role: 'ADMIN', label: 'Quản trị viên', color: '#f59e0b' },
  { role: 'TEACHER', label: 'Giáo viên', color: '#a855f7' },
];

/** Tỉ lệ lỗi AI vượt mức này thì đánh dấu cảnh báo */
const AI_FAILURE_WARN = 5;

export function DashboardStatCards({ overview }: { overview: DashboardOverview }) {
  const { users, attempts, content, ai, access } = overview;
  const aiWarning = (ai.failureRate ?? 0) > AI_FAILURE_WARN;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Người dùng"
        icon={Users}
        tone="bg-accent text-primary"
        value={formatNumber(users.total)}
        caption={`+${formatNumber(users.newInRange)} tài khoản mới trong kỳ`}
      >
        <RoleBar byRole={users.byRole} total={users.total} />
        <StatRow
          label="Đăng nhập trong kỳ"
          value={`${formatNumber(access.activeUsers)} người · ${formatNumber(access.logins)} lượt`}
        />
        {users.locked > 0 && <StatRow label="Đang bị khóa" value={formatNumber(users.locked)} />}
      </StatCard>

      <StatCard
        title="Lượt làm bài"
        icon={ClipboardCheck}
        tone="bg-emerald-50 text-emerald-600"
        value={formatNumber(attempts.started)}
        caption="lượt bắt đầu trong kỳ"
      >
        <StatRow label="Đã nộp bài" value={formatNumber(attempts.completed)} />
        <StatRow label="Tỉ lệ hoàn thành" value={formatPercent(attempts.completionRate)} />
        <StatRow
          label="Điểm TB TOEIC LR"
          value={
            attempts.averageToeicScore === null ? 'Chưa có' : `${attempts.averageToeicScore}/990`
          }
        />
      </StatCard>

      <StatCard
        title="Đề thi & câu hỏi"
        icon={FileText}
        tone="bg-violet-50 text-violet-600"
        value={formatNumber(content.exams.published)}
        caption="đề thi đang xuất bản"
      >
        <StatRow label="Đề nháp" value={formatNumber(content.exams.draft)} />
        <StatRow label="Đề đã gỡ xuất bản" value={formatNumber(content.exams.unpublished)} />
        <StatRow
          label="Câu hỏi đang dùng"
          value={`${formatNumber(content.questions.active)}/${formatNumber(content.questions.total)}`}
        />
      </StatCard>

      <StatCard
        title="Lượt gọi AI"
        icon={Sparkles}
        tone="bg-amber-50 text-amber-600"
        value={formatNumber(ai.calls)}
        caption="lượt trong kỳ"
      >
        <StatRow
          label={
            <span className={cn('flex items-center gap-1.5', aiWarning && 'text-destructive')}>
              {aiWarning && <TriangleAlert className="size-3.5" aria-hidden />}
              {aiWarning ? 'Lỗi (cao)' : 'Lỗi'}
            </span>
          }
          value={`${formatNumber(ai.failed)} (${formatPercent(ai.failureRate)})`}
        />
        <StatRow label="Token đầu vào" value={formatNumber(ai.inputTokens)} />
        <StatRow label="Token đầu ra" value={formatNumber(ai.outputTokens)} />
      </StatCard>
    </div>
  );
}

/** Thanh tỉ lệ người dùng theo vai trò, chú thích có nhãn và số (không dựa riêng vào màu) */
function RoleBar({ byRole, total }: { byRole: DashboardUsersByRole; total: number }) {
  const segments = ROLE_SEGMENTS.filter(({ role }) => byRole[role] > 0);
  return (
    <div className="space-y-2">
      {total > 0 && (
        <div
          role="img"
          aria-label={ROLE_SEGMENTS.map(({ role, label }) => `${label} ${byRole[role]}`).join(', ')}
          // Khoảng hở 2px giữa các đoạn để các màu không dính vào nhau
          className="flex h-2 gap-0.5"
        >
          {segments.map(({ role, color }) => (
            <span
              key={role}
              className="min-w-1 rounded-full"
              style={{ flexGrow: byRole[role], backgroundColor: color }}
            />
          ))}
        </div>
      )}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {ROLE_SEGMENTS.map(({ role, label, color }) => (
          <li key={role} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(byRole[role])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardStatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}
