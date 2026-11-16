import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError } from '@/api/errors';
import { useSaveRecordingMutation, type AttemptAnswerItem } from '@/api/generated';
import { listPending, removePending, savePending } from './recording-store';

const RETRY_MS = 5000;

export interface RecordingUploadState {
  /** Câu Speaking đã có bài nói (trên server, hoặc đang chờ tải lên) */
  recorded: ReadonlySet<string>;
  /** Số bài nói chưa tải lên được */
  pending: number;
  offline: boolean;
  /** Lỗi không thử lại được (bài nói hỏng, quá dài…) gần nhất */
  error?: string;
}

interface Options {
  attemptId: string;
  serverAnswers: AttemptAnswerItem[];
  onRemaining: (seconds: number | null) => void;
  /** Bài đã hết giờ hoặc đã được nộp ở nơi khác */
  onClosed: () => void;
}

/**
 * Hàng đợi tải bài nói lên server. Bài nói vào IndexedDB trước rồi mới tải lên: mất mạng, đóng tab
 * cũng không mất; tải lên xong thì xóa khỏi IndexedDB. Lỗi mạng thì thử lại sau vài giây hoặc khi có
 * mạng lại; mở lại bài còn bài nói chờ thì tải lên tiếp
 */
export function useRecordingUploads({ attemptId, serverAnswers, onRemaining, onClosed }: Options) {
  const [saveRecording] = useSaveRecordingMutation();
  const queue = useRef(new Map<string, Blob>());
  const running = useRef<Promise<boolean> | null>(null);
  const closed = useRef(false);
  const callbacks = useRef({ onRemaining, onClosed });
  useEffect(() => {
    callbacks.current = { onRemaining, onClosed };
  });

  const [state, setState] = useState<RecordingUploadState>(() => ({
    recorded: new Set(
      serverAnswers.filter((answer) => answer.hasRecording).map((a) => a.examQuestionId),
    ),
    pending: 0,
    offline: false,
  }));

  const markRecorded = (examQuestionId: string) =>
    setState((prev) => ({ ...prev, recorded: new Set(prev.recorded).add(examQuestionId) }));

  /** Tải lần lượt mọi bài nói trong hàng đợi; false khi còn bài chưa tải được */
  const upload = useCallback(async (): Promise<boolean> => {
    for (const [examQuestionId, blob] of [...queue.current]) {
      if (closed.current) return false;
      try {
        const result = await saveRecording({
          id: attemptId,
          examQuestionId,
          body: { file: blob },
        }).unwrap();
        // Trong lúc tải, học viên không ghi lại câu này (không quay lại câu trước) nên xóa luôn
        queue.current.delete(examQuestionId);
        await removePending(attemptId, examQuestionId);
        callbacks.current.onRemaining(result.data.remainingSeconds);
        setState((prev) => ({ ...prev, pending: queue.current.size, offline: false }));
      } catch (cause) {
        const error = toApiError(cause);
        if (error.status === null) {
          setState((prev) => ({ ...prev, pending: queue.current.size, offline: true }));
          return false;
        }
        if (
          error.code === 'ATTEMPT_EXPIRED' ||
          error.code === 'ATTEMPT_NOT_IN_PROGRESS' ||
          error.code === 'ATTEMPT_NOT_FOUND'
        ) {
          closed.current = true;
          callbacks.current.onClosed();
          return false;
        }
        // Bài nói hỏng, quá dài…: thử lại cũng không được, bỏ để không kẹt hàng đợi
        queue.current.delete(examQuestionId);
        await removePending(attemptId, examQuestionId);
        setState((prev) => {
          const recorded = new Set(prev.recorded);
          recorded.delete(examQuestionId);
          return { ...prev, recorded, pending: queue.current.size, error: error.message };
        });
      }
    }
    return true;
  }, [attemptId, saveRecording]);

  /** Tải hết hàng đợi; các lần gọi trùng nhau dùng chung một lượt tải */
  const flush = useCallback(async (): Promise<boolean> => {
    let ok: boolean;
    do {
      while (running.current) await running.current;
      if (queue.current.size === 0) return true;
      running.current = upload().finally(() => {
        running.current = null;
      });
      ok = await running.current;
    } while (ok && queue.current.size > 0);
    return ok;
  }, [upload]);

  const enqueue = useCallback(
    async (examQuestionId: string, blob: Blob) => {
      queue.current.set(examQuestionId, blob);
      markRecorded(examQuestionId);
      setState((prev) => ({ ...prev, pending: queue.current.size }));
      await savePending({ attemptId, examQuestionId, blob, recordedAt: Date.now() });
      void flush();
    },
    [attemptId, flush],
  );

  // Mở lại bài: bài nói còn trong IndexedDB (đóng tab lúc mất mạng) thì tải lên tiếp
  useEffect(() => {
    let cancelled = false;
    void listPending(attemptId).then((items) => {
      if (cancelled || items.length === 0) return;
      for (const item of items) {
        queue.current.set(item.examQuestionId, item.blob);
        markRecorded(item.examQuestionId);
      }
      setState((prev) => ({ ...prev, pending: queue.current.size }));
      void flush();
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId, flush]);

  // Có mạng lại thì tải ngay; còn hàng đợi thì cứ vài giây thử lại
  useEffect(() => {
    const online = () => void flush();
    window.addEventListener('online', online);
    const retry = setInterval(() => {
      if (queue.current.size > 0 && !running.current) void flush();
    }, RETRY_MS);
    return () => {
      window.removeEventListener('online', online);
      clearInterval(retry);
    };
  }, [flush]);

  // Còn bài nói chưa tải lên mà đóng tab: trình duyệt hỏi lại (bài nói vẫn còn trong IndexedDB)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (queue.current.size > 0 && !closed.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: undefined })), []);

  return { ...state, enqueue, flush, clearError };
}
