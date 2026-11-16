import type { PaperSection } from '@/api/generated';

/**
 * Làm cả đề Writing như thi thật (Ke_hoach Mục 7.3): mỗi bước có đồng hồ riêng, hết giờ tự sang bước
 * sau, không quay lại bước trước. Part 1: 8 phút cho cả 5 câu; Part 2: 10 phút mỗi email; Part 3:
 * 30 phút cho bài luận
 */
const STEP_RULE: Record<number, { minutes: number; perQuestion: boolean }> = {
  1: { minutes: 8, perQuestion: false },
  2: { minutes: 10, perQuestion: true },
  3: { minutes: 30, perQuestion: true },
};

export interface WritingStep {
  sectionIndex: number;
  part: number;
  examQuestionIds: string[];
  firstNumber: number;
  lastNumber: number;
  seconds: number;
}

/** Các bước làm bài; null khi không phải đề chỉ gồm Writing (đề khác giữ cách làm tự do) */
export function writingSteps(sections: PaperSection[]): WritingStep[] | null {
  if (sections.length === 0 || sections.some((section) => section.skill !== 'WRITING')) return null;
  const steps: WritingStep[] = [];
  sections.forEach((section, sectionIndex) => {
    const questions = section.blocks.flatMap((block) => block.questions);
    if (questions.length === 0) return;
    // Part lạ (dữ liệu lỗi): 10 phút mỗi câu
    const rule = STEP_RULE[section.part] ?? { minutes: 10, perQuestion: true };
    const groups = rule.perQuestion ? questions.map((question) => [question]) : [questions];
    for (const group of groups) {
      steps.push({
        sectionIndex,
        part: section.part,
        examQuestionIds: group.map((question) => question.examQuestionId),
        firstNumber: group[0].number,
        lastNumber: group[group.length - 1].number,
        seconds: rule.minutes * 60,
      });
    }
  });
  return steps.length ? steps : null;
}

export interface StepPosition {
  index: number;
  /** Lúc bắt đầu bước (mốc đồng hồ máy học viên, ms) */
  startedAt: number;
}

/**
 * Đi tới bước đúng tại thời điểm now: bước nào đã hết giờ thì sang bước sau (bước sau bắt đầu đúng
 * lúc bước trước hết giờ). Dừng ở bước cuối
 */
export function advanceTo(steps: WritingStep[], position: StepPosition, now: number): StepPosition {
  let { index, startedAt } = position;
  while (index < steps.length - 1 && now >= startedAt + steps[index].seconds * 1000) {
    startedAt += steps[index].seconds * 1000;
    index++;
  }
  return { index, startedAt };
}

/** Bước cuối đã hết giờ: nộp bài */
export function finished(steps: WritingStep[], position: StepPosition, now: number): boolean {
  const last = steps.length - 1;
  return position.index === last && now >= position.startedAt + steps[last].seconds * 1000;
}

const storageKey = (attemptId: string) => `writing-step:${attemptId}`;

/** Vị trí đã lưu ở máy này (mở lại trang không mất bước đang làm); lỗi đọc thì null */
export function loadPosition(attemptId: string, steps: WritingStep[]): StepPosition | null {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StepPosition>;
    if (
      typeof value.index !== 'number' ||
      typeof value.startedAt !== 'number' ||
      value.index < 0 ||
      value.index >= steps.length
    ) {
      return null;
    }
    return { index: value.index, startedAt: value.startedAt };
  } catch {
    return null;
  }
}

export function savePosition(attemptId: string, position: StepPosition): void {
  try {
    localStorage.setItem(storageKey(attemptId), JSON.stringify(position));
  } catch {
    // Trình duyệt chặn bộ nhớ: mở lại trang thì tính bước theo giờ bắt đầu bài
  }
}

export function clearPosition(attemptId: string): void {
  try {
    localStorage.removeItem(storageKey(attemptId));
  } catch {
    // bỏ qua
  }
}
