import { downloadResponse } from '@/lib/download';
import { api } from './generated';

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
