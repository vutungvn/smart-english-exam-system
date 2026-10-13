import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Env } from '../../config/env.schema.js';
import { QUESTION_MEDIA_KEY_PREFIX, QUESTION_MEDIA_URL_PREFIX } from './media.constants.js';

// URL còn hạn ít nhất 4 giờ: đủ cho một bài thi LR 120 phút kể cả khi tải trang từ đầu giờ
const URL_TTL_SECONDS = 4 * 60 * 60;
// Làm tròn hạn lên đầu giờ kế tiếp: trong cùng một giờ URL không đổi nên trình duyệt dùng lại cache
const ROUND_SECONDS = 60 * 60;

export interface MediaKeys {
  audioKey: string | null;
  imageKey: string | null;
}

export interface MediaUrls {
  audioUrl: string | null;
  imageUrl: string | null;
}

/**
 * URL có chữ ký cho audio, ảnh câu hỏi. Bucket riêng tư và <audio>/<img> không gửi được header
 * Bearer, nên kiểm tra quyền diễn ra lúc PHÁT URL: chỉ API đã kiểm tra quyền xem câu hỏi/đề mới
 * trả URL; route /media/questions chỉ kiểm tra chữ ký và hạn dùng.
 */
@Injectable()
export class MediaUrlService {
  private readonly key: Buffer;

  constructor(config: ConfigService<Env, true>) {
    // Khóa ký riêng, dẫn xuất từ secret JWT: không cần thêm biến môi trường,
    // và chữ ký URL không dùng lại được làm chữ ký JWT
    this.key = createHmac('sha256', config.get('JWT_ACCESS_SECRET', { infer: true }))
      .update('media-url-v1')
      .digest();
  }

  /** null khi câu chưa có tệp, hoặc key không phải tệp câu hỏi */
  questionMediaUrl(key: string | null, now = Date.now()): string | null {
    if (!key?.startsWith(QUESTION_MEDIA_KEY_PREFIX)) return null;
    const file = key.slice(QUESTION_MEDIA_KEY_PREFIX.length);
    const exp = (
      Math.ceil(now / 1000 / ROUND_SECONDS) * ROUND_SECONDS +
      URL_TTL_SECONDS
    ).toString();
    return `${QUESTION_MEDIA_URL_PREFIX}${file}?exp=${exp}&sig=${this.sign(file, exp)}`;
  }

  /** Thêm audioUrl, imageUrl cạnh audioKey, imageKey */
  withUrls<T extends MediaKeys>(item: T): T & MediaUrls {
    return {
      ...item,
      audioUrl: this.questionMediaUrl(item.audioKey),
      imageUrl: this.questionMediaUrl(item.imageKey),
    };
  }

  verify(file: string, exp: unknown, sig: unknown, now = Date.now()): boolean {
    if (typeof exp !== 'string' || typeof sig !== 'string' || !/^\d{1,12}$/.test(exp)) return false;
    if (Number(exp) * 1000 < now) return false;

    const expected = Buffer.from(this.sign(file, exp));
    const actual = Buffer.from(sig);
    // So sánh thời gian hằng: không lộ chữ ký đúng qua thời gian phản hồi
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private sign(file: string, exp: string): string {
    return createHmac('sha256', this.key).update(`${file}:${exp}`).digest('base64url');
  }
}
