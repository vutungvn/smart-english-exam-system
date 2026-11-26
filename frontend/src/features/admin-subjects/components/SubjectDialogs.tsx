import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, RotateCw, Save, Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  api,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useUpdateSubjectMutation,
  type AdminSubjectItem,
  type SubjectCategory,
} from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { NativeSelect } from '@/components/form/NativeSelect';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/features/question-bank/form/styles';
import { applyFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_META, formatCount, SUBJECT_CODE_PATTERN } from '../labels';
import { ConfirmDialog } from './ConfirmDialog';

// ---------------------------------------------------------------------------------------------
// Thêm, sửa tên

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Tên dài từ 2 đến 150 ký tự')
  .max(150, 'Tên dài từ 2 đến 150 ký tự');

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(SUBJECT_CODE_PATTERN, 'Mã gồm 2–50 ký tự: chữ hoa, số, gạch dưới')),
  name: nameSchema,
  category: z.enum(['TOEIC', 'IELTS']),
});
const editSchema = z.object({ name: nameSchema });

type CreateInput = z.input<typeof createSchema>;
type CreateValues = z.output<typeof createSchema>;

interface SubjectFormDialogProps {
  /** undefined: đóng; null: thêm mới; có giá trị: sửa tên */
  subject: AdminSubjectItem | null | undefined;
  onClose: () => void;
  onDone: (message: string, created?: AdminSubjectItem) => void;
}

export function SubjectFormDialog({ subject, onClose, onDone }: SubjectFormDialogProps) {
  const [busy, setBusy] = useState(false);
  const editing = Boolean(subject);

  return (
    <AppDialog
      open={subject !== undefined}
      onOpenChange={(open) => !open && onClose()}
      busy={busy}
      title={editing ? 'Sửa chương trình thi' : 'Thêm chương trình thi'}
      description={
        editing
          ? 'Mã và loại không đổi được sau khi tạo.'
          : 'Mã dùng trong tệp nhập câu hỏi, không đổi được sau khi tạo.'
      }
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <SubmitButton form="subject-form" loading={busy} className="h-10 w-auto px-5 text-sm">
            {!busy && <Save />}
            {editing ? 'Lưu thay đổi' : 'Thêm chương trình'}
          </SubmitButton>
        </>
      }
    >
      {subject ? (
        <EditSubjectForm key={subject.id} subject={subject} onBusy={setBusy} onDone={onDone} />
      ) : (
        subject === null && <CreateSubjectForm onBusy={setBusy} onDone={onDone} />
      )}
    </AppDialog>
  );
}

function CreateSubjectForm({
  onBusy,
  onDone,
}: {
  onBusy: (busy: boolean) => void;
  onDone: SubjectFormDialogProps['onDone'];
}) {
  const [createSubject] = useCreateSubjectMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateInput, unknown, CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { code: '', name: '', category: 'TOEIC' },
  });

  const submit = async (values: CreateValues) => {
    onBusy(true);
    try {
      const { data } = await createSubject(values).unwrap();
      onDone(`Đã thêm chương trình ${data.code}`, data);
    } catch (cause) {
      const apiError = toApiError(cause);
      if (apiError.code === 'SUBJECT_CODE_EXISTS') {
        setError('code', { message: apiError.message }, { shouldFocus: true });
      } else if (!applyFieldErrors(apiError, setError, ['code', 'name', 'category'])) {
        setError('root.server', { message: apiError.message });
      }
    } finally {
      onBusy(false);
    }
  };

  return (
    <form id="subject-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      {errors.root?.server && <FormAlert message={errors.root.server.message ?? ''} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="subject-code" label="Mã" required error={errors.code?.message}>
          <input
            id="subject-code"
            autoComplete="off"
            placeholder="Ví dụ: IELTS_ACADEMIC"
            aria-invalid={!!errors.code}
            className={cn(inputClass, 'uppercase placeholder:normal-case')}
            {...register('code')}
          />
        </FormField>
        <FormField id="subject-category" label="Loại" required error={errors.category?.message}>
          <NativeSelect id="subject-category" {...register('category')}>
            {CATEGORIES.map((category: SubjectCategory) => (
              <option key={category} value={category}>
                {CATEGORY_META[category].label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField id="subject-name" label="Tên" required error={errors.name?.message}>
        <input
          id="subject-name"
          autoComplete="off"
          placeholder="Ví dụ: IELTS Academic"
          aria-invalid={!!errors.name}
          className={inputClass}
          {...register('name')}
        />
      </FormField>
      <p className="text-xs text-subtle">
        Chương trình loại IELTS tạo được nhưng chưa thêm chủ đề, soạn câu hỏi được (hệ thống mới hỗ
        trợ cấu trúc đề TOEIC).
      </p>
    </form>
  );
}

function EditSubjectForm({
  subject,
  onBusy,
  onDone,
}: {
  subject: AdminSubjectItem;
  onBusy: (busy: boolean) => void;
  onDone: SubjectFormDialogProps['onDone'];
}) {
  const [updateSubject] = useUpdateSubjectMutation();
  const [loadLatest, { isFetching: reloading }] = api.useLazyGetAdminSubjectQuery();
  const [version, setVersion] = useState(subject.updatedAt);
  const [conflict, setConflict] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(editSchema), defaultValues: { name: subject.name } });

  const submit = async ({ name }: { name: string }) => {
    onBusy(true);
    setConflict(false);
    try {
      await updateSubject({
        id: subject.id,
        updateSubjectDto: { name, updatedAt: version },
      }).unwrap();
      onDone(`Đã lưu chương trình ${subject.code}`);
    } catch (cause) {
      const apiError = toApiError(cause);
      if (apiError.code === 'VERSION_CONFLICT') setConflict(true);
      else if (!applyFieldErrors(apiError, setError, ['name'])) {
        setError('root.server', { message: apiError.message });
      }
    } finally {
      onBusy(false);
    }
  };

  const reload = async () => {
    try {
      const { data } = await loadLatest(subject.id).unwrap();
      reset({ name: data.name });
      setVersion(data.updatedAt);
      setConflict(false);
    } catch (cause) {
      setError('root.server', { message: toApiError(cause).message });
    }
  };

  return (
    <form id="subject-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      {conflict && <ConflictAlert reloading={reloading} onReload={() => void reload()} />}
      {errors.root?.server && <FormAlert message={errors.root.server.message ?? ''} />}
      <div className="flex items-center gap-3 rounded-2xl bg-background p-3 text-sm">
        <span className="font-semibold text-foreground">{subject.code}</span>
        <span className="text-subtle">· {CATEGORY_META[subject.category].label}</span>
      </div>
      <FormField id="subject-name" label="Tên" required error={errors.name?.message}>
        <input
          id="subject-name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          className={inputClass}
          {...register('name')}
        />
      </FormField>
    </form>
  );
}

export function ConflictAlert({
  reloading,
  onReload,
}: {
  reloading: boolean;
  onReload: () => void;
}) {
  return (
    <FormAlert message="Dữ liệu đã được sửa ở nơi khác. Tải bản mới nhất rồi sửa lại; thay đổi chưa lưu ở đây sẽ mất.">
      <button
        type="button"
        disabled={reloading}
        onClick={onReload}
        className="inline-flex items-center gap-1 underline-offset-4 hover:underline disabled:opacity-60"
      >
        <RotateCw className={cn('size-3.5', reloading && 'animate-spin')} />
        {reloading ? 'Đang tải…' : 'Tải bản mới nhất'}
      </button>
    </FormAlert>
  );
}

// ---------------------------------------------------------------------------------------------
// Ẩn / hiện

interface SubjectActionProps {
  subject: AdminSubjectItem | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function ToggleSubjectDialog({ subject, onClose, onDone }: SubjectActionProps) {
  const [updateSubject, { isLoading }] = useUpdateSubjectMutation();
  const [error, setError] = useState<string>();
  const hiding = subject?.isActive ?? false;

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!subject) return;
    setError(undefined);
    try {
      await updateSubject({
        id: subject.id,
        updateSubjectDto: { isActive: !hiding, updatedAt: subject.updatedAt },
      }).unwrap();
      onDone(`Đã ${hiding ? 'ẩn' : 'hiện lại'} chương trình ${subject.code}`);
    } catch (cause) {
      const apiError = toApiError(cause);
      setError(
        apiError.code === 'VERSION_CONFLICT'
          ? 'Chương trình vừa được sửa ở nơi khác. Đóng hộp thoại rồi thử lại.'
          : apiError.message,
      );
    }
  };

  return (
    <ConfirmDialog
      open={subject !== null}
      title={hiding ? 'Ẩn chương trình thi?' : 'Dùng lại chương trình thi?'}
      description={subject ? `${subject.code} · ${subject.name}` : ''}
      confirmLabel={hiding ? 'Ẩn chương trình' : 'Dùng lại'}
      icon={hiding ? <EyeOff /> : <Eye />}
      tone={hiding ? 'danger' : 'primary'}
      busy={isLoading}
      error={error}
      onClose={close}
      onConfirm={() => void confirm()}
    >
      {hiding ? (
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Không còn trong danh sách chương trình thi của học viên, khách.</li>
          <li>Giáo viên không chọn được khi tạo đề, soạn câu hỏi, nhập tệp.</li>
          <li>Đề thi, câu hỏi đã có giữ nguyên; dùng lại được bất cứ lúc nào.</li>
        </ul>
      ) : (
        <p>Chương trình hiện lại cho học viên và giáo viên chọn được.</p>
      )}
    </ConfirmDialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Xóa

export function DeleteSubjectDialog({ subject, onClose, onDone }: SubjectActionProps) {
  const [deleteSubject, { isLoading }] = useDeleteSubjectMutation();
  const [error, setError] = useState<string>();
  const inUse = subject ? subject.examCount + subject.questionCount > 0 : false;
  const canDelete = Boolean(subject && !subject.isProtected && !inUse);

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = async () => {
    if (!subject) return;
    setError(undefined);
    try {
      await deleteSubject(subject.id).unwrap();
      onDone(`Đã xóa chương trình ${subject.code}`);
    } catch (cause) {
      setError(toApiError(cause).message);
    }
  };

  return (
    <ConfirmDialog
      open={subject !== null}
      title={canDelete ? 'Xóa chương trình thi?' : 'Không xóa được chương trình'}
      description={subject ? `${subject.code} · ${subject.name}` : ''}
      confirmLabel="Xóa vĩnh viễn"
      icon={<Trash2 />}
      tone="danger"
      busy={isLoading}
      error={error}
      canConfirm={canDelete}
      onClose={close}
      onConfirm={() => void confirm()}
    >
      {subject?.isProtected ? (
        <p>
          TOEIC là chương trình hệ thống: giao diện giáo viên và tệp nhập câu hỏi đang dùng nên
          không xóa được.
        </p>
      ) : inUse && subject ? (
        <p>
          Chương trình đang có {formatCount(subject.examCount)} đề thi,{' '}
          {formatCount(subject.questionCount)} câu hỏi. Hãy <strong>ẩn</strong> chương trình thay vì
          xóa.
        </p>
      ) : (
        subject && (
          <p>
            {formatCount(subject.topicCount)} chủ đề của chương trình cũng bị xóa theo. Không khôi
            phục lại được.
          </p>
        )
      )}
    </ConfirmDialog>
  );
}
