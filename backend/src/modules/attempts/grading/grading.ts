import { AttemptMode, QuestionType, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import { toeicLrScore } from './toeic-conversion.js';
import { toeicSwScore } from './toeic-sw-conversion.js';

// Chấm điểm một lượt làm bài: hàm thuần (không đụng DB) để unit test (Ke_hoach Mục 7.2, SPRINT-52;
// câu Speaking/Writing chấm bằng AI: SPRINT-86)

export interface GradingQuestion {
  examQuestionId: string;
  skill: Skill;
  type: QuestionType;
  /** Phương án đúng; null với câu Speaking/Writing (hoặc câu trắc nghiệm lỗi dữ liệu) */
  correctOptionId: string | null;
  /** Câu Speaking/Writing: điểm tối đa của dạng câu */
  maxScore?: number;
  /** Câu Speaking/Writing: điểm đã có (bỏ trống 0, AI đã chấm); null/không có khi còn chờ chấm */
  openScore?: number | null;
}

export interface GradingAnswer {
  examQuestionId: string;
  selectedOptionId: string | null;
}

export interface GradingInput {
  scale: ScoringScale;
  mode: AttemptMode;
  /** Các câu trong phạm vi bài làm (cả đề, hoặc Part đang luyện), theo thứ tự đề */
  questions: GradingQuestion[];
  answers: GradingAnswer[];
}

export interface SkillScore {
  skill: Skill;
  correct: number;
  wrong: number;
  skipped: number;
  /** Số câu trắc nghiệm */
  total: number;
  /** Số câu Speaking/Writing (chấm bằng AI) */
  openCount: number;
  /** Tổng điểm tối đa của các câu Speaking/Writing */
  openMax: number;
  /** Tổng điểm các câu Speaking/Writing; null khi còn câu chờ chấm */
  openRaw: number | null;
  /** Số câu Speaking/Writing chưa có điểm (chờ AI chấm hoặc chấm lỗi) */
  openPending: number;
  /** Điểm quy đổi của kỹ năng; null khi chưa tính được (còn câu chờ AI chấm) */
  scaled: number | null;
}

export type ScoringName = 'TOEIC_990' | 'TOEIC_SW' | 'PERCENT';

/** Cách quy đổi điểm theo thang của đề (Strategy pattern) */
export interface ScoringStrategy {
  readonly name: ScoringName;
  skillScore(skill: SkillScore): number | null;
  totalScore(skills: SkillScore[]): number | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Cộng điểm quy đổi các kỹ năng đã có điểm */
function sumScaled(skills: SkillScore[]): number | null {
  const scored = skills.filter((skill) => skill.scaled !== null);
  return scored.length ? scored.reduce((sum, skill) => sum + (skill.scaled ?? 0), 0) : null;
}

/** Đề TOEIC LR: mỗi kỹ năng quy đổi theo bảng (5–495), tổng 10–990 */
export const toeic990Strategy: ScoringStrategy = {
  name: 'TOEIC_990',
  skillScore: (skill) => (skill.total > 0 ? toeicLrScore(skill.skill, skill.correct) : null),
  totalScore: sumScaled,
};

/** Đề TOEIC Speaking/Writing: mỗi kỹ năng quy đổi điểm thô theo bảng (0–200), tổng 0–400 */
export const toeicSwStrategy: ScoringStrategy = {
  name: 'TOEIC_SW',
  skillScore: (skill) =>
    skill.openMax > 0 && skill.openRaw !== null
      ? toeicSwScore(skill.skill, skill.openRaw, skill.openMax)
      : null,
  totalScore: sumScaled,
};

/**
 * Điểm và điểm tối đa theo kiểu %: câu trắc nghiệm 1 điểm, câu mở theo thang của dạng câu. Câu mở
 * chưa chấm xong thì chưa tính (tạm hiện % phần trắc nghiệm)
 */
function points(skill: SkillScore): [number, number] {
  const open = skill.openRaw === null ? [0, 0] : [skill.openRaw, skill.openMax];
  return [skill.correct + open[0], skill.total + open[1]];
}

/** Đề luyện tập và mọi lượt luyện theo Part: phần trăm điểm đạt được */
export const percentStrategy: ScoringStrategy = {
  name: 'PERCENT',
  skillScore: (skill) => {
    const [earned, max] = points(skill);
    return max > 0 ? round2((earned / max) * 100) : null;
  },
  totalScore: (skills) => {
    const [earned, max] = skills.map(points).reduce(([e, m], [se, sm]) => [e + se, m + sm], [0, 0]);
    return max > 0 ? round2((earned / max) * 100) : null;
  },
};

/** Chọn cách quy đổi: luyện theo Part luôn tính %, vì một Part không quy đổi ra điểm TOEIC được */
export function strategyFor(scale: ScoringScale, mode: AttemptMode): ScoringStrategy {
  if (mode !== AttemptMode.FULL) return percentStrategy;
  if (scale === ScoringScale.TOEIC_990) return toeic990Strategy;
  if (scale === ScoringScale.TOEIC_SW) return toeicSwStrategy;
  return percentStrategy;
}

const isChoice = (type: QuestionType) =>
  type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE;

export interface GradingResult {
  strategy: ScoringName;
  /** Đúng/sai từng câu trắc nghiệm có trả lời; câu bỏ trống và câu mở không có trong map */
  marks: Map<string, boolean>;
  correct: number;
  wrong: number;
  skipped: number;
  /** = số câu trắc nghiệm đúng */
  rawScore: number;
  /** null khi còn câu Speaking/Writing chờ chấm, hoặc đề không có câu nào */
  scaledScore: number | null;
  /** Số câu Speaking/Writing chờ AI chấm: > 0 thì lượt làm giữ SUBMITTED */
  pendingOpen: number;
  skills: SkillScore[];
}

/** Tính lại điểm quy đổi từng kỹ năng và điểm tổng (dùng cả lúc nộp bài và lúc AI chấm xong) */
export function scoreSkills(
  strategy: ScoringStrategy,
  skills: SkillScore[],
): { skills: SkillScore[]; total: number | null; pendingOpen: boolean } {
  const scored = skills.map((skill) => ({ ...skill, scaled: strategy.skillScore(skill) }));
  const pendingOpen = scored.some((skill) => skill.openPending > 0);
  return { skills: scored, total: pendingOpen ? null : strategy.totalScore(scored), pendingOpen };
}

export function gradeAttempt(input: GradingInput): GradingResult {
  const strategy = strategyFor(input.scale, input.mode);
  const selected = new Map(input.answers.map((a) => [a.examQuestionId, a.selectedOptionId]));
  const marks = new Map<string, boolean>();
  const bySkill = new Map<Skill, SkillScore>();
  let pendingOpen = 0;

  for (const question of input.questions) {
    let skill = bySkill.get(question.skill);
    if (!skill) {
      skill = {
        skill: question.skill,
        correct: 0,
        wrong: 0,
        skipped: 0,
        total: 0,
        openCount: 0,
        openMax: 0,
        openRaw: 0,
        openPending: 0,
        scaled: null,
      };
      bySkill.set(question.skill, skill);
    }
    if (!isChoice(question.type)) {
      skill.openCount++;
      skill.openMax += question.maxScore ?? 0;
      const score = question.openScore ?? null;
      if (score === null) {
        pendingOpen++;
        skill.openPending++;
        skill.openRaw = null;
      } else if (skill.openRaw !== null) {
        skill.openRaw += score;
      }
      continue;
    }
    skill.total++;
    const option = selected.get(question.examQuestionId) ?? null;
    if (option === null) {
      skill.skipped++;
    } else if (option === question.correctOptionId) {
      skill.correct++;
      marks.set(question.examQuestionId, true);
    } else {
      skill.wrong++;
      marks.set(question.examQuestionId, false);
    }
  }

  const { skills, total } = scoreSkills(strategy, [...bySkill.values()]);
  const sum = (key: 'correct' | 'wrong' | 'skipped') =>
    skills.reduce((acc, skill) => acc + skill[key], 0);
  const correct = sum('correct');

  return {
    strategy: strategy.name,
    marks,
    correct,
    wrong: sum('wrong'),
    skipped: sum('skipped'),
    rawScore: correct,
    scaledScore: total,
    pendingOpen,
    skills,
  };
}
