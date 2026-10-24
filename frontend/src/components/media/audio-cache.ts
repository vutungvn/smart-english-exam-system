/**
 * Tệp audio đã tải, dùng lại khi quay lại câu cũ (giới hạn số tệp để không giữ quá nhiều trong bộ
 * nhớ). Lưu Promise để nhiều trình phát cùng một tệp chỉ tải một lần.
 */
const CACHE_LIMIT = 40;
const cache = new Map<string, Promise<Blob>>();

export function loadBlob(url: string): Promise<Blob> {
  const cached = cache.get(url);
  if (cached) return cached;
  const promise = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  });
  // Lỗi thì bỏ khỏi cache để bấm "Thử lại" tải lại thật
  promise.catch(() => cache.delete(url));
  cache.set(url, promise);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return promise;
}

/**
 * Tải trước tệp vào cache (ví dụ audio của Part kế tiếp trong lúc làm Part hiện tại): lúc mở Part đó
 * phát được ngay, và lượng tải trải đều theo thời gian làm bài thay vì dồn vào một lúc
 */
export function preloadAudio(url: string): void {
  if (url.startsWith('blob:')) return;
  // Lỗi thì thôi: lúc mở câu đó trình phát tự tải lại
  loadBlob(url).catch(() => undefined);
}
