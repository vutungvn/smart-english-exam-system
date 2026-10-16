import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Eye, FileQuestion, RotateCw, Save, Trash2, TriangleAlert } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useCreateQuestionMutation,
  useGetQuestionQuery,
  useUpdateQuestionMutation,
  useUploadQuestionMediaMutation,
  type QuestionDetail,
  type Skill,
} from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { FormAlert } from '@/components/form/FormAlert';
import { NativeSelect } from '@/components/form/NativeSelect';
import { SubmitButton } from '@/components/form/SubmitButton';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { SaveFeedback } from '@/features/profile/components/SaveFeedback';
import { formatDateTime } from '@/features/profile/format';
import { useSavedFlag } from '@/features/profile/hooks/use-saved-flag';
import { useAppSelector } from '@/hooks/hooks';
import { applyFieldErrors } from '@/lib/form-errors';
import { describeMediaError } from '@/lib/media-file';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { DeleteQuestionDialog } from '../components/DeleteQuestionDialog';
import { EmptyState, ErrorState } from '../components/ListStates';
import { AnswerFields } from '../form/AnswerFields';
import { ClassificationFields } from '../form/ClassificationFields';
import { ExplanationField, GroupFields } from '../form/ExtraFields';
import { FormSection } from '../form/FormSection';
import { MediaFields } from '../form/MediaFields';
import {
  emptyFormValues,
  questionFormSchema,
  toFormValues,
  toPayload,
  type QuestionFormValues,
} from '../form/question-form';
import { QuestionSidePanel } from '../form/QuestionPreview';
import { usePendingMedia } from '../form/use-pending-media';
import { groupPath, QUESTION_LIST_PATH, questionPath } from '../paths';
import {
  findPartRule,
  OPTION_LABELS,
  questionMediaKinds,
  SKILLS,
  STATUS_META,
  type PartRule,
} from '../toeic';
import type { QuestionBankLocationState } from './QuestionBankPage';

// Lỗi VALIDATION_ERROR của server gắn được vào các ô này
const SERVER_FIELDS: Path<QuestionFormValues>[] = [
  'skill',
  'part',
  'topicId',
  'difficulty',
  'status',
  'content',
  'explanation',
  'sampleAnswer',
  'prepSeconds',
  'responseSeconds',
  'groupId',
  'orderInGroup',
  'options',
  ...OPTION_LABELS.map((_, i) => `options.${i}.content` as const),
];

/** Trang tạo câu chuyển sang trang sửa khi câu đã tạo nhưng tải tệp lỗi */
interface QuestionFormLocationState {
  mediaError?: string;
}

/** `/teacher/questions/new` (tạo) và `/teacher/questions/:id` (sửa, hoặc chỉ xem nếu không phải tác giả) */
export function QuestionFormPage() {
  const { id } = useParams();
  return id ? <EditQuestion key={id} id={id} /> : <CreateQuestion />;
}

function CreateQuestion() {
  // Từ danh sách đang lọc Reading · Part 5 bấm "Tạo câu hỏi" thì chọn sẵn kỹ năng/Part đó
  const [params] = useSearchParams();
  const skill = SKILLS.find((s) => s === params.get('skill')) as Skill | undefined;
  const part = Number(params.get('part')) || undefined;
  // Từ trang nhóm bấm "Thêm câu vào nhóm": chọn sẵn nhóm, lưu xong quay về trang nhóm
  const groupId = params.get('groupId') ?? undefined;
  return (
    <QuestionEditor
      defaultValues={emptyFormValues({ skill, part, groupId })}
      backPath={groupId ? groupPath(groupId) : undefined}
    />
  );
}

function EditQuestion({ id }: { id: string }) {
  const { data, error, isLoading, refetch } = useGetQuestionQuery(id);
  const location = useLocation();
  const navigate = useNavigate();
  const [mediaError, setMediaError] = useState(
    () => (location.state as QuestionFormLocationState | null)?.mediaError,
  );
  // Xóa thông báo khỏi lịch sử để tải lại trang không hiện lại
  useEffect(() => {
    if ((location.state as QuestionFormLocationState | null)?.mediaError) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  if (isLoading) return <EditorSkeleton />;
  if (!data) {
    const apiError = toApiError(error);
    return (
      <div className="rounded-3xl border border-border bg-white">
        {apiError.code === 'QUESTION_NOT_FOUND' || apiError.code === 'VALIDATION_ERROR' ? (
          <EmptyState
            icon={FileQuestion}
            title="Không tìm thấy câu hỏi"
            description="Câu hỏi không tồn tại hoặc đã bị xóa."
          >
            <ButtonLink to={QUESTION_LIST_PATH} className="h-10 w-auto px-5">
              Về ngân hàng câu hỏi
            </ButtonLink>
          </EmptyState>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  return (
    <QuestionEditor
      question={data.data}
      defaultValues={toFormValues(data.data)}
      reload={async () => toFormValues((await refetch().unwrap()).data)}
      notice={
        mediaError &&
        `Đã tạo câu hỏi nhưng chưa tải được tệp (${mediaError}). Hãy tải lại ở mục "Âm thanh & hình ảnh".`
      }
      onDismissNotice={() => setMediaError(undefined)}
    />
  );
}

interface QuestionEditorProps {
  defaultValues: QuestionFormValues;
  /** Có khi sửa/xem câu đã lưu */
  question?: QuestionDetail;
  /** Tải lại bản mới nhất từ server (sau khi gặp 409) */
  reload?: () => Promise<QuestionFormValues>;
  /** Trang quay về khi Hủy, sau khi tạo/xóa (mặc định: câu thuộc nhóm thì về nhóm, không thì về danh sách) */
  backPath?: string;
  /** Thông báo đầu trang (câu vừa tạo nhưng tải tệp lỗi) */
  notice?: string;
  onDismissNotice?: () => void;
}

function QuestionEditor({
  defaultValues,
  question,
  reload,
  backPath,
  notice,
  onDismissNotice,
}: QuestionEditorProps) {
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [uploadMedia] = useUploadQuestionMediaMutation();
  const pendingMedia = usePendingMedia();
  const { saved, markSaved, clearSaved } = useSavedFlag(4000);
  const [savedMessage, setSavedMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editing = !!question;
  const returnPath =
    backPath ?? (question?.groupId ? groupPath(question.groupId) : QUESTION_LIST_PATH);
  const readOnly = editing && question.author.id !== user?.id;

  const form = useForm({
    resolver: zodResolver(questionFormSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    reset,
    resetField,
    setError,
    clearErrors,
    getValues,
    register,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const [skill, part] = useWatch({ control: form.control, name: ['skill', 'part'] });
  const rule = skill ? findPartRule(skill, part) : undefined;
  const formError = errors.root?.server?.message;

  const handleServerError = (err: unknown) => {
    const apiError = toApiError(err);
    if (apiError.code === 'VERSION_CONFLICT') return setConflict(true);
    if (apiError.code === 'QUESTION_GROUP_ORDER_TAKEN') {
      return setError(
        'orderInGroup',
        { type: 'server', message: apiError.message },
        { shouldFocus: true },
      );
    }
    // Backend báo sai loại câu ở trường `type` (FE tự suy ra từ Part) → hiện ở ô Part
    const fieldErrors = apiError.fieldErrors.map((item) =>
      item.field === 'type' ? { ...item, field: 'part' } : item,
    );
    if (applyFieldErrors({ ...apiError, fieldErrors }, setError, SERVER_FIELDS)) return;
    setError('root.server', {
      type: apiError.code,
      message:
        apiError.code === 'FORBIDDEN'
          ? 'Bạn chỉ sửa được câu hỏi do mình tạo'
          : apiError.code === 'QUESTION_NOT_FOUND'
            ? 'Câu hỏi đã bị xóa, không lưu được'
            : apiError.message,
    });
  };

  /** Câu vừa tạo: tải các tệp đã chọn; trả về lỗi của từng tệp không tải được */
  const uploadPending = async (id: string, currentRule: PartRule): Promise<string[]> => {
    const failures: string[] = [];
    for (const kind of questionMediaKinds(currentRule.skill, currentRule.part)) {
      const item = pendingMedia.pending[kind];
      if (!item) continue;
      try {
        await uploadMedia({ id, kind, body: { file: item.file } }).unwrap();
      } catch (err) {
        failures.push(`${kind === 'audio' ? 'âm thanh' : 'hình ảnh'}: ${describeMediaError(err)}`);
      }
    }
    return failures;
  };

  /** Tải/gỡ tệp ở câu đang sửa làm đổi updatedAt: đổi mốc của form để lần Lưu sau không bị 409 */
  const mediaSaved = (previousUpdatedAt: string, saved: QuestionDetail) => {
    // Form đang giữ bản cũ hơn (câu bị sửa ở nơi khác) thì để nguyên, lần Lưu sau vẫn báo xung đột
    if (getValues('updatedAt') === previousUpdatedAt) {
      resetField('updatedAt', { defaultValue: saved.updatedAt });
    }
    setSavedMessage('Đã lưu tệp');
    markSaved();
  };

  const save = async (values: QuestionFormValues, createAnother: boolean) => {
    const currentRule = values.skill ? findPartRule(values.skill, values.part) : undefined;
    if (!currentRule) return;
    clearSaved();
    const payload = toPayload(values, currentRule);
    try {
      if (question) {
        const { data } = await updateQuestion({
          id: question.id,
          updateQuestionDto: { ...payload, updatedAt: values.updatedAt ?? question.updatedAt },
        }).unwrap();
        reset(toFormValues(data)); // bản vừa lưu thành mốc mới, nút Lưu tắt lại
        setSavedMessage('Đã lưu thay đổi');
        markSaved();
        return;
      }

      const { data: created } = await createQuestion(payload).unwrap();
      const failures = await uploadPending(created.id, currentRule);
      pendingMedia.clear();
      if (failures.length) {
        // Câu đã tạo: sang trang sửa câu đó để tải lại tệp
        const state: QuestionFormLocationState = { mediaError: failures.join('; ') };
        return void navigate(questionPath(created.id), { state });
      }
      if (!createAnother) {
        const state: QuestionBankLocationState = { flash: 'Đã tạo câu hỏi mới' };
        return void navigate(returnPath, { state });
      }
      // Soạn tiếp câu cùng loại: giữ phân loại, nhóm; xóa nội dung
      reset({
        ...emptyFormValues({ skill: currentRule.skill, part: currentRule.part }),
        topicId: values.topicId,
        difficulty: values.difficulty,
        status: values.status,
        prepSeconds: values.prepSeconds,
        responseSeconds: values.responseSeconds,
        groupId: values.groupId,
        // Để trống: GroupFields điền vị trí trống đầu tiên khi nhóm tải lại (đã thêm câu vừa tạo)
        orderInGroup: '',
      });
      setSavedMessage('Đã tạo câu hỏi, mời soạn câu tiếp theo');
      markSaved();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      handleServerError(err);
    }
  };

  const reloadLatest = async () => {
    if (!reload) return;
    setReloading(true);
    try {
      reset(await reload());
      setConflict(false);
    } finally {
      setReloading(false);
    }
  };

  const title = readOnly ? 'Chi tiết câu hỏi' : editing ? 'Sửa câu hỏi' : 'Tạo câu hỏi';

  return (
    <FormProvider {...form}>
      <title>{`${title} – Smart English Exam`}</title>
      <form
        noValidate
        onSubmit={handleSubmit((values) => save(values, false))}
        className="space-y-6"
      >
        {/* Mốc khóa lạc quan không có ô nhập: đăng ký để resetField đổi được sau khi tải tệp
            (resetField bỏ qua trường chưa đăng ký); để ngoài fieldset vì ô bị disabled thì RHF bỏ giá trị */}
        <input type="hidden" {...register('updatedAt')} />
        <PageHeader
          breadcrumbs={[
            { label: 'Ngân hàng câu hỏi', to: QUESTION_LIST_PATH },
            ...(returnPath !== QUESTION_LIST_PATH ? [{ label: 'Nhóm câu', to: returnPath }] : []),
            { label: title },
          ]}
          title={title}
          description={
            question
              ? `${question.author.id === user?.id ? 'Bạn' : question.author.fullName} tạo · Cập nhật ${formatDateTime(question.updatedAt)}`
              : 'Chọn kỹ năng và Part trước, form sẽ đổi theo đúng dạng câu TOEIC.'
          }
          actions={
            editing &&
            !readOnly && (
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-xl px-4"
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
                Xóa câu hỏi
              </Button>
            )
          }
        />

        {readOnly && (
          <p className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm text-slate-700">
            <Eye className="mt-0.5 size-4 shrink-0 text-primary" />
            Câu hỏi của {question.author.fullName}. Bạn xem và dùng được khi tạo đề, nhưng chỉ tác
            giả mới sửa hoặc xóa được.
          </p>
        )}

        {notice && <FormAlert message={notice} onClose={() => onDismissNotice?.()} />}

        {conflict && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <TriangleAlert className="size-5 shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1">
              Câu hỏi vừa được cập nhật ở nơi khác (tab hoặc thiết bị khác). Tải bản mới nhất rồi
              sửa lại; thay đổi chưa lưu ở đây sẽ mất.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl bg-white px-3"
              disabled={reloading}
              onClick={() => void reloadLatest()}
            >
              <RotateCw className={reloading ? 'animate-spin' : undefined} />
              Tải bản mới nhất
            </Button>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <fieldset disabled={readOnly || isSubmitting} className="min-w-0 space-y-6">
            <FormSection
              step={1}
              title="Phân loại"
              description="Kỹ năng, Part quyết định dạng câu và các trường cần nhập."
            >
              <ClassificationFields />
            </FormSection>

            <FormSection step={2} title="Nội dung & đáp án">
              <AnswerFields rule={rule} />
            </FormSection>

            {rule?.group === 'required' && (
              <FormSection
                step={3}
                title="Nhóm câu"
                description={`Part ${rule.part} gồm nhiều câu dùng chung ${rule.groupContent === 'transcript' ? 'một đoạn hội thoại/bài nói' : 'một đoạn văn'}.`}
              >
                <GroupFields rule={rule} editing={editing} questionId={question?.id} />
              </FormSection>
            )}

            <FormSection
              step={rule?.group === 'required' ? 4 : 3}
              title="Giải thích"
              description="Không bắt buộc."
            >
              <ExplanationField rule={rule} />
            </FormSection>

            {rule && (
              <FormSection step={rule.group === 'required' ? 5 : 4} title="Âm thanh & hình ảnh">
                <MediaFields
                  rule={rule}
                  question={question}
                  readOnly={readOnly}
                  disabled={isSubmitting}
                  pending={pendingMedia.pending}
                  onPendingChange={pendingMedia.setFile}
                  onSaved={mediaSaved}
                />
              </FormSection>
            )}
          </fieldset>

          <aside className="lg:sticky lg:top-24">
            <QuestionSidePanel checklist={!readOnly} />
          </aside>
        </div>

        {formError && <FormAlert message={formError} onClose={() => clearErrors('root.server')} />}

        {/* Thanh lưu dính đáy màn hình: form dài vẫn thấy nút Lưu */}
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur">
          {readOnly ? (
            <>
              <p className="mr-auto text-sm text-muted-foreground">Chế độ chỉ xem</p>
              <ButtonLink to={returnPath} variant="secondary" className="h-10 w-auto px-4">
                Về danh sách
              </ButtonLink>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label htmlFor="status" className="text-sm font-medium text-slate-700">
                  Trạng thái
                </label>
                <NativeSelect
                  id="status"
                  className="w-36"
                  disabled={isSubmitting}
                  {...register('status')}
                >
                  {(editing
                    ? (['DRAFT', 'ACTIVE', 'INACTIVE'] as const)
                    : (['DRAFT', 'ACTIVE'] as const)
                  ).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <SaveFeedback show={saved} message={savedMessage} />
              {/* Màn hẹp: bỏ nút Hủy (quay lại bằng breadcrumb), hai nút lưu chia đều một hàng */}
              <div className="flex w-full gap-3 sm:w-auto">
                <Link
                  to={returnPath}
                  className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-accent sm:flex"
                >
                  {isDirty ? 'Hủy' : 'Đóng'}
                </Link>
                {!editing && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl px-4 sm:flex-none"
                    disabled={isSubmitting}
                    onClick={() => void handleSubmit((values) => save(values, true))()}
                  >
                    Lưu & tạo tiếp
                  </Button>
                )}
                <SubmitButton
                  loading={isSubmitting}
                  disabled={editing && !isDirty}
                  className="h-10 flex-1 px-5 text-sm sm:w-auto sm:flex-none"
                >
                  <Save />
                  {editing ? 'Lưu thay đổi' : 'Lưu câu hỏi'}
                </SubmitButton>
              </div>
            </>
          )}
        </div>
      </form>

      {question && (
        <DeleteQuestionDialog
          question={deleting ? { id: question.id, content: getValues('content') } : null}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            const state: QuestionBankLocationState = { flash: 'Đã xóa câu hỏi' };
            void navigate(returnPath, { state });
          }}
        />
      )}
    </FormProvider>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200/70" />
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl border border-border bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-3xl border border-border bg-white" />
      </div>
    </div>
  );
}
