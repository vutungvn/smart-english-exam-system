import { downloadResponse } from '@/lib/download';
import { api } from './generated';

// Codegen gửi body { file } dạng JSON, backend nhận multipart/form-data (field "file").
// Không tự đặt Content-Type: trình duyệt tự thêm boundary của multipart
function toFormData(file: Blob): FormData {
  const body = new FormData();
  body.append('file', file);
  return body;
}

/**
 * Bổ sung cho endpoint do codegen sinh, không sửa generated.ts (sinh lại sẽ mất).
 * File này chạy một lần khi nạp store (xem store.ts), sửa thẳng định nghĩa endpoint
 * nên các hook lấy từ generated.ts (useUploadAvatarMutation...) dùng luôn bản đã sửa.
 */
export const enhancedApi = api.enhanceEndpoints({
  endpoints: {
    // Codegen gửi body { file } dạng JSON, backend nhận multipart/form-data (field "file")
    uploadAvatar: {
      query: ({ file }) => {
        const body = new FormData();
        body.append('file', file);
        // Không tự đặt Content-Type: trình duyệt tự thêm boundary của multipart
        return { url: '/api/v1/me/avatar', method: 'POST', body };
      },
    },
    // Thêm/sửa/xóa câu làm đổi số câu và danh sách câu của nhóm: tải lại cả dữ liệu nhóm.
    // Đổi trạng thái hay xóa câu, nhóm đang nằm trong đề làm đổi kết quả kiểm tra xuất bản của đề
    createQuestion: { invalidatesTags: ['Questions', 'Question Groups'] },
    updateQuestion: { invalidatesTags: ['Questions', 'Question Groups', 'Exams'] },
    deleteQuestion: { invalidatesTags: ['Questions', 'Question Groups', 'Exams'] },
    updateQuestionGroup: { invalidatesTags: ['Question Groups', 'Exams'] },
    // Xóa nhiều / xóa nhóm kèm câu: câu, nhóm cùng đổi; đề nháp chứa câu bị xóa đổi kết quả kiểm tra
    bulkDeleteQuestions: { invalidatesTags: ['Questions', 'Question Groups', 'Exams'] },
    deleteQuestionGroup: { invalidatesTags: ['Questions', 'Question Groups', 'Exams'] },
    bulkDeleteQuestionGroups: { invalidatesTags: ['Questions', 'Question Groups', 'Exams'] },

    // Tải/gỡ audio, ảnh của câu, nhóm: gửi multipart; đổi tệp làm đổi kết quả kiểm tra xuất bản
    // của đề chứa câu đó. Ghi ngay bản server trả về vào trang chi tiết để ô tệp không nháy lại
    // tệp cũ trong lúc chờ tải lại theo tag
    uploadQuestionMedia: {
      query: ({ id, kind, body: { file } }) => ({
        url: `/api/v1/teacher/questions/${id}/media/${kind}`,
        method: 'PUT',
        body: toFormData(file),
      }),
      invalidatesTags: ['Questions', 'Exams'],
      onQueryStarted: async ({ id }, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(api.util.upsertQueryData('getQuestion', id, data));
      },
    },
    removeQuestionMedia: {
      invalidatesTags: ['Questions', 'Exams'],
      onQueryStarted: async ({ id }, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(api.util.upsertQueryData('getQuestion', id, data));
      },
    },
    uploadQuestionGroupMedia: {
      query: ({ id, kind, body: { file } }) => ({
        url: `/api/v1/teacher/question-groups/${id}/media/${kind}`,
        method: 'PUT',
        body: toFormData(file),
      }),
      invalidatesTags: ['Question Groups', 'Exams'],
      onQueryStarted: async ({ id }, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(api.util.upsertQueryData('getQuestionGroup', id, data));
      },
    },
    removeQuestionGroupMedia: {
      invalidatesTags: ['Question Groups', 'Exams'],
      onQueryStarted: async ({ id }, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(api.util.upsertQueryData('getQuestionGroup', id, data));
      },
    },

    // Làm bài: lưu câu trả lời không được làm tải lại cả đề (getAttempt) sau mỗi lần chọn;
    // bắt đầu, nộp, hủy bài làm đổi số lượt và nút "Làm tiếp" ở danh sách đề
    saveAnswer: { invalidatesTags: [] },
    syncAnswers: { invalidatesTags: [] },
    startAttempt: { invalidatesTags: ['Attempts', 'Exam Catalog'] },
    // Nộp bài làm đổi điểm, tỉ lệ đúng ở trang Tiến độ và Trang chủ
    submitAttempt: { invalidatesTags: ['Attempts', 'Exam Catalog', 'Progress'] },
    // Đổi điểm mục tiêu thì đường mục tiêu trên biểu đồ điểm đổi theo
    updateProfile: { invalidatesTags: ['Me', 'Progress'] },
    cancelAttempt: { invalidatesTags: ['Attempts', 'Exam Catalog'] },

    // Nhập câu hỏi từ tệp .zip
    previewQuestionImport: {
      query: ({ file }) => {
        const body = new FormData();
        body.append('file', file);
        return { url: '/api/v1/teacher/questions/import/preview', method: 'POST', body };
      },
      invalidatesTags: [],
    },
    // Nhập xong thì danh sách câu, nhóm (và số đếm ở sidebar) phải tải lại
    confirmQuestionImport: { invalidatesTags: ['Questions', 'Question Groups'] },
    // Hai route trả tệp: gọi bằng initiate(..., { subscribe: false }) khi bấm nút, tệp lưu thẳng
    // xuống máy, không giữ trong cache và không tự tải lại theo tag
    getQuestionImportTemplate: {
      query: () => ({
        url: '/api/v1/teacher/questions/import/template',
        responseHandler: downloadResponse('mau-nhap-cau-hoi.zip'),
      }),
      providesTags: [],
    },
    getQuestionImportErrors: {
      query: (token) => ({
        url: `/api/v1/teacher/questions/import/${token}/errors`,
        responseHandler: downloadResponse('loi-nhap-cau-hoi.xlsx'),
      }),
      providesTags: [],
    },
  },
});
