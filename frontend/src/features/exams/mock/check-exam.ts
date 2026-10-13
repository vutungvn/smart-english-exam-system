import type { Skill } from '@/api/generated';
import { findPartRule, groupSize } from '@/features/question-bank/toeic';
import { EXAM_TYPE_META, partsOfScale, quotaOf } from '../exam-meta';
import type { ExamDetail, ExamIssue, ExamPartCheck, ExamValidation } from '../types';

/**
 * TẠM (lượt 1): kiểm tra điều kiện xuất bản ngay trên trình duyệt, cùng luật với backend
 * (backend/src/modules/exams/exam-check.ts). Lượt 2 thay bằng GET /teacher/exams/{id}/validation.
 */

const describe = (skill: Skill, part: number) => {
  const name = findPartRule(skill, part)?.name;
  return `${skill.charAt(0)}${skill.slice(1).toLowerCase()} Part ${part}${name ? ` (${name})` : ''}`;
};
const short = (text: string) => (text.length > 40 ? `${text.slice(0, 40)}…` : text);

export function checkExamLocal(exam: ExamDetail): ExamValidation {
  const issues: ExamIssue[] = [];
  const add = (
    level: ExamIssue['level'],
    code: string,
    message: string,
    sectionId: string | null = null,
    questionId: string | null = null,
  ) => issues.push({ level, code, message, sectionId, questionId });
  const official = exam.scoringScale !== 'PERCENT';

  if (exam.sections.length === 0) add('ERROR', 'NO_SECTIONS', 'Đề chưa có phần thi nào');

  // Đề LR đủ 7 Part; đề SW đủ các Part của kỹ năng đã có mặt; luyện tập không bắt buộc
  const presentSkills = new Set(exam.sections.map((s) => s.skill));
  const required = !official
    ? []
    : partsOfScale(exam.scoringScale).filter(
        (rule) => exam.scoringScale === 'TOEIC_990' || presentSkills.has(rule.skill),
      );
  for (const rule of required) {
    if (!exam.sections.some((s) => s.skill === rule.skill && s.part === rule.part)) {
      add('ERROR', 'MISSING_PART', `Thiếu ${describe(rule.skill, rule.part)}`);
    }
  }

  const parts: ExamPartCheck[] = required.map((rule) => ({
    skill: rule.skill,
    part: rule.part,
    name: rule.name,
    expected: quotaOf(exam.scoringScale, rule.skill, rule.part),
    actual: 0,
  }));

  for (const section of exam.sections) {
    const name = describe(section.skill, section.part);
    const actual = section.questions.length;
    const expected = quotaOf(exam.scoringScale, section.skill, section.part);
    const check = parts.find((p) => p.skill === section.skill && p.part === section.part);
    if (check) check.actual = actual;
    else
      parts.push({
        skill: section.skill,
        part: section.part,
        name: section.name,
        expected,
        actual,
      });

    if (actual === 0) {
      add('ERROR', 'EMPTY_SECTION', `${name} chưa có câu hỏi`, section.id);
      continue;
    }
    if (expected !== null && actual !== expected) {
      add(
        'ERROR',
        'WRONG_QUESTION_COUNT',
        `${name} cần ${expected} câu, đang có ${actual}`,
        section.id,
      );
    }

    const groups = new Map<string, { topic: string; count: number }>();
    for (const { question } of section.questions) {
      if (question.status !== 'ACTIVE') {
        add(
          'ERROR',
          'QUESTION_NOT_ACTIVE',
          `Câu "${short(question.content)}" chưa ở trạng thái Đang dùng`,
          section.id,
          question.id,
        );
      }
      if (question.groupId) {
        const entry = groups.get(question.groupId);
        if (entry) entry.count++;
        else groups.set(question.groupId, { topic: question.topic.name, count: 1 });
      }
    }

    const size = groupSize(section.skill, section.part);
    for (const { topic, count } of groups.values()) {
      if (size && (count < size.min || count > size.max)) {
        const standard = size.min === size.max ? `${size.min}` : `${size.min}–${size.max}`;
        add(
          official ? 'ERROR' : 'WARNING',
          'GROUP_SIZE',
          `Nhóm "${topic}" (${name}) có ${count} câu, định dạng TOEIC là ${standard} câu`,
          section.id,
        );
      }
    }

    // Dữ liệu chưa có tệp âm thanh/hình ảnh (gắn ở chức năng Nhập từ tệp): chỉ nhắc
    const media = findPartRule(section.skill, section.part)?.media ?? 'none';
    if (media !== 'none') {
      const unit = groups.size > 0 ? `${groups.size} nhóm` : `${actual} câu`;
      const kind =
        media === 'audio+image'
          ? 'âm thanh, hình ảnh'
          : media === 'audio'
            ? 'âm thanh'
            : 'hình ảnh';
      add('WARNING', 'MISSING_MEDIA', `${unit} ${name} chưa có ${kind}`, section.id);
    }
  }

  const standardMinutes = EXAM_TYPE_META.TOEIC_990.defaultMinutes;
  if (exam.scoringScale === 'TOEIC_990' && exam.durationMinutes !== standardMinutes) {
    add(
      'WARNING',
      'DURATION',
      `Đề TOEIC LR chuẩn làm trong ${standardMinutes} phút, đề này đặt ${exam.durationMinutes} phút`,
    );
  }

  return {
    publishable: !issues.some((issue) => issue.level === 'ERROR'),
    totalQuestions: exam.sections.reduce((sum, s) => sum + s.questions.length, 0),
    parts,
    issues,
  };
}

/** Tổng số câu chuẩn của đề (null với đề luyện tập): LR 200, Speaking 11, Writing 8 */
export function expectedTotal(exam: Pick<ExamDetail, 'scoringScale' | 'sections'>): number | null {
  if (exam.scoringScale === 'PERCENT') return null;
  const skills =
    exam.scoringScale === 'TOEIC_990'
      ? EXAM_TYPE_META.TOEIC_990.skills
      : EXAM_TYPE_META.TOEIC_SW.skills.filter((skill) =>
          exam.sections.some((s) => s.skill === skill),
        );
  return partsOfScale(exam.scoringScale)
    .filter((rule) => skills.includes(rule.skill))
    .reduce((sum, rule) => sum + (quotaOf(exam.scoringScale, rule.skill, rule.part) ?? 0), 0);
}
