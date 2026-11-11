import { useEffect, useRef, useState } from 'react';
import {
  advanceTo,
  finished,
  loadPosition,
  savePosition,
  type StepPosition,
  type WritingStep,
} from './writing-steps';

interface UseWritingStepsOptions {
  attemptId: string;
  /** Rỗng: không chạy (đề không phải Writing, hoặc luyện theo Part không đếm giờ) */
  steps: WritingStep[];
  /** Lúc bắt đầu bài theo đồng hồ máy học viên (ms), dùng khi máy chưa lưu bước đang làm */
  startedAt: number;
  /** Bước cuối hết giờ */
  onFinish: () => void;
}

export interface WritingStepsState {
  step: WritingStep | null;
  index: number;
  total: number;
  /** Số giây còn lại của bước đang làm */
  remaining: number;
  /** Sang bước sau trước khi hết giờ (không quay lại được) */
  next: () => void;
}

/**
 * Đồng hồ từng bước của đề Writing. Bước đang làm lưu ở localStorage để tải lại trang không mất; máy
 * không có thì coi như các bước trước đã dùng hết giờ (tính từ lúc bắt đầu bài). Đồng hồ cả bài vẫn
 * do server giữ (expiresAt)
 */
export function useWritingSteps({
  attemptId,
  steps,
  startedAt,
  onFinish,
}: UseWritingStepsOptions): WritingStepsState {
  const [now, setNow] = useState(() => Date.now());
  const [position, setPosition] = useState<StepPosition>(() => {
    const start = loadPosition(attemptId, steps) ?? { index: 0, startedAt };
    return steps.length ? advanceTo(steps, start, Date.now()) : start;
  });
  const latest = useRef({ steps, onFinish, finishedCalled: false });
  useEffect(() => {
    latest.current.steps = steps;
    latest.current.onFinish = onFinish;
  });

  // Mỗi giây: cập nhật đồng hồ, hết giờ thì sang bước sau (đổi state trong callback của interval)
  useEffect(() => {
    if (steps.length === 0) return;
    const tick = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setPosition((prev) => {
        const next = advanceTo(latest.current.steps, prev, current);
        return next.index === prev.index ? prev : next;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [steps.length]);

  useEffect(() => {
    if (steps.length) savePosition(attemptId, position);
  }, [attemptId, position, steps.length]);

  useEffect(() => {
    if (!steps.length || latest.current.finishedCalled) return;
    if (finished(steps, position, now)) {
      latest.current.finishedCalled = true;
      latest.current.onFinish();
    }
  }, [steps, position, now]);

  const step = steps[position.index] ?? null;
  const remaining = step
    ? Math.max(0, Math.ceil((position.startedAt + step.seconds * 1000 - now) / 1000))
    : 0;

  return {
    step,
    index: position.index,
    total: steps.length,
    remaining,
    next: () => {
      if (position.index >= steps.length - 1) return;
      const current = Date.now();
      setNow(current);
      setPosition({ index: position.index + 1, startedAt: current });
    },
  };
}
