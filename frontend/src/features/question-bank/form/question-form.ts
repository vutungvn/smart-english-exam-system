import * as z from 'zod';
import type {
  CreateQuestionDto,
  Difficulty,
  QuestionDetail,
  QuestionStatus,
  Skill,
} from '@/api/generated';
import { defaultContent, findPartRule, OPTION_LABELS, type PartRule } from '../toeic';

/**
 * Giá trị form giữ dạng chuỗi cho ô số (thời gian, thứ tự) để ô trống không thành NaN;
 * đổi sang số khi gửi API (toPayload). Luật khớp backend/src/modules/questions, server vẫn kiểm tra lại.
 */
export const CONTENT_MAX = 5000;
export const EXPLANATION_MAX = 5000;
export const SAMPLE_ANSWER_MAX = 10000;
export const OPTION_MAX = 1000;

const SKILL_VALUES = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'] as const;

export const questionFormSchema = z
  .object({
    skill: z.enum(SKILL_VALUES).or(z.literal('')),
    part: z.number(),
    topicId: z.string(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']),
    content: z.string(),
    options: z.array(z.object({ content: z.string() })),
    correct: z.string(),
    sampleAnswer: z.string(),
    prepSeconds: z.string(),
    responseSeconds: z.string(),
    explanation: z.string(),
    groupId: z.string(),
    orderInGroup: z.string(),
    /** Chỉ có khi sửa: gửi lại để server kiểm tra xung đột */
    updatedAt: z.string().optional(),
  })
  // Mọi luật nằm trong một superRefine: Zod bỏ qua kiểm tra cấp object khi có trường đã lỗi,
  // gom lại một chỗ để người dùng thấy hết lỗi cùng lúc
  .superRefine((values, ctx) => {
    const issue = (path: string[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (!values.content.trim()) issue(['content'], 'Nhập nội dung câu hỏi');
    else if (values.content.length > CONTENT_MAX)
      issue(['content'], `Nội dung câu hỏi tối đa ${CONTENT_MAX} ký tự`);
    if (values.explanation.length > EXPLANATION_MAX)
      issue(['explanation'], `Tối đa ${EXPLANATION_MAX} ký tự`);

    if (!values.skill) return issue(['skill'], 'Chọn kỹ năng');
    const rule = findPartRule(values.skill, values.part);
    if (!rule) return issue(['part'], 'Chọn Part');
    if (!values.topicId) issue(['topicId'], 'Chọn chủ đề');

    if (rule.type === 'SINGLE_CHOICE') {
      const count = rule.optionCount ?? OPTION_LABELS.length;
      values.options.slice(0, count).forEach((option, index) => {
        const label = OPTION_LABELS[index];
        if (!option.content.trim())
          issue(['options', String(index), 'content'], `Nhập phương án ${label}`);
        else if (option.content.length > OPTION_MAX)
          issue(['options', String(index), 'content'], `Tối đa ${OPTION_MAX} ký tự`);
      });
      if (!OPTION_LABELS.slice(0, count).some((label) => label === values.correct)) {
        issue(['correct'], 'Chọn đáp án đúng');
      }
    } else {
      if (!values.sampleAnswer.trim()) issue(['sampleAnswer'], 'Nhập câu trả lời mẫu');
      else if (values.sampleAnswer.length > SAMPLE_ANSWER_MAX)
        issue(['sampleAnswer'], `Tối đa ${SAMPLE_ANSWER_MAX} ký tự`);
    }

    if (rule.skill === 'SPEAKING') {
      checkInt(values.prepSeconds, 0, 300, 'Thời gian chuẩn bị', (m) => issue(['prepSeconds'], m));
      checkInt(values.responseSeconds, 1, 3600, 'Thời gian trả lời', (m) =>
        issue(['responseSeconds'], m),
      );
    }

    if (rule.group === 'required') {
      if (!values.groupId) issue(['groupId'], 'Chọn nhóm câu');
      checkInt(values.orderInGroup, 1, 20, 'Thứ tự trong nhóm', (m) => issue(['orderInGroup'], m));
    }
  });

function checkInt(
  raw: string,
  min: number,
  max: number,
  name: string,
  report: (m: string) => void,
) {
  if (raw.trim() === '') return report(`Nhập ${name.toLowerCase()}`);
  const n = Number(raw);
  if (!Number.isInteger(n)) return report(`${name} phải là số nguyên`);
  if (n < min || n > max) report(`${name} từ ${min} đến ${max}`);
}

export type QuestionFormValues = z.infer<typeof questionFormSchema>;

const EMPTY_OPTIONS = OPTION_LABELS.map(() => ({ content: '' }));

export function emptyFormValues(preset?: {
  skill?: Skill;
  part?: number;
  groupId?: string;
}): QuestionFormValues {
  const rule = preset?.skill && preset.part ? findPartRule(preset.skill, preset.part) : undefined;
  return {
    skill: preset?.skill ?? '',
    part: rule?.part ?? 0,
    topicId: '',
    difficulty: 'MEDIUM',
    status: 'DRAFT',
    // L1, L2 có nhãn cố định; R6 điền "Chỗ trống [n]" khi biết thứ tự trong nhóm (AnswerFields)
    content: rule ? (defaultContent(rule.skill, rule.part) ?? '') : '',
    options: EMPTY_OPTIONS,
    correct: '',
    sampleAnswer: '',
    prepSeconds: rule?.defaultSeconds ? String(rule.defaultSeconds.prep) : '',
    responseSeconds: rule?.defaultSeconds ? String(rule.defaultSeconds.response) : '',
    explanation: '',
    // Nhóm chỉ có nghĩa với Part nhóm; thứ tự, chủ đề điền theo nhóm khi danh sách nhóm tải xong
    groupId: rule?.group === 'required' ? (preset?.groupId ?? '') : '',
    orderInGroup: '',
  };
}

export function toFormValues(question: QuestionDetail): QuestionFormValues {
  return {
    skill: question.skill,
    part: question.part,
    topicId: question.topic.id,
    difficulty: question.difficulty,
    status: question.status,
    content: question.content,
    options: OPTION_LABELS.map((label) => ({
      content: question.options.find((option) => option.label === label)?.content ?? '',
    })),
    correct: question.options.find((option) => option.isCorrect)?.label ?? '',
    sampleAnswer: question.sampleAnswer ?? '',
    prepSeconds: question.prepSeconds?.toString() ?? '',
    responseSeconds: question.responseSeconds?.toString() ?? '',
    explanation: question.explanation ?? '',
    groupId: question.groupId ?? '',
    orderInGroup: question.orderInGroup?.toString() ?? '',
    updatedAt: question.updatedAt,
  };
}

/**
 * Luôn gửi đủ mọi trường (kể cả null, mảng rỗng): khi sửa đổi Part từ trắc nghiệm sang câu mở,
 * backend ghép với bản cũ nên phải xóa rõ phương án/câu mẫu không còn dùng.
 */
export function toPayload(values: QuestionFormValues, rule: PartRule): CreateQuestionDto {
  const choice = rule.type === 'SINGLE_CHOICE';
  const speaking = rule.skill === 'SPEAKING';
  const grouped = rule.group === 'required';
  const count = rule.optionCount ?? 0;

  return {
    topicId: values.topicId,
    skill: rule.skill,
    part: rule.part,
    type: rule.type,
    difficulty: values.difficulty as Difficulty,
    status: values.status as QuestionStatus,
    content: values.content.trim(),
    explanation: values.explanation.trim() || null,
    sampleAnswer: choice ? null : values.sampleAnswer.trim(),
    prepSeconds: speaking ? Number(values.prepSeconds) : null,
    responseSeconds: speaking ? Number(values.responseSeconds) : null,
    groupId: grouped ? values.groupId : null,
    orderInGroup: grouped ? Number(values.orderInGroup) : null,
    options: choice
      ? OPTION_LABELS.slice(0, count).map((label, index) => ({
          label,
          content: values.options[index].content.trim(),
          isCorrect: values.correct === label,
        }))
      : [],
  };
}
