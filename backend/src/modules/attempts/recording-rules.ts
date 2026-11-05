// Quy tắc thuần của bài nói Speaking (không đụng DB, không chạy ffmpeg) để test được riêng

/** Bài nói dài nhất 60 giây (S5): WebM/Opus khoảng 0,5 MB, MP4/AAC khoảng 1 MB; 10 MB là dư sức */
export const RECORDING_MAX_BYTES = 10 * 1024 * 1024;

/** Trình duyệt dừng ghi trễ vài trăm mili giây sau khi hết giờ, cộng phần đệm của bộ mã hóa */
export const RECORDING_TOLERANCE_SECONDS = 3;

/**
 * Định dạng MediaRecorder của các trình duyệt ghi ra, nhận dạng theo NỘI DUNG tệp: Chrome, Edge
 * WebM/Opus (thư viện nhận là video/webm), Firefox WebM hoặc Ogg/Opus, Safari MP4/AAC
 */
const INPUT_TYPES = new Set([
  'audio/webm',
  'video/webm',
  'audio/ogg',
  'audio/opus',
  'audio/mp4',
  'video/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]);

export function isRecordingType(mime: string | undefined): boolean {
  return mime !== undefined && INPUT_TYPES.has(mime);
}

/**
 * Thời lượng (giây) theo dòng tiến độ cuối cùng ffmpeg in ra stderr ("time=00:00:12.34"). Không
 * dùng dòng "Duration:" của tệp đầu vào vì WebM do trình duyệt ghi thường không có thời lượng
 */
export function lastProgressSeconds(stderr: string): number | null {
  const matches = [...stderr.matchAll(/time=(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g)];
  const last = matches.at(-1);
  if (!last) return null;
  return Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]);
}

/** Dài hơn thời gian trả lời của câu (cộng dung sai); câu không ghi thời gian trả lời thì không chặn */
export function recordingTooLong(seconds: number, responseSeconds: number | null): boolean {
  return responseSeconds !== null && seconds > responseSeconds + RECORDING_TOLERANCE_SECONDS;
}
