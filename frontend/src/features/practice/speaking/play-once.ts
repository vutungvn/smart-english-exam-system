import { loadBlob } from '@/components/media/audio-cache';

/**
 * Phát audio câu hỏi Speaking một lần (như thi thật: không tua, không nghe lại) và chờ phát xong.
 * Tải bằng fetch rồi phát từ blob: như MediaAudio để trình quản lý tải xuống (IDM) không bắt tệp.
 * Trả về hàm dừng để hủy khi rời câu
 */
export function playOnce(url: string): { done: Promise<void>; stop: () => void } {
  const audio = new Audio();
  let objectUrl: string | undefined;
  let stopped = false;

  const done = loadBlob(url).then(
    (blob) =>
      new Promise<void>((resolve) => {
        if (stopped) return resolve();
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        audio.onended = () => resolve();
        // Không phát được (tệp lỗi, trình duyệt chặn tự phát): vẫn đi tiếp, đề bài có sẵn trên màn
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      }),
    () => undefined,
  );

  return {
    done: done.finally(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }),
    stop: () => {
      stopped = true;
      audio.pause();
      audio.onended?.(new Event('ended'));
    },
  };
}
