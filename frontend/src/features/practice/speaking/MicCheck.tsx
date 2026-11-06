import { useEffect, useRef, useState } from 'react';
import { CircleCheck, Mic, Play, RotateCw, Square, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RECORDER_ERROR_MESSAGE, useRecorder } from './use-recorder';

/** Ghi thử tối đa 5 giây */
const TEST_SECONDS = 5;

interface MicCheckProps {
  onReady: () => void;
}

/**
 * Kiểm tra micro trước phần Speaking: ghi thử vài giây rồi nghe lại. Học viên tự xác nhận nghe rõ
 * giọng mình mới bắt đầu (thi thật cũng có bước thử micro), tránh làm cả phần mà micro không thu
 */
export function MicCheck({ onReady }: MicCheckProps) {
  const recorder = useRecorder();
  const [left, setLeft] = useState(0);
  const [sample, setSample] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      if (sample) URL.revokeObjectURL(sample);
    },
    [sample],
  );

  const stop = async () => {
    clearInterval(timer.current);
    setLeft(0);
    const blob = await recorder.stop();
    if (blob) setSample(URL.createObjectURL(blob));
  };

  const record = async () => {
    if (sample) URL.revokeObjectURL(sample);
    setSample(undefined);
    if (!(await recorder.start())) return;
    setLeft(TEST_SECONDS);
    timer.current = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          void stop();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Mic className="size-5 text-primary" />
          Kiểm tra micro
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bấm “Ghi thử”, đọc một câu bất kỳ trong {TEST_SECONDS} giây rồi nghe lại. Nghe rõ giọng
          mình thì bắt đầu phần Speaking.
        </p>
      </div>

      {recorder.error && (
        <p className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {RECORDER_ERROR_MESSAGE[recorder.error]}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {recorder.recording ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void stop()}
            className="h-10 rounded-xl"
          >
            <Square className="fill-current" />
            Dừng ({left}s)
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => void record()}
            className="h-10 rounded-xl"
          >
            {sample ? <RotateCw /> : <Mic />}
            {sample ? 'Ghi lại' : 'Ghi thử'}
          </Button>
        )}
        {recorder.recording && (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
            <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
            Đang ghi…
          </span>
        )}
      </div>

      {sample && (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Play className="size-4 text-primary" />
            Nghe lại bản ghi thử
          </p>
          <audio controls src={sample} className="w-full" />
          <Button
            type="button"
            onClick={() => {
              recorder.release();
              onReady();
            }}
            className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold"
          >
            <CircleCheck />
            Nghe rõ, bắt đầu phần Speaking
          </Button>
        </div>
      )}
    </section>
  );
}
