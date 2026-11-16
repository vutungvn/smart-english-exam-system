import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderError = 'unsupported' | 'denied' | 'no-device' | 'failed';

export const RECORDER_ERROR_MESSAGE: Record<RecorderError, string> = {
  unsupported:
    'Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome, Edge, Firefox hoặc Safari bản mới, mở trang qua https hoặc localhost.',
  denied:
    'Bạn đã chặn quyền dùng micro. Bấm biểu tượng ổ khóa cạnh thanh địa chỉ, cho phép Micro rồi tải lại trang.',
  'no-device': 'Không tìm thấy micro. Hãy cắm micro hoặc tai nghe có micro rồi thử lại.',
  failed: 'Không mở được micro (có thể ứng dụng khác đang dùng). Đóng ứng dụng đó rồi thử lại.',
};

/**
 * Định dạng ưu tiên: Chrome, Edge, Firefox ghi WebM/Opus; Safari chỉ ghi MP4/AAC. Backend chuẩn hóa
 * mọi định dạng về MP3 nên chỉ cần chọn cái trình duyệt hỗ trợ
 */
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

function pickMimeType(): string | undefined {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function toRecorderError(error: unknown): RecorderError {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device';
  return 'failed';
}

export function recorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/**
 * Ghi âm bằng MediaRecorder. Giữ một luồng micro cho cả phần Speaking (prepare một lần) để trình
 * duyệt không hỏi quyền lại mỗi câu và lần ghi đầu không bị hụt mất đầu câu do micro khởi động chậm.
 * stop() trả về Blob của lần ghi; release() tắt micro (đèn báo micro của trình duyệt tắt theo)
 */
export function useRecorder() {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [error, setError] = useState<RecorderError | null>(null);
  const [recording, setRecording] = useState(false);

  const prepare = useCallback(async (): Promise<boolean> => {
    if (streamRef.current?.active) return true;
    if (!recorderSupported()) {
      setError('unsupported');
      return false;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setError(null);
      return true;
    } catch (cause) {
      setError(toRecorderError(cause));
      return false;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!(await prepare()) || !streamRef.current) return false;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    return true;
  }, [prepare]);

  /** Dừng ghi và trả về bài nói; null khi chưa ghi */
  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () =>
        resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
      recorder.stop();
    });
  }, []);

  const release = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  }, []);

  // Rời màn: tắt micro
  useEffect(() => release, [release]);

  return { prepare, start, stop, release, recording, error };
}
