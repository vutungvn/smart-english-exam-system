/**
 * Bài nói chưa tải lên được (mất mạng, server lỗi) giữ trong IndexedDB để không mất khi tải lại
 * trang hay đóng tab; tải lên xong thì xóa. Blob vài trăm KB nên không dùng localStorage (chỉ lưu
 * chuỗi, giới hạn khoảng 5 MB). Không dùng thư viện: chỉ cần thêm, đọc, xóa theo bài làm
 */
const DB_NAME = 'smart-exam';
const STORE = 'pending-recordings';

export interface PendingRecording {
  /** `${attemptId}:${examQuestionId}` */
  key: string;
  attemptId: string;
  examQuestionId: string;
  blob: Blob;
  recordedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
      store.createIndex('attemptId', 'attemptId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không mở được IndexedDB'));
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Lỗi IndexedDB'));
    });
  } finally {
    db.close();
  }
}

export const recordingKey = (attemptId: string, examQuestionId: string) =>
  `${attemptId}:${examQuestionId}`;

/**
 * IndexedDB có thể bị chặn (một số chế độ riêng tư): khi đó chỉ mất khả năng giữ bài nói qua lần
 * tải trang, việc tải lên vẫn chạy trong bộ nhớ
 */
export async function savePending(item: Omit<PendingRecording, 'key'>): Promise<void> {
  try {
    await run('readwrite', (store) =>
      store.put({ ...item, key: recordingKey(item.attemptId, item.examQuestionId) }),
    );
  } catch {
    // bỏ qua
  }
}

export async function listPending(attemptId: string): Promise<PendingRecording[]> {
  try {
    return (await run('readonly', (store) =>
      store.index('attemptId').getAll(attemptId),
    )) as PendingRecording[];
  } catch {
    return [];
  }
}

export async function removePending(attemptId: string, examQuestionId: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(recordingKey(attemptId, examQuestionId)));
  } catch {
    // bỏ qua
  }
}
