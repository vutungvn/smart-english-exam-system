import { QuestionStatus, ScoringScale, Skill } from '../../generated/prisma/enums.js';
import { describePart, findPartRule } from '../questions/toeic-parts.js';
import {
  excerpt,
  groupSizeOf,
  quotaOf,
  SCALE_SKILLS,
  TOEIC_LR_MINUTES,
  TOEIC_QUOTAS,
  type PartQuota,
} from './exam-structure.js';
import type { ExamCheckRow } from './exams.mapper.js';
import {
  ExamIssueCode,
  ExamIssueLevel,
  type ExamIssue,
  type ExamPartCheck,
  type ExamValidation,
} from './exams.types.js';

type Section = ExamCheckRow['sections'][number];
type CheckedQuestion = Section['questions'][number]['question'];

/** Part bắt buộc phải có: đề LR đủ 7 Part; đề SW đủ các Part của mỗi kỹ năng đã có mặt; luyện tập không bắt buộc */
function requiredQuotas(exam: ExamCheckRow): PartQuota[] {
  if (exam.scoringScale === ScoringScale.PERCENT) return [];
  const skills =
    exam.scoringScale === ScoringScale.TOEIC_990
      ? SCALE_SKILLS.TOEIC_990
      : SCALE_SKILLS.TOEIC_SW.filter((skill) =>
          exam.sections.some((section) => section.skill === skill),
        );
  return TOEIC_QUOTAS.filter((quota) => skills.includes(quota.skill));
}

/** Câu cần tệp âm thanh/hình ảnh theo Part (chỉ cảnh báo: tệp gắn ở chức năng nhập .zip) */
function missingMedia(skill: Skill, part: number, question: CheckedQuestion): string[] {
  const needAudio = skill === Skill.LISTENING && part <= 2;
  const needImage =
    (skill === Skill.LISTENING && part === 1) ||
    (skill === Skill.SPEAKING && part === 2) ||
    (skill === Skill.WRITING && part === 1);
  return [
    ...(needAudio && !question.audioKey ? ['âm thanh'] : []),
    ...(needImage && !question.imageKey ? ['hình ảnh'] : []),
  ];
}

/**
 * Kiểm tra điều kiện xuất bản (UC Xuất bản đề thi, bước 4): đủ câu theo cấu trúc đề,
 * mọi câu đang ở trạng thái Đang dùng, nhóm câu đủ số câu. Lỗi mức ERROR chặn xuất bản,
 * WARNING chỉ nhắc.
 */
export function checkExam(exam: ExamCheckRow): ExamValidation {
  const issues: ExamIssue[] = [];
  const add = (
    level: ExamIssueLevel,
    code: ExamIssueCode,
    message: string,
    ref: { sectionId?: string; questionId?: string } = {},
  ) =>
    issues.push({
      level,
      code,
      message,
      sectionId: ref.sectionId ?? null,
      questionId: ref.questionId ?? null,
    });
  const official = exam.scoringScale !== ScoringScale.PERCENT;

  if (exam.sections.length === 0) {
    add(ExamIssueLevel.ERROR, ExamIssueCode.NO_SECTIONS, 'Đề chưa có phần thi nào');
  }

  const required = requiredQuotas(exam);
  for (const quota of required) {
    const exists = exam.sections.some((s) => s.skill === quota.skill && s.part === quota.part);
    const rule = findPartRule(quota.skill, quota.part);
    if (!exists && rule) {
      add(ExamIssueLevel.ERROR, ExamIssueCode.MISSING_PART, `Thiếu ${describePart(rule)}`);
    }
  }

  const parts: ExamPartCheck[] = required.map((quota) => ({
    skill: quota.skill,
    part: quota.part,
    name: findPartRule(quota.skill, quota.part)?.name ?? '',
    expected: quota.count,
    actual: 0,
  }));

  for (const section of exam.sections) {
    const rule = findPartRule(section.skill, section.part);
    const partName = rule ? describePart(rule) : `${section.skill} Part ${section.part}`;
    const ref = { sectionId: section.id };
    const actual = section.questions.length;
    const quota = official ? quotaOf(section.skill, section.part) : undefined;

    const check = parts.find((p) => p.skill === section.skill && p.part === section.part);
    if (check) check.actual = actual;
    else {
      parts.push({
        skill: section.skill,
        part: section.part,
        name: rule?.name ?? '',
        expected: null,
        actual,
      });
    }

    if (actual === 0) {
      add(ExamIssueLevel.ERROR, ExamIssueCode.EMPTY_SECTION, `${partName} chưa có câu hỏi`, ref);
      continue;
    }
    if (quota && actual !== quota.count) {
      add(
        ExamIssueLevel.ERROR,
        ExamIssueCode.WRONG_QUESTION_COUNT,
        `${partName} cần ${quota.count} câu, đang có ${actual}`,
        ref,
      );
    }

    // Từng câu: còn trong ngân hàng, đang dùng; đếm số câu mỗi nhóm có trong đề
    const groups = new Map<
      string,
      { group: NonNullable<CheckedQuestion['group']>; count: number }
    >();
    const media = new Map<string, number>();

    for (const { question } of section.questions) {
      const questionRef = { ...ref, questionId: question.id };
      if (question.deletedAt) {
        add(
          ExamIssueLevel.ERROR,
          ExamIssueCode.QUESTION_REMOVED,
          `Câu "${excerpt(question.content)}" đã bị xóa khỏi ngân hàng, hãy gỡ khỏi đề`,
          questionRef,
        );
        continue;
      }
      if (question.status !== QuestionStatus.ACTIVE) {
        add(
          ExamIssueLevel.ERROR,
          ExamIssueCode.QUESTION_NOT_ACTIVE,
          `Câu "${excerpt(question.content)}" chưa ở trạng thái Đang dùng`,
          questionRef,
        );
      }
      for (const kind of missingMedia(section.skill, section.part, question)) {
        media.set(kind, (media.get(kind) ?? 0) + 1);
      }
      if (question.group) {
        const entry = groups.get(question.group.id);
        if (entry) entry.count++;
        else groups.set(question.group.id, { group: question.group, count: 1 });
      }
    }

    for (const [kind, count] of media) {
      add(
        ExamIssueLevel.WARNING,
        ExamIssueCode.MISSING_MEDIA,
        `${count} câu ${partName} chưa có ${kind} (gắn tệp ở chức năng Nhập từ tệp)`,
        ref,
      );
    }

    const size = groupSizeOf(section.skill, section.part);
    for (const { group, count } of groups.values()) {
      const name = `Nhóm "${group.topic.name}" (${partName})`;
      if (group.status !== QuestionStatus.ACTIVE) {
        add(
          ExamIssueLevel.ERROR,
          ExamIssueCode.GROUP_NOT_ACTIVE,
          `${name} chưa ở trạng thái Đang dùng`,
          ref,
        );
      }
      if (size && (count < size.min || count > size.max)) {
        const standard = size.min === size.max ? `${size.min}` : `${size.min}–${size.max}`;
        add(
          official ? ExamIssueLevel.ERROR : ExamIssueLevel.WARNING,
          ExamIssueCode.GROUP_SIZE,
          `${name} có ${count} câu, định dạng TOEIC là ${standard} câu`,
          ref,
        );
      }
      if (group._count.questions > count) {
        add(
          ExamIssueLevel.WARNING,
          ExamIssueCode.GROUP_INCOMPLETE,
          `${name} có ${group._count.questions} câu trong ngân hàng nhưng đề chỉ có ${count}; gỡ nhóm rồi thêm lại để lấy đủ`,
          ref,
        );
      }
      if (section.skill === Skill.LISTENING && !group.audioKey) {
        add(
          ExamIssueLevel.WARNING,
          ExamIssueCode.MISSING_MEDIA,
          `${name} chưa có âm thanh (gắn tệp ở chức năng Nhập từ tệp)`,
          ref,
        );
      }
    }
  }

  if (exam.scoringScale === ScoringScale.TOEIC_990 && exam.durationMinutes !== TOEIC_LR_MINUTES) {
    add(
      ExamIssueLevel.WARNING,
      ExamIssueCode.DURATION,
      `Đề TOEIC LR chuẩn làm trong ${TOEIC_LR_MINUTES} phút, đề này đặt ${exam.durationMinutes} phút`,
    );
  }

  return {
    publishable: !issues.some((issue) => issue.level === ExamIssueLevel.ERROR),
    totalQuestions: exam.sections.reduce((sum, section) => sum + section.questions.length, 0),
    parts,
    issues,
  };
}
