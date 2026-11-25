import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditContext } from '../../infra/audit/audit-context.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  CONVERSION_RULES,
  isSettingGroup,
  SETTING_DEFAULTS,
  SETTING_RANGES,
  validateSettings,
  type SettingGroup,
  type SettingsValues,
} from '../../infra/settings/settings.schema.js';
import { SystemSettingsService } from '../../infra/settings/system-settings.service.js';
import { expiredRecordingsWhere } from '../attempts/recording-rules.js';
import { settingsDiff } from './settings-audit.js';
import type { AdminSettings, PublicSettings, RecordingImpact } from './settings.types.js';

const rowSelect = {
  group: true,
  value: true,
  updatedAt: true,
  updatedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.SystemSettingSelect;

type SettingRow = Prisma.SystemSettingGetPayload<{ select: typeof rowSelect }>;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SystemSettingsService,
    private readonly audit: AuditContext,
  ) {}

  async findAll(): Promise<AdminSettings> {
    const rows = await this.prisma.systemSetting.findMany({ select: rowSelect });
    return {
      scoring: {
        ...this.view('scoring', rows),
        rules: { ...CONVERSION_RULES, points: SETTING_RANGES.conversionPoints },
      },
      ai: {
        ...this.view('ai', rows),
        ranges: {
          dailyBudget: SETTING_RANGES.dailyBudget,
          explainDailyLimit: SETTING_RANGES.explainDailyLimit,
        },
      },
      recording: {
        ...this.view('recording', rows),
        ranges: { retentionDays: SETTING_RANGES.retentionDays },
      },
    };
  }

  async update<G extends SettingGroup>(
    group: G,
    dto: SettingsValues[G] & { updatedAt: string },
    adminId: string,
  ): Promise<AdminSettings> {
    const { updatedAt, ...values } = dto;
    const result = validateSettings(group, values);
    if (!result.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        undefined,
        result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
      );
    }
    return this.save(group, result.data, updatedAt, adminId);
  }

  async reset(group: string, updatedAt: string, adminId: string): Promise<AdminSettings> {
    if (!isSettingGroup(group)) throw new AppException(ErrorCode.SETTING_GROUP_NOT_FOUND);
    return this.save(group, null, updatedAt, adminId);
  }

  async recordingImpact(retentionDays: number): Promise<RecordingImpact> {
    return {
      recordingCount: await this.prisma.attemptAnswer.count({
        where: expiredRecordingsWhere(retentionDays, new Date()),
      }),
    };
  }

  async findPublic(): Promise<PublicSettings> {
    const { retentionDays } = await this.settings.get('recording');
    return { recordingRetentionDays: retentionDays };
  }

  /** values null: khôi phục mặc định (lưu {} để sau này đổi mặc định trong code thì tự theo) */
  private async save<G extends SettingGroup>(
    group: G,
    values: SettingsValues[G] | null,
    updatedAt: string,
    adminId: string,
  ): Promise<AdminSettings> {
    const before = await this.settings.get(group);

    // Khóa lạc quan: chỉ ghi khi updatedAt còn khớp lần đọc của admin (tab khác đã lưu thì 409)
    const { count } = await this.prisma.systemSetting.updateMany({
      where: { group, updatedAt: new Date(updatedAt) },
      data: {
        value: values ?? {},
        updatedById: adminId,
      },
    });
    if (count === 0) throw new AppException(ErrorCode.VERSION_CONFLICT);

    const diff = settingsDiff(before, values ?? SETTING_DEFAULTS[group]);
    this.audit.setBefore(diff.before);
    this.audit.setAfter(diff.after);
    this.audit.setMeta({ group });

    return this.findAll();
  }

  private view<G extends SettingGroup>(group: G, rows: SettingRow[]) {
    const row = rows.find((item) => item.group === group);
    // Các dòng do migration tạo sẵn; thiếu nghĩa là DB bị sửa tay
    if (!row) throw new Error(`Thiếu nhóm cấu hình "${group}" trong system_settings`);
    const values = this.settings.resolve(group, row.value);
    const defaults = SETTING_DEFAULTS[group];
    return {
      values,
      defaults,
      isDefault: JSON.stringify(values) === JSON.stringify(defaults),
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
}
