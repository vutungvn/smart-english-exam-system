import { describe, expect, it } from 'vitest';
import {
  isRecordingType,
  lastProgressSeconds,
  RECORDING_TOLERANCE_SECONDS,
  recordingTooLong,
} from './recording-rules.js';

describe('Bài nói Speaking', () => {
  it('nhận định dạng MediaRecorder của Chrome, Firefox, Safari; từ chối ảnh, tài liệu', () => {
    for (const mime of ['video/webm', 'audio/webm', 'audio/ogg', 'video/mp4', 'audio/mp4']) {
      expect(isRecordingType(mime)).toBe(true);
    }
    for (const mime of ['image/png', 'application/pdf', undefined]) {
      expect(isRecordingType(mime)).toBe(false);
    }
  });

  it('lấy thời lượng từ dòng tiến độ CUỐI CÙNG của ffmpeg', () => {
    const stderr = [
      'Input #0, matroska,webm, from recording:',
      '  Duration: N/A, start: 0.000000, bitrate: N/A',
      'size=      12kB time=00:00:03.12 bitrate=  31.5kbits/s speed=60x',
      'size=      58kB time=00:00:14.80 bitrate=  32.1kbits/s speed=61x',
      '[out#0/mp3] video:0kB audio:58kB',
    ].join('\r');
    expect(lastProgressSeconds(stderr)).toBeCloseTo(14.8);
    expect(lastProgressSeconds('size=1kB time=01:02:03.5')).toBeCloseTo(3723.5);
    expect(lastProgressSeconds('Invalid data found when processing input')).toBeNull();
  });

  it('chặn bài nói dài hơn thời gian trả lời cộng dung sai; câu không ghi thời gian thì không chặn', () => {
    expect(recordingTooLong(30 + RECORDING_TOLERANCE_SECONDS, 30)).toBe(false);
    expect(recordingTooLong(30 + RECORDING_TOLERANCE_SECONDS + 0.1, 30)).toBe(true);
    expect(recordingTooLong(500, null)).toBe(false);
  });
});
