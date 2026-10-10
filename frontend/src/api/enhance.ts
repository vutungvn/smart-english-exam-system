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
  },
});
