import type { QuestionType, Skill } from '../../generated/prisma/enums.js';

/**
 * Khóa nội dung câu đang được làm bài (D23, D29): câu, nhóm nằm trong đề đang xuất bản, hoặc trong
 * đề còn bài làm cả đề đang dở, thì không sửa được phần học viên thấy khi làm bài và phần dùng để
 * chấm. Phần chỉ hiện ở màn xem lại (giải thích, bài mẫu, lời thoại) và phân loại (chủ đề, độ khó,
 * trạng thái) vẫn sửa được.
 */
export type LockedField =
  | 'content'
  | 'options'
  | 'type'
  | 'skill'
  | 'part'
  | 'group'
  | 'timing'
  | 'passage'
  | 'audio'
  | 'image';

export const LOCKED_FIELD_LABEL: Record<LockedField, string> = {
  content: 'nội dung câu',
  options: 'phương án, đáp án đúng',
  type: 'loại câu',
  skill: 'kỹ năng',
  part: 'Part',
  group: 'nhóm, thứ tự trong nhóm',
  timing: 'thời gian chuẩn bị, trả lời',
  passage: 'đoạn văn, bảng thông tin',
  audio: 'âm thanh',
  image: 'hình ảnh',
};

interface OptionValues {
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface LockableQuestion {
  content: string;
  type: QuestionType;
  skill: Skill;
  part: number;
  groupId: string | null;
  orderInGroup: number | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
  /** Theo thứ tự hiển thị */
  options: OptionValues[];
}

/** PATCH: undefined = không gửi (giữ nguyên) */
export type LockableQuestionChanges = {
  [K in keyof LockableQuestion]?: LockableQuestion[K];
};

const changed = <T>(next: T | undefined, current: T): boolean =>
  next !== undefined && next !== current;

function sameOptions(next: OptionValues[], current: OptionValues[]): boolean {
  return (
    next.length === current.length &&
    next.every(
      (option, index) =>
        option.label === current[index]?.label &&
        option.content === current[index]?.content &&
        option.isCorrect === current[index]?.isCorrect,
    )
  );
}

/**
 * Các trường bị khóa mà bản gửi lên thực sự làm thay đổi. Form gửi lại cả những trường không sửa
 * nên phải so với bản đang lưu, không chỉ xem trường có được gửi hay không
 */
export function lockedQuestionChanges(
  current: LockableQuestion,
  next: LockableQuestionChanges,
): LockedField[] {
  const fields: LockedField[] = [];
  if (changed(next.content, current.content)) fields.push('content');
  if (next.options && !sameOptions(next.options, current.options)) fields.push('options');
  if (changed(next.type, current.type)) fields.push('type');
  if (changed(next.skill, current.skill)) fields.push('skill');
  if (changed(next.part, current.part)) fields.push('part');
  if (changed(next.groupId, current.groupId) || changed(next.orderInGroup, current.orderInGroup)) {
    fields.push('group');
  }
  if (
    changed(next.prepSeconds, current.prepSeconds) ||
    changed(next.responseSeconds, current.responseSeconds)
  ) {
    fields.push('timing');
  }
  return fields;
}

export function describeLockedFields(fields: LockedField[]): string {
  return fields.map((field) => LOCKED_FIELD_LABEL[field]).join(', ');
}
