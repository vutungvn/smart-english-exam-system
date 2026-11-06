import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  CircleCheck,
  CirclePlay,
  Clock,
  Layers,
  Loader2,
  Rocket,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  History,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useCancelAttemptMutation,
  useGetPublishedExamQuery,
  useStartAttemptMutation,
  type ExamCatalogDetail,
  type StartAttemptDto,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { ButtonLink } from '@/components/ButtonLink';
import { FormAlert } from '@/components/form/FormAlert';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { cn } from '@/lib/utils';
import { attemptPath, formatClock, PRACTICE_PATH, resultsPath, SCALE_META } from '../practice-meta';
import { VoiceConsentDialog } from '../speaking/VoiceConsentDialog';

const NOTES = [
  'Câu trả lời tự lưu sau mỗi lần chọn hoặc ngừng gõ.',
  'Mất mạng vẫn làm tiếp được, có mạng lại sẽ tự đồng bộ.',
  'Làm cả đề có đếm giờ, hết giờ hệ thống tự nộp bài.',
  'Luyện theo Part không đếm giờ và không tính vào số lượt.',
  'Câu Speaking, Writing được AI chấm sau khi nộp.',
];

export function PracticeExamDetailPage() {
  const { id = '' } = useParams();
  const { data, error, isLoading, refetch } = useGetPublishedExamQuery(id);

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-white" aria-hidden />;
  }
  if (error && !data) {
    const apiError = toApiError(error);
    return (
      <div className="rounded-3xl border border-border bg-white">
        {apiError.code === 'EXAM_NOT_FOUND' ? (
          <EmptyState
            title="Không tìm thấy đề"
            description="Đề không tồn tại hoặc đã ngừng mở cho học viên."
          >
            <ButtonLink to={PRACTICE_PATH} className="h-10 w-auto px-5">
              Về danh sách đề
            </ButtonLink>
          </EmptyState>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }
  return data ? <ExamDetail exam={data.data} /> : null;
}

function ExamDetail({ exam }: { exam: ExamCatalogDetail }) {
  const navigate = useNavigate();
  const [startAttempt, { isLoading: starting, originalArgs }] = useStartAttemptMutation();
  const [cancelAttempt, { isLoading: cancelling }] = useCancelAttemptMutation();
  const [error, setError] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Đề có Speaking mà chưa đồng ý ghi âm: hỏi rồi bắt đầu lại đúng lựa chọn vừa bấm
  const [needConsent, setNeedConsent] = useState<StartAttemptDto | null>(null);

  const inProgress = exam.inProgress;
  const inProgressSection = exam.sections.find((section) => section.id === inProgress?.sectionId);
  const canStartFull = exam.attemptsLeft !== 0 || inProgress?.mode === 'FULL';
  const scale = SCALE_META[exam.scoringScale];
  const counts = {
    choice: exam.sections.filter((s) => s.skill === 'LISTENING' || s.skill === 'READING'),
    writing: exam.sections.filter((s) => s.skill === 'WRITING'),
    speaking: exam.sections.filter((s) => s.skill === 'SPEAKING'),
  };
  const sum = (list: typeof exam.sections) => list.reduce((n, s) => n + s.questionCount, 0);

  const start = async (dto: StartAttemptDto) => {
    setError(undefined);
    try {
      const result = await startAttempt({ id: exam.id, startAttemptDto: dto }).unwrap();
      void navigate(attemptPath(result.data.id));
    } catch (cause) {
      const apiError = toApiError(cause);
      if (apiError.code === 'VOICE_CONSENT_REQUIRED') {
        setNeedConsent(dto);
        return;
      }
      // Đang có bài dở khác kiểu, hết lượt, đề vừa bị gỡ…: hiện thông báo của server
      setError(apiError.message);
    }
  };

  const cancel = async () => {
    if (!inProgress) return;
    try {
      await cancelAttempt(inProgress.id).unwrap();
      setConfirmCancel(false);
    } catch (cause) {
      setError(toApiError(cause).message);
      setConfirmCancel(false);
    }
  };

  const busyFor = (dto: StartAttemptDto) =>
    starting &&
    originalArgs?.startAttemptDto.mode === dto.mode &&
    originalArgs.startAttemptDto.sectionId === dto.sectionId;

  return (
    <div className="space-y-6">
      <title>{`${exam.title} – Luyện đề thi`}</title>
      <PageHeader
        breadcrumbs={[{ label: 'Luyện đề thi', to: PRACTICE_PATH }, { label: exam.title }]}
        title={exam.title}
        description={
          <span className="mt-1 block space-y-2">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', scale.pill)}>
                {scale.label}
              </span>
              {exam.skills.map((skill) => (
                <SkillPill key={skill} skill={skill} />
              ))}
            </span>
            {exam.description && <span className="block">{exam.description}</span>}
          </span>
        }
      />

      {error && <FormAlert message={error} onClose={() => setError(undefined)} />}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Cấu trúc đề */}
        <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2.5 font-bold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                <Layers className="size-4" />
              </span>
              Cấu trúc đề
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {exam.skills.length} kỹ năng · {exam.sectionCount} Part
            </span>
          </div>

          <ul className="divide-y divide-border">
            {exam.sections.map((section) => {
              const speaking = section.skill === 'SPEAKING';
              const kind = speaking
                ? 'ghi âm'
                : section.skill === 'WRITING'
                  ? 'tự luận gõ văn bản'
                  : 'trắc nghiệm';
              const dto: StartAttemptDto = { mode: 'PART', sectionId: section.id };
              const isCurrent = inProgress?.mode === 'PART' && inProgress.sectionId === section.id;
              return (
                <li
                  key={section.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <SkillPill skill={section.skill} className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        Part {section.part} · {section.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {section.questionCount} câu · {kind}
                      </p>
                    </div>
                  </div>
                  {exam.allowPartPractice && (
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      {isCurrent ? (
                        <ButtonLink to={attemptPath(inProgress.id)} className="h-9 w-auto px-4">
                          <CirclePlay />
                          Làm tiếp Part này
                        </ButtonLink>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={starting}
                          onClick={() => void start(dto)}
                          className="h-9 rounded-xl bg-white px-4 font-semibold"
                        >
                          {busyFor(dto) ? <Loader2 className="animate-spin" /> : <CirclePlay />}
                          Luyện Part này
                        </Button>
                      )}
                      <span className="text-xs text-subtle">
                        {speaking ? 'Cần micro · không tính giờ' : 'Không tính giờ'}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50/70 px-5 py-3 text-sm sm:px-6">
            <p className="flex items-center gap-2 font-bold text-foreground">
              <CircleCheck className="size-4 text-success" />
              {exam.sectionCount} Part · Tổng {exam.questionCount} câu
            </p>
            <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {sum(counts.choice) > 0 && <span>{sum(counts.choice)} trắc nghiệm</span>}
              {sum(counts.writing) > 0 && <span>{sum(counts.writing)} tự luận</span>}
              {sum(counts.speaking) > 0 && <span>{sum(counts.speaking)} nói</span>}
            </p>
          </div>
          {!exam.allowPartPractice && (
            <p className="border-t border-border px-5 py-3 text-xs text-subtle sm:px-6">
              Đề này chỉ cho làm cả đề, không luyện riêng từng Part.
            </p>
          )}
        </section>

        <div className="space-y-6">
          {inProgress && (
            <section
              role="status"
              className="rounded-3xl border border-amber-300/60 bg-amber-50 p-5 text-amber-900"
            >
              <p className="flex items-start gap-2 font-bold">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                {inProgress.mode === 'FULL'
                  ? 'Bạn đang làm dở bài làm cả đề'
                  : `Bạn đang làm dở bài luyện Part ${inProgressSection?.part ?? ''}`}
              </p>
              <p className="mt-1 text-sm">
                {inProgress.remainingSeconds !== null
                  ? `Còn ${formatClock(inProgress.remainingSeconds)}. `
                  : ''}
                Hãy làm tiếp, hoặc hủy bài đó để bắt đầu bài khác.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink to={attemptPath(inProgress.id)} className="h-9 w-auto px-4">
                  <CirclePlay />
                  Làm tiếp
                </ButtonLink>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmCancel(true)}
                  className="h-9 rounded-xl bg-white px-4 font-semibold"
                >
                  <Trash2 />
                  Hủy bài đó
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
            <h2 className="flex items-center gap-2.5 font-bold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                <Clock className="size-4" />
              </span>
              Làm cả đề
            </h2>
            <p className="mt-4 text-xs font-semibold tracking-wider text-subtle uppercase">
              Thời gian làm bài
            </p>
            <p className="text-4xl font-bold text-foreground">
              {exam.durationMinutes} <span className="text-xl font-semibold">phút</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Đồng hồ tính ở máy chủ: tải lại trang hay mất mạng vẫn đúng giờ. Hết giờ hệ thống tự
              nộp bài.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              {exam.maxAttempts === null ? (
                <p className="text-slate-700">Không giới hạn số lượt làm cả đề</p>
              ) : (
                <>
                  <p className="flex justify-between gap-2 text-slate-700">
                    <span>
                      Đã làm {exam.attemptsUsed}/{exam.maxAttempts} lượt
                    </span>
                    <span className="font-semibold text-brand">Còn {exam.attemptsLeft} lượt</span>
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(exam.attemptsUsed / exam.maxAttempts) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {inProgress?.mode === 'FULL' ? (
              <ButtonLink to={attemptPath(inProgress.id)} className="mt-4 h-11">
                <CirclePlay />
                Làm tiếp bài làm cả đề
              </ButtonLink>
            ) : (
              <Button
                type="button"
                disabled={!canStartFull || starting}
                onClick={() => void start({ mode: 'FULL' })}
                className="mt-4 h-11 w-full rounded-xl bg-linear-to-r from-primary to-brand font-semibold shadow-md shadow-primary/30"
              >
                {busyFor({ mode: 'FULL' }) ? <Loader2 className="animate-spin" /> : <Rocket />}
                {canStartFull ? 'Bắt đầu làm cả đề' : 'Đã hết lượt làm cả đề'}
              </Button>
            )}
            <Link
              to={resultsPath(exam.id)}
              className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-brand"
            >
              <History className="size-4" />
              Lịch sử làm đề này
            </Link>
          </section>

          <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
            <h2 className="flex items-center gap-2.5 font-bold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                <ShieldCheck className="size-4" />
              </span>
              Lưu ý
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {NOTES.map((note) => (
                <li key={note} className="flex gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  {note}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <AppDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        busy={cancelling}
        title="Hủy bài đang làm dở?"
        description="Bài bị hủy không tính vào số lượt và không chấm điểm. Bạn có thể bắt đầu bài mới ngay sau đó."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => setConfirmCancel(false)}
              className="h-10 rounded-xl px-4"
            >
              Giữ lại
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
          {inProgress?.mode === 'FULL'
            ? 'Bài làm cả đề'
            : `Bài luyện Part ${inProgressSection?.part ?? ''} · ${inProgressSection?.name ?? ''}`}
        </p>
      </AppDialog>

      <VoiceConsentDialog
        open={needConsent !== null}
        onClose={() => setNeedConsent(null)}
        onAgreed={() => {
          const dto = needConsent;
          setNeedConsent(null);
          if (dto) void start(dto);
        }}
      />
    </div>
  );
}
