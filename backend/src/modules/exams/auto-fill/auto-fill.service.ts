import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';
import { fieldError } from '../../../common/errors/field-error.js';
import type { AuthUser } from '../../../common/types/auth-user.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  Difficulty,
  ExamStatus,
  QuestionStatus,
  ScoringScale,
  Skill,
} from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { describePart, findPartRule, TOEIC_PARTS } from '../../questions/toeic-parts.js';
import { ExamContentService } from '../exam-content.service.js';
import { excerpt, groupSizeOf, partOrder, SCALE_SKILLS, TOEIC_QUOTAS } from '../exam-structure.js';
import { ExamsService } from '../exams.service.js';
import type { ExamDetail } from '../exams.types.js';
import {
  DEFAULT_RATIO,
  groupDifficulty,
  pickReading7,
  pickWithGraphics,
  planPart,
  READING7_PROFILE,
  type Candidate,
  type PartPlan,
  type PickOptions,
} from './auto-fill-rules.js';
import {
  AutoFillScope,
  type AutoFillApplyDto,
  type AutoFillPartDto,
  type AutoFillPreviewDto,
} from './auto-fill.dto.js';
import type {
  AutoFillCoverage,
  AutoFillCoveragePart,
  AutoFillPreview,
  AutoFillPreviewItem,
  AutoFillPreviewPart,
  DifficultyCount,
  TopicCount,
} from './auto-fill.types.js';

/** Đếm số đề KHÁC (chưa xóa) đang dùng câu: ưu tiên câu chưa dùng để các đề ít trùng nhau */
const usedIn = (examId: string) => ({
  examQuestions: { where: { section: { examId: { not: examId }, exam: { deletedAt: null } } } },
});

interface PartKey {
  skill: Skill;
  part: number;
}

/** Thông tin hiển thị của một ứng viên trong bản xem trước, theo key của Candidate */
interface CandidateInfo {
  label: string;
  topicName: string;
  questionIds: string[];
}

interface Pool {
  candidates: Candidate[];
  info: Map<string, CandidateInfo>;
  /** Mọi chủ đề của Part trong chương trình thi */
  topics: { id: string; name: string }[];
  /** Nhóm ACTIVE nhưng sai số câu theo định dạng TOEIC */
  invalidGroups: number;
}

const key = ({ skill, part }: PartKey) => `${skill}-${part}`;

function countLevels(candidates: readonly Candidate[]): DifficultyCount {
  return {
    easy: candidates.filter((c) => c.difficulty === Difficulty.EASY).length,
    medium: candidates.filter((c) => c.difficulty === Difficulty.MEDIUM).length,
    hard: candidates.filter((c) => c.difficulty === Difficulty.HARD).length,
  };
}

function countTopics(candidates: readonly Candidate[], pool: Pool, all: boolean): TopicCount[] {
  return pool.topics
    .map((topic) => ({
      topicId: topic.id,
      name: topic.name,
      count: candidates.filter((c) => c.topicId === topic.id).length,
    }))
    .filter((topic) => all || topic.count > 0);
}

/**
 * Rút đề tự động theo ma trận (SPRINT-50): đọc ứng viên trong ngân hàng, gọi các hàm thuần ở
 * auto-fill-rules.ts, dựng bản xem trước; áp dụng thì kiểm tra lại từng câu như khi thêm tay rồi
 * ghi cả đề trong một transaction
 */
@Injectable()
export class ExamAutoFillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exams: ExamsService,
    private readonly content: ExamContentService,
  ) {}

  private async loadExam(examId: string, user: AuthUser) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, authorId: user.id, deletedAt: null },
      select: {
        id: true,
        status: true,
        scoringScale: true,
        subjectId: true,
        updatedAt: true,
        sections: {
          select: {
            id: true,
            skill: true,
            part: true,
            questions: { select: { questionId: true } },
          },
        },
      },
    });
    if (!exam) throw new AppException(ErrorCode.EXAM_NOT_FOUND);
    return exam;
  }

  /** Part có thể có trong đề: đề TOEIC theo chuẩn, đề PERCENT mọi Part */
  private partsOf(scale: ScoringScale): PartKey[] {
    const skills = SCALE_SKILLS[scale];
    const parts = scale === ScoringScale.PERCENT ? TOEIC_PARTS : TOEIC_QUOTAS;
    return parts
      .filter((item) => skills.includes(item.skill))
      .map(({ skill, part }) => ({ skill, part }));
  }

  /** Ứng viên của một Part: câu, nhóm ACTIVE, đúng định dạng, không nằm trong `exclude` */
  private async loadPool(
    examId: string,
    subjectId: string,
    { skill, part }: PartKey,
    exclude: ReadonlySet<string>,
  ): Promise<Pool> {
    const rule = findPartRule(skill, part);
    const topics = await this.prisma.topic.findMany({
      where: { subjectId, skill, parts: { has: part } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    const candidates: Candidate[] = [];
    const info = new Map<string, CandidateInfo>();
    let invalidGroups = 0;

    if (rule?.group !== 'required') {
      const rows = await this.prisma.question.findMany({
        where: { skill, part, groupId: null, status: QuestionStatus.ACTIVE, deletedAt: null },
        select: {
          id: true,
          content: true,
          difficulty: true,
          topicId: true,
          topic: { select: { name: true } },
          _count: { select: usedIn(examId) },
        },
      });
      for (const row of rows) {
        if (exclude.has(row.id)) continue;
        candidates.push({
          key: row.id,
          difficulty: row.difficulty,
          topicId: row.topicId,
          usedCount: row._count.examQuestions,
          size: 1,
          hasGraphic: false,
        });
        info.set(row.id, {
          label: excerpt(row.content, 80),
          topicName: row.topic.name,
          questionIds: [row.id],
        });
      }
      return { candidates, info, topics, invalidGroups };
    }

    const size = groupSizeOf(skill, part);
    const groups = await this.prisma.questionGroup.findMany({
      where: { skill, part, status: QuestionStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        topicId: true,
        imageKey: true,
        passage: true,
        transcript: true,
        topic: { select: { name: true } },
        questions: {
          where: { deletedAt: null },
          orderBy: { orderInGroup: 'asc' },
          select: {
            id: true,
            status: true,
            difficulty: true,
            content: true,
            _count: { select: usedIn(examId) },
          },
        },
      },
    });
    for (const group of groups) {
      const { questions } = group;
      if (questions.some((question) => exclude.has(question.id))) continue;
      // Nhóm phải đủ câu và mọi câu đang dùng: xuất bản đề bắt buộc câu ACTIVE
      if (questions.length === 0 || questions.some((q) => q.status !== QuestionStatus.ACTIVE)) {
        continue;
      }
      if (size && (questions.length < size.min || questions.length > size.max)) {
        invalidGroups++;
        continue;
      }
      candidates.push({
        key: group.id,
        difficulty: groupDifficulty(questions.map((question) => question.difficulty)),
        topicId: group.topicId,
        usedCount: Math.max(...questions.map((question) => question._count.examQuestions)),
        size: questions.length,
        hasGraphic: group.imageKey !== null,
      });
      info.set(group.id, {
        label: excerpt(group.passage ?? group.transcript ?? questions[0].content, 80),
        topicName: group.topic.name,
        questionIds: questions.map((question) => question.id),
      });
    }
    return { candidates, info, topics, invalidGroups };
  }

  async coverage(examId: string, user: AuthUser): Promise<AutoFillCoverage> {
    const exam = await this.loadExam(examId, user);
    const parts: AutoFillCoveragePart[] = [];

    for (const target of this.partsOf(exam.scoringScale)) {
      const rule = findPartRule(target.skill, target.part);
      // Đề PERCENT chưa có số lượng: lấy kế hoạch với 1 đơn vị để biết đơn vị đếm
      const plan = planPart(exam.scoringScale, target.skill, target.part, 1);
      if (!rule || !plan) continue;
      const pool = await this.loadPool(examId, exam.subjectId, target, new Set());
      const section = exam.sections.find((s) => key(s) === key(target));
      const toeic = exam.scoringScale !== ScoringScale.PERCENT;
      const sizes =
        plan.unit === 'GROUP'
          ? [...new Set(pool.candidates.map((c) => c.size))]
              .sort((a, b) => a - b)
              .map((size) => ({
                size,
                count: pool.candidates.filter((c) => c.size === size).length,
              }))
          : [];
      parts.push({
        ...target,
        name: rule.name,
        unit: plan.unit,
        reading7Profile: plan.reading7Profile,
        required: toeic ? plan.count : null,
        requiredQuestions: toeic ? plan.questions : null,
        available: pool.candidates.length,
        unused: pool.candidates.filter((c) => c.usedCount === 0).length,
        difficulty: countLevels(pool.candidates),
        topics: countTopics(pool.candidates, pool, true),
        sizes,
        graphics: pool.candidates.filter((c) => c.hasGraphic).length,
        current: section?.questions.length ?? 0,
      });
    }
    return { scoringScale: exam.scoringScale, parts };
  }

  /** Kiểm tra cấu hình ma trận; trả về danh sách Part cần rút kèm cấu hình */
  private targets(
    scale: ScoringScale,
    dtoParts: AutoFillPartDto[],
  ): { target: PartKey; config: AutoFillPartDto | undefined; field: string }[] {
    const seen = new Set<string>();
    dtoParts.forEach((item, index) => {
      const field = `parts[${index}]`;
      if (seen.has(key(item))) throw fieldError(field, 'Part bị lặp lại');
      seen.add(key(item));
      const rule = findPartRule(item.skill, item.part);
      if (!rule || !SCALE_SKILLS[scale].includes(item.skill)) {
        throw fieldError(field, `Đề này không có ${item.skill} Part ${item.part}`);
      }
      if (scale === ScoringScale.PERCENT && !item.count) {
        throw fieldError(`${field}.count`, 'Nhập số lượng cần rút');
      }
      if (scale !== ScoringScale.PERCENT && item.count !== undefined) {
        throw fieldError(`${field}.count`, 'Đề TOEIC rút đúng số lượng chuẩn, không nhập số lượng');
      }
      const ratio = item.difficulty;
      if (ratio && ratio.easy + ratio.medium + ratio.hard !== 100) {
        throw fieldError(`${field}.difficulty`, 'Tổng tỉ lệ độ khó phải bằng 100%');
      }
      const topicIds = (item.topics ?? []).map((topic) => topic.topicId);
      if (new Set(topicIds).size !== topicIds.length) {
        throw fieldError(`${field}.topics`, 'Chủ đề bị lặp lại');
      }
    });

    const configOf = (target: PartKey) => {
      const index = dtoParts.findIndex((item) => key(item) === key(target));
      return { target, config: dtoParts[index], field: `parts[${index}]` };
    };
    if (scale === ScoringScale.PERCENT) return dtoParts.map((item) => configOf(item));
    return this.partsOf(scale).map(configOf);
  }

  async preview(examId: string, dto: AutoFillPreviewDto, user: AuthUser): Promise<AutoFillPreview> {
    const exam = await this.loadExam(examId, user);
    if (exam.status === ExamStatus.PUBLISHED) throw new AppException(ErrorCode.EXAM_PUBLISHED);
    const targets = this.targets(exam.scoringScale, dto.parts);
    if (targets.length === 0) throw fieldError('parts', 'Chọn ít nhất một Part để rút');

    const seed = dto.seed ?? randomUUID();
    const keepExisting = dto.scope === AutoFillScope.EMPTY_PARTS;
    const existing = new Set(
      exam.sections.flatMap((section) => section.questions.map((q) => q.questionId)),
    );
    const parts: AutoFillPreviewPart[] = [];

    for (const { target, config, field } of targets) {
      const rule = findPartRule(target.skill, target.part);
      const plan = planPart(exam.scoringScale, target.skill, target.part, config?.count);
      if (!rule || !plan) continue;
      const current = exam.sections.find((s) => key(s) === key(target))?.questions.length ?? 0;
      const base = {
        ...target,
        name: rule.name,
        unit: plan.unit,
        reading7Profile: plan.reading7Profile,
      };

      if (keepExisting && current > 0) {
        parts.push({
          ...base,
          kept: true,
          required: plan.count,
          selected: 0,
          shortage: 0,
          questionCount: current,
          relaxed: [],
          difficulty: { easy: 0, medium: 0, hard: 0 },
          topics: [],
          items: [],
        });
        continue;
      }

      const pool = await this.loadPool(
        examId,
        exam.subjectId,
        target,
        keepExisting ? existing : new Set(),
      );
      const topics = config?.topics ?? [];
      const known = new Set(pool.topics.map((topic) => topic.id));
      if (topics.some((topic) => !known.has(topic.topicId))) {
        throw fieldError(`${field}.topics`, `Có chủ đề không thuộc ${describePart(rule)}`);
      }
      const maxUnits = plan.reading7Profile
        ? READING7_PROFILE.reduce((n, bin) => n + bin.groups, 0)
        : plan.count;
      if (topics.reduce((n, topic) => n + topic.min, 0) > maxUnits) {
        throw fieldError(
          `${field}.topics`,
          `Tổng số tối thiểu theo chủ đề vượt ${maxUnits} ${plan.unit === 'GROUP' ? 'nhóm' : 'câu'}`,
        );
      }

      parts.push(
        this.pick(plan, pool, base, topics, dto.preferUnused, `${seed}:${key(target)}`, config),
      );
    }

    const totalQuestions =
      parts.reduce((n, part) => n + part.questionCount, 0) +
      (keepExisting
        ? exam.sections
            .filter((section) => !targets.some(({ target }) => key(target) === key(section)))
            .reduce((n, section) => n + section.questions.length, 0)
        : 0);
    return { seed, scope: dto.scope, totalQuestions, parts };
  }

  private pick(
    plan: PartPlan,
    pool: Pool,
    base: Pick<AutoFillPreviewPart, 'skill' | 'part' | 'name' | 'unit' | 'reading7Profile'>,
    topics: PickOptions['topics'],
    preferUnused: boolean,
    seed: string,
    config: AutoFillPartDto | undefined,
  ): AutoFillPreviewPart {
    const unitLabel = plan.unit === 'GROUP' ? 'nhóm' : 'câu';
    const names = new Map(pool.topics.map((topic) => [topic.id, topic.name]));
    const options = {
      ratio: config?.difficulty ?? DEFAULT_RATIO,
      topics,
      preferUnused,
      seed,
      topicName: (id: string) => names.get(id) ?? id,
      unitLabel,
    };

    let picked: Candidate[];
    let relaxed: string[];
    let selected: number;
    let shortage: number;
    if (plan.reading7Profile) {
      const result = pickReading7(pool.candidates, options);
      ({ picked, relaxed } = result);
      shortage = result.shortage;
      selected = plan.count - shortage;
    } else {
      const result = pickWithGraphics(
        pool.candidates,
        { ...options, count: plan.count },
        plan.graphics,
      );
      ({ picked, relaxed } = result);
      selected = picked.length;
      shortage = plan.count - selected;
    }
    if (pool.invalidGroups > 0) {
      relaxed = [
        ...relaxed,
        `Bỏ qua ${pool.invalidGroups} nhóm có số câu không đúng định dạng TOEIC`,
      ];
    }

    const items: AutoFillPreviewItem[] = picked.map((candidate) => {
      const detail = pool.info.get(candidate.key);
      return {
        questionId: plan.unit === 'QUESTION' ? candidate.key : null,
        groupId: plan.unit === 'GROUP' ? candidate.key : null,
        label: detail?.label ?? '',
        difficulty: candidate.difficulty,
        topicName: detail?.topicName ?? '',
        usedCount: candidate.usedCount,
        questionCount: candidate.size,
        hasGraphic: candidate.hasGraphic,
      };
    });
    return {
      ...base,
      kept: false,
      required: plan.count,
      selected,
      shortage,
      questionCount: picked.reduce((n, candidate) => n + candidate.size, 0),
      relaxed,
      difficulty: countLevels(picked),
      topics: countTopics(picked, pool, false),
      items,
    };
  }

  /**
   * Ghi kết quả xem trước vào đề. Kiểm tra lại từng câu, nhóm bằng đúng logic thêm tay
   * (ExamContentService), rồi ghi cả đề trong một transaction: lỗi giữa chừng thì đề giữ nguyên
   */
  async apply(examId: string, dto: AutoFillApplyDto, user: AuthUser): Promise<ExamDetail> {
    const exam = await this.loadExam(examId, user);
    if (exam.status === ExamStatus.PUBLISHED) throw new AppException(ErrorCode.EXAM_PUBLISHED);
    // Khóa lạc quan: đề đổi sau lúc xem trước (tab khác, thêm câu tay) thì xem trước lại
    if (exam.updatedAt.getTime() !== new Date(dto.updatedAt).getTime()) {
      throw new AppException(ErrorCode.VERSION_CONFLICT);
    }
    const replaceAll = dto.scope === AutoFillScope.ALL;

    const seen = new Set<string>();
    const writes: { target: PartKey; sectionId: string | null; ids: string[] }[] = [];
    for (const [index, item] of dto.parts.entries()) {
      const field = `parts[${index}]`;
      const rule = findPartRule(item.skill, item.part);
      if (!rule || !SCALE_SKILLS[exam.scoringScale].includes(item.skill)) {
        throw fieldError(field, `Đề này không có ${item.skill} Part ${item.part}`);
      }
      if (seen.has(key(item))) throw fieldError(field, 'Part bị lặp lại');
      seen.add(key(item));
      const partName = describePart(rule);
      const questionIds = [...new Set(item.questionIds ?? [])];
      const groupIds = [...new Set(item.groupIds ?? [])];
      if (rule.group === 'required' ? questionIds.length > 0 : groupIds.length > 0) {
        throw fieldError(field, `${partName} không thêm câu theo cách này`);
      }

      const section = exam.sections.find((s) => key(s) === key(item));
      if (!replaceAll && section && section.questions.length > 0) {
        throw fieldError(field, `${partName} đã có câu, chọn "Rút lại cả đề" để thay toàn bộ`);
      }
      const ref = { id: section?.id ?? '', skill: item.skill, part: item.part };
      const ids = [
        ...(await this.content.collectSingles(questionIds, ref, partName)),
        ...(await this.content.collectGroups(groupIds, ref, partName)),
      ];
      if (ids.length === 0) continue;
      writes.push({ target: item, sectionId: replaceAll ? null : (section?.id ?? null), ids });
    }

    // Không trùng câu trong cả đề (giữa các Part mới và với Part giữ lại)
    const all = writes.flatMap((write) => write.ids);
    const kept = replaceAll
      ? new Set<string>()
      : new Set(exam.sections.flatMap((section) => section.questions.map((q) => q.questionId)));
    const duplicates = all.filter((id, index) => all.indexOf(id) !== index || kept.has(id));
    if (duplicates.length > 0) {
      throw new AppException(
        ErrorCode.EXAM_QUESTION_DUPLICATE,
        `${new Set(duplicates).size} câu bị trùng trong đề`,
        { questionIds: [...new Set(duplicates)] },
      );
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (replaceAll) await tx.examSection.deleteMany({ where: { examId } });
          for (const write of writes) {
            const sectionId =
              write.sectionId ??
              (
                await tx.examSection.create({
                  data: {
                    examId,
                    skill: write.target.skill,
                    part: write.target.part,
                    orderIndex: partOrder(write.target.skill, write.target.part),
                  },
                  select: { id: true },
                })
              ).id;
            await tx.examQuestion.createMany({
              data: write.ids.map((questionId, orderIndex) => ({
                sectionId,
                questionId,
                orderIndex,
              })),
            });
          }
          await tx.exam.update({ where: { id: examId }, data: { updatedAt: new Date() } });
        },
        { timeout: 30_000 },
      );
    } catch (error) {
      // Hai request ghi cùng lúc: vi phạm unique (Part, câu trong đề)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(ErrorCode.VERSION_CONFLICT);
      }
      throw error;
    }
    return this.exams.get(examId, user);
  }
}
