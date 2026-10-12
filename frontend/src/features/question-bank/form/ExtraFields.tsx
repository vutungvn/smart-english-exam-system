import { useFormContext, useWatch } from 'react-hook-form';
import { Clock, Headphones, ImageIcon, Info, Layers } from 'lucide-react';
import { useListQuestionGroupsQuery, type QuestionGroupSummary } from '@/api/generated';
import { FormField } from '@/components/form/FormField';
import { NativeSelect } from '@/components/form/NativeSelect';
import type { PartRule } from '../toeic';
import { Counter } from './AnswerFields';
import { EXPLANATION_MAX, type QuestionFormValues } from './question-form';
import { inputClass, textareaClass } from './styles';

function groupLabel(group: QuestionGroupSummary): string {
  const text = (group.passage ?? group.transcript ?? '').replace(/\s+/g, ' ').trim();
  const excerpt = text.length > 60 ? `${text.slice(0, 60)}…` : text || 'Chưa có nội dung';
  return `${excerpt} (${group.questionCount} câu)`;
}

// Part nhóm (L3, L4, R6, R7, S4): chọn nhóm của mình cùng kỹ năng/Part và vị trí trong nhóm
export function GroupFields({ rule, editing }: { rule: PartRule; editing: boolean }) {
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<QuestionFormValues>();
  const { data, isLoading, isError } = useListQuestionGroupsQuery({
    mine: true,
    skill: rule.skill,
    part: rule.part,
    limit: 100,
  });
  const groups = data?.data ?? [];
  const groupId = useWatch<QuestionFormValues, 'groupId'>({ name: 'groupId' });
  // Xem câu của giáo viên khác: nhóm của họ không có trong danh sách nhóm của mình
  const foreignGroup = groupId && !isLoading && !groups.some((g) => g.id === groupId);
  const contentName = rule.groupContent === 'transcript' ? 'lời thoại' : 'đoạn văn';

  return (
    <div className="space-y-4">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px]">
        <FormField id="groupId" label="Nhóm câu" required error={errors.groupId?.message}>
          <NativeSelect
            id="groupId"
            disabled={isLoading}
            aria-invalid={!!errors.groupId}
            {...register('groupId', {
              // Câu mới: gợi ý vị trí kế tiếp trong nhóm
              onChange: (event: { target: { value: string } }) => {
                const group = groups.find((g) => g.id === event.target.value);
                if (group && !editing && !getValues('orderInGroup')) {
                  setValue('orderInGroup', String(group.questionCount + 1), { shouldDirty: true });
                }
              },
            })}
          >
            <option value="">
              {isLoading
                ? 'Đang tải nhóm…'
                : groups.length
                  ? 'Chọn nhóm câu'
                  : 'Chưa có nhóm phù hợp'}
            </option>
            {foreignGroup && <option value={groupId}>Nhóm của tác giả câu hỏi</option>}
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {groupLabel(group)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="orderInGroup"
          label="Thứ tự trong nhóm"
          required
          error={errors.orderInGroup?.message}
        >
          <input
            id="orderInGroup"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            aria-invalid={!!errors.orderInGroup}
            className={inputClass}
            {...register('orderInGroup')}
          />
        </FormField>
      </div>

      {isError ? (
        <p className="text-xs text-destructive">
          Không tải được danh sách nhóm, vui lòng tải lại trang.
        </p>
      ) : (
        !isLoading &&
        groups.length === 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Layers className="mt-0.5 size-4 shrink-0" />
            Bạn chưa có nhóm câu nào cho Part {rule.part}. Mỗi nhóm chứa {contentName} dùng chung;
            trang tạo nhóm câu sẽ có ở mục “Nhóm câu hỏi”.
          </p>
        )
      )}
    </div>
  );
}

export function ExplanationField({ rule }: { rule?: PartRule }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<QuestionFormValues>();
  const explanation = useWatch<QuestionFormValues, 'explanation'>({ name: 'explanation' });
  const choice = !rule || rule.type === 'SINGLE_CHOICE';

  return (
    <FormField
      id="explanation"
      label={choice ? 'Giải thích đáp án' : 'Gợi ý cách làm'}
      error={errors.explanation?.message}
      hint={<Counter value={explanation.length} max={EXPLANATION_MAX} />}
    >
      <textarea
        id="explanation"
        rows={3}
        placeholder={
          choice
            ? 'Vì sao đáp án đúng, vì sao các phương án khác sai (học viên xem sau khi nộp bài)'
            : 'Dàn ý, từ vựng, cấu trúc nên dùng (học viên xem sau khi nộp bài)'
        }
        aria-invalid={!!errors.explanation}
        className={textareaClass}
        {...register('explanation')}
      />
    </FormField>
  );
}

const MEDIA_TEXT: Record<Exclude<PartRule['media'], 'none'>, string> = {
  audio: 'tệp âm thanh',
  image: 'hình ảnh',
  'audio+image': 'tệp âm thanh và hình ảnh',
};

// Tải media chưa làm (gắn khi nhập .zip, SPRINT-45): chỉ báo Part này cần gì
export function MediaNotice({
  rule,
  audioKey,
  imageKey,
}: {
  rule: PartRule;
  audioKey?: string | null;
  imageKey?: string | null;
}) {
  if (rule.media === 'none') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0 text-subtle" />
        Part {rule.part} không dùng âm thanh hay hình ảnh.
      </p>
    );
  }

  const needAudio = rule.media.includes('audio');
  const needImage = rule.media.includes('image');
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {needAudio && <MediaSlot icon={Headphones} label="Âm thanh" attached={audioKey} />}
        {needImage && <MediaSlot icon={ImageIcon} label="Hình ảnh" attached={imageKey} />}
      </div>
      <p className="flex items-start gap-2 text-xs text-subtle">
        <Clock className="mt-0.5 size-3.5 shrink-0" />
        Part {rule.part} cần {MEDIA_TEXT[rule.media]}. Tải tệp sẽ làm cùng chức năng “Nhập từ tệp”;
        hiện có thể lưu câu ở trạng thái Nháp trước.
      </p>
    </div>
  );
}

function MediaSlot({
  icon: Icon,
  label,
  attached,
}: {
  icon: typeof Headphones;
  label: string;
  attached?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-slate-50 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-subtle">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <span className="block truncate text-xs text-subtle">
          {attached ? 'Đã gắn tệp' : 'Chưa có tệp'}
        </span>
      </span>
      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        Sắp có
      </span>
    </div>
  );
}
