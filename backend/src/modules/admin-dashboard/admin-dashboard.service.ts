import { Injectable } from '@nestjs/common';
import { RoleCode } from '../../common/constants/roles.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AiCallStatus,
  AttemptMode,
  AttemptStatus,
  ExamStatus,
  QuestionStatus,
  ScoringScale,
  UserStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RedisService } from '../../infra/redis/redis.service.js';
import { percentOf } from '../progress/progress-stats.js';
import type {
  DashboardOverview,
  DashboardRefreshResult,
  DashboardTrends,
} from './admin-dashboard.types.js';
import {
  bucketKeys,
  DASHBOARD_CACHE_PREFIX,
  DASHBOARD_CACHE_TTL_SECONDS,
  dashboardCacheKeys,
  fillBuckets,
  resolveRange,
} from './dashboard-range.js';
import type { BucketCount, DashboardGranularity, DashboardRange } from './dashboard-range.js';
import type { DashboardRangeDto, DashboardTrendsQueryDto } from './dto/dashboard-query.dto.js';

// Đơn vị date_trunc ghi thẳng vào SQL (đã qua whitelist ở DTO). Không truyền làm tham số: cùng một
// biểu thức thành 2 placeholder khác nhau thì Postgres không coi là một khi GROUP BY
const TRUNC_UNIT: Record<DashboardGranularity, Prisma.Sql> = {
  day: Prisma.sql`'day'`,
  week: Prisma.sql`'week'`,
};

/** Bảng, cột thời gian và điều kiện thêm của một chuỗi số liệu trên biểu đồ */
interface TrendSource {
  table: Prisma.Sql;
  column: Prisma.Sql;
  where?: Prisma.Sql;
}

const TREND_SOURCES = {
  newUsers: { table: Prisma.sql`users`, column: Prisma.sql`created_at` },
  // Khớp attempts.started của overview: tính cả lượt đã hủy
  attempts: { table: Prisma.sql`exam_attempts`, column: Prisma.sql`started_at` },
  aiCalls: { table: Prisma.sql`ai_usage_logs`, column: Prisma.sql`created_at` },
  logins: {
    table: Prisma.sql`login_histories`,
    column: Prisma.sql`created_at`,
    where: Prisma.sql`AND success`,
  },
} satisfies Record<string, TrendSource>;

const ROLE_CODES = Object.values(RoleCode);

/**
 * Thống kê tổng quan cho admin (UC "Xem bảng điều khiển thống kê tổng quan"). Kết quả lưu Redis
 * theo kỳ xem, nút Làm mới xóa cache để tính lại.
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  overview(query: DashboardRangeDto): Promise<DashboardOverview> {
    const range = resolveRange(query, new Date());
    return this.cached(dashboardCacheKeys.overview(range), () => this.computeOverview(range));
  }

  trends(query: DashboardTrendsQueryDto): Promise<DashboardTrends> {
    const range = resolveRange(query, new Date());
    const unit = query.granularity;
    return this.cached(dashboardCacheKeys.trends(range, unit), () =>
      this.computeTrends(range, unit),
    );
  }

  /** Xóa mọi số liệu đã lưu; lần gọi overview/trends kế tiếp sẽ tính lại từ DB */
  async refresh(): Promise<DashboardRefreshResult> {
    // SCAN thay cho KEYS để không chặn Redis khi có nhiều key
    const stream = this.redis.scanStream({ match: `${DASHBOARD_CACHE_PREFIX}*`, count: 100 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await this.redis.del(...keys);
    }
    return { refreshedAt: new Date().toISOString() };
  }

  private async cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const value = await compute();
    await this.redis.set(key, JSON.stringify(value), 'EX', DASHBOARD_CACHE_TTL_SECONDS);
    return value;
  }

  private async computeOverview(range: DashboardRange): Promise<DashboardOverview> {
    const inRange = { gte: range.start, lt: range.endExclusive };
    const [
      roles,
      usersByRole,
      newUsers,
      lockedUsers,
      pendingTeachers,
      examsByStatus,
      questionTotal,
      questionActive,
      attemptsStarted,
      attemptsCompleted,
      toeicScore,
      aiByStatus,
      logins,
      activeUsers,
    ] = await Promise.all([
      this.prisma.role.findMany({ select: { id: true, code: true } }),
      this.prisma.user.groupBy({ by: ['roleId'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: inRange } }),
      this.prisma.user.count({ where: { status: UserStatus.LOCKED } }),
      this.prisma.user.count({ where: { status: UserStatus.PENDING_APPROVAL } }),
      // exams, questions xóa mềm nhưng không có extension tự lọc: phải ghi deletedAt: null
      this.prisma.exam.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.question.count({ where: { deletedAt: null } }),
      this.prisma.question.count({ where: { deletedAt: null, status: QuestionStatus.ACTIVE } }),
      // Tính cả lượt đã hủy: tỉ lệ hoàn thành phải phản ánh việc học viên bỏ dở bài
      this.prisma.examAttempt.count({ where: { startedAt: inRange } }),
      this.prisma.examAttempt.count({
        where: {
          startedAt: inRange,
          status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
        },
      }),
      // Chỉ thang 990 (TOEIC LR làm cả đề): trộn với thang % hay SW thì số trung bình vô nghĩa
      this.prisma.examAttempt.aggregate({
        where: {
          mode: AttemptMode.FULL,
          submittedAt: inRange,
          scaledScore: { not: null },
          exam: { scoringScale: ScoringScale.TOEIC_990 },
        },
        _avg: { scaledScore: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['status'],
        where: { createdAt: inRange },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.loginHistory.count({ where: { success: true, createdAt: inRange } }),
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT user_id)::int AS count
        FROM login_histories
        WHERE success AND created_at >= ${range.start} AND created_at < ${range.endExclusive}`,
    ]);

    const roleCodeById = new Map(roles.map((role) => [role.id, role.code]));
    const byRole = Object.fromEntries(ROLE_CODES.map((code) => [code, 0])) as Record<
      RoleCode,
      number
    >;
    let totalUsers = 0;
    for (const group of usersByRole) {
      totalUsers += group._count._all;
      const code = roleCodeById.get(group.roleId) as RoleCode | undefined;
      if (code && code in byRole) byRole[code] += group._count._all;
    }

    const examCount = (status: ExamStatus) =>
      examsByStatus.find((group) => group.status === status)?._count._all ?? 0;

    const aiCalls = aiByStatus.reduce((sum, group) => sum + group._count._all, 0);
    const aiFailed = aiByStatus
      .filter((group) => group.status !== AiCallStatus.SUCCESS)
      .reduce((sum, group) => sum + group._count._all, 0);
    const tokens = (key: 'inputTokens' | 'outputTokens') =>
      aiByStatus.reduce((sum, group) => sum + (group._sum[key] ?? 0), 0);

    const averageScore = toeicScore._avg.scaledScore;

    return {
      range: { from: range.from, to: range.to },
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        byRole,
        newInRange: newUsers,
        locked: lockedUsers,
        pendingApproval: pendingTeachers,
      },
      content: {
        exams: {
          published: examCount(ExamStatus.PUBLISHED),
          draft: examCount(ExamStatus.DRAFT),
          unpublished: examCount(ExamStatus.UNPUBLISHED),
        },
        questions: { total: questionTotal, active: questionActive },
      },
      attempts: {
        started: attemptsStarted,
        completed: attemptsCompleted,
        completionRate: percentOf(attemptsCompleted, attemptsStarted),
        averageToeicScore: averageScore === null ? null : Math.round(averageScore.toNumber()),
      },
      ai: {
        calls: aiCalls,
        failed: aiFailed,
        failureRate: percentOf(aiFailed, aiCalls),
        inputTokens: tokens('inputTokens'),
        outputTokens: tokens('outputTokens'),
      },
      access: { logins, activeUsers: activeUsers[0]?.count ?? 0 },
    };
  }

  private async computeTrends(
    range: DashboardRange,
    unit: DashboardGranularity,
  ): Promise<DashboardTrends> {
    const [newUsers, attempts, aiCalls, logins] = await Promise.all([
      this.countByBucket(TREND_SOURCES.newUsers, range, unit),
      this.countByBucket(TREND_SOURCES.attempts, range, unit),
      this.countByBucket(TREND_SOURCES.aiCalls, range, unit),
      this.countByBucket(TREND_SOURCES.logins, range, unit),
    ]);

    const keys = bucketKeys(range.from, range.to, unit);
    const series = {
      newUsers: fillBuckets(keys, newUsers),
      attempts: fillBuckets(keys, attempts),
      aiCalls: fillBuckets(keys, aiCalls),
      logins: fillBuckets(keys, logins),
    };

    return {
      range: { from: range.from, to: range.to },
      granularity: unit,
      generatedAt: new Date().toISOString(),
      points: keys.map((bucket, index) => ({
        bucket,
        newUsers: series.newUsers[index],
        attempts: series.attempts[index],
        aiCalls: series.aiCalls[index],
        logins: series.logins[index],
      })),
    };
  }

  /** Đếm bản ghi trong kỳ theo từng mốc ngày/tuần, mốc tính theo giờ Việt Nam */
  private countByBucket(
    { table, column, where = Prisma.empty }: TrendSource,
    range: DashboardRange,
    unit: DashboardGranularity,
  ): Promise<BucketCount[]> {
    // COUNT(*)::int để Prisma trả number thay vì BigInt
    return this.prisma.$queryRaw<BucketCount[]>`
      SELECT to_char(date_trunc(${TRUNC_UNIT[unit]}, ${column} AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') AS bucket,
             COUNT(*)::int AS count
      FROM ${table}
      WHERE ${column} >= ${range.start} AND ${column} < ${range.endExclusive} ${where}
      GROUP BY 1`;
  }
}
