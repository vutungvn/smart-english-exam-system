import { useState } from 'react';
import { useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bot,
  FileText,
  Loader2,
  Mic,
  MicOff,
  NotebookPen,
  RotateCw,
  Save,
  Sparkles,
  UserRoundSearch,
} from 'lucide-react';
import { z } from 'zod';
import { toApiError } from '@/api/errors';
import {
  useGetTeacherAssessmentQuery,
  useGradeTeacherAssessmentMutation,
  type QuestionAssessment,
  type TeacherReviewDetail,
} from '@/api/generated';
import { FieldError } from '@/components/form/FieldError';
import { FormAlert } from '@/components/form/FormAlert';
import { NativeSelect } from '@/components/form/NativeSelect';
import { MediaAudio } from '@/components/media/MediaAudio';
import { PageHeader } from '@/components/PageHeader';
import { QuestionMedia } from '@/components/QuestionMedia';
import { Button } from '@/components/ui/button';
import { countWords, formatDateTime } from '@/features/practice/practice-meta';
import { AssessmentPanel } from '@/features/practice/review/AssessmentPanel';
import { ErrorState, SuccessBanner } from '@/features/question-bank/components/ListStates';
import { textareaClass } from '@/features/question-bank/form/styles';
import { cn } from '@/lib/utils';
import { GRADING_PATH, questionLabel, REASON_META } from '../grading-meta';

const FEEDBACK_MAX = 2000;
const card = 'rounded-3xl border border-border bg-white p-5 shadow-2xs';

/** Màn chấm một câu Speaking/Writing của giáo viên (SPRINT-91): đề, bài làm, bản AI, form chấm */
export function GradingDetailPage() {
  const { answerId = '' } = useParams();
  const { data, error, isLoading, refetch, isFetching } = useGetTeacherAssessmentQuery(answerId, {
    refetchOnMountOrArgChange: true,
  });
  const [saved, setSaved] = useState(false);

  if (isLoading) return <div className="h-96 animate-pulse rounded-3xl bg-white" aria-hidden />;
  if (error && !data) {
    return (
      <div className="rounded-3xl border border-border bg-white">
        <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!data) return null;
  const detail = data.data;
  const speaking = detail.question.type === 'SPOKEN_RESPONSE';

  return (
    <div className="space-y-6">
      <title>Chấm lại bài – Smart English Exam</title>
      <PageHeader
        backTo={{ label: 'Chấm lại bài', to: GRADING_PATH }}
        title={detail.examTitle}
        description={`${questionLabel(detail.skill, detail.part, detail.questionNumber)} · ${detail.studentCode} · nộp ${formatDateTime(detail.submittedAt)}`}
      />

      {saved && (
        <SuccessBanner
          message="Đã lưu điểm. Điểm bài làm đã tính lại và học viên đã nhận thông báo."
          onClose={() => setSaved(false)}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <section aria-label="Đề bài" className={card}>
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <FileText className="size-5 text-primary" />
              Đề bài
            </h2>
            {(detail.question.imageUrl || detail.question.groupImageUrl) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {detail.question.groupImageUrl && (
                  <QuestionMedia kind="image" url={detail.question.groupImageUrl} />
                )}
                {detail.question.imageUrl && (
                  <QuestionMedia kind="image" url={detail.question.imageUrl} />
                )}
              </div>
            )}
            {detail.question.passage && (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed wrap-break-word whitespace-pre-line text-slate-700">
                {detail.question.passage}
              </p>
            )}
            <p className="mt-4 leading-relaxed font-semibold wrap-break-word whitespace-pre-line text-foreground">
              {detail.question.content}
            </p>
            {detail.question.sampleAnswer && (
              <details className="group mt-4 rounded-2xl bg-accent/60 px-4 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-800 select-none [&::-webkit-details-marker]:hidden">
                  <Sparkles className="size-4 text-primary" />
                  Bài mẫu
                  <span className="ml-auto text-xs font-medium text-primary group-open:hidden">
                    Xem
                  </span>
                </summary>
                <p className="mt-2 leading-relaxed wrap-break-word whitespace-pre-line">
                  {detail.question.sampleAnswer}
                </p>
              </details>
            )}
          </section>

          <section aria-label="Bài làm của học viên" className={card}>
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              {speaking ? (
                <Mic className="size-5 text-primary" />
              ) : (
                <NotebookPen className="size-5 text-primary" />
              )}
              {speaking ? 'Bài nói của học viên' : 'Bài viết của học viên'}
            </h2>
            <StudentAnswer detail={detail} />
          </section>

          {detail.reviewRequest && (
            <section
              aria-label="Yêu cầu của học viên"
              className="flex items-start gap-3 rounded-3xl border border-violet-200 bg-violet-50 p-5 text-sm text-violet-900"
            >
              <UserRoundSearch className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">
                  Học viên yêu cầu chấm lại lúc {formatDateTime(detail.reviewRequest.requestedAt)}
                </p>
                <p className="mt-1 wrap-break-word">“{detail.reviewRequest.note}”</p>
              </div>
            </section>
          )}

          <section aria-label="Bản AI chấm" className={card}>
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <Bot className="size-5 text-sky-600" />
              Bản AI chấm
            </h2>
            <AiCopy assessment={detail.aiAssessment} speaking={speaking} />
          </section>
        </div>

        <aside className={cn(card, 'lg:sticky lg:top-24')}>
          <div className="flex flex-wrap items-center gap-1.5">
            {detail.reasons.map((reason) => (
              <span
                key={reason}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  REASON_META[reason].className,
                )}
              >
                {REASON_META[reason].label}
              </span>
            ))}
          </div>
          <h2 className="mt-2 font-bold text-foreground">
            {detail.teacherAssessment ? 'Sửa điểm giáo viên' : 'Giáo viên chấm'}
          </h2>
          {detail.teacherAssessment && (
            <p className="mt-0.5 text-xs text-subtle">
              {detail.reviewerName ?? 'Giáo viên'} chấm lúc{' '}
              {formatDateTime(
                detail.teacherAssessment.gradedAt ?? detail.teacherAssessment.updatedAt,
              )}
            </p>
          )}
          {/* Bản giáo viên đổi (vừa lưu, người khác sửa) thì dựng lại form với giá trị mới */}
          <GradeForm
            key={detail.teacherAssessment?.updatedAt ?? 'new'}
            detail={detail}
            reloading={isFetching}
            onReload={() => void refetch()}
            onSaved={() => setSaved(true)}
          />
        </aside>
      </div>
    </div>
  );
}

function StudentAnswer({ detail }: { detail: TeacherReviewDetail }) {
  const { answer } = detail;
  if (detail.question.type === 'WRITTEN_RESPONSE') {
    return (
      <>
        <p className="mt-1 text-xs text-subtle">{countWords(answer.textAnswer)} từ</p>
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 leading-relaxed wrap-break-word whitespace-pre-line text-slate-800">
          {answer.textAnswer}
        </p>
      </>
    );
  }
  const transcript = detail.aiAssessment?.transcript;
  return (
    <div className="mt-3 space-y-3 text-sm">
      {answer.recordingUrl ? (
        <MediaAudio url={answer.recordingUrl} />
      ) : (
        <p className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">
          <MicOff className="mt-0.5 size-4 shrink-0" />
          {answer.recordingDeletedAt
            ? `Bản ghi âm đã tự xóa ngày ${new Date(answer.recordingDeletedAt).toLocaleDateString('vi-VN')} do hết thời hạn lưu; chấm theo lời nói AI nghe được bên dưới.`
            : 'Không có bản ghi âm.'}
        </p>
      )}
      {detail.question.responseSeconds !== null && (
        <p className="text-xs text-subtle">
          Thời gian trả lời: {detail.question.responseSeconds} giây
        </p>
      )}
      {transcript && (
        <div>
          <h3 className="mb-1 font-semibold text-slate-800">AI nghe được</h3>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 leading-relaxed wrap-break-word whitespace-pre-line text-slate-700 italic">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}

function AiCopy({
  assessment,
  speaking,
}: {
  assessment: QuestionAssessment | null;
  speaking: boolean;
}) {
  if (!assessment) return <p className="mt-2 text-sm text-muted-foreground">Chưa có bản AI.</p>;
  if (assessment.status === 'DONE') {
    return (
      <AssessmentPanel
        attemptId=""
        assessment={assessment}
        kind={speaking ? 'speaking' : 'writing'}
      />
    );
  }
  return (
    <p className="mt-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-on-danger-soft">
      {assessment.status === 'FAILED'
        ? `AI chưa chấm được: ${assessment.errorMessage ?? 'kết quả không hợp lệ'}`
        : 'AI đang chấm câu này.'}
    </p>
  );
}

/** Giá trị form: ô chọn trả chuỗi, "" là chưa chọn */
interface GradeValues {
  score: string;
  pronunciation: string;
  intonation: string;
  criteria: Record<string, string>;
  feedback: string;
}

function makeSchema(hasSubScores: boolean) {
  const required = z.string().min(1, 'Chọn điểm');
  return z.object({
    score: hasSubScores ? z.string() : required,
    pronunciation: hasSubScores ? required : z.string(),
    intonation: hasSubScores ? required : z.string(),
    criteria: z.record(z.string(), z.string()),
    feedback: z
      .string()
      .trim()
      .min(5, 'Nhận xét dài ít nhất 5 ký tự')
      .max(FEEDBACK_MAX, `Nhận xét tối đa ${FEEDBACK_MAX} ký tự`),
  });
}

const toText = (value: number | null | undefined) => (value == null ? '' : String(value));
const range = (max: number) => Array.from({ length: max + 1 }, (_, index) => index);

/** Giá trị ban đầu: bản giáo viên nếu đã chấm, không thì bắt đầu từ bản AI */
function defaultsOf(detail: TeacherReviewDetail): GradeValues {
  const base = detail.teacherAssessment ?? detail.aiAssessment;
  const done = base?.status === 'DONE';
  const sub = (key: string) => toText(base?.subScores.find((item) => item.key === key)?.score);
  return {
    score: done ? toText(base.score) : '',
    pronunciation: done ? sub('pronunciation') : '',
    intonation: done ? sub('intonation') : '',
    criteria: Object.fromEntries(
      detail.criteriaOptions.map(({ key }) => [
        key,
        done ? toText(base.criteria.find((item) => item.key === key)?.score) : '',
      ]),
    ),
    feedback: detail.teacherAssessment?.feedback ?? '',
  };
}

function GradeForm({
  detail,
  reloading,
  onReload,
  onSaved,
}: {
  detail: TeacherReviewDetail;
  reloading: boolean;
  onReload: () => void;
  onSaved: () => void;
}) {
  const hasSubScores = detail.subScoreOptions.length > 0;
  const [grade, { isLoading }] = useGradeTeacherAssessmentMutation();
  const [error, setError] = useState<{ message: string; conflict: boolean }>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GradeValues>({
    resolver: zodResolver(makeSchema(hasSubScores)),
    defaultValues: defaultsOf(detail),
  });

  const submit = handleSubmit(async (values) => {
    setError(undefined);
    const criteria = Object.fromEntries(
      Object.entries(values.criteria)
        .filter(([, value]) => value !== '')
        .map(([key, value]) => [key, Number(value)]),
    );
    try {
      await grade({
        answerId: detail.answerId,
        gradeAnswerDto: {
          ...(hasSubScores
            ? {
                subScores: {
                  pronunciation: Number(values.pronunciation),
                  intonation: Number(values.intonation),
                },
              }
            : { score: Number(values.score) }),
          criteria,
          feedback: values.feedback,
          updatedAt: detail.teacherAssessment?.updatedAt,
        },
      }).unwrap();
      onSaved();
    } catch (cause) {
      const apiError = toApiError(cause);
      setError({ message: apiError.message, conflict: apiError.code === 'VERSION_CONFLICT' });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4" noValidate>
      {error && (
        <FormAlert message={error.message}>
          {error.conflict && (
            <button
              type="button"
              onClick={onReload}
              disabled={reloading}
              className="inline-flex items-center gap-1 underline"
            >
              <RotateCw className="size-3" />
              Tải lại điểm mới
            </button>
          )}
        </FormAlert>
      )}

      {hasSubScores ? (
        <div className="grid grid-cols-2 gap-3">
          {detail.subScoreOptions.map((option) => {
            const name = option.key as 'pronunciation' | 'intonation';
            return (
              <div key={option.key} className="flex flex-col gap-1.5">
                <label htmlFor={`sub-${name}`} className="text-xs font-semibold text-slate-700">
                  {option.label} (0–{option.max}) <span className="text-rose-500">*</span>
                </label>
                <NativeSelect id={`sub-${name}`} {...register(name)}>
                  <option value="">Chọn</option>
                  {range(option.max).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </NativeSelect>
                <FieldError message={errors[name]?.message} />
              </div>
            );
          })}
          <p className="col-span-2 text-xs text-subtle">
            Điểm câu = tổng 2 điểm con (tối đa {detail.maxScore})
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="grade-score" className="text-xs font-semibold text-slate-700">
            Điểm câu (0–{detail.maxScore}) <span className="text-rose-500">*</span>
          </label>
          <NativeSelect id="grade-score" {...register('score')}>
            <option value="">Chọn điểm</option>
            {range(detail.maxScore).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.score?.message} />
        </div>
      )}

      <fieldset>
        <legend className="text-xs font-semibold text-slate-700">
          Tiêu chí (0–5, không bắt buộc)
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {detail.criteriaOptions.map((option) => (
            <label key={option.key} className="flex flex-col gap-1 text-xs text-slate-600">
              {option.label}
              <NativeSelect {...register(`criteria.${option.key}`)}>
                <option value="">—</option>
                {range(5).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </NativeSelect>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grade-feedback" className="text-xs font-semibold text-slate-700">
          Nhận xét cho học viên <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="grade-feedback"
          {...register('feedback')}
          maxLength={FEEDBACK_MAX}
          placeholder="Nêu điểm làm tốt, lỗi chính và cách cải thiện."
          aria-invalid={!!errors.feedback}
          className={textareaClass}
        />
        <FieldError message={errors.feedback?.message} />
      </div>

      <Button type="submit" disabled={isLoading} className="h-10 w-full rounded-xl font-semibold">
        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
        {detail.teacherAssessment ? 'Lưu điểm mới' : 'Lưu điểm'}
      </Button>
      <p className="text-xs text-subtle">
        Điểm giáo viên thay cho điểm AI; bản AI vẫn giữ để đối chiếu. Học viên nhận thông báo khi
        lưu.
      </p>
    </form>
  );
}
