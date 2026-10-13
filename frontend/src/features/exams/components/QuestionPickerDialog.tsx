import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { CircleAlert, Layers, ListChecks, Lock, X } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useListQuestionGroupsQuery,
  useListQuestionsQuery,
  type Difficulty,
  type ExamSectionItem,
  type QuestionGroupSummary,
  type QuestionStatus,
  type QuestionSummary,
  type ScoringScale,
} from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/hooks/hooks';
import { FilterSelect, ToggleSwitch } from '@/features/question-bank/components/FilterControls';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { DifficultyPill, StatusPill } from '@/features/question-bank/components/Pills';
import { useToeicTopics } from '@/features/question-bank/hooks/use-toeic-topics';
import {
  DIFFICULTY_META,
  findPartRule,
  groupSize,
  groupSizeLabel,
  groupText,
  SKILL_META,
} from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { quotaOf, sectionTitle } from '../exam-meta';
import { SearchInput } from './SearchInput';

interface QuestionPickerDialogProps {
  section: ExamSectionItem;
  scale: ScoringScale;
  /** Id câu (trong ngân hàng) đã có ở bất kỳ Part nào của đề */
  usedQuestionIds: Set<string>;
  /** Id nhóm đã có trong đề */
  usedGroupIds: Set<string>;
  onClose: () => void;
  /** Gửi API; ném lỗi (từ `.unwrap()`) để hộp thoại hiện thông báo và giữ lựa chọn */
  onConfirm: (ids: { questionIds: string[]; groupIds: string[] }) => Promise<void>;
}

const PICKER_PAGE_SIZES = [20, 50] as const;

/**
 * Chọn câu đơn hoặc nhóm câu từ ngân hàng (dùng chung mọi giáo viên) cho một Part.
 * Kỹ năng và Part khóa theo phần thi; lọc và phân trang ở server.
 * Lựa chọn giữ nguyên khi đổi trang, đổi bộ lọc (chọn ở nhiều trang rồi thêm một lần).
 */
export function QuestionPickerDialog({
  section,
  scale,
  usedQuestionIds,
  usedGroupIds,
  onClose,
  onConfirm,
}: QuestionPickerDialogProps) {
  const user = useAppSelector(selectCurrentUser);
  const grouped = findPartRule(section.skill, section.part)?.group === 'required';
  const [q, setQ] = useState<string>();
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [status, setStatus] = useState<QuestionStatus>('ACTIVE');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(PICKER_PAGE_SIZES[0]);
  // id → số câu (câu đơn là 1, nhóm là số câu trong nhóm) để đếm tổng khi chọn qua nhiều trang
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const { topics } = useToeicTopics(section.skill, section.part);
  const common = {
    skill: section.skill,
    part: section.part,
    topicId: topicId || undefined,
    status,
    mine: mine || undefined,
    page,
    limit,
  };
  const questions = useListQuestionsQuery(
    { ...common, q, difficulty: difficulty || undefined, sort: 'createdAt:desc' },
    { skip: grouped },
  );
  const groups = useListQuestionGroupsQuery(common, { skip: !grouped });
  const list = grouped ? groups : questions;
  const meta = list.data?.meta;

  /** Đổi bộ lọc thì về trang 1 */
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const toggle = (id: string, count: number) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else next.set(id, count);
      return next;
    });

  const selectedCount = [...selected.values()].reduce((sum, count) => sum + count, 0);
  const expected = quotaOf(scale, section.skill, section.part);
  const after = section.questionCount + selectedCount;
  const overBy = expected !== null ? after - expected : 0;
  const over = overBy > 0;

  const confirm = async () => {
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const ids = [...selected.keys()];
      await onConfirm(
        grouped ? { questionIds: [], groupIds: ids } : { questionIds: ids, groupIds: [] },
      );
    } catch (err) {
      const apiError = toApiError(err);
      // Lỗi luật nghiệp vụ trả VALIDATION_ERROR kèm câu thông báo cụ thể trong details
      setSubmitError(apiError.fieldErrors[0]?.message ?? apiError.message);
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* Màn hẹp: toàn màn hình; từ sm: hộp thoại giữa màn, tối đa 85% chiều cao */}
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-white shadow-2xl shadow-slate-900/20 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-border">
          <div className="flex items-start gap-4 border-b border-border px-5 pt-5 pb-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="flex flex-wrap items-center gap-2 text-lg font-bold text-foreground">
                Thêm {grouped ? 'nhóm' : 'câu'} vào {sectionTitle(section.skill, section.part)}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                    SKILL_META[section.skill].pill,
                  )}
                >
                  <Lock className="size-3" />
                  {SKILL_META[section.skill].label} · Part {section.part}
                </span>
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {grouped
                  ? 'Thêm theo nhóm: mọi câu trong nhóm vào đề cùng lúc, đúng thứ tự trong nhóm.'
                  : `Chỉ hiện câu thuộc Part ${section.part}. Câu đã có trong đề không chọn lại được.`}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Đóng"
              disabled={submitting}
              className="-mt-1 -mr-1 rounded-lg p-1.5 text-subtle transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 border-b border-border bg-accent/50 px-5 py-4 sm:px-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
              {/* API danh sách nhóm chưa có tìm kiếm theo từ khóa: Part nhóm lọc theo chủ đề */}
              {grouped ? (
                <div className="[&_label]:sr-only">
                  <FilterSelect
                    label="Chủ đề"
                    value={topicId}
                    placeholder="Mọi chủ đề"
                    onChange={(value) => filter(() => setTopicId(value))}
                  >
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
              ) : (
                <SearchInput
                  value={q}
                  onSearch={(next) => filter(() => setQ(next))}
                  placeholder="Tìm theo nội dung câu hỏi…"
                />
              )}
              <ToggleSwitch
                label={grouped ? 'Chỉ nhóm của tôi' : 'Chỉ câu của tôi'}
                checked={mine}
                onChange={(checked) => filter(() => setMine(checked))}
              />
            </div>
            <div
              className={cn(
                'grid gap-3 [&_label]:sr-only',
                grouped ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-3',
              )}
            >
              {!grouped && (
                <>
                  <div className="col-span-2 md:col-span-1">
                    <FilterSelect
                      label="Chủ đề"
                      value={topicId}
                      placeholder="Mọi chủ đề"
                      onChange={(value) => filter(() => setTopicId(value))}
                    >
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </FilterSelect>
                  </div>
                  <FilterSelect
                    label="Độ khó"
                    value={difficulty}
                    placeholder="Mọi độ khó"
                    onChange={(value) => filter(() => setDifficulty(value as Difficulty | ''))}
                  >
                    {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((key) => (
                      <option key={key} value={key}>
                        {DIFFICULTY_META[key].label}
                      </option>
                    ))}
                  </FilterSelect>
                </>
              )}
              {/* Câu, nhóm Ngừng dùng không thêm vào đề được nên không có trong bộ lọc */}
              <FilterSelect
                label="Trạng thái"
                value={status}
                onChange={(value) => filter(() => setStatus(value as QuestionStatus))}
              >
                <option value="ACTIVE">Đang dùng</option>
                <option value="DRAFT">Nháp</option>
              </FilterSelect>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {list.isLoading ? (
              <div aria-hidden className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : list.error && !list.data ? (
              <ErrorState
                message={toApiError(list.error).message}
                onRetry={() => void list.refetch()}
              />
            ) : !meta || meta.total === 0 ? (
              <EmptyState
                title={grouped ? 'Không có nhóm phù hợp' : 'Không có câu phù hợp'}
                description="Thử đổi bộ lọc, hoặc soạn thêm ở Ngân hàng câu hỏi."
              />
            ) : (
              <div className={cn('transition-opacity', list.isFetching && 'opacity-60')}>
                <p className="mb-3 text-xs text-subtle">
                  {meta.total} {grouped ? 'nhóm' : 'câu'} phù hợp
                </p>
                {grouped ? (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {(groups.data?.data ?? []).map((group) => (
                      <GroupOption
                        key={group.id}
                        group={group}
                        used={usedGroupIds.has(group.id)}
                        checked={selected.has(group.id)}
                        onToggle={() => toggle(group.id, group.questionCount)}
                      />
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {(questions.data?.data ?? []).map((question) => (
                      <QuestionOption
                        key={question.id}
                        question={question}
                        mine={question.author.id === user?.id}
                        used={usedQuestionIds.has(question.id)}
                        checked={selected.has(question.id)}
                        onToggle={() => toggle(question.id, 1)}
                      />
                    ))}
                  </ul>
                )}
                {meta.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      page={page}
                      totalPages={meta.totalPages}
                      limit={limit}
                      pageSizes={PICKER_PAGE_SIZES}
                      onPageChange={setPage}
                      onLimitChange={(next) => filter(() => setLimit(next))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border px-5 py-4 sm:px-6">
            {submitError && (
              <FormAlert message={submitError} onClose={() => setSubmitError(undefined)} />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm text-slate-700">
                Đã chọn{' '}
                <span className="font-semibold text-brand">
                  {grouped
                    ? `${selected.size} nhóm (${selectedCount} câu)`
                    : `${selectedCount} câu`}
                </span>
                {selectedCount > 0 && (
                  <span
                    className={cn(
                      'mt-1 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold sm:mt-0 sm:ml-2 sm:inline-flex',
                      over ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {over && <CircleAlert className="size-3.5" />}
                    Part {section.part} sẽ có {after}
                    {expected !== null && `/${expected}`} câu
                    {over && ` (vượt ${overBy} câu)`}
                  </span>
                )}
              </p>
              <div className="flex w-full gap-3 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl px-4 sm:flex-none"
                  disabled={submitting}
                  onClick={onClose}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={selected.size === 0 || submitting}
                  onClick={() => void confirm()}
                  className="h-10 flex-1 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold shadow-md shadow-primary/30 hover:brightness-95 sm:flex-none"
                >
                  {submitting
                    ? 'Đang thêm…'
                    : `Thêm ${selectedCount > 0 ? `${selectedCount} câu ` : ''}vào đề`}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function QuestionOption({
  question,
  mine,
  used,
  checked,
  onToggle,
}: {
  question: QuestionSummary;
  mine: boolean;
  used: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition-colors',
          used && 'cursor-not-allowed opacity-55',
          checked
            ? 'border-primary bg-accent shadow-[inset_3px_0_0_var(--color-primary)]'
            : 'border-border hover:border-slate-300',
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={used}
          onChange={onToggle}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-sm font-medium wrap-break-word whitespace-pre-line text-foreground">
            {question.content}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-subtle">
            <span>#{question.topic.name}</span>
            <span aria-hidden>·</span>
            {mine ? (
              <span className="font-semibold text-primary">Bạn</span>
            ) : (
              <span>{question.author.fullName}</span>
            )}
            <DifficultyPill difficulty={question.difficulty} />
            <StatusPill status={question.status} />
            {used && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                Đã có trong đề
              </span>
            )}
          </span>
          {question.status === 'DRAFT' && !used && (
            <span className="mt-1.5 block text-xs text-amber-700">
              Câu Nháp vẫn thêm được, nhưng phải chuyển sang Đang dùng trước khi xuất bản đề.
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

function GroupOption({
  group,
  used,
  checked,
  onToggle,
}: {
  group: QuestionGroupSummary;
  used: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const size = groupSize(group.skill, group.part);
  const badSize = size && (group.questionCount < size.min || group.questionCount > size.max);
  const empty = group.questionCount === 0;
  const disabled = used || empty;
  return (
    <li>
      <label
        className={cn(
          'flex h-full cursor-pointer gap-3 rounded-2xl border p-4 transition-colors',
          disabled && 'cursor-not-allowed opacity-55',
          checked
            ? 'border-primary bg-accent ring-1 ring-primary'
            : 'border-border hover:border-slate-300',
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Layers className="size-4 shrink-0 text-primary" />
            <span className="truncate">{group.topic.name}</span>
          </span>
          <span className="mt-1.5 line-clamp-3 block text-sm whitespace-pre-line text-slate-600">
            {groupText(group) || 'Chưa có nội dung'}
          </span>
          <span className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-border">
              <ListChecks className="size-3.5" />
              {group.questionCount} câu hỏi
            </span>
            <StatusPill status={group.status} />
            {size && badSize && !empty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                <CircleAlert className="size-3.5" />
                Chuẩn {groupSizeLabel(size)}
              </span>
            )}
            {empty && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                Nhóm chưa có câu
              </span>
            )}
            {used && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                Đã có trong đề
              </span>
            )}
          </span>
        </span>
      </label>
    </li>
  );
}
