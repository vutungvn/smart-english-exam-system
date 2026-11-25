import { z } from 'zod';

// Định nghĩa cấu hình hệ thống (SPRINT-69): giá trị mặc định, khoảng hợp lệ, luật kiểm tra. Hàm
// thuần, dùng chung khi admin lưu và khi đọc từ DB

export interface ConversionPoint {
  /** LR: số câu đúng (0–100); SW: tỉ lệ % điểm thô (0–100) */
  raw: number;
  /** Điểm quy đổi */
  score: number;
}

export interface ConversionRule {
  minScore: number;
  maxScore: number;
  /** Điểm là bội số của step */
  step: number;
}

const LR_RULE: ConversionRule = { minScore: 5, maxScore: 495, step: 5 };
const SW_RULE: ConversionRule = { minScore: 0, maxScore: 200, step: 10 };

export const CONVERSION_RULES = {
  listening: LR_RULE,
  reading: LR_RULE,
  speaking: SW_RULE,
  writing: SW_RULE,
};

export const RAW_MAX = 100;

export const SETTING_RANGES = {
  /** Số mốc của một bảng quy đổi */
  conversionPoints: { min: 2, max: 30 },
  dailyBudget: { min: 10, max: 100_000 },
  explainDailyLimit: { min: 1, max: 500 },
  // Tối đa 30: học viên đã đồng ý "lưu tối đa 30 ngày" khi cho phép ghi âm (D19)
  retentionDays: { min: 7, max: 30 },
};

interface ConversionIssue {
  path: (string | number)[];
  message: string;
}

function conversionIssues(points: ConversionPoint[], rule: ConversionRule): ConversionIssue[] {
  const { min, max } = SETTING_RANGES.conversionPoints;
  if (points.length < min || points.length > max) {
    return [{ path: [], message: `Bảng quy đổi cần từ ${min} đến ${max} mốc` }];
  }

  const issues: ConversionIssue[] = [];
  points.forEach(({ raw, score }, i) => {
    const previous = i > 0 ? points[i - 1] : undefined;
    if (raw < 0 || raw > RAW_MAX) {
      issues.push({ path: [i, 'raw'], message: `Mốc phải từ 0 đến ${RAW_MAX}` });
    } else if (previous && raw <= previous.raw) {
      issues.push({ path: [i, 'raw'], message: 'Mốc phải lớn hơn mốc trước' });
    }
    if (score < rule.minScore || score > rule.maxScore) {
      issues.push({
        path: [i, 'score'],
        message: `Điểm phải từ ${rule.minScore} đến ${rule.maxScore}`,
      });
    } else if (score % rule.step !== 0) {
      issues.push({ path: [i, 'score'], message: `Điểm phải là bội số của ${rule.step}` });
    } else if (previous && score < previous.score) {
      issues.push({ path: [i, 'score'], message: 'Điểm không được thấp hơn mốc trước' });
    }
  });

  const last = points.length - 1;
  if (points[0].raw !== 0 || points[0].score !== rule.minScore) {
    issues.push({ path: [0, 'raw'], message: `Mốc đầu phải là 0 → ${rule.minScore} điểm` });
  }
  if (points[last].raw !== RAW_MAX || points[last].score !== rule.maxScore) {
    issues.push({
      path: [last, 'raw'],
      message: `Mốc cuối phải là ${RAW_MAX} → ${rule.maxScore} điểm`,
    });
  }
  return issues;
}

function conversionTable(rule: ConversionRule) {
  return z.array(z.object({ raw: z.int(), score: z.int() })).superRefine((points, ctx) => {
    for (const { path, message } of conversionIssues(points, rule)) {
      ctx.addIssue({ code: 'custom', path, message });
    }
  });
}

function intInRange(label: string, range: { min: number; max: number }) {
  const message = `${label} phải từ ${range.min} đến ${range.max}`;
  return z.int(message).min(range.min, message).max(range.max, message);
}

const SETTING_SCHEMAS = {
  scoring: z.object({
    listening: conversionTable(CONVERSION_RULES.listening),
    reading: conversionTable(CONVERSION_RULES.reading),
    speaking: conversionTable(CONVERSION_RULES.speaking),
    writing: conversionTable(CONVERSION_RULES.writing),
  }),
  ai: z
    .object({
      dailyBudget: intInRange('Tổng lượt AI mỗi ngày', SETTING_RANGES.dailyBudget),
      explainDailyLimit: intInRange('Lượt giải thích đáp án', SETTING_RANGES.explainDailyLimit),
    })
    .refine((ai) => ai.explainDailyLimit <= ai.dailyBudget, {
      path: ['explainDailyLimit'],
      message: 'Lượt của một học viên không được lớn hơn tổng lượt AI mỗi ngày',
    }),
  recording: z.object({
    retentionDays: intInRange('Số ngày giữ bản ghi âm', SETTING_RANGES.retentionDays),
  }),
};

export type SettingsValues = {
  [G in keyof typeof SETTING_SCHEMAS]: z.infer<(typeof SETTING_SCHEMAS)[G]>;
};
export type SettingGroup = keyof SettingsValues;
export type ScoringSettings = SettingsValues['scoring'];

export const SETTING_GROUPS = Object.keys(SETTING_SCHEMAS) as SettingGroup[];

export function isSettingGroup(value: string): value is SettingGroup {
  return (SETTING_GROUPS as string[]).includes(value);
}

/** Mốc viết gọn [raw, score] */
const toPoints = (pairs: [number, number][]): ConversionPoint[] =>
  pairs.map(([raw, score]) => ({ raw, score }));

/**
 * Bảng quy đổi mặc định là BẢNG THAM KHẢO dựng từ các mốc phổ biến trên tài liệu luyện thi, KHÔNG
 * phải bảng chính thức của ETS (ETS quy đổi riêng theo từng đề, D13). Giữa hai mốc nội suy tuyến tính
 */
export const SETTING_DEFAULTS: SettingsValues = {
  scoring: {
    // Số câu đúng → điểm
    listening: toPoints([
      [0, 5],
      [10, 20],
      [20, 70],
      [30, 125],
      [40, 185],
      [50, 250],
      [60, 310],
      [70, 370],
      [80, 430],
      [90, 480],
      [95, 495],
      [100, 495],
    ]),
    reading: toPoints([
      [0, 5],
      [10, 10],
      [20, 55],
      [30, 110],
      [40, 165],
      [50, 220],
      [60, 280],
      [70, 335],
      [80, 395],
      [90, 450],
      [95, 475],
      [100, 495],
    ]),
    // Tỉ lệ % điểm thô → điểm
    speaking: toPoints([
      [0, 0],
      [20, 40],
      [40, 90],
      [55, 120],
      [70, 150],
      [85, 180],
      [95, 200],
      [100, 200],
    ]),
    writing: toPoints([
      [0, 0],
      [20, 40],
      [35, 80],
      [50, 110],
      [65, 140],
      [80, 170],
      [90, 190],
      [100, 200],
    ]),
  },
  // Ngày tính theo giờ Thái Bình Dương như Google (ai-quota.ts). 1000: gói Free 500 lượt × 2 model
  // Flash-Lite. Lời giải thích lấy từ cache không tính lượt
  ai: { dailyBudget: 1000, explainDailyLimit: 20 },
  recording: { retentionDays: 30 },
};

export function validateSettings<G extends SettingGroup>(
  group: G,
  values: unknown,
): z.ZodSafeParseResult<SettingsValues[G]> {
  const schemas: { [K in SettingGroup]: z.ZodType<SettingsValues[K]> } = SETTING_SCHEMAS;
  return schemas[group].safeParse(values);
}

/** Giá trị đang dùng: phần lưu trong DB đè lên mặc định; null khi dữ liệu lưu không hợp lệ */
export function parseSettings<G extends SettingGroup>(
  group: G,
  stored: unknown,
): SettingsValues[G] | null {
  const saved = typeof stored === 'object' && stored !== null ? stored : {};
  const result = validateSettings(group, { ...SETTING_DEFAULTS[group], ...saved });
  return result.success ? result.data : null;
}
