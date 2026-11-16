import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError } from '@/api/errors';
import {
  useSaveAnswerMutation,
  useSyncAnswersMutation,
  type AttemptAnswerItem,
} from '@/api/generated';

export interface LocalAnswer {
  selectedOptionId: string | null;
  textAnswer: string | null;
  isFlagged: boolean;
}

export type AnswerPatch = Partial<LocalAnswer>;

/** Thay đổi chưa gửi được lên server của một câu, kèm lúc học viên trả lời */
type QueueItem = AnswerPatch & { answeredAt: string };
type Queue = Record<string, QueueItem>;

export type SaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface SyncStatus {
  state: SaveState;
  savedAt?: Date;
  /** Số câu đang chờ gửi */
  pending: number;
  message?: string;
}

const EMPTY: LocalAnswer = { selectedOptionId: null, textAnswer: null, isFlagged: false };
/** Chọn phương án, đánh dấu: gửi gần như ngay; gõ bài viết: chờ ngừng gõ */
const DEBOUNCE = { quick: 150, typing: 500 };
const RETRY_MS = 5000;

const storageKey = (attemptId: string) => `smart-exam:attempt-queue:${attemptId}`;

// localStorage có thể bị chặn (chế độ riêng tư): khi đó chỉ mất khả năng giữ hàng đợi qua lần tải trang
function loadQueue(attemptId: string): Queue {
  try {
    return JSON.parse(localStorage.getItem(storageKey(attemptId)) ?? '{}') as Queue;
  } catch {
    return {};
  }
}

function saveQueue(attemptId: string, queue: Queue): void {
  try {
    if (Object.keys(queue).length === 0) localStorage.removeItem(storageKey(attemptId));
    else localStorage.setItem(storageKey(attemptId), JSON.stringify(queue));
  } catch {
    // bỏ qua
  }
}

export function clearAnswerQueue(attemptId: string): void {
  saveQueue(attemptId, {});
}

interface Options {
  attemptId: string;
  serverAnswers: AttemptAnswerItem[];
  /** Server trả thời gian còn lại sau mỗi lần lưu: dùng chỉnh lại đồng hồ */
  onRemaining: (seconds: number | null) => void;
  /** Bài đã hết giờ hoặc đã được nộp ở nơi khác */
  onClosed: () => void;
}

/**
 * Câu trả lời của một lượt làm bài. Giao diện đổi ngay khi học viên chọn (không chờ server); thay
 * đổi xếp vào hàng đợi lưu ở localStorage rồi gửi lên: một câu thì PUT, nhiều câu (sau khi mất
 * mạng) thì PATCH đồng bộ lô. Server giữ bản có answeredAt mới hơn nên gửi lại không sợ ghi đè.
 */
export function useAnswerSync({ attemptId, serverAnswers, onRemaining, onClosed }: Options) {
  const [saveAnswer] = useSaveAnswerMutation();
  const [syncAnswers] = useSyncAnswersMutation();
  // Hàng đợi còn lại từ lần mở trước (đóng tab lúc mất mạng), đọc một lần khi vào màn
  const [initialQueue] = useState(() => loadQueue(attemptId));
  const queueRef = useRef<Queue>(initialQueue);

  // Đáp án đang hiện: bản server + thay đổi còn trong hàng đợi
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>(() => {
    const result: Record<string, LocalAnswer> = {};
    for (const answer of serverAnswers) {
      result[answer.examQuestionId] = {
        selectedOptionId: answer.selectedOptionId,
        textAnswer: answer.textAnswer,
        isFlagged: answer.isFlagged,
      };
    }
    for (const [id, item] of Object.entries(initialQueue)) {
      const patch: Partial<QueueItem> = { ...item };
      delete patch.answeredAt;
      result[id] = { ...(result[id] ?? EMPTY), ...patch };
    }
    return result;
  });
  const [status, setStatus] = useState<SyncStatus>(() => ({
    state: 'idle',
    pending: Object.keys(initialQueue).length,
  }));

  const flushing = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closed = useRef(false);
  const callbacks = useRef({ onRemaining, onClosed });
  useEffect(() => {
    callbacks.current = { onRemaining, onClosed };
  });

  const pendingCount = () => Object.keys(queueRef.current).length;

  const send = useCallback(async (): Promise<boolean> => {
    const items = Object.entries(queueRef.current);
    if (items.length === 0 || closed.current) return true;
    if (!navigator.onLine) {
      setStatus({ state: 'offline', pending: items.length });
      return false;
    }

    setStatus((prev) => ({ ...prev, state: 'saving', pending: items.length }));
    try {
      let remaining: number | null;
      if (items.length === 1) {
        const [[examQuestionId, item]] = items;
        const result = await saveAnswer({
          id: attemptId,
          examQuestionId,
          saveAnswerDto: item,
        }).unwrap();
        remaining = result.data.remainingSeconds;
      } else {
        const result = await syncAnswers({
          id: attemptId,
          syncAnswersDto: {
            answers: items.map(([examQuestionId, item]) => ({ examQuestionId, ...item })),
          },
        }).unwrap();
        remaining = result.data.remainingSeconds;
      }

      // Bỏ khỏi hàng đợi những mục đã gửi, trừ mục học viên vừa sửa tiếp trong lúc chờ
      for (const [id, item] of items) {
        if (queueRef.current[id]?.answeredAt === item.answeredAt) delete queueRef.current[id];
      }
      saveQueue(attemptId, queueRef.current);
      setStatus({ state: 'saved', savedAt: new Date(), pending: pendingCount() });
      callbacks.current.onRemaining(remaining);
      return true;
    } catch (cause) {
      const error = toApiError(cause);
      if (error.status === null) {
        // Mất mạng hoặc server không trả lời: giữ hàng đợi, thử lại sau
        setStatus({ state: 'offline', pending: pendingCount() });
        return false;
      }
      if (
        error.code === 'ATTEMPT_EXPIRED' ||
        error.code === 'ATTEMPT_NOT_IN_PROGRESS' ||
        error.code === 'ATTEMPT_NOT_FOUND'
      ) {
        closed.current = true;
        setStatus({ state: 'error', pending: pendingCount(), message: error.message });
        callbacks.current.onClosed();
        return false;
      }
      // Dữ liệu sai (không nên xảy ra từ giao diện): bỏ lô đó để không kẹt hàng đợi
      queueRef.current = {};
      saveQueue(attemptId, queueRef.current);
      setStatus({ state: 'error', pending: 0, message: error.message });
      return false;
    }
  }, [attemptId, saveAnswer, syncAnswers]);

  /** Gửi hết hàng đợi; các lần gọi trùng nhau dùng chung một lượt gửi */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    let ok: boolean;
    // Lặp: trong lúc đang gửi, học viên có thể trả lời thêm câu mới
    do {
      while (flushing.current) await flushing.current;
      if (pendingCount() === 0) return true;
      flushing.current = send().finally(() => {
        flushing.current = null;
      });
      ok = await flushing.current;
    } while (ok && pendingCount() > 0);
    return ok;
  }, [send]);

  const schedule = useCallback(
    (delay: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [flush],
  );

  const change = useCallback(
    (examQuestionId: string, patch: AnswerPatch, typing = false) => {
      if (closed.current) return;
      const answeredAt = new Date().toISOString();
      setAnswers((prev) => ({
        ...prev,
        [examQuestionId]: { ...(prev[examQuestionId] ?? EMPTY), ...patch },
      }));
      queueRef.current = {
        ...queueRef.current,
        [examQuestionId]: { ...queueRef.current[examQuestionId], ...patch, answeredAt },
      };
      saveQueue(attemptId, queueRef.current);
      setStatus((prev) => ({ ...prev, pending: pendingCount() }));
      schedule(typing ? DEBOUNCE.typing : DEBOUNCE.quick);
    },
    [attemptId, schedule],
  );

  // Có mạng lại thì đồng bộ ngay; còn hàng đợi thì cứ vài giây thử lại một lần
  useEffect(() => {
    const online = () => void flush();
    const offline = () => setStatus((prev) => ({ ...prev, state: 'offline' }));
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    const retry = setInterval(() => {
      if (pendingCount() > 0 && !flushing.current) void flush();
    }, RETRY_MS);
    // Mở lại bài còn hàng đợi từ lần trước (đóng tab lúc mất mạng): gửi luôn (sau lần vẽ đầu)
    const first = setTimeout(() => {
      if (pendingCount() > 0) void flush();
    }, 0);
    return () => {
      clearTimeout(first);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      clearInterval(retry);
    };
  }, [flush]);

  // Còn câu chưa lưu mà đóng tab: trình duyệt hỏi lại (hàng đợi vẫn nằm trong localStorage)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingCount() > 0 && !closed.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { answers, status, change, flush };
}
