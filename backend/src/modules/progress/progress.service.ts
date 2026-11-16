import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/types/auth-user.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AttemptMode, AttemptStatus, ScoringScale, Skill } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { resultSelect, toResult } from '../attempts/attempt-submission.service.js';
import type { AttemptResult } from '../attempts/attempts.types.js';
import { findPartRule } from '../questions/toeic-parts.js';
import type { ProgressSkillsQueryDto, ScoreTrendQueryDto } from './dto/progress-query.dto.js';
import {
  MIN_TOPIC_QUESTIONS,
  partStats,
  percentOf,
  sinceOf,
  skillStats,
  totalStat,
  WEAK_ACCURACY,
  weakTopics,
  type ScopeRow,
  type TopicInfo,
} from './progress-stats.js';
import type { ProgressSkills, ScoreTrend, ScoreTrendPoint } from './progress.types.js';

const SUBMITTED = [AttemptStatus.SUBMITTED, AttemptStatus.GRADED];
/** Biểu đồ không cần nhiều hơn: lấy 200 bài gần nhất trong khoảng */
const TREND_LIMIT = 200;

const trendSelect = {
  ...resultSelect,
  exam: { select: { id: true, title: true, scoringScale: true, durationMinutes: true } },
  section: { select: { id: true, skill: true, part: true } },
} satisfies Prisma.ExamAttemptSelect;

/**
 * Tiến độ học tập (Thiet_ke_API Mục 3.9, SPRINT-53): điểm theo thời gian và năng lực theo kỹ năng,
 * Part, chủ đề, tính từ các bài đã nộp của chính học viên. Điểm yếu xác định bằng số liệu (AI ở
 * Sprint 5 chỉ diễn giải dựa trên các con số này).
 */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async scoreTrend(query: ScoreTrendQueryDto, user: AuthUser): Promise<ScoreTrend> {
    const from = sinceOf(query.range, new Date());
    // Chỉ mục ix_exam_attempts_student_submitted (student_id, submitted_at DESC)
    const [rows, student] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where: {
          studentId: user.id,
          status: { in: SUBMITTED },
          submittedAt: from ? { gte: from } : undefined,
        },
        orderBy: { submittedAt: 'desc' },
        take: TREND_LIMIT,
        select: trendSelect,
      }),
      this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { targetScore: true },
      }),
    ]);

    const points = rows.reverse().map((row): ScoreTrendPoint => {
      const result = toResult(row) as AttemptResult;
      const choiceTotal = result.correctCount + result.wrongCount + result.skippedCount;
      return {
        attemptId: row.id,
        submittedAt: result.submittedAt,
        mode: row.mode,
        exam: row.exam,
        section: row.section && {
          ...row.section,
          name:
            findPartRule(row.section.skill, row.section.part)?.name ?? `Part ${row.section.part}`,
        },
        scoring: result.scoring,
        scaledScore: result.scaledScore,
        choicePercent: percentOf(result.correctCount, choiceTotal),
        correctCount: result.correctCount,
        choiceTotal,
        skillScores: result.skillScores,
      };
    });

    return { range: query.range, from, targetScore: student?.targetScore ?? null, points };
  }

  async skills(query: ProgressSkillsQueryDto, user: AuthUser): Promise<ProgressSkills> {
    const from = sinceOf(query.range, new Date());
    const [rows, attempts] = await Promise.all([
      this.scopeRows(user.id, from),
      this.prisma.examAttempt.findMany({
        where: {
          studentId: user.id,
          status: { in: SUBMITTED },
          submittedAt: from ? { gte: from } : undefined,
        },
        orderBy: { submittedAt: 'desc' },
        select: {
          mode: true,
          status: true,
          submittedAt: true,
          scaledScore: true,
          exam: { select: { scoringScale: true } },
        },
      }),
    ]);

    const topicIds = [...new Set(rows.map((row) => row.topicId))];
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true, name: true, skill: true, parts: true },
    });
    const topicMap = new Map<string, TopicInfo>(topics.map((topic) => [topic.id, topic]));

    // Điểm TOEIC LR chỉ có ở bài làm cả đề TOEIC LR đã chấm xong (mới nhất trước)
    const toeic = attempts
      .filter(
        (a) =>
          a.mode === AttemptMode.FULL &&
          a.exam.scoringScale === ScoringScale.TOEIC_990 &&
          a.status === AttemptStatus.GRADED &&
          a.scaledScore !== null,
      )
      .map((a) => Number(a.scaledScore));
    const total = totalStat(rows);

    return {
      range: query.range,
      from,
      overview: {
        submittedCount: attempts.length,
        fullCount: attempts.filter((a) => a.mode === AttemptMode.FULL).length,
        partCount: attempts.filter((a) => a.mode === AttemptMode.PART).length,
        choiceTotal: total.total,
        choiceCorrect: total.correct,
        accuracy: total.accuracy,
        lastSubmittedAt: attempts[0]?.submittedAt ?? null,
        bestToeicScore: toeic.length ? Math.max(...toeic) : null,
        latestToeicScore: toeic[0] ?? null,
      },
      skills: skillStats(rows),
      parts: partStats(rows),
      weakTopics: weakTopics(rows, topicMap),
      minTopicQuestions: MIN_TOPIC_QUESTIONS,
      weakAccuracy: WEAK_ACCURACY,
    };
  }

  /**
   * Mọi câu trắc nghiệm trong phạm vi các bài đã nộp (cả đề, hoặc chỉ Part đã luyện), gộp theo
   * kỹ năng – Part – chủ đề. Câu bỏ trống không có dòng attempt_answers nên phải đi từ đề
   * (exam_questions) rồi LEFT JOIN câu trả lời; is_correct ghi lúc chấm bài
   */
  private async scopeRows(studentId: string, from: Date | null): Promise<ScopeRow[]> {
    const rows = await this.prisma.$queryRaw<
      {
        skill: Skill;
        part: number;
        topic_id: string;
        total: bigint;
        correct: bigint;
        wrong: bigint;
      }[]
    >`
      SELECT q.skill, q.part, q.topic_id,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE aa.is_correct = TRUE) AS correct,
             COUNT(*) FILTER (WHERE aa.is_correct = FALSE) AS wrong
      FROM exam_attempts a
      JOIN exam_sections s ON s.exam_id = a.exam_id AND (a.section_id IS NULL OR s.id = a.section_id)
      JOIN exam_questions eq ON eq.section_id = s.id
      JOIN questions q ON q.id = eq.question_id
      LEFT JOIN attempt_answers aa ON aa.attempt_id = a.id AND aa.exam_question_id = eq.id
      WHERE a.student_id = ${studentId}::uuid
        AND a.status IN ('SUBMITTED', 'GRADED')
        AND q.type = 'SINGLE_CHOICE'
        ${from ? Prisma.sql`AND a.submitted_at >= ${from}` : Prisma.empty}
      GROUP BY q.skill, q.part, q.topic_id`;

    return rows.map((row) => ({
      skill: row.skill,
      part: Number(row.part),
      topicId: row.topic_id,
      total: Number(row.total),
      correct: Number(row.correct),
      wrong: Number(row.wrong),
    }));
  }
}
