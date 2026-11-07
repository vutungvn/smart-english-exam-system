import type {
  AutoFillApplyDto,
  AutoFillCoveragePart,
  AutoFillPartDto,
  AutoFillPreview,
  Difficulty,
  ScoringScale,
} from '@/api/generated';

/** Ô nhập giữ dạng chuỗi để ô trống không thành NaN; đổi sang số lúc gửi */
export interface TopicRow {
  topicId: string;
  min: string;
}

export interface PartConfig {
  /** Đề PERCENT: có rút Part này không */
  enabled: boolean;
  count: string;
  easy: string;
  medium: string;
  hard: string;
  topics: TopicRow[];
  /** Đang mở phần chủ đề */
  open: boolean;
}

export const DEFAULT_RATIO = { easy: '30', medium: '50', hard: '20' };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Vừa',
  HARD: 'Khó',
};

export const partKey = (part: { skill: string; part: number }) => `${part.skill}-${part.part}`;

export const skillLabel = (skill: string) => skill.charAt(0) + skill.slice(1).toLowerCase();

/** "câu" hoặc "nhóm": đơn vị của số lượng và số tối thiểu theo chủ đề */
export const unitLabel = (part: Pick<AutoFillCoveragePart, 'unit'>) =>
  part.unit === 'GROUP' ? 'nhóm' : 'câu';

export function initialConfig(part: AutoFillCoveragePart, scale: ScoringScale): PartConfig {
  return {
    // Đề PERCENT: mặc định bật Part đã có câu trong ngân hàng
    enabled: scale !== 'PERCENT' || part.available > 0,
    count: scale === 'PERCENT' ? String(Math.min(part.available, 10) || 1) : '',
    ...DEFAULT_RATIO,
    topics: [],
    open: false,
  };
}

/** Số đơn vị tối đa cho tổng số tối thiểu theo chủ đề (Reading Part 7 đề TOEIC: 15 nhóm) */
export function maxUnits(part: AutoFillCoveragePart, config: PartConfig): number {
  if (part.reading7Profile) return 15;
  return part.required ?? (Number(config.count) || 0);
}

/** Lỗi của cấu hình một Part; null khi hợp lệ */
export function configError(
  part: AutoFillCoveragePart,
  config: PartConfig,
  scale: ScoringScale,
): string | null {
  if (scale === 'PERCENT') {
    if (!config.enabled) return null;
    const count = Number(config.count);
    if (!Number.isInteger(count) || count < 1 || count > 100) return 'Số lượng từ 1 đến 100';
  }
  const ratio = [config.easy, config.medium, config.hard].map(Number);
  if (ratio.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
    return 'Tỉ lệ độ khó là số nguyên từ 0 đến 100';
  }
  if (ratio.reduce((sum, value) => sum + value, 0) !== 100) {
    return 'Tổng tỉ lệ độ khó phải bằng 100%';
  }
  const rows = config.topics.filter((row) => row.topicId);
  if (new Set(rows.map((row) => row.topicId)).size !== rows.length) return 'Chủ đề bị lặp lại';
  if (rows.some((row) => !Number.isInteger(Number(row.min)) || Number(row.min) < 1)) {
    return 'Số tối thiểu theo chủ đề từ 1';
  }
  const total = rows.reduce((sum, row) => sum + Number(row.min), 0);
  const max = maxUnits(part, config);
  if (total > max) return `Tổng tối thiểu theo chủ đề vượt ${max} ${unitLabel(part)}`;
  return null;
}

/** Ma trận → body xem trước */
export function toPreviewParts(
  parts: AutoFillCoveragePart[],
  configs: Record<string, PartConfig>,
  scale: ScoringScale,
): AutoFillPartDto[] {
  return parts
    .filter((part) => configs[partKey(part)].enabled)
    .map((part) => {
      const config = configs[partKey(part)];
      return {
        skill: part.skill,
        part: part.part,
        ...(scale === 'PERCENT' ? { count: Number(config.count) } : {}),
        difficulty: {
          easy: Number(config.easy),
          medium: Number(config.medium),
          hard: Number(config.hard),
        },
        topics: config.topics
          .filter((row) => row.topicId)
          .map((row) => ({ topicId: row.topicId, min: Number(row.min) })),
      };
    });
}

/** Kết quả xem trước → body áp dụng: đúng các câu, nhóm đã xem, đúng thứ tự */
export function toApplyBody(preview: AutoFillPreview, updatedAt: string): AutoFillApplyDto {
  return {
    scope: preview.scope,
    updatedAt,
    parts: preview.parts
      .filter((part) => !part.kept && part.items.length > 0)
      .map((part) => ({
        skill: part.skill,
        part: part.part,
        questionIds: part.items.flatMap((item) => (item.questionId ? [item.questionId] : [])),
        groupIds: part.items.flatMap((item) => (item.groupId ? [item.groupId] : [])),
      })),
  };
}
