import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, Headphones, Mic, Play, SkipForward, TriangleAlert } from 'lucide-react';
import type { PaperGroup, PaperQuestion, PaperSection } from '@/api/generated';
import { QuestionMedia } from '@/components/QuestionMedia';
import { Button } from '@/components/ui/button';
import { PassageView } from '@/features/question-bank/components/GroupContent';
import { cn } from '@/lib/utils';
import { MicCheck } from './MicCheck';
import { playOnce } from './play-once';
import { RECORDER_ERROR_MESSAGE, useRecorder } from './use-recorder';

/** listen: đang phát câu hỏi · prep: đếm ngược chuẩn bị · record: đang ghi · saving: đóng bài nói */
type Phase = 'listen' | 'prep' | 'record' | 'saving';

interface Step {
  question: PaperQuestion;
  group: PaperGroup | null;
}

interface SpeakingSectionProps {
  section: PaperSection;
  /** Câu đã có bài nói: không làm lại (thi thật không quay lại câu trước) */
  recorded: ReadonlySet<string>;
  micReady: boolean;
  onMicReady: () => void;
  onRecorded: (examQuestionId: string, blob: Blob) => void;
  /** Đang chạy thì màn làm bài khóa chuyển Part, nộp bài */
  onRunningChange: (running: boolean) => void;
}

const PHASE_LABEL: Record<Phase, string> = {
  listen: 'Nghe câu hỏi',
  prep: 'Chuẩn bị',
  record: 'Đang ghi âm',
  saving: 'Đang lưu bài nói',
};

/**
 * Một Part Speaking chạy liên tục như thi thật: (phát câu hỏi) → đếm ngược chuẩn bị → tự ghi âm →
 * hết giờ tự dừng → lưu → câu tiếp. Câu đã ghi âm không làm lại; mở lại bài thì chạy tiếp từ câu
 * chưa ghi. Thời gian lấy theo prepSeconds, responseSeconds của từng câu
 */
export function SpeakingSection({
  section,
  recorded,
  micReady,
  onMicReady,
  onRecorded,
  onRunningChange,
}: SpeakingSectionProps) {
  const steps = useMemo<Step[]>(
    () =>
      section.blocks.flatMap((block) =>
        block.questions.map((question) => ({ question, group: block.group })),
      ),
    [section],
  );
  const recorder = useRecorder();
  // Danh sách câu của lượt chạy hiện tại (chốt lúc bấm bắt đầu); null: chưa chạy
  const [run, setRun] = useState<Step[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('listen');
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const transitioning = useRef(false);

  const running = run !== null && index < run.length;
  const step = running ? run[index] : undefined;
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    onRunningChange(running);
  }, [running, onRunningChange]);
  useEffect(() => () => onRunningChange(false), [onRunningChange]);

  const startPhase = (next: Phase, seconds: number) => {
    const at = Date.now();
    setNow(at);
    setEndsAt(at + seconds * 1000);
    setPhase(next);
  };

  // Vào câu mới: phát câu hỏi (S3, S4) rồi mới đếm giờ chuẩn bị
  useEffect(() => {
    if (!step || phase !== 'listen') return;
    const prep = step.question.prepSeconds ?? 0;
    // Câu không có audio (S1, S2, S5): vào thẳng bước chuẩn bị (đổi bước trong callback, không
    // setState ngay trong thân effect)
    const playback = step.question.audioUrl ? playOnce(step.question.audioUrl) : null;
    let cancelled = false;
    void (playback?.done ?? Promise.resolve()).then(() => {
      if (!cancelled) startPhase('prep', prep);
    });
    return () => {
      cancelled = true;
      playback?.stop();
    };
  }, [step, phase]);

  const beginRecording = useCallback(async () => {
    if (!step || transitioning.current) return;
    transitioning.current = true;
    const ok = await recorder.start();
    // Không mở được micro: dừng ở bước chuẩn bị, hiện lỗi và nút thử lại
    if (ok) startPhase('record', step.question.responseSeconds ?? 30);
    // Mở lại sau khi đã chuyển bước: đồng hồ 200 ms không gọi bắt đầu ghi lần nữa
    transitioning.current = false;
  }, [recorder, step]);

  const finishRecording = useCallback(async () => {
    if (!step || !run || transitioning.current) return;
    transitioning.current = true;
    setPhase('saving');
    const blob = await recorder.stop();
    if (blob) onRecorded(step.question.examQuestionId, blob);
    if (index + 1 < run.length) {
      setIndex(index + 1);
      setPhase('listen');
    } else {
      setIndex(run.length);
      recorder.release();
    }
    transitioning.current = false;
  }, [index, onRecorded, recorder, run, step]);

  // Giá trị mới nhất cho callback của đồng hồ (đồng hồ không dựng lại mỗi lần đổi bước)
  const latest = useRef({ phase, endsAt, error: recorder.error, beginRecording, finishRecording });
  useEffect(() => {
    latest.current = { phase, endsAt, error: recorder.error, beginRecording, finishRecording };
  });

  // Đồng hồ: cập nhật số giây còn lại; hết giờ chuẩn bị thì tự ghi, hết giờ trả lời thì tự dừng
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      const current = latest.current;
      if (at < current.endsAt) return;
      if (current.phase === 'prep' && !current.error) void current.beginRecording();
      if (current.phase === 'record') void current.finishRecording();
    }, 200);
    return () => clearInterval(timer);
  }, [running]);

  const start = async () => {
    const remaining = steps.filter((s) => !recorded.has(s.question.examQuestionId));
    if (remaining.length === 0 || !(await recorder.prepare())) return;
    setIndex(0);
    setPhase('listen');
    setRun(remaining);
  };

  if (step) {
    const { question, group } = step;
    const total = run?.length ?? 0;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-white px-5 py-4 shadow-2xs">
          <div>
            <p className="text-xs font-semibold tracking-wider text-subtle uppercase">
              Câu {question.number} · {index + 1}/{total}
            </p>
            <p
              className={cn(
                'mt-1 flex items-center gap-2 text-lg font-bold',
                phase === 'record' ? 'text-destructive' : 'text-foreground',
              )}
            >
              {phase === 'record' && (
                <span className="size-3 animate-pulse rounded-full bg-destructive" />
              )}
              {phase === 'listen' && <Headphones className="size-5 text-primary" />}
              {PHASE_LABEL[phase]}
            </p>
          </div>
          {(phase === 'prep' || phase === 'record') && (
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'rounded-2xl px-4 py-2 text-3xl font-bold tabular-nums',
                  phase === 'record' ? 'bg-danger-soft text-destructive' : 'bg-accent text-brand',
                )}
                aria-live="polite"
              >
                {left}s
              </span>
              {phase === 'prep' && !recorder.error && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void beginRecording()}
                  className="h-10 rounded-xl"
                >
                  <Mic />
                  Nói ngay
                </Button>
              )}
              {phase === 'record' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void finishRecording()}
                  className="h-10 rounded-xl"
                >
                  <SkipForward />
                  Trả lời xong
                </Button>
              )}
            </div>
          )}
        </div>

        {recorder.error && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            <span className="flex-1">{RECORDER_ERROR_MESSAGE[recorder.error]}</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void beginRecording()}
              className="h-9 rounded-xl bg-white"
            >
              Thử lại
            </Button>
          </div>
        )}

        <div
          className={cn(
            'grid items-start gap-4',
            group && 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]',
          )}
        >
          {group && (
            <section className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
              {group.imageUrl && <QuestionMedia kind="image" url={group.imageUrl} />}
              {group.passage && (
                <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
                  <PassageView text={group.passage} />
                </div>
              )}
            </section>
          )}
          <article className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
            {question.imageUrl && <QuestionMedia kind="image" url={question.imageUrl} />}
            <p className="text-base leading-relaxed font-semibold wrap-break-word whitespace-pre-line text-foreground">
              {question.content}
            </p>
          </article>
        </div>
      </div>
    );
  }

  const done = steps.filter((s) => recorded.has(s.question.examQuestionId)).length;
  const finished = done === steps.length;

  return (
    <div className="space-y-4">
      {!finished && !micReady ? (
        <MicCheck onReady={onMicReady} />
      ) : (
        <section className="space-y-4 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
          {finished ? (
            <p className="flex items-center gap-2 font-semibold text-success">
              <CircleCheck className="size-5" />
              Đã ghi âm xong Part {section.part}. Chuyển sang Part tiếp theo để làm tiếp.
            </p>
          ) : (
            <>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Part {section.part} gồm {steps.length} câu, chạy liên tục như thi thật.
                </p>
                <p>
                  Mỗi câu: nghe câu hỏi (nếu có) → chuẩn bị → hệ thống tự ghi âm → hết giờ tự dừng
                  và sang câu tiếp. Câu đã ghi âm không làm lại được.
                </p>
                {done > 0 && <p>Đã ghi {done} câu, bắt đầu lại từ câu chưa ghi.</p>}
              </div>
              {recorder.error && (
                <p className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  {RECORDER_ERROR_MESSAGE[recorder.error]}
                </p>
              )}
              <Button
                type="button"
                onClick={() => void start()}
                className="h-11 rounded-xl bg-linear-to-r from-primary to-brand px-6 font-semibold"
              >
                <Play />
                {done > 0 ? 'Làm tiếp' : `Bắt đầu Part ${section.part}`}
              </Button>
            </>
          )}
        </section>
      )}

      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map(({ question }) => {
          const ok = recorded.has(question.examQuestionId);
          return (
            <li
              key={question.examQuestionId}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-brand tabular-nums">
                {question.number}
              </span>
              <span className="flex-1 text-muted-foreground">
                Chuẩn bị {question.prepSeconds ?? 0}s · Trả lời {question.responseSeconds ?? 0}s
              </span>
              {ok ? (
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <CircleCheck className="size-4" />
                  Đã ghi
                </span>
              ) : (
                <span className="text-xs text-subtle">Chưa ghi</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
