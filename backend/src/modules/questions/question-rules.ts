import { fieldError } from '../../common/errors/field-error.js';
import { Skill } from '../../generated/prisma/enums.js';
import type { QuestionType } from '../../generated/prisma/enums.js';
import { describePart, findPartRule, type PartRule } from './toeic-parts.js';

// Hàm thuần (không đụng DB) để test được riêng: nhận trạng thái câu hỏi SAU khi áp thay đổi,
// ném lỗi VALIDATION_ERROR gắn đúng trường để FE hiện dưới ô nhập.

export interface QuestionDraft {
  skill: Skill;
  part: number;
  type: QuestionType;
  groupId: string | null;
  orderInGroup: number | null;
  sampleAnswer: string | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
  options: { label: string; isCorrect: boolean }[];
}

export interface GroupDraft {
  skill: Skill;
  part: number;
  passage: string | null;
  transcript: string | null;
}

/** Tra Part trong TOEIC_PARTS; cặp skill–part không tồn tại thì báo lỗi ở trường part */
export function requirePartRule(skill: Skill, part: number): PartRule {
  const rule = findPartRule(skill, part);
  if (!rule) throw fieldError('part', `Kỹ năng ${skill} không có Part ${part}`);
  return rule;
}

export function assertQuestionRules(draft: QuestionDraft): PartRule {
  const rule = requirePartRule(draft.skill, draft.part);
  const partName = describePart(rule);

  if (draft.type !== rule.type) {
    throw fieldError('type', `${partName} chỉ dùng loại câu ${rule.type}`);
  }

  if (rule.group === 'required' && !draft.groupId) {
    throw fieldError('groupId', `Câu ${partName} phải thuộc một nhóm câu`);
  }
  if (rule.group === 'none' && draft.groupId) {
    throw fieldError('groupId', `Câu ${partName} là câu đơn, không thuộc nhóm`);
  }
  if (draft.groupId && draft.orderInGroup === null) {
    throw fieldError('orderInGroup', 'Câu thuộc nhóm phải có thứ tự trong nhóm');
  }
  if (!draft.groupId && draft.orderInGroup !== null) {
    throw fieldError('orderInGroup', 'Câu đơn không có thứ tự trong nhóm');
  }

  if (rule.optionCount) assertChoiceOptions(draft, rule.optionCount, partName);
  else assertOpenResponse(draft);

  return rule;
}

function assertChoiceOptions(draft: QuestionDraft, count: number, partName: string): void {
  const { options } = draft;
  if (options.length !== count) {
    throw fieldError('options', `${partName} cần đúng ${count} phương án`);
  }

  // Nhãn đi theo thứ tự hiển thị: A, B, C, D (Part 2 chỉ A, B, C)
  const expected = 'ABCD'.slice(0, count);
  if (options.map((option) => option.label).join('') !== expected) {
    throw fieldError('options', `Nhãn phương án phải lần lượt là ${expected.split('').join(', ')}`);
  }

  if (options.filter((option) => option.isCorrect).length !== 1) {
    throw fieldError('options', 'Câu trắc nghiệm phải có đúng 1 đáp án đúng');
  }

  if (draft.sampleAnswer || draft.prepSeconds !== null || draft.responseSeconds !== null) {
    throw fieldError(
      'sampleAnswer',
      'Câu trắc nghiệm không có câu trả lời mẫu hay thời gian trả lời',
    );
  }
}

function assertOpenResponse(draft: QuestionDraft): void {
  if (draft.options.length > 0) {
    throw fieldError('options', 'Câu trả lời mở không có phương án');
  }
  if (!draft.sampleAnswer) {
    throw fieldError(
      'sampleAnswer',
      'Cần câu trả lời mẫu (dùng ở màn xem lại và làm mốc khi AI chấm)',
    );
  }

  if (draft.skill === Skill.SPEAKING) {
    if (draft.prepSeconds === null) {
      throw fieldError('prepSeconds', 'Câu Speaking cần thời gian chuẩn bị');
    }
    if (draft.responseSeconds === null) {
      throw fieldError('responseSeconds', 'Câu Speaking cần thời gian trả lời');
    }
  } else if (draft.prepSeconds !== null || draft.responseSeconds !== null) {
    // Writing tính giờ theo cả phần thi (ví dụ 8 phút cho 5 câu Part 1), không theo từng câu
    throw fieldError(
      'responseSeconds',
      'Câu Writing tính giờ theo phần thi, không đặt thời gian cho từng câu',
    );
  }
}

export function assertGroupRules(draft: GroupDraft): PartRule {
  const rule = requirePartRule(draft.skill, draft.part);
  const partName = describePart(rule);

  if (rule.group !== 'required') {
    throw fieldError('part', `${partName} là câu đơn, không tạo nhóm câu`);
  }
  if (rule.groupContent === 'passage' && !draft.passage) {
    throw fieldError('passage', `Nhóm ${partName} cần đoạn văn hoặc bảng thông tin`);
  }
  if (rule.groupContent === 'transcript' && !draft.transcript) {
    throw fieldError('transcript', `Nhóm ${partName} cần lời thoại (transcript)`);
  }

  return rule;
}
