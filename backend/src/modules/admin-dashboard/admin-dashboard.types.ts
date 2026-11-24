import { ApiProperty } from '@nestjs/swagger';
import { DASHBOARD_GRANULARITIES } from './dashboard-range.js';
import type { DashboardGranularity } from './dashboard-range.js';

// Khai báo class con trước class cha vì decorator của class cha tham chiếu tới chúng

export class DashboardRangeInfo {
  @ApiProperty({ format: 'date', example: '2026-10-26' })
  from: string;

  @ApiProperty({ format: 'date', example: '2026-11-24' })
  to: string;
}

export class DashboardUsersByRole {
  @ApiProperty({ example: 120 })
  STUDENT: number;

  @ApiProperty({ example: 8 })
  TEACHER: number;

  @ApiProperty({ example: 1 })
  ADMIN: number;
}

export class DashboardUserStats {
  @ApiProperty({ description: 'Tổng số tài khoản hiện có', example: 129 })
  total: number;

  @ApiProperty({ type: DashboardUsersByRole })
  byRole: DashboardUsersByRole;

  @ApiProperty({ description: 'Tài khoản tạo trong kỳ', example: 15 })
  newInRange: number;

  @ApiProperty({ description: 'Tài khoản đang bị khóa', example: 2 })
  locked: number;

  @ApiProperty({ description: 'Giáo viên chờ admin duyệt', example: 3 })
  pendingApproval: number;
}

export class DashboardExamStats {
  @ApiProperty({ example: 12 })
  published: number;

  @ApiProperty({ example: 4 })
  draft: number;

  @ApiProperty({ example: 1 })
  unpublished: number;
}

export class DashboardQuestionStats {
  @ApiProperty({ description: 'Câu hỏi chưa bị xóa', example: 850 })
  total: number;

  @ApiProperty({ description: 'Câu hỏi đang dùng (ACTIVE)', example: 800 })
  active: number;
}

export class DashboardContentStats {
  @ApiProperty({ type: DashboardExamStats, description: 'Đề thi chưa bị xóa theo trạng thái' })
  exams: DashboardExamStats;

  @ApiProperty({ type: DashboardQuestionStats })
  questions: DashboardQuestionStats;
}

export class DashboardAttemptStats {
  @ApiProperty({
    description: 'Lượt bắt đầu làm bài trong kỳ, tính cả lượt đã hủy',
    example: 340,
  })
  started: number;

  @ApiProperty({ description: 'Trong số đó, lượt đã nộp bài', example: 290 })
  completed: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'completed / started (%): lượt hủy hoặc đang làm dở kéo tỉ lệ xuống; null khi chưa có lượt nào',
    example: 85.3,
  })
  completionRate: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Điểm TB thang 990 của lượt làm cả đề TOEIC LR nộp trong kỳ; null khi chưa có lượt nào',
    example: 615,
  })
  averageToeicScore: number | null;
}

export class DashboardAiStats {
  @ApiProperty({ description: 'Lượt gọi AI trong kỳ', example: 520 })
  calls: number;

  @ApiProperty({ description: 'Lượt lỗi hoặc AI trả sai định dạng', example: 12 })
  failed: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'failed / calls (%), null khi chưa có lượt nào',
    example: 2.3,
  })
  failureRate: number | null;

  @ApiProperty({ example: 1_250_000 })
  inputTokens: number;

  @ApiProperty({ example: 340_000 })
  outputTokens: number;
}

export class DashboardAccessStats {
  @ApiProperty({ description: 'Lượt đăng nhập thành công trong kỳ', example: 1_024 })
  logins: number;

  @ApiProperty({ description: 'Số tài khoản có đăng nhập trong kỳ', example: 98 })
  activeUsers: number;
}

// GET /admin/dashboard/overview
export class DashboardOverview {
  @ApiProperty({ type: DashboardRangeInfo })
  range: DashboardRangeInfo;

  @ApiProperty({ format: 'date-time', description: 'Thời điểm tổng hợp (có thể lấy từ cache)' })
  generatedAt: string;

  @ApiProperty({ type: DashboardUserStats })
  users: DashboardUserStats;

  @ApiProperty({ type: DashboardContentStats })
  content: DashboardContentStats;

  @ApiProperty({ type: DashboardAttemptStats })
  attempts: DashboardAttemptStats;

  @ApiProperty({ type: DashboardAiStats })
  ai: DashboardAiStats;

  @ApiProperty({ type: DashboardAccessStats })
  access: DashboardAccessStats;
}

export class DashboardTrendPoint {
  @ApiProperty({
    format: 'date',
    description: 'Ngày đầu mốc: chính ngày đó, hoặc thứ Hai của tuần',
    example: '2026-11-23',
  })
  bucket: string;

  @ApiProperty({ example: 4 })
  newUsers: number;

  @ApiProperty({ description: 'Lượt bắt đầu làm bài, tính cả lượt đã hủy', example: 21 })
  attempts: number;

  @ApiProperty({ example: 35 })
  aiCalls: number;

  @ApiProperty({ description: 'Lượt đăng nhập thành công', example: 60 })
  logins: number;
}

// GET /admin/dashboard/trends
export class DashboardTrends {
  @ApiProperty({ type: DashboardRangeInfo })
  range: DashboardRangeInfo;

  @ApiProperty({ enum: DASHBOARD_GRANULARITIES, enumName: 'DashboardGranularity' })
  granularity: DashboardGranularity;

  @ApiProperty({ format: 'date-time' })
  generatedAt: string;

  @ApiProperty({ type: [DashboardTrendPoint], description: 'Tăng dần, đủ mọi mốc trong kỳ' })
  points: DashboardTrendPoint[];
}

// POST /admin/dashboard/refresh
export class DashboardRefreshResult {
  @ApiProperty({ format: 'date-time' })
  refreshedAt: string;
}
