import { seededOrder } from '../../../common/utils/seeded-order.js';
import { Difficulty, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import { findPartRule } from '../../questions/toeic-parts.js';
import { groupSizeOf, quotaOf } from '../exam-structure.js';

// Rút đề tự động theo ma trận (SPRINT-50). Hàm thuần, không đụng DB, để test riêng

export interface DifficultyRatio {
  easy: number;
  medium: number;
  hard: number;
}

/** Tỉ lệ độ khó mặc định (%) */
export const DEFAULT_RATIO: DifficultyRatio = { easy: 30, medium: 50, hard: 20 };

export const LEVELS = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD] as const;

const LEVEL_LABEL: Record<Difficulty, string> = {
  [Difficulty.EASY]: 'Dễ',
  [Difficulty.MEDIUM]: 'Vừa',
  [Difficulty.HARD]: 'Khó',
};

/** Một ứng viên: câu đơn (Part câu đơn) hoặc cả nhóm câu (Part nhóm) */
export interface Candidate {
  /** id câu hoặc id nhóm */
  key: string;
  difficulty: Difficulty;
  topicId: string;
  /** Số đề KHÁC đang dùng câu (nhóm: câu dùng nhiều nhất) */
  usedCount: number;
  /** Số câu: câu đơn là 1 */
  size: number;
  /** Nhóm có biểu đồ, bảng (Listening 3, 4) */
  hasGraphic: boolean;
}

export interface TopicMin {
  topicId: string;
  /** Số tối thiểu, tính theo đơn vị của Part (câu hoặc nhóm) */
  min: number;
}

export interface PickOptions {
  count: number;
  ratio: DifficultyRatio;
  topics: readonly TopicMin[];
  preferUnused: boolean;
  seed: string;
  /** Tên chủ đề để ghi vào báo cáo */
  topicName: (topicId: string) => string;
  /** "câu" hoặc "nhóm" */
  unitLabel: string;
}

export interface PickResult {
  picked: Candidate[];
  /** Các ràng buộc đã nới, tiếng Việt */
  relaxed: string[];
}

/**
 * Chia số lượng theo tỉ lệ độ khó, tổng luôn đúng bằng count (Vừa nhận phần dư do làm tròn).
 * Ví dụ 6 câu với 30/50/20: Dễ 2, Vừa 3, Khó 1
 */
export function splitDifficulty(count: number, ratio: DifficultyRatio): Record<Difficulty, number> {
  const easy = Math.min(count, Math.round((count * ratio.easy) / 100));
  const hard = Math.min(count - easy, Math.round((count * ratio.hard) / 100));
  return {
    [Difficulty.EASY]: easy,
    [Difficulty.MEDIUM]: count - easy - hard,
    [Difficulty.HARD]: hard,
  };
}

const LEVEL_SCORE: Record<Difficulty, number> = {
  [Difficulty.EASY]: 1,
  [Difficulty.MEDIUM]: 2,
  [Difficulty.HARD]: 3,
};

/** Độ khó của nhóm câu: trung bình độ khó các câu trong nhóm, làm tròn (độ khó ghi ở từng câu) */
export function groupDifficulty(levels: readonly Difficulty[]): Difficulty {
  if (levels.length === 0) return Difficulty.MEDIUM;
  const average = levels.reduce((sum, level) => sum + LEVEL_SCORE[level], 0) / levels.length;
  return LEVELS[Math.min(2, Math.max(0, Math.round(average) - 1))];
}

/** Thứ tự ngẫu nhiên theo seed; bật ưu tiên câu chưa dùng thì câu chưa dùng ở đề khác đứng trước */
function rank(candidates: readonly Candidate[], seed: string, preferUnused: boolean): Candidate[] {
  const ordered = seededOrder(candidates, seed, (candidate) => candidate.key);
  if (!preferUnused) return ordered;
  return [...ordered.filter((c) => c.usedCount === 0), ...ordered.filter((c) => c.usedCount > 0)];
}

/**
 * Chọn đúng `count` đơn vị (câu hoặc nhóm) từ ứng viên theo ma trận. Mỗi lượt:
 * 1. Chủ đề trước: mỗi chủ đề lấy đủ số tối thiểu, ưu tiên mức độ khó còn chỉ tiêu
 * 2. Lấp phần còn lại theo chỉ tiêu độ khó
 * 3. Thiếu thì nới độ khó (lấy câu mức khác)
 * Bật ưu tiên câu chưa dùng thì chạy lượt đầu chỉ với câu chưa dùng ở đề khác, thiếu mới chạy lượt
 * hai với cả câu đã dùng: thứ tự nới ràng buộc là chủ đề → độ khó → câu đã dùng. Nới ràng buộc nào
 * thì ghi vào `relaxed`. Kết quả theo thứ tự ngẫu nhiên của seed
 */
export function pickUnits(candidates: readonly Candidate[], options: PickOptions): PickResult {
  const { count, ratio, topics, preferUnused, seed, topicName, unitLabel } = options;
  const ranked = rank(candidates, seed, preferUnused);
  const target = splitDifficulty(count, ratio);
  const quota = { ...target };
  const chosen = new Set<string>();
  const topicGot = new Map<string, number>();

  const take = (candidate: Candidate) => {
    chosen.add(candidate.key);
    quota[candidate.difficulty]--;
    topicGot.set(candidate.topicId, (topicGot.get(candidate.topicId) ?? 0) + 1);
  };

  const tiers = preferUnused ? [ranked.filter((c) => c.usedCount === 0), ranked] : [ranked];
  for (const tier of tiers) {
    const free = (match: (candidate: Candidate) => boolean) =>
      tier.filter((candidate) => !chosen.has(candidate.key) && match(candidate));

    // 1. Chủ đề: đủ số tối thiểu, ưu tiên mức còn chỉ tiêu, hết thì lấy mức khác của chủ đề đó
    for (const { topicId, min } of topics) {
      const need = Math.min(min, count);
      for (const strict of [true, false]) {
        for (const candidate of free((c) => c.topicId === topicId)) {
          if ((topicGot.get(topicId) ?? 0) >= need || chosen.size >= count) break;
          // Kiểm tra chỉ tiêu ngay lúc lấy: chỉ tiêu giảm dần trong vòng lặp
          if (strict && quota[candidate.difficulty] <= 0) continue;
          take(candidate);
        }
      }
    }

    // 2. Lấp theo chỉ tiêu độ khó
    for (const level of LEVELS) {
      for (const candidate of free((c) => c.difficulty === level)) {
        if (quota[level] <= 0 || chosen.size >= count) break;
        take(candidate);
      }
    }

    // 3. Còn thiếu: nới tỉ lệ độ khó
    for (const candidate of free(() => true)) {
      if (chosen.size >= count) break;
      take(candidate);
    }
    if (chosen.size >= count) break;
  }

  const relaxed: string[] = [];
  for (const { topicId, min } of topics) {
    const need = Math.min(min, count);
    const got = Math.min(topicGot.get(topicId) ?? 0, need);
    if (got < need)
      relaxed.push(`Chủ đề "${topicName(topicId)}" chỉ có ${got}/${need} ${unitLabel}`);
  }

  const picked = ranked.filter((candidate) => chosen.has(candidate.key));
  const shortLevels = LEVELS.filter((level) => quota[level] > 0);
  const substituted = LEVELS.reduce((n, level) => n + Math.max(0, -quota[level]), 0);
  if (shortLevels.length > 0 && substituted > 0) {
    const labels = shortLevels.map((level) => LEVEL_LABEL[level]).join(', ');
    relaxed.push(
      `Không đủ ${unitLabel} mức ${labels}: lấy thêm ${substituted} ${unitLabel} mức khác`,
    );
  }
  if (preferUnused) {
    const used = picked.filter((candidate) => candidate.usedCount > 0).length;
    if (used > 0)
      relaxed.push(`${used} ${unitLabel} đã dùng ở đề khác (ngân hàng không đủ câu mới)`);
  }
  return { picked, relaxed };
}

/**
 * Listening 3, 4: ưu tiên đủ số nhóm có biểu đồ như đề thật (L3: 3 nhóm, L4: 2 nhóm), đặt ở CUỐI
 * Part; thiếu nhóm có biểu đồ thì lấy nhóm thường
 */
export function pickWithGraphics(
  candidates: readonly Candidate[],
  options: PickOptions,
  graphicCount: number,
): PickResult {
  if (graphicCount <= 0) return pickUnits(candidates, options);

  const graphics = pickUnits(
    candidates.filter((c) => c.hasGraphic),
    { ...options, count: Math.min(graphicCount, options.count), topics: [] },
  ).picked;
  const relaxed: string[] = [];
  if (graphics.length < Math.min(graphicCount, options.count)) {
    relaxed.push(`Chỉ có ${graphics.length}/${graphicCount} nhóm có biểu đồ`);
  }

  // Chủ đề đã được nhóm có biểu đồ đáp ứng thì trừ đi
  const topics = options.topics
    .map((topic) => ({
      ...topic,
      min: topic.min - graphics.filter((c) => c.topicId === topic.topicId).length,
    }))
    .filter((topic) => topic.min > 0);
  const taken = new Set(graphics.map((c) => c.key));
  const restOptions = { ...options, count: options.count - graphics.length, topics };

  let rest = pickUnits(
    candidates.filter((c) => !taken.has(c.key) && !c.hasGraphic),
    restOptions,
  );
  // Nhóm thường không đủ: cho dùng cả nhóm có biểu đồ còn lại
  if (rest.picked.length < restOptions.count) {
    rest = pickUnits(
      candidates.filter((c) => !taken.has(c.key)),
      restOptions,
    );
  }
  return { picked: [...rest.picked, ...graphics], relaxed: [...relaxed, ...rest.relaxed] };
}

/** Cấu trúc Reading Part 7 của đề ETS: 10 đoạn đơn (29 câu) + 5 đoạn kép, ba đoạn (25 câu) */
export const READING7_PROFILE = [
  { size: 2, groups: 4 },
  { size: 3, groups: 3 },
  { size: 4, groups: 3 },
  { size: 5, groups: 5 },
] as const;

export const READING7_QUESTIONS = READING7_PROFILE.reduce((n, bin) => n + bin.size * bin.groups, 0);

/** Chọn các phần tử có tổng kích thước đúng bằng target (quy hoạch động); null khi không có */
export function subsetWithSize<T extends { size: number }>(
  items: readonly T[],
  target: number,
): T[] | null {
  const reach: (number[] | null)[] = Array.from({ length: target + 1 }, () => null);
  reach[0] = [];
  items.forEach((item, index) => {
    for (let sum = target; sum >= item.size; sum--) {
      const from = reach[sum - item.size];
      if (from && !reach[sum]) reach[sum] = [...from, index];
    }
  });
  return reach[target]?.map((index) => items[index]) ?? null;
}

/**
 * Reading Part 7 của đề TOEIC: đúng 54 câu theo hồ sơ nhóm (4×2, 3×3, 3×4, 5×5). Chọn riêng từng
 * "ngăn" kích thước; ngăn nào thiếu thì thay bằng tổ hợp nhóm khác có cùng tổng số câu (một nhóm 4
 * câu = hai nhóm 2 câu). Chủ đề tính theo nhóm. Thứ tự: nhóm nhỏ trước như đề thật
 */
export function pickReading7(
  candidates: readonly Candidate[],
  options: Omit<PickOptions, 'count'>,
): PickResult & { shortage: number } {
  const picked: Candidate[] = [];
  const relaxed: string[] = [];
  let topics = [...options.topics];
  let missing = 0;

  for (const bin of READING7_PROFILE) {
    const taken = new Set(picked.map((c) => c.key));
    const result = pickUnits(
      candidates.filter((c) => c.size === bin.size && !taken.has(c.key)),
      { ...options, count: bin.groups, topics, seed: `${options.seed}:size-${bin.size}` },
    );
    picked.push(...result.picked);
    relaxed.push(...result.relaxed.map((note) => `Nhóm ${bin.size} câu: ${note}`));
    missing += (bin.groups - result.picked.length) * bin.size;
    topics = topics
      .map((topic) => ({
        ...topic,
        min: topic.min - result.picked.filter((c) => c.topicId === topic.topicId).length,
      }))
      .filter((topic) => topic.min > 0);
  }

  if (missing > 0) {
    const taken = new Set(picked.map((c) => c.key));
    const leftovers = rank(
      candidates.filter((c) => !taken.has(c.key)),
      `${options.seed}:fill`,
      options.preferUnused,
    );
    const combo = subsetWithSize(leftovers, missing);
    if (combo) {
      picked.push(...combo);
      relaxed.push(
        `Thiếu nhóm đúng kích thước: thay bằng ${combo.length} nhóm khác có cùng tổng ${missing} câu`,
      );
      missing = 0;
    }
  }

  // Nhóm nhỏ trước, giữ thứ tự ngẫu nhiên trong cùng kích thước
  picked.sort((a, b) => a.size - b.size);
  return { picked, relaxed, shortage: missing };
}

/** Cách rút một Part: đơn vị đếm, số lượng, số nhóm có biểu đồ, có theo hồ sơ Part 7 không */
export interface PartPlan {
  skill: Skill;
  part: number;
  unit: 'QUESTION' | 'GROUP';
  /** Số đơn vị cần (Part 7 của đề TOEIC: số câu = 54) */
  count: number;
  /** Số câu cần (để báo cáo) */
  questions: number;
  graphics: number;
  /** Reading Part 7 của đề TOEIC: chọn theo READING7_PROFILE */
  reading7Profile: boolean;
}

/**
 * Đề TOEIC: số lượng theo chuẩn (Part nhóm tính theo số nhóm = số câu / số câu mỗi nhóm). Đề
 * PERCENT: giáo viên nhập số lượng (câu với Part câu đơn, nhóm với Part nhóm). null khi Part không
 * tồn tại hoặc đề PERCENT chưa có số lượng
 */
export function planPart(
  scale: ScoringScale,
  skill: Skill,
  part: number,
  percentCount?: number,
): PartPlan | null {
  const rule = findPartRule(skill, part);
  if (!rule) return null;
  const unit = rule.group === 'required' ? 'GROUP' : 'QUESTION';
  const size = groupSizeOf(skill, part);

  if (scale === ScoringScale.PERCENT) {
    if (!percentCount) return null;
    const perGroup = unit === 'GROUP' ? (size?.min === size?.max ? (size?.min ?? 1) : 0) : 1;
    return {
      skill,
      part,
      unit,
      count: percentCount,
      // Nhóm có số câu thay đổi (Part 7): chưa biết trước số câu
      questions: perGroup * percentCount,
      graphics: 0,
      reading7Profile: false,
    };
  }

  const quota = quotaOf(skill, part);
  if (!quota) return null;
  const reading7Profile = skill === Skill.READING && part === 7;
  const graphics =
    scale === ScoringScale.TOEIC_990 && skill === Skill.LISTENING
      ? part === 3
        ? 3
        : part === 4
          ? 2
          : 0
      : 0;
  return {
    skill,
    part,
    unit,
    count: reading7Profile || unit === 'QUESTION' ? quota.count : quota.count / (size?.min ?? 1),
    questions: quota.count,
    graphics,
    reading7Profile,
  };
}
