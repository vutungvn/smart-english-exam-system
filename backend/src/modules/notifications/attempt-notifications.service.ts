import { Injectable, Logger } from '@nestjs/common';
import {
  AssessmentStatus,
  AttemptMode,
  AttemptStatus,
  Grader,
  NotificationType,
  Skill,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

const SKILL_LABELS: Record<Skill, string> = {
  [Skill.LISTENING]: 'Listening',
  [Skill.READING]: 'Reading',
  [Skill.SPEAKING]: 'Speaking',
  [Skill.WRITING]: 'Writing',
};

interface AttemptInfo {
  studentId: string;
  status: AttemptStatus;
  /** Tên đề, luyện theo Part thì kèm tên Part */
  name: string;
  /** "150 điểm", "80%"; null khi chưa có điểm */
  score: string | null;
}

/**
 * Soạn và gửi thông báo về bài làm (SPRINT-56): chấm xong, tự nộp khi hết giờ, có câu chấm lỗi.
 * Nội dung chỉ có tên đề và điểm, không chứa câu trả lời của học viên. Không bao giờ ném lỗi: việc
 * chính (chấm, nộp bài) đã xong, thông báo hỏng chỉ ghi log
 */
@Injectable()
export class AttemptNotificationsService {
  private readonly logger = new Logger(AttemptNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** AI chấm xong câu Speaking/Writing cuối cùng, bài làm vừa sang GRADED */
  graded(attemptId: string): Promise<void> {
    return this.safely(attemptId, async () => {
      const info = await this.load(attemptId);
      if (!info || info.status !== AttemptStatus.GRADED) return;
      await this.notifications.notify(info.studentId, {
        type: NotificationType.ATTEMPT_GRADED,
        title: 'Đã chấm xong bài làm',
        message: `${info.name}: ${info.score}. AI đã chấm xong phần Speaking/Writing.`,
        data: { attemptId },
      });
    });
  }

  /** Hệ thống tự nộp bài khi hết giờ (học viên không có mặt để thấy kết quả) */
  autoSubmitted(attemptId: string): Promise<void> {
    return this.safely(attemptId, async () => {
      const info = await this.load(attemptId);
      if (!info) return;
      const message =
        info.status === AttemptStatus.GRADED
          ? `${info.name}: ${info.score}.`
          : `${info.name}: AI đang chấm phần Speaking/Writing, bạn sẽ nhận thông báo khi có điểm.`;
      await this.notifications.notify(info.studentId, {
        type: NotificationType.ATTEMPT_AUTO_SUBMITTED,
        title: 'Hết giờ, hệ thống đã tự nộp bài',
        message,
        data: { attemptId },
      });
    });
  }

  /**
   * Một câu vừa chấm lỗi hẳn (hết số lần thử). Nhiều câu lỗi cùng bài chỉ báo một lần khi thông báo
   * trước chưa đọc
   */
  gradingFailed(attemptId: string): Promise<void> {
    return this.safely(attemptId, async () => {
      const info = await this.load(attemptId);
      if (!info || info.status !== AttemptStatus.SUBMITTED) return;
      const type = NotificationType.GRADING_FAILED;
      if (await this.notifications.hasUnread(info.studentId, type, attemptId)) return;
      const failed = await this.prisma.answerAssessment.count({
        where: {
          grader: Grader.AI,
          status: AssessmentStatus.FAILED,
          attemptAnswer: { attemptId },
        },
      });
      await this.notifications.notify(info.studentId, {
        type,
        title: 'Có câu AI chưa chấm được',
        message: `${info.name}: ${failed} câu chấm lỗi. Mở trang xem lại để bấm "Chấm lại".`,
        data: { attemptId },
      });
    });
  }

  /** Giáo viên chấm lại một câu (SPRINT-91): điểm câu và điểm bài sau khi tính lại */
  teacherReviewed(
    attemptId: string,
    question: { skill: Skill; part: number; score: number; maxScore: number },
  ): Promise<void> {
    return this.safely(attemptId, async () => {
      const info = await this.load(attemptId);
      if (!info) return;
      const total = info.score ? ` Điểm bài: ${info.score}.` : '';
      await this.notifications.notify(info.studentId, {
        type: NotificationType.TEACHER_REVIEWED,
        title: 'Giáo viên đã chấm lại bài làm',
        message:
          `${info.name}: câu ${SKILL_LABELS[question.skill]} Part ${question.part} được ` +
          `${question.score}/${question.maxScore} điểm.${total}`,
        data: { attemptId },
      });
    });
  }

  private async safely(attemptId: string, send: () => Promise<void>): Promise<void> {
    try {
      await send();
    } catch (error) {
      this.logger.error(
        `Không gửi được thông báo bài làm ${attemptId}: ${(error as Error).message}`,
      );
    }
  }

  private async load(attemptId: string): Promise<AttemptInfo | null> {
    const row = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        studentId: true,
        status: true,
        mode: true,
        scaledScore: true,
        exam: { select: { title: true } },
        section: { select: { skill: true, part: true } },
      },
    });
    if (!row) return null;
    const part = row.section
      ? ` (${SKILL_LABELS[row.section.skill]} Part ${row.section.part})`
      : '';
    const score = row.scaledScore === null ? null : Number(row.scaledScore);
    return {
      studentId: row.studentId,
      status: row.status,
      name: row.exam.title + part,
      // Lượt không phải thi trọn đề tính theo phần trăm (PercentStrategy)
      score: score === null ? null : row.mode === AttemptMode.FULL ? `${score} điểm` : `${score}%`,
    };
  }
}
