import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toApiError } from '@/api/errors';
import { api, type GetNextCalibrationApiArg } from '@/api/generated';
import { useAppDispatch } from '@/hooks/hooks';
import { gradingDetailPath } from './grading-meta';

/** Đường dẫn màn chấm ở chế độ chấm đối chiếu (ẩn điểm AI) */
export const blindGradingPath = (answerId: string) => `${gradingDetailPath(answerId)}?blind=1`;

/**
 * Lấy ngẫu nhiên một câu AI đã chấm mà chưa giáo viên nào chấm rồi mở ở chế độ chấm đối chiếu
 * (SPRINT-90). Hết câu thì trả thông báo để hiện cho giáo viên
 */
export function useNextCalibration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  const start = async (arg: GetNextCalibrationApiArg = {}) => {
    setMessage(undefined);
    setLoading(true);
    try {
      // Mỗi lần bấm là một lần chọn ngẫu nhiên mới: không lấy từ cache
      const { data } = await dispatch(
        api.endpoints.getNextCalibration.initiate(arg, { subscribe: false, forceRefetch: true }),
      ).unwrap();
      if (data.answerId) void navigate(blindGradingPath(data.answerId));
      else setMessage('Đã hết câu để chấm đối chiếu: mọi câu AI đã chấm đều đã có giáo viên chấm.');
    } catch (error) {
      setMessage(toApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  return { start, loading, message, clearMessage: () => setMessage(undefined) };
}
