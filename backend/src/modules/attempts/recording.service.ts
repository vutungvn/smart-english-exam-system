import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fileTypeFromBuffer } from 'file-type';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { isRecordingType, lastProgressSeconds } from './recording-rules.js';

/** Đổi một bài nói 60 giây mất dưới 1 giây; quá lâu là tệp lỗi hoặc ffmpeg treo */
const FFMPEG_TIMEOUT_MS = 30_000;
/** Chỉ giữ phần cuối stderr: đủ chứa dòng tiến độ cuối cùng và thông báo lỗi */
const STDERR_TAIL = 8_000;

export interface NormalizedRecording {
  /** MP3 mono 16 kHz */
  data: Buffer;
  seconds: number;
}

/**
 * Chuẩn hóa bài nói do trình duyệt ghi (Chrome/Edge/Firefox: WebM/Opus, Safari: MP4/AAC) về MP3
 * mono 16 kHz 32 kbps: một định dạng duy nhất để phát lại trên mọi trình duyệt và gửi AI chấm,
 * đủ rõ cho giọng nói và nhẹ (60 giây khoảng 240 KB). Chạy ffmpeg bằng child_process (D18)
 */
@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private readonly ffmpeg: string;

  constructor(config: ConfigService<Env, true>) {
    this.ffmpeg = config.get('FFMPEG_PATH', { infer: true });
  }

  async normalize(input: Buffer): Promise<NormalizedRecording> {
    // Kiểm tra theo nội dung trước khi gọi ffmpeg: chặn sớm ảnh, tài liệu, tệp rác
    if (!isRecordingType((await fileTypeFromBuffer(input))?.mime)) {
      throw new AppException(ErrorCode.ATTEMPT_RECORDING_INVALID);
    }

    // Safari có thể ghi chỉ mục MP4 (moov) ở cuối tệp nên ffmpeg cần đọc cả tệp: ghi ra tệp tạm
    // thay vì đẩy qua stdin. Đầu ra MP3 đọc thẳng từ stdout
    const path = join(tmpdir(), `recording-${randomUUID()}`);
    await writeFile(path, input);
    try {
      const { stdout, stderr } = await this.run([
        '-hide_banner',
        '-nostdin',
        '-i',
        path,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '32k',
        '-f',
        'mp3',
        'pipe:1',
      ]);
      const seconds = lastProgressSeconds(stderr);
      if (stdout.length === 0 || seconds === null) {
        throw new AppException(ErrorCode.ATTEMPT_RECORDING_INVALID);
      }
      return { data: stdout, seconds };
    } finally {
      await rm(path, { force: true });
    }
  }

  private run(args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpeg, args, { windowsHide: true });
      const chunks: Buffer[] = [];
      let stderr = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), FFMPEG_TIMEOUT_MS);

      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL);
      });
      // Không chạy được ffmpeg (chưa cài, sai FFMPEG_PATH): lỗi cấu hình server, không phải lỗi tệp
      child.on('error', (error) => {
        clearTimeout(timer);
        this.logger.error(`Không chạy được ffmpeg (${this.ffmpeg}): ${error.message}`);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout: Buffer.concat(chunks), stderr });
          return;
        }
        this.logger.warn(`ffmpeg không đọc được bài nói (mã ${code}): ${stderr.slice(-300)}`);
        reject(new AppException(ErrorCode.ATTEMPT_RECORDING_INVALID));
      });
    });
  }
}
