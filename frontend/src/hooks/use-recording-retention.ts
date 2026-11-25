import { useGetPublicSettingsQuery } from '@/api/generated';

// Mức tối đa admin đặt được: đang tải hoặc lỗi mà hiện số này thì vẫn không hứa sai với học viên
const MAX_RETENTION_DAYS = 30;

/** Số ngày giữ bản ghi âm Speaking theo cấu hình hệ thống (công khai, khách cũng đọc được) */
export function useRecordingRetention(): number {
  const { data } = useGetPublicSettingsQuery();
  return data?.data.recordingRetentionDays ?? MAX_RETENTION_DAYS;
}
