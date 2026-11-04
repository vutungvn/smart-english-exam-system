import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import {
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  GraduationCap,
  LayoutGrid,
  Loader2,
  LogOut,
  Send,
  Timer,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useCancelAttemptMutation,
  useGetAttemptQuery,
  useSubmitAttemptMutation,
  type AttemptDetail,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { ButtonLink } from '@/components/ButtonLink';
import { preloadAudio } from '@/components/media/audio-cache';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import { allQuestions, progressOf } from '../attempt/attempt-progress';
import { BlockView } from '../attempt/BlockView';
import { QuestionNavigator } from '../attempt/QuestionNavigator';
import { clearAnswerQueue, useAnswerSync, type SyncStatus } from '../attempt/use-answer-sync';
import { useCountdown } from '../attempt/use-countdown';
import { attemptResultPath, formatClock, PRACTICE_PATH, practiceExamPath } from '../practice-meta';

/** Dưới 5 phút: đồng hồ chuyển đỏ */
const WARNING_SECONDS = 5 * 60;
/** Mở Part được vài giây (audio của Part đó đã tải xong phần lớn) mới tải trước Part kế tiếp */
const PRELOAD_DELAY_MS = 5000;

export function AttemptPage() {
  const { id = '' } = useParams();
  // Luôn tải bản mới nhất khi vào màn: thời gian còn lại, câu đã trả lời ở tab khác
  const { data, error, isFetching, startedTimeStamp, fulfilledTimeStamp, refetch } =
    useGetAttemptQuery(id, { refetchOnMountOrArgChange: true });
  // Chỉ dựng màn làm bài từ dữ liệu tải sau lúc vào màn. Cache còn bản cũ (vào lại trong vòng 60
  // giây sau khi thoát) thì thiếu các câu vừa lưu, vì lưu câu trả lời không làm mới getAttempt
  // (enhance.ts), còn useAnswerSync chỉ đọc câu trả lời của server một lần lúc dựng màn
  const [mountedAt] = useState(() => Date.now());
  const fresh = fulfilledTimeStamp !== undefined && fulfilledTimeStamp >= mountedAt;
  // Lỗi của lần tải sau lúc vào màn (lỗi cũ còn trong cache thì bỏ qua, chờ lần tải mới)
  const failed =
    !fresh &&
    !!error &&
    !isFetching &&
    startedTimeStamp !== undefined &&
    startedTimeStamp >= mountedAt;

  if (!fresh && !failed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Đang tải bài làm…
      </div>
    );
  }
  if (failed) {
    const apiError = toApiError(error);
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-border bg-white">
        {apiError.code === 'ATTEMPT_NOT_FOUND' ? (
          <div className="p-8 text-center">
            <p className="text-lg font-bold text-foreground">Không tìm thấy bài làm</p>
            <ButtonLink to={PRACTICE_PATH} className="mt-5 h-10 w-auto px-5">
              Về danh sách đề
            </ButtonLink>
          </div>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }
  if (!data) return null;
  const attempt = data.data;
  // Bài đã nộp (hoặc đã hủy) thì không làm tiếp được
  if (attempt.status === 'CANCELLED')
    return <Navigate to={practiceExamPath(attempt.exam.id)} replace />;
  if (attempt.status !== 'IN_PROGRESS')
    return <Navigate to={attemptResultPath(attempt.id)} replace />;
  return <AttemptWorkspace key={attempt.id} attempt={attempt} />;
}

function AttemptWorkspace({ attempt }: { attempt: AttemptDetail }) {
  const navigate = useNavigate();
  const sections = attempt.paper.sections;
  const [deadline, setDeadline] = useState<number | null>(() =>
    attempt.remainingSeconds === null ? null : Date.now() + attempt.remainingSeconds * 1000,
  );
  const remaining = useCountdown(deadline);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [activeId, setActiveId] = useState<string>();
  const [scrollTick, setScrollTick] = useState(0);
  const [dialog, setDialog] = useState<'submit' | 'cancel' | 'nav' | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [submitAttempt, { isLoading: submitting }] = useSubmitAttemptMutation();
  const [cancelAttempt, { isLoading: cancelling }] = useCancelAttemptMutation();
  const submitStarted = useRef(false);
  // onClosed của hook cần gọi submit, còn submit cần flush của hook: nối qua ref
  const submitRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const { answers, status, change, flush } = useAnswerSync({
    attemptId: attempt.id,
    serverAnswers: attempt.answers,
    onRemaining: (seconds) => {
      if (seconds !== null) setDeadline(Date.now() + seconds * 1000);
    },
    // Server báo hết giờ hoặc bài đã đóng: nộp (nếu chưa) rồi sang trang kết quả
    onClosed: () => void submitRef.current(),
  });

  const submit = async () => {
    if (submitStarted.current) return;
    submitStarted.current = true;
    setActionError(undefined);
    // Gửi nốt câu trả lời còn trong hàng đợi trước khi nộp (lỗi mạng thì vẫn nộp phần đã lưu)
    await flush();
    try {
      await submitAttempt(attempt.id).unwrap();
    } catch (cause) {
      const apiError = toApiError(cause);
      // Bài đã được nộp ở nơi khác (job tự nộp, tab khác): vẫn sang trang kết quả
      if (apiError.code !== 'ATTEMPT_NOT_IN_PROGRESS') {
        submitStarted.current = false;
        setActionError(apiError.message);
        return;
      }
    }
    clearAnswerQueue(attempt.id);
    void navigate(attemptResultPath(attempt.id), { replace: true });
  };

  useEffect(() => {
    submitRef.current = submit;
  });

  // Hết giờ: tự nộp
  useEffect(() => {
    if (remaining === 0) void submitRef.current();
  }, [remaining]);

  // Tải trước audio của Part kế tiếp sau khi Part hiện tại đã tải xong phần lớn (chờ vài giây)
  useEffect(() => {
    const next = sections[sectionIndex + 1];
    if (!next) return;
    const timer = window.setTimeout(() => {
      for (const block of next.blocks) {
        if (block.group?.audioUrl) preloadAudio(block.group.audioUrl);
        for (const question of block.questions) {
          if (question.audioUrl) preloadAudio(question.audioUrl);
        }
      }
    }, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [sections, sectionIndex]);

  // Bấm số câu ở bảng câu hỏi: sang đúng Part rồi cuộn tới câu đó
  useEffect(() => {
    if (!activeId) return;
    document
      .getElementById(`q-${activeId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeId, scrollTick]);

  const jump = (index: number, examQuestionId: string) => {
    setSectionIndex(index);
    setActiveId(examQuestionId);
    setScrollTick((n) => n + 1);
    setDialog(null);
  };
  const goSection = (index: number) => {
    setSectionIndex(index);
    setActiveId(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exit = async () => {
    await flush();
    void navigate(practiceExamPath(attempt.exam.id));
  };

  const cancel = async () => {
    try {
      await cancelAttempt(attempt.id).unwrap();
      clearAnswerQueue(attempt.id);
      void navigate(practiceExamPath(attempt.exam.id), { replace: true });
    } catch (cause) {
      setActionError(toApiError(cause).message);
      setDialog(null);
    }
  };

  const section = sections[sectionIndex];
  const progress = progressOf(sections, answers);
  const lastSection = sectionIndex === sections.length - 1;
  const timed = remaining !== null;
  const warning = timed && remaining <= WARNING_SECONDS;

  return (
    <div className="min-h-dvh bg-background">
      <title>{`${attempt.exam.title} – Làm bài`}</title>

      {/* Thanh trên: tên đề, đồng hồ, trạng thái lưu, nộp bài */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 lg:px-8">
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary sm:flex">
            <GraduationCap className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground sm:text-base">
              {attempt.exam.title}
            </p>
            <p className="truncate text-xs text-subtle">
              {attempt.section
                ? `Luyện Part ${attempt.section.part} · ${attempt.section.name}`
                : 'Làm cả đề'}
            </p>
          </div>

          <div
            role="timer"
            aria-label="Thời gian còn lại"
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-bold tabular-nums sm:text-lg',
              !timed && 'bg-slate-100 text-sm font-semibold text-slate-600 sm:text-sm',
              timed && !warning && 'bg-accent text-brand',
              warning && 'animate-pulse bg-danger-soft text-destructive',
            )}
          >
            <Timer className="size-4 sm:size-5" />
            {timed ? formatClock(remaining) : 'Không giới hạn'}
          </div>

          <SaveIndicator status={status} className="hidden lg:flex" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => void exit()}
            className="hidden h-10 rounded-xl px-3 text-slate-600 sm:inline-flex"
          >
            <LogOut />
            Thoát
          </Button>
          <Button
            type="button"
            onClick={() => setDialog('submit')}
            disabled={submitting}
            className="h-10 shrink-0 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold shadow-md shadow-primary/30"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Nộp bài
          </Button>
        </div>

        {/* Các Part */}
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-4 pb-3 lg:px-8">
          {sections.map((item, index) => {
            const count = allQuestions([item]).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goSection(index)}
                aria-current={index === sectionIndex}
                className={cn(
                  'shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors',
                  index === sectionIndex
                    ? 'bg-accent text-brand ring-1 ring-primary/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {item.skill.charAt(0) + item.skill.slice(1).toLowerCase()} · Part {item.part} (
                {count})
              </button>
            );
          })}
          <SaveIndicator status={status} className="ml-auto flex shrink-0 lg:hidden" />
        </div>
      </header>

      {/* pb-24 trên màn hẹp: chừa chỗ cho nút "Bảng câu hỏi" nổi ở góc dưới */}
      <main className="mx-auto grid max-w-[1440px] items-start gap-6 px-4 pt-6 pb-24 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-8 lg:pb-6">
        <div className="min-w-0 space-y-5">
          {actionError && (
            <FormAlert message={actionError} onClose={() => setActionError(undefined)} />
          )}
          {warning && (
            <p className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              Còn dưới 5 phút. Hết giờ hệ thống tự nộp bài.
            </p>
          )}

          <h1 className="text-lg font-bold text-foreground">
            Part {section.part} · {section.name}
          </h1>
          {section.blocks.map((block, index) => (
            <BlockView
              key={block.group?.id ?? block.questions[0]?.examQuestionId ?? index}
              block={block}
              skill={section.skill}
              part={section.part}
              answers={answers}
              activeId={activeId}
              onChange={change}
            />
          ))}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={sectionIndex === 0}
              onClick={() => goSection(sectionIndex - 1)}
              className="h-10 rounded-xl bg-white px-4"
            >
              <ChevronLeft />
              Part trước
            </Button>
            {lastSection ? (
              <Button
                type="button"
                onClick={() => setDialog('submit')}
                className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold"
              >
                <Send />
                Nộp bài
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => goSection(sectionIndex + 1)}
                className="h-10 rounded-xl bg-white px-4"
              >
                Part tiếp
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>

        {/* Bảng câu hỏi: cột phải trên màn rộng, hộp thoại trên màn hẹp */}
        <aside className="sticky top-36 hidden space-y-4 rounded-3xl border border-border bg-white p-5 shadow-2xs lg:block">
          <NavigatorHeader progress={progress} />
          <QuestionNavigator
            sections={sections}
            answers={answers}
            activeId={activeId}
            onJump={jump}
          />
          <CancelButton onClick={() => setDialog('cancel')} />
        </aside>
      </main>

      <button
        type="button"
        onClick={() => setDialog('nav')}
        className="fixed right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-lg ring-1 ring-border lg:hidden"
      >
        <LayoutGrid className="size-4 text-primary" />
        Bảng câu hỏi · {progress.answered}/{progress.total}
      </button>

      {status.state === 'offline' && (
        <div
          role="status"
          className="fixed bottom-20 left-4 z-20 flex max-w-xs items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg lg:bottom-4"
        >
          <CloudOff className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Mất kết nối tạm thời</p>
            <p className="text-xs">
              {status.pending} câu trả lời đang chờ, có mạng lại sẽ tự đồng bộ. Cứ làm tiếp bình
              thường.
            </p>
          </div>
        </div>
      )}

      <AppDialog
        open={dialog === 'nav'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Bảng câu hỏi"
        description="Bấm vào số câu để chuyển tới câu đó."
        footer={<CancelButton onClick={() => setDialog('cancel')} />}
      >
        <NavigatorHeader progress={progress} />
        <div className="mt-4">
          <QuestionNavigator
            sections={sections}
            answers={answers}
            activeId={activeId}
            onJump={jump}
          />
        </div>
      </AppDialog>

      <AppDialog
        open={dialog === 'submit'}
        onOpenChange={(open) => !open && setDialog(null)}
        busy={submitting}
        title="Nộp bài?"
        description="Sau khi nộp bạn không sửa được câu trả lời nữa."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setDialog(null)}
              className="h-10 rounded-xl px-4"
            >
              Làm tiếp
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              {submitting ? 'Đang nộp…' : 'Nộp bài'}
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-3 gap-2">
          <Tile label="Đã làm" value={`${progress.answered}/${progress.total}`} />
          <Tile label="Bỏ trống" value={progress.blank} warn={progress.blank > 0} />
          <Tile label="Đánh dấu" value={progress.flagged} warn={progress.flagged > 0} />
        </dl>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {timed && <p>Còn {formatClock(remaining)} làm bài.</p>}
          {progress.speaking > 0 && (
            <p>{progress.speaking} câu Speaking chưa hỗ trợ ghi âm, không tính vào điểm.</p>
          )}
          {status.pending > 0 && (
            <p className="text-amber-700">
              Còn {status.pending} câu chưa đồng bộ, hệ thống sẽ gửi trước khi nộp.
            </p>
          )}
        </div>
      </AppDialog>

      <AppDialog
        open={dialog === 'cancel'}
        onOpenChange={(open) => !open && setDialog(null)}
        busy={cancelling}
        title="Hủy bài làm?"
        description="Bài bị hủy không được chấm và không tính vào số lượt. Bạn có thể làm lại từ đầu."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => setDialog(null)}
              className="h-10 rounded-xl px-4"
            >
              Làm tiếp
            </Button>
            <Button
              type="button"
              disabled={cancelling}
              onClick={() => void cancel()}
              className="h-10 rounded-xl bg-destructive px-4 text-white hover:bg-destructive/90"
            >
              <Trash2 />
              {cancelling ? 'Đang hủy…' : 'Hủy bài'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Bạn đã làm {progress.answered}/{progress.total} câu.
        </p>
      </AppDialog>
    </div>
  );
}

function SaveIndicator({ status, className }: { status: SyncStatus; className?: string }) {
  const base = cn('items-center gap-1.5 text-xs font-semibold whitespace-nowrap', className);
  // className chứa lớp hiển thị (hidden lg:flex / flex lg:hidden): không tự thêm "flex" ở đây
  if (status.state === 'saving' || (status.pending > 0 && status.state !== 'offline')) {
    return (
      <span className={cn(base, 'text-slate-500')}>
        <Loader2 className="size-4 animate-spin" />
        Đang lưu…
      </span>
    );
  }
  if (status.state === 'offline') {
    return (
      <span className={cn(base, 'text-amber-700')}>
        <CloudOff className="size-4" />
        Chờ đồng bộ {status.pending} câu
      </span>
    );
  }
  if (status.state === 'error') {
    return (
      <span className={cn(base, 'text-destructive')} title={status.message}>
        <TriangleAlert className="size-4" />
        Lỗi lưu
      </span>
    );
  }
  if (status.savedAt) {
    return (
      <span className={cn(base, 'text-success')}>
        <CircleCheck className="size-4" />
        Đã lưu ·{' '}
        {status.savedAt.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    );
  }
  return (
    <span className={cn(base, 'text-subtle')}>
      <CircleCheck className="size-4" />
      Tự lưu khi trả lời
    </span>
  );
}

function NavigatorHeader({ progress }: { progress: ReturnType<typeof progressOf> }) {
  return (
    <div>
      <h2 className="font-bold text-foreground">Bảng câu hỏi</h2>
      <p className="mt-1 rounded-xl bg-accent px-3 py-1.5 text-xs text-slate-700">
        Đã làm <span className="font-bold text-brand">{progress.answered}</span>/{progress.total} ·
        Đánh dấu <span className="font-bold text-amber-700">{progress.flagged}</span>
      </p>
    </div>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:underline"
    >
      <Trash2 className="size-4" />
      Hủy bài làm
    </button>
  );
}

function Tile({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={cn('rounded-2xl px-3 py-2 text-center', warn ? 'bg-amber-50' : 'bg-accent/70')}>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className={cn('text-lg font-bold', warn ? 'text-amber-700' : 'text-brand')}>{value}</dd>
    </div>
  );
}
