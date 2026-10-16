import { AttemptMode, QuestionType, ScoringScale, Skill } from '../../../generated/prisma/enums.js';
import { toeicLrScore } from './toeic-conversion.js';

// Chấm điểm một lượt làm bài: hàm thuần (không đụng DB) để unit test (Ke_hoach Mục 7.2, SPRINT-52)

export interface GradingQuestion {
  examQuestionId: string;
  skill: Skill;
  type: QuestionType;
  /** Phương án đúng; null với câu Speaking/Writing (hoặc câu trắc nghiệm lỗi dữ liệu) */
  correctOptionId: string | null;
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
  /** Số câu Speaking/Writing (chấm bằng AI, SPRINT-86) */
  openCount: number;
  /** Điểm quy đổi của kỹ năng; null khi kỹ năng chỉ có câu mở chưa chấm */
  scaled: number | null;
}

/** Cách quy đổi điểm theo thang của đề (Strategy pattern) */
export interface ScoringStrategy {
  readonly name: 'TOEIC_990' | 'PERCENT';
  skillScore(skill: Skill, correct: number, total: number): number | null;
  totalScore(skills: SkillScore[], correct: number, total: number): number | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Đề TOEIC LR: mỗi kỹ năng quy đổi theo bảng (5–495), tổng 10–990 */
export const toeic990Strategy: ScoringStrategy = {
  name: 'TOEIC_990',
  skillScore: (skill, correct) => toeicLrScore(skill, correct),
  totalScore: (skills) => {
    const scored = skills.filter((skill) => skill.scaled !== null);
    return scored.length ? scored.reduce((sum, skill) => sum + (skill.scaled ?? 0), 0) : null;
  },
};

/** Đề luyện tập và mọi lượt luyện theo Part: phần trăm câu trắc nghiệm đúng */
export const percentStrategy: ScoringStrategy = {
  name: 'PERCENT',
  skillScore: (_skill, correct, total) => (total > 0 ? round2((correct / total) * 100) : null),
  totalScore: (_skills, correct, total) => (total > 0 ? round2((correct / total) * 100) : null),
};

/**
 * Chọn cách quy đổi: luyện theo Part luôn tính %, vì một Part không quy đổi ra điểm TOEIC được.
 * Đề Speaking/Writing (TOEIC_SW) chỉ có câu mở: ToeicSwStrategy làm cùng chấm AI (SPRINT-86)
 */
export function strategyFor(scale: ScoringScale, mode: AttemptMode): ScoringStrategy {
  return mode === AttemptMode.FULL && scale === ScoringScale.TOEIC_990
    ? toeic990Strategy
    : percentStrategy;
}

const isChoice = (type: QuestionType) =>
  type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE;

export interface GradingResult {
  strategy: ScoringStrategy['name'];
  /** Đúng/sai từng câu trắc nghiệm có trả lời; câu bỏ trống và câu mở không có trong map */
  marks: Map<string, boolean>;
  correct: number;
  wrong: number;
  skipped: number;
  /** = số câu trắc nghiệm đúng */
  rawScore: number;
  /** null khi còn câu Speaking/Writing chờ chấm, hoặc đề không có câu trắc nghiệm */
  scaledScore: number | null;
  /** Số câu Speaking/Writing chờ AI chấm: > 0 thì lượt làm giữ SUBMITTED */
  pendingOpen: number;
  skills: SkillScore[];
}

export function gradeAttempt(input: GradingInput): GradingResult {
  const strategy = strategyFor(input.scale, input.mode);
  const selected = new Map(input.answers.map((a) => [a.examQuestionId, a.selectedOptionId]));
  const marks = new Map<string, boolean>();
  const bySkill = new Map<Skill, SkillScore>();

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
        scaled: null,
      };
      bySkill.set(question.skill, skill);
    }
    if (!isChoice(question.type)) {
      skill.openCount++;
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

  const skills = [...bySkill.values()].map((skill) => ({
    ...skill,
    scaled: skill.total > 0 ? strategy.skillScore(skill.skill, skill.correct, skill.total) : null,
  }));
  const sum = (key: 'correct' | 'wrong' | 'skipped' | 'total' | 'openCount') =>
    skills.reduce((total, skill) => total + skill[key], 0);
  const correct = sum('correct');
  const pendingOpen = sum('openCount');

  return {
    strategy: strategy.name,
    marks,
    correct,
    wrong: sum('wrong'),
    skipped: sum('skipped'),
    rawScore: correct,
    scaledScore: pendingOpen > 0 ? null : strategy.totalScore(skills, correct, sum('total')),
    pendingOpen,
    skills,
  };
}
