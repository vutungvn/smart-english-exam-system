import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { MeService } from './me.service.js';
import { MeProfile } from './me.types.js';
import { InMemoryFile } from '../../common/types/in-memory-file.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import {
  AVATAR_CACHE_CONTROL,
  AVATAR_KEY_PREFIX,
  avatarKeyFromUrl,
  avatarUrl,
} from '../media/media.constants.js';

// Tệp gửi lên tối đa 5 MB (multer chặn trước khi vào service, trả 413)
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 256;
// Chặn "bom giải nén": ảnh nén nhỏ nhưng kích thước điểm ảnh khổng lồ
const MAX_INPUT_PIXELS = 50_000_000;
// Định dạng sharp đọc ra từ nội dung tệp, không tin đuôi tệp hay Content-Type do client gửi
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly me: MeService,
  ) {}

  async upload(userId: string, file: InMemoryFile | undefined): Promise<MeProfile> {
    if (!file) {
      throw new AppException(ErrorCode.AVATAR_INVALID_IMAGE, 'Vui lòng chọn một ảnh để tải lên');
    }

    const image = await this.toAvatar(file.buffer);
    const oldUrl = await this.currentAvatarUrl(userId);

    const fileName = `${randomUUID()}.webp`;
    const key = AVATAR_KEY_PREFIX + fileName;
    await this.storage.save(key, image, {
      contentType: 'image/webp',
      cacheControl: AVATAR_CACHE_CONTROL,
    });

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: avatarUrl(fileName) },
      });
    } catch (error) {
      // Không lưu được vào DB thì dọn tệp vừa tải lên, tránh tệp mồ côi trong bucket
      await this.deleteQuietly(key);
      throw error;
    }

    await this.deleteStoredAvatar(oldUrl);
    return this.me.getProfile(userId);
  }

  async remove(userId: string): Promise<MeProfile> {
    const oldUrl = await this.currentAvatarUrl(userId);

    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    await this.deleteStoredAvatar(oldUrl);

    return this.me.getProfile(userId);
  }

  /** Cắt vuông ở giữa, thu về 256×256 WebP; sharp mặc định bỏ toàn bộ EXIF (có thể chứa vị trí GPS) */
  private async toAvatar(input: Buffer): Promise<Buffer> {
    try {
      const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
      const { format } = await image.metadata();
      if (!format || !ALLOWED_FORMATS.has(format)) throw new Error(`Định dạng ${format}`);

      return await image
        .autoOrient() // xoay theo EXIF trước khi bỏ EXIF, ảnh chụp điện thoại không bị nằm ngang
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      // Không phải ảnh, ảnh hỏng, định dạng không hỗ trợ hoặc quá nhiều điểm ảnh
      throw new AppException(ErrorCode.AVATAR_INVALID_IMAGE);
    }
  }

  private async currentAvatarUrl(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'Tài khoản không còn tồn tại');
    return user.avatarUrl;
  }

  // Chỉ xóa ảnh do hệ thống lưu; ảnh Google (URL ngoài) thì bỏ qua
  private async deleteStoredAvatar(url: string | null): Promise<void> {
    const key = avatarKeyFromUrl(url);
    if (key) await this.deleteQuietly(key);
  }

  // Xóa tệp cũ là việc dọn dẹp: lỗi thì ghi log, không làm hỏng thao tác chính đã thành công
  private async deleteQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch {
      this.logger.warn(`Không xóa được tệp ${key}, cần dọn tay`);
    }
  }
}
