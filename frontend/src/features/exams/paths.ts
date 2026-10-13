// Đường dẫn trang đề thi (khu vực giáo viên)

export const EXAM_LIST_PATH = '/teacher/exams';
export const examPath = (id: string) => `${EXAM_LIST_PATH}/${id}`;
export const examPreviewPath = (id: string) => `${EXAM_LIST_PATH}/${id}/preview`;
