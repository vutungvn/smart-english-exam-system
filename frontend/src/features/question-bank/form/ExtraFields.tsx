import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { ArrowUpRight, Layers, Plus } from 'lucide-react';
import {
  useGetQuestionGroupQuery,
  useListQuestionGroupsQuery,
  type QuestionGroupSummary,
} from '@/api/generated';
import { FormField } from '@/components/form/FormField';
import { NativeSelect } from '@/components/form/NativeSelect';
import { groupPath, newGroupPath } from '../paths';
import { groupText, type PartRule } from '../toeic';
import { Counter } from './AnswerFields';
import { EXPLANATION_MAX, type QuestionFormValues } from './question-form';
import { inputClass, textareaClass } from './styles';

function groupLabel(group: QuestionGroupSummary): string {
  const text = groupText(group).replace(/\s+/g, ' ');
  const excerpt = text.length > 40 ? `${text.slice(0, 40)}…` : text;
  return `${group.topic.name}${excerpt ? ` – ${excerpt}` : ''} (${group.questionCount} câu)`;
}

const MAX_ORDER = 20; // khớp @Max(20) của orderInGroup ở backend

/** Vị trí trống nhỏ nhất (1–20); undefined khi nhóm đã kín */
function firstFreeOrder(used: number[]): number | undefined {
  for (let order = 1; order <= MAX_ORDER; order++) {
    if (!used.includes(order)) return order;
  }
  return undefined;
}

interface GroupFieldsProps {
  rule: PartRule;
  editing: boolean;
  /** Câu đang sửa: vị trí của chính nó không tính là đã có câu */
  questionId?: string;
}

// Part nhóm (L3, L4, R6, R7, S4): chọn nhóm của mình cùng kỹ năng/Part và vị trí trong nhóm
export function GroupFields({ rule, editing, questionId }: GroupFieldsProps) {
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

  // Vị trí đã có câu lấy từ chi tiết nhóm: "số câu + 1" sai khi nhóm từng bị xóa câu ở giữa
  // (có 1, 2, 3, xóa 2 → còn 2 câu nhưng vị trí 3 vẫn đã có câu)
  const { data: detail } = useGetQuestionGroupQuery(groupId, {
    skip: !groupId || !!foreignGroup,
  });
  const loadedGroup = detail?.data.id === groupId ? detail.data : undefined;
  const usedOrders = (loadedGroup?.questions ?? [])
    .filter((question) => question.id !== questionId)
    .map((question) => question.orderInGroup)
    .filter((order): order is number => order !== null)
    .sort((a, b) => a - b);
  const suggestedOrder = loadedGroup ? firstFreeOrder(usedOrders) : undefined;

  /** Câu mới đổi nhóm: lấy chủ đề của nhóm, xóa thứ tự cũ để điền lại theo nhóm mới */
  const changeGroup = (id: string) => {
    if (editing) return;
    setValue('orderInGroup', '', { shouldDirty: true });
    const group = groups.find((g) => g.id === id);
    if (group && !getValues('topicId')) {
      setValue('topicId', group.topic.id, { shouldDirty: true });
    }
  };

  // Mở từ nút "Thêm câu vào nhóm" (?groupId=): danh sách nhóm tải xong thì lấy chủ đề của nhóm
  useEffect(() => {
    const group = groups.find((g) => g.id === groupId);
    if (group && !editing && !getValues('topicId')) {
      setValue('topicId', group.topic.id, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi danh sách nhóm vừa tải
  }, [data]);

  // Câu mới: chi tiết nhóm tải xong (lần đầu, đổi nhóm, hoặc tải lại sau "Lưu & tạo tiếp")
  // thì điền vị trí trống đầu tiên nếu ô thứ tự đang trống
  useEffect(() => {
    if (!editing && suggestedOrder && !getValues('orderInGroup')) {
      setValue('orderInGroup', String(suggestedOrder), { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ điền khi dữ liệu nhóm đổi, không điền lại lúc người dùng xóa ô
  }, [loadedGroup]);

  return (
    <div className="space-y-4">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px]">
        <FormField id="groupId" label="Nhóm câu" required error={errors.groupId?.message}>
          <NativeSelect
            id="groupId"
            disabled={isLoading}
            aria-invalid={!!errors.groupId}
            // Danh sách lựa chọn tải sau: điều khiển giá trị theo state của form, nếu không thẻ select
            // giữ placeholder vì lúc RHF gán giá trị chưa có <option> tương ứng
            {...register('groupId', {
              onChange: (event: { target: { value: string } }) => changeGroup(event.target.value),
            })}
            value={groupId}
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

      {loadedGroup && (
        <p className="text-xs text-subtle">
          {usedOrders.length
            ? `Vị trí đã có câu: ${usedOrders.join(', ')}. `
            : 'Nhóm chưa có câu nào. '}
          {suggestedOrder
            ? `Vị trí trống đầu tiên: ${suggestedOrder}.`
            : `Nhóm đã dùng hết ${MAX_ORDER} vị trí.`}
        </p>
      )}

      {groupId && !foreignGroup && (
        <Link
          to={groupPath(groupId)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-brand"
        >
          Xem nội dung nhóm
          <ArrowUpRight className="size-4" />
        </Link>
      )}

      {isError ? (
        <p className="text-xs text-destructive">
          Không tải được danh sách nhóm, vui lòng tải lại trang.
        </p>
      ) : (
        !isLoading &&
        groups.length === 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Layers className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Bạn chưa có nhóm câu nào cho Part {rule.part}. Mỗi nhóm chứa {contentName} dùng chung
              cho các câu hỏi.{' '}
              <Link
                to={newGroupPath({ skill: rule.skill, part: rule.part })}
                className="inline-flex items-center gap-0.5 font-semibold underline-offset-4 hover:underline"
              >
                <Plus className="size-3.5" />
                Tạo nhóm câu
              </Link>
            </span>
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
