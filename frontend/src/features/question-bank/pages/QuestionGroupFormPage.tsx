import { useState } from 'react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { Eye, EyeOff, Lightbulb, Lock, RotateCw, Save, TriangleAlert } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useCreateQuestionGroupMutation,
  useGetQuestionGroupQuery,
  useUpdateQuestionGroupMutation,
  useUploadQuestionGroupMediaMutation,
  type QuestionGroupDetail,
  type Skill,
} from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { FieldError } from '@/components/form/FieldError';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { NativeSelect } from '@/components/form/NativeSelect';
import { SubmitButton } from '@/components/form/SubmitButton';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { SaveFeedback } from '@/features/profile/components/SaveFeedback';
import { useSavedFlag } from '@/features/profile/hooks/use-saved-flag';
import { useAppSelector } from '@/hooks/hooks';
import { applyFieldErrors } from '@/lib/form-errors';
import { describeMediaError } from '@/lib/media-file';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { PassageView, TranscriptView } from '../components/GroupContent';
import { EmptyState, ErrorState } from '../components/ListStates';
import { Counter } from '../form/AnswerFields';
import { FormSection } from '../form/FormSection';
import { GroupMediaFields } from '../form/GroupMediaFields';
import {
  emptyGroupValues,
  GROUP_CONTENT_MAX,
  groupFormSchema,
  toCreateGroupPayload,
  toGroupValues,
  toUpdateGroupPayload,
  type GroupFormValues,
} from '../form/group-form';
import { textareaClass } from '../form/styles';
import { usePendingMedia } from '../form/use-pending-media';
import { useToeicTopics } from '../hooks/use-toeic-topics';
import { GROUP_LIST_PATH, groupPath } from '../paths';
import {
  findPartRule,
  GROUP_SKILLS,
  groupMediaKinds,
  groupPartsOfSkill,
  groupSize,
  groupSizeLabel,
  SKILL_META,
  STATUS_META,
  type PartRule,
} from '../toeic';
import type { QuestionBankLocationState } from './QuestionBankPage';

/** `/teacher/question-groups/new` và `/teacher/question-groups/:id/edit` */
export function QuestionGroupFormPage() {
  const { id } = useParams();
  return id ? <EditGroup key={id} id={id} /> : <CreateGroup />;
}

function CreateGroup() {
  const [params] = useSearchParams();
  const skill = (params.get('skill') ?? undefined) as Skill | undefined;
  const part = Number(params.get('part')) || undefined;
  return <GroupEditor defaultValues={emptyGroupValues({ skill, part })} />;
}

function EditGroup({ id }: { id: string }) {
  const user = useAppSelector(selectCurrentUser);
  const { data, error, isLoading, refetch } = useGetQuestionGroupQuery(id);

  if (isLoading) return <div aria-busy className="h-96 animate-pulse rounded-3xl bg-white" />;
  if (!data) {
    const apiError = toApiError(error);
    return (
      <div className="rounded-3xl border border-border bg-white">
        {apiError.code === 'QUESTION_GROUP_NOT_FOUND' || apiError.code === 'VALIDATION_ERROR' ? (
          <EmptyState
            title="Không tìm thấy nhóm câu"
            description="Nhóm không tồn tại hoặc đã bị xóa."
          >
            <ButtonLink to={GROUP_LIST_PATH} className="h-10 w-auto px-5">
              Về danh sách nhóm
            </ButtonLink>
          </EmptyState>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }
  // Nhóm của người khác: chỉ xem ở trang chi tiết
  if (data.data.author.id !== user?.id) return <Navigate to={groupPath(id)} replace />;

  return (
    <GroupEditor
      group={data.data}
      defaultValues={toGroupValues(data.data)}
      reload={async () => toGroupValues((await refetch().unwrap()).data)}
    />
  );
}

interface GroupEditorProps {
  defaultValues: GroupFormValues;
  group?: QuestionGroupDetail;
  reload?: () => Promise<GroupFormValues>;
}

function GroupEditor({ defaultValues, group, reload }: GroupEditorProps) {
  const navigate = useNavigate();
  const [createGroup] = useCreateQuestionGroupMutation();
  const [updateGroup] = useUpdateQuestionGroupMutation();
  const [uploadMedia] = useUploadQuestionGroupMediaMutation();
  const pendingMedia = usePendingMedia();
  const { saved, markSaved } = useSavedFlag(4000);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const editing = !!group;

  const form = useForm({
    resolver: zodResolver(groupFormSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    reset,
    resetField,
    getValues,
    setError,
    clearErrors,
    register,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const [skill, part] = useWatch({ control: form.control, name: ['skill', 'part'] });
  const rule = skill ? findPartRule(skill, part) : undefined;
  const formError = errors.root?.server?.message;
  const cancelPath = group ? groupPath(group.id) : GROUP_LIST_PATH;

  /** Nhóm vừa tạo: tải các tệp đã chọn; trả về lỗi của từng tệp không tải được */
  const uploadPending = async (id: string, currentRule: PartRule): Promise<string[]> => {
    const failures: string[] = [];
    for (const kind of groupMediaKinds(currentRule.skill, currentRule.part)) {
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

  /** Tải/gỡ tệp ở nhóm đang sửa làm đổi updatedAt: đổi mốc của form để lần Lưu sau không bị 409 */
  const mediaSaved = (previousUpdatedAt: string, savedGroup: QuestionGroupDetail) => {
    // Form đang giữ bản cũ hơn (nhóm bị sửa ở nơi khác) thì để nguyên, lần Lưu sau vẫn báo xung đột
    if (getValues('updatedAt') === previousUpdatedAt) {
      resetField('updatedAt', { defaultValue: savedGroup.updatedAt });
    }
    markSaved();
  };

  const save = async (values: GroupFormValues) => {
    const currentRule = values.skill ? findPartRule(values.skill, values.part) : undefined;
    if (!currentRule) return;
    try {
      const { data } = group
        ? await updateGroup({
            id: group.id,
            updateQuestionGroupDto: toUpdateGroupPayload(
              values,
              currentRule,
              values.updatedAt ?? group.updatedAt,
            ),
          }).unwrap()
        : await createGroup(toCreateGroupPayload(values, currentRule)).unwrap();
      // Nhóm mới: tải tệp đã chọn; lỗi thì báo ở trang nhóm (ở đó tải lại được)
      const failures = group ? [] : await uploadPending(data.id, currentRule);
      pendingMedia.clear();
      const state: QuestionBankLocationState = {
        flash: group ? 'Đã lưu nhóm câu' : 'Đã tạo nhóm câu, thêm câu hỏi cho nhóm ngay bên dưới',
        mediaError: failures.length ? failures.join('; ') : undefined,
      };
      void navigate(groupPath(data.id), { state });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'VERSION_CONFLICT') return setConflict(true);
      // passage/transcript của backend đều là ô "nội dung" trên form
      const fieldErrors = apiError.fieldErrors.map((item) =>
        item.field === 'passage' || item.field === 'transcript'
          ? { ...item, field: 'content' }
          : item,
      );
      if (
        applyFieldErrors({ ...apiError, fieldErrors }, setError, [
          'skill',
          'part',
          'topicId',
          'status',
          'content',
        ])
      ) {
        return;
      }
      setError('root.server', {
        type: apiError.code,
        message:
          apiError.code === 'FORBIDDEN' ? 'Bạn chỉ sửa được nhóm do mình tạo' : apiError.message,
      });
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

  const title = editing ? 'Sửa nhóm câu' : 'Tạo nhóm câu';

  return (
    <FormProvider {...form}>
      <title>{`${title} – Smart English Exam`}</title>
      <form noValidate onSubmit={handleSubmit(save)} className="space-y-6">
        {/* Mốc khóa lạc quan không có ô nhập: đăng ký để resetField đổi được sau khi tải tệp
            (resetField bỏ qua trường chưa đăng ký); để ngoài fieldset vì ô bị disabled thì RHF bỏ giá trị */}
        <input type="hidden" {...register('updatedAt')} />
        <PageHeader
          breadcrumbs={[
            { label: 'Nhóm câu hỏi', to: GROUP_LIST_PATH },
            ...(group
              ? [
                  {
                    label: `${SKILL_META[group.skill].label} · Part ${group.part}`,
                    to: groupPath(group.id),
                  },
                ]
              : []),
            { label: title },
          ]}
          title={title}
          description={
            editing
              ? 'Sửa chủ đề, trạng thái và nội dung dùng chung. Các câu trong nhóm giữ nguyên.'
              : 'Tạo nội dung dùng chung trước, sau đó thêm các câu hỏi vào nhóm.'
          }
        />

        {conflict && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <TriangleAlert className="size-5 shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1">
              Nhóm vừa được cập nhật ở nơi khác. Tải bản mới nhất rồi sửa lại; thay đổi chưa lưu ở
              đây sẽ mất.
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
          <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
            <FormSection
              step={1}
              title="Phân loại"
              description={
                editing
                  ? undefined
                  : 'Chỉ các Part có nhiều câu dùng chung nội dung mới cần tạo nhóm.'
              }
            >
              <GroupClassification locked={editing} />
            </FormSection>

            <FormSection
              step={2}
              title={
                rule?.groupContent === 'transcript'
                  ? 'Lời thoại'
                  : rule?.skill === 'SPEAKING'
                    ? 'Thông tin cho học viên'
                    : 'Đoạn văn'
              }
            >
              <GroupContentField rule={rule} />
            </FormSection>

            {rule && (
              <FormSection step={3} title="Âm thanh & hình ảnh">
                <GroupMediaFields
                  rule={rule}
                  group={group}
                  disabled={isSubmitting}
                  pending={pendingMedia.pending}
                  onPendingChange={pendingMedia.setFile}
                  onSaved={mediaSaved}
                />
              </FormSection>
            )}
          </fieldset>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <GroupPreview rule={rule} />
            <GroupGuide rule={rule} />
          </aside>
        </div>

        {formError && <FormAlert message={formError} onClose={() => clearErrors('root.server')} />}

        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur">
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
          <SaveFeedback show={saved} message="Đã lưu tệp" />
          <div className="flex w-full gap-3 sm:w-auto">
            <Link
              to={cancelPath}
              className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-accent sm:flex"
            >
              {isDirty ? 'Hủy' : 'Đóng'}
            </Link>
            <SubmitButton
              loading={isSubmitting}
              disabled={editing && !isDirty}
              className="h-10 flex-1 px-5 text-sm sm:w-auto sm:flex-none"
            >
              <Save />
              {editing ? 'Lưu thay đổi' : 'Tạo nhóm'}
            </SubmitButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

const tileClass =
  'rounded-2xl border text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:cursor-not-allowed';

function GroupClassification({ locked }: { locked: boolean }) {
  const {
    register,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<GroupFormValues>();
  const [skill, part, topicId] = useWatch<GroupFormValues, ['skill', 'part', 'topicId']>({
    name: ['skill', 'part', 'topicId'],
  });
  const rule = skill ? findPartRule(skill, part) : undefined;
  const { topics, isLoading: topicsLoading } = useToeicTopics(
    skill || undefined,
    rule ? part : undefined,
  );
  const opts = { shouldDirty: true, shouldValidate: isSubmitted };

  const selectPart = (nextPart: number) => {
    setValue('part', nextPart, opts);
    setValue('topicId', '', opts); // chủ đề gắn với từng Part
  };

  return (
    <div className="space-y-6">
      {locked && (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          Không đổi được kỹ năng và Part sau khi tạo nhóm (các câu trong nhóm phụ thuộc vào Part).
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700">
          Kỹ năng <span className="text-rose-500">*</span>
        </p>
        <div role="radiogroup" aria-label="Kỹ năng" className="grid gap-3 sm:grid-cols-3">
          {GROUP_SKILLS.map((item) => {
            const meta = SKILL_META[item];
            const Icon = meta.icon;
            const active = skill === item;
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={locked && !active}
                onClick={() => {
                  if (active) return;
                  setValue('skill', item as GroupFormValues['skill'], opts);
                  // Kỹ năng chỉ có một Part nhóm (Speaking 4) thì chọn luôn
                  const parts = groupPartsOfSkill(item);
                  selectPart(parts.length === 1 ? parts[0].part : 0);
                }}
                className={cn(
                  tileClass,
                  'flex items-center gap-3 p-3',
                  active
                    ? 'border-primary bg-accent ring-1 ring-primary'
                    : 'border-border hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    meta.tile,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{meta.label}</span>
                  <span className="block text-xs text-subtle">
                    Part{' '}
                    {groupPartsOfSkill(item)
                      .map((r) => r.part)
                      .join(', ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <FieldError message={errors.skill?.message} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700">
          Part <span className="text-rose-500">*</span>
        </p>
        {skill ? (
          <div role="radiogroup" aria-label="Part" className="grid gap-2.5 sm:grid-cols-2">
            {groupPartsOfSkill(skill).map((item) => {
              const active = rule?.part === item.part;
              const size = groupSize(item.skill, item.part);
              return (
                <button
                  key={item.part}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={locked && !active}
                  onClick={() => !active && selectPart(item.part)}
                  className={cn(
                    tileClass,
                    'rounded-xl px-3.5 py-3',
                    active
                      ? 'border-primary bg-accent ring-1 ring-primary'
                      : 'border-border hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn('text-sm font-bold', active ? 'text-brand' : 'text-foreground')}
                    >
                      Part {item.part}
                    </span>
                    {size && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        {groupSizeLabel(size)}/nhóm
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-sm text-slate-700">{item.name}</span>
                  <span className="mt-0.5 block text-xs text-subtle">
                    {item.groupContent === 'transcript'
                      ? 'Dùng chung lời thoại + âm thanh'
                      : item.skill === 'SPEAKING'
                        ? 'Dùng chung bảng thông tin'
                        : 'Dùng chung đoạn văn'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-subtle">
            Chọn kỹ năng để xem các Part.
          </p>
        )}
        <FieldError message={errors.part?.message} />
      </div>

      <FormField id="topicId" label="Chủ đề" required error={errors.topicId?.message}>
        <NativeSelect
          id="topicId"
          disabled={!rule || topicsLoading}
          aria-invalid={!!errors.topicId}
          // Danh sách lựa chọn tải sau: điều khiển giá trị theo state của form, nếu không thẻ select
          // giữ placeholder vì lúc RHF gán giá trị chưa có <option> tương ứng
          {...register('topicId')}
          value={topicId}
        >
          <option value="">
            {!rule ? 'Chọn Part trước' : topicsLoading ? 'Đang tải chủ đề…' : 'Chọn chủ đề'}
          </option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
    </div>
  );
}

/** Ví dụ gợi ý theo Part, hiện trong ô nhập khi còn trống */
function contentPlaceholder(rule?: PartRule): string {
  if (!rule) return 'Chọn kỹ năng và Part trước…';
  if (rule.skill === 'LISTENING' && rule.part === 3)
    return "M: Hi, I'd like to book a room for two nights starting this Friday.\nW: Certainly. Would you prefer a room with a city view or a garden view?\nM: A garden view, please.";
  if (rule.skill === 'LISTENING')
    return 'Good morning, passengers. This is an announcement for Flight VN248 to Singapore…';
  if (rule.skill === 'SPEAKING')
    return 'Annual Tech Summit – Schedule\n09:00 – 10:30  Keynote: The future of AI\n10:45 – 12:00  Workshop: Cloud security\n…';
  if (rule.part === 6)
    return 'To: All staff\nFrom: Human Resources\n\nPlease be advised that the office will be [1] ___ next Monday. [2] ___…';
  return 'Dán email, thông báo, quảng cáo, bài báo… mà các câu hỏi sẽ hỏi về.';
}

function GroupContentField({ rule }: { rule?: PartRule }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<GroupFormValues>();
  const content = useWatch<GroupFormValues, 'content'>({ name: 'content' });
  const transcript = rule?.groupContent === 'transcript';

  return (
    <div className="space-y-3">
      {transcript && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
          <EyeOff className="mt-0.5 size-3.5 shrink-0" />
          Học viên chỉ thấy lời thoại ở màn xem lại, không thấy khi đang làm bài.
        </p>
      )}
      <FormField
        id="content"
        label={transcript ? 'Lời thoại (transcript)' : 'Nội dung'}
        required
        error={errors.content?.message}
        hint={<Counter value={content.length} max={GROUP_CONTENT_MAX} />}
      >
        <textarea
          id="content"
          rows={12}
          disabled={!rule}
          placeholder={contentPlaceholder(rule)}
          aria-invalid={!!errors.content}
          className={cn(textareaClass, 'min-h-60', transcript && 'font-mono text-[13px]')}
          {...register('content')}
        />
      </FormField>
    </div>
  );
}

function GroupPreview({ rule }: { rule?: PartRule }) {
  const content = useWatch<GroupFormValues, 'content'>({ name: 'content' }).trim();
  const transcript = rule?.groupContent === 'transcript';

  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Eye className="size-4 text-primary" />
        Xem trước
      </h2>
      <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-border bg-slate-50 p-4">
        {!content ? (
          <p className="text-sm text-subtle italic">Nội dung sẽ hiện ở đây</p>
        ) : transcript ? (
          <TranscriptView text={content} />
        ) : (
          <PassageView text={content} />
        )}
      </div>
    </section>
  );
}

function GroupGuide({ rule }: { rule?: PartRule }) {
  if (!rule) return null;
  const size = groupSize(rule.skill, rule.part);
  const tips =
    rule.groupContent === 'transcript'
      ? [
          'Mỗi lượt thoại một dòng, bắt đầu bằng M: (nam) hoặc W: (nữ); nhiều người cùng giới thì ghi M1:, M2:.',
          rule.part === 4 ? 'Bài nói một người: ghi liền đoạn, không cần M:/W:.' : null,
          'Âm thanh phải khớp đúng lời thoại.',
        ]
      : rule.skill === 'SPEAKING'
        ? [
            'Lịch trình, thông báo, bảng biểu… học viên đọc để trả lời câu hỏi.',
            'Giữ xuống dòng để bảng dễ đọc.',
          ]
        : rule.part === 6
          ? [
              'Đánh dấu chỗ trống theo thứ tự câu trong nhóm: [1] ___, [2] ___, [3] ___, [4] ___. Không dùng số câu của đề (131, 132…) vì mỗi đề đánh số khác nhau.',
              'Câu hỏi có Thứ tự trong nhóm là n sẽ điền vào chỗ trống [n]; form câu hỏi tự ghi nhãn "Chỗ trống [n]".',
              'Thường có 1 chỗ trống điền cả câu: 4 phương án là 4 câu hoàn chỉnh.',
            ]
          : [
              'Có thể gồm một hoặc nhiều văn bản (email + hóa đơn…), ghi rõ tiêu đề từng phần.',
              'Câu hỏi nên theo thứ tự thông tin xuất hiện trong đoạn văn.',
            ];

  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Lightbulb className="size-4 text-amber-500" />
        Gợi ý Part {rule.part}
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {size && (
          <li className="font-medium text-foreground">
            Mỗi nhóm có {groupSizeLabel(size)} hỏi theo định dạng TOEIC.
          </li>
        )}
        {tips
          .filter((tip): tip is string => !!tip)
          .map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" />
              {tip}
            </li>
          ))}
      </ul>
    </section>
  );
}
