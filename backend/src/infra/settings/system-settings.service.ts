import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  parseSettings,
  SETTING_DEFAULTS,
  type SettingGroup,
  type SettingsValues,
} from './settings.schema.js';

/**
 * Nơi duy nhất nghiệp vụ đọc cấu hình hệ thống. Không cache: tra theo khóa chính, chỉ đọc lúc nộp
 * bài, gọi AI, dọn bản ghi âm, nên admin lưu xong là có hiệu lực ngay
 */
@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get<G extends SettingGroup>(group: G): Promise<SettingsValues[G]> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { group },
      select: { value: true },
    });
    return this.resolve(group, row?.value);
  }

  /** Dữ liệu lưu bị hỏng thì dùng mặc định, không làm gián đoạn nộp bài, chấm bài */
  resolve<G extends SettingGroup>(group: G, stored: unknown): SettingsValues[G] {
    const values = parseSettings(group, stored);
    if (values) return values;
    this.logger.error(`Cấu hình "${group}" trong DB không hợp lệ, đang dùng giá trị mặc định`);
    return SETTING_DEFAULTS[group];
  }
}
