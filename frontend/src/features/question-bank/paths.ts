import type { Skill } from '@/api/generated';

// Đường dẫn trang của ngân hàng câu hỏi (khu vực giáo viên)

export const QUESTION_LIST_PATH = '/teacher/questions';
export const GROUP_LIST_PATH = '/teacher/question-groups';
export const NEW_GROUP_PATH = `${GROUP_LIST_PATH}/new`;

export const questionPath = (id: string) => `${QUESTION_LIST_PATH}/${id}`;
export const groupPath = (id: string) => `${GROUP_LIST_PATH}/${id}`;
export const groupEditPath = (id: string) => `${GROUP_LIST_PATH}/${id}/edit`;

/** Trang tạo câu, chọn sẵn kỹ năng/Part (và nhóm nếu có) */
export function newQuestionPath(preset: { skill?: Skill; part?: number; groupId?: string }) {
  const search = new URLSearchParams();
  if (preset.skill) search.set('skill', preset.skill);
  if (preset.part) search.set('part', String(preset.part));
  if (preset.groupId) search.set('groupId', preset.groupId);
  return `${QUESTION_LIST_PATH}/new${search.size ? `?${search}` : ''}`;
}

/** Trang tạo nhóm, chọn sẵn kỹ năng/Part đang lọc */
export function newGroupPath(preset: { skill?: Skill; part?: number }) {
  const search = new URLSearchParams();
  if (preset.skill) search.set('skill', preset.skill);
  if (preset.part) search.set('part', String(preset.part));
  return `${NEW_GROUP_PATH}${search.size ? `?${search}` : ''}`;
}
