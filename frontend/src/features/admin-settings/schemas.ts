import * as z from 'zod';
import type {
  AiRanges,
  AiSettingsDto,
  ConversionPointDto,
  RecordingRanges,
  RecordingSettingsDto,
  ScoringRules,
  ScoringSettingsDto,
  SettingConversionRule,
  SettingRange,
} from '@/api/generated';
import { rangeHint, SCORING_SKILLS } from './labels';

// Luật khớp settings.schema.ts ở backend; khoảng hợp lệ lấy từ API nên không viết cứng ở đây.
// Ô số giữ dạng chuỗi để ô trống không thành NaN

const RAW_MAX = 100;

const isInteger = (value: string) => /^\d+$/.test(value.trim());

function integerInRange(range: SettingRange) {
  return z
    .string()
    .refine(isInteger, 'Nhập một số nguyên')
    .refine(
      (value) => !isInteger(value) || (Number(value) >= range.min && Number(value) <= range.max),
      rangeHint(range),
    );
}

// ---------------------------------------------------------------------------------------------
// Hạn mức AI

export interface AiForm {
  dailyBudget: string;
  explainDailyLimit: string;
}

export const toAiForm = (values: AiSettingsDto): AiForm => ({
  dailyBudget: String(values.dailyBudget),
  explainDailyLimit: String(values.explainDailyLimit),
});

export function aiSchema(ranges: AiRanges) {
  return z
    .object({
      dailyBudget: integerInRange(ranges.dailyBudget),
      explainDailyLimit: integerInRange(ranges.explainDailyLimit),
    })
    .superRefine((values, ctx) => {
      if (Number(values.explainDailyLimit) > Number(values.dailyBudget)) {
        ctx.addIssue({
          code: 'custom',
          path: ['explainDailyLimit'],
          message: 'Không được lớn hơn tổng lượt AI mỗi ngày',
        });
      }
    });
}

// ---------------------------------------------------------------------------------------------
// Ghi âm Speaking

export interface RecordingForm {
  retentionDays: string;
}

export const toRecordingForm = (values: RecordingSettingsDto): RecordingForm => ({
  retentionDays: String(values.retentionDays),
});

export function recordingSchema(ranges: RecordingRanges) {
  return z.object({ retentionDays: integerInRange(ranges.retentionDays) });
}

// ---------------------------------------------------------------------------------------------
// Quy đổi điểm

export interface PointForm {
  raw: string;
  score: string;
}

export interface ScoringForm {
  listening: PointForm[];
  reading: PointForm[];
  speaking: PointForm[];
  writing: PointForm[];
}

const toPointForms = (points: ConversionPointDto[]): PointForm[] =>
  points.map(({ raw, score }) => ({ raw: String(raw), score: String(score) }));

export const toScoringForm = (values: ScoringSettingsDto): ScoringForm => ({
  listening: toPointForms(values.listening),
  reading: toPointForms(values.reading),
  speaking: toPointForms(values.speaking),
  writing: toPointForms(values.writing),
});

const toPoints = (rows: PointForm[]): ConversionPointDto[] =>
  rows.map(({ raw, score }) => ({ raw: Number(raw), score: Number(score) }));

export const toScoringDto = (values: ScoringForm): ScoringSettingsDto => ({
  listening: toPoints(values.listening),
  reading: toPoints(values.reading),
  speaking: toPoints(values.speaking),
  writing: toPoints(values.writing),
});

/** Các mốc đã nhập đủ và đúng thứ tự, để vẽ biểu đồ khi bảng đang sửa dở */
export function drawablePoints(rows: PointForm[]): ConversionPointDto[] {
  const points = rows.filter((row) => isInteger(row.raw) && isInteger(row.score));
  return toPoints(points).sort((a, b) => a.raw - b.raw);
}

/** Mốc gợi ý khi chèn giữa hai mốc: nằm chính giữa, điểm nội suy làm tròn theo bước */
export function suggestPoint(from: PointForm, to: PointForm, step: number): PointForm {
  const [start, end] = toPoints([from, to]);
  if (![from, to].every((row) => isInteger(row.raw) && isInteger(row.score))) {
    return { raw: '', score: '' };
  }
  const raw = Math.floor((start.raw + end.raw) / 2);
  const ratio = end.raw === start.raw ? 0 : (raw - start.raw) / (end.raw - start.raw);
  const score = Math.round((start.score + (end.score - start.score) * ratio) / step) * step;
  return { raw: String(raw), score: String(score) };
}

function tableSchema(rule: SettingConversionRule, count: SettingRange) {
  return z.array(z.object({ raw: z.string(), score: z.string() })).superRefine((rows, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (rows.length < count.min || rows.length > count.max) {
      issue([], `Bảng quy đổi cần từ ${count.min} đến ${count.max} mốc`);
      return;
    }
    rows.forEach((row, i) => {
      const previous = i > 0 ? rows[i - 1] : undefined;
      const raw = Number(row.raw);
      const score = Number(row.score);

      if (!isInteger(row.raw)) issue([i, 'raw'], 'Nhập số nguyên');
      else if (raw > RAW_MAX) issue([i, 'raw'], `Từ 0 đến ${RAW_MAX}`);
      else if (previous && isInteger(previous.raw) && raw <= Number(previous.raw)) {
        issue([i, 'raw'], 'Phải lớn hơn mốc trước');
      }

      if (!isInteger(row.score)) issue([i, 'score'], 'Nhập số nguyên');
      else if (score < rule.minScore || score > rule.maxScore) {
        issue([i, 'score'], `Từ ${rule.minScore} đến ${rule.maxScore}`);
      } else if (score % rule.step !== 0) {
        issue([i, 'score'], `Bội số của ${rule.step}`);
      } else if (previous && isInteger(previous.score) && score < Number(previous.score)) {
        issue([i, 'score'], 'Không được thấp hơn mốc trước');
      }
    });
  });
}

export function scoringSchema(rules: ScoringRules) {
  return z.object({
    listening: tableSchema(rules.listening, rules.points),
    reading: tableSchema(rules.reading, rules.points),
    speaking: tableSchema(rules.speaking, rules.points),
    writing: tableSchema(rules.writing, rules.points),
  });
}

/** Kỹ năng đầu tiên có lỗi (theo thứ tự hiển thị), để chuyển tới đó sau khi bấm Lưu */
export const firstInvalidSkill = (errors: Partial<Record<string, unknown>>) =>
  SCORING_SKILLS.find(({ value }) => errors[value] !== undefined)?.value;
