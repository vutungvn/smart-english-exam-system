import { ChevronRight, Lock, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatClock } from '../practice-meta';
import type { WritingStep } from './writing-steps';

/** Dưới 1 phút: đồng hồ của bước chuyển đỏ */
const WARNING_SECONDS = 60;

interface WritingStepBarProps {
  step: WritingStep;
  index: number;
  total: number;
  remaining: number;
  onNext: () => void;
}

/** Thanh của bước đang làm (đề Writing thi như thật): câu nào, còn bao lâu, sang bước sau */
export function WritingStepBar({ step, index, total, remaining, onNext }: WritingStepBarProps) {
  const warning = remaining <= WARNING_SECONDS;
  const last = index === total - 1;
  const questions =
    step.firstNumber === step.lastNumber
      ? `Câu ${step.firstNumber}`
      : `Câu ${step.firstNumber}–${step.lastNumber}`;

  return (
    <section
      aria-label="Thời gian của phần đang làm"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-2xs"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Phần {index + 1}/{total} · {questions}
        </p>
        <p className="flex items-center gap-1 text-xs text-subtle">
          <Lock className="size-3.5" />
          Hết giờ tự sang phần sau, không quay lại phần trước được
        </p>
      </div>
      <span
        role="timer"
        aria-label="Thời gian còn lại của phần này"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold tabular-nums',
          warning ? 'animate-pulse bg-danger-soft text-destructive' : 'bg-accent text-brand',
        )}
      >
        <Timer className="size-4" />
        {formatClock(remaining)}
      </span>
      <Button
        type="button"
        variant="outline"
        onClick={onNext}
        className="h-9 rounded-xl bg-white px-3 text-sm"
      >
        {last ? 'Nộp bài' : 'Sang phần tiếp'}
        <ChevronRight />
      </Button>
    </section>
  );
}
