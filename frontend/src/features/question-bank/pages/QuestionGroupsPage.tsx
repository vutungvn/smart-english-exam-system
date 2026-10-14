import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Layers, Plus } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useBulkDeleteQuestionGroupsMutation,
  useListQuestionGroupsQuery,
  type QuestionGroupSummary,
  type QuestionStatus,
  type Skill,
} from '@/api/generated';
import { BulkActionBar } from '@/components/bulk/BulkActionBar';
import { BulkDeleteDialog } from '@/components/bulk/BulkDeleteDialog';
import { toOutcome, type BulkOutcome } from '@/components/bulk/bulk-outcome';
import { BulkResultBanner } from '@/components/bulk/BulkResultBanner';
import { SelectCheckbox } from '@/components/bulk/SelectCheckbox';
import { useSelection } from '@/components/bulk/use-selection';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { FilterSelect, SegmentedControl, ToggleSwitch } from '../components/FilterControls';
import { GroupCard, GroupGridSkeleton } from '../components/GroupCard';
import { EmptyState, ErrorState, SuccessBanner } from '../components/ListStates';
import {
  GROUP_PAGE_SIZES,
  toGroupListArg,
  useGroupFilters,
  type GroupFilters,
} from '../hooks/use-group-filters';
import { useGroupCount } from '../hooks/use-question-counts';
import { useToeicTopics } from '../hooks/use-toeic-topics';
import { newGroupPath } from '../paths';
import { GROUP_SKILLS, groupPartsOfSkill, partLabel, SKILL_META, STATUS_META } from '../toeic';
import type { QuestionBankLocationState } from './QuestionBankPage';

export function QuestionGroupsPage() {
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, update, hasFilters, clear } = useGroupFilters();
  const { data, error, isLoading, isFetching, refetch } = useListQuestionGroupsQuery(
    toGroupListArg(filters),
  );
  const [pendingDelete, setPendingDelete] = useState<QuestionGroupSummary | null>(null);
  // Chọn nhiều để xóa: đổi bộ lọc/trang thì bỏ chọn
  const selection = useSelection(JSON.stringify(filters));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [withQuestions, setWithQuestions] = useState(true);
  const [bulkError, setBulkError] = useState<string>();
  const [outcome, setOutcome] = useState<BulkOutcome>();
  const [bulkDelete, { isLoading: bulkDeleting }] = useBulkDeleteQuestionGroupsMutation();

  // Thông báo do trang khác gửi qua state (tạo/xóa nhóm), xóa khỏi lịch sử để tải lại không hiện lại
  const [flash, setFlash] = useState(
    () => (location.state as QuestionBankLocationState | null)?.flash,
  );
  useEffect(() => {
    if ((location.state as QuestionBankLocationState | null)?.flash) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  const meta = data?.meta;
  useEffect(() => {
    if (meta && meta.totalPages > 0 && filters.page > meta.totalPages) {
      update({ page: meta.totalPages });
    }
  }, [meta, filters.page, update]);

  const groups = data?.data ?? [];
  const createPath = newGroupPath({ skill: filters.skill, part: filters.part });
  const myIds = groups.filter((group) => group.author.id === user?.id).map((group) => group.id);
  const selectedQuestions = groups
    .filter((group) => selection.has(group.id))
    .reduce((sum, group) => sum + group.questionCount, 0);
  const allMineSelected = myIds.length > 0 && myIds.every((id) => selection.has(id));

  const openBulk = () => {
    setWithQuestions(true);
    setBulkError(undefined);
    setBulkOpen(true);
  };

  const confirmBulk = async () => {
    setBulkError(undefined);
    try {
      const { data: result } = await bulkDelete({
        ids: [...selection.ids],
        withQuestions,
      }).unwrap();
      setBulkOpen(false);
      selection.clear();
      setFlash(undefined);
      setOutcome(
        toOutcome(
          result,
          'nhóm',
          result.deletedQuestions > 0 ? ` và ${result.deletedQuestions} câu hỏi trong nhóm` : '',
        ),
      );
    } catch (err) {
      setBulkError(toApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <title>Nhóm câu hỏi – Smart English Exam</title>
      <PageHeader
        title="Nhóm câu hỏi"
        description="Đoạn hội thoại, bài nói, đoạn văn dùng chung cho nhiều câu hỏi (Listening Part 3–4, Reading Part 6–7, Speaking Part 4)."
        actions={
          <ButtonLink
            to={createPath}
            className="h-10 w-auto bg-linear-to-r from-primary to-brand px-4 shadow-primary/30"
          >
            <Plus />
            Tạo nhóm câu
          </ButtonLink>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}
      {outcome && <BulkResultBanner outcome={outcome} onClose={() => setOutcome(undefined)} />}

      <GroupFilterCard
        filters={filters}
        hasFilters={hasFilters}
        onChange={update}
        onClear={clear}
      />

      {isLoading ? (
        <GroupGridSkeleton count={Math.min(filters.limit, 6)} />
      ) : error && !data ? (
        <div className="rounded-3xl border border-border bg-white">
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl border border-border bg-white">
          {hasFilters || filters.mine ? (
            <EmptyState title="Không có nhóm phù hợp" description="Thử bỏ bớt điều kiện lọc.">
              <button
                type="button"
                onClick={clear}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 hover:bg-accent"
              >
                Xóa bộ lọc
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={Layers}
              title="Chưa có nhóm câu nào"
              description="Tạo nhóm cho đoạn hội thoại, bài nói hoặc đoạn văn, rồi thêm các câu hỏi dùng chung nội dung đó."
            >
              <ButtonLink to={createPath} className="h-10 w-auto px-5">
                <Plus />
                Tạo nhóm câu
              </ButtonLink>
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {myIds.length > 0 && (
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-white px-3 py-1.5 text-sm shadow-2xs">
              <SelectCheckbox
                checked={allMineSelected}
                indeterminate={selection.count > 0}
                label="Chọn tất cả nhóm của bạn trong trang"
                onChange={(checked) => selection.setMany(myIds, checked)}
              />
              <span className="text-slate-600">
                Chọn tất cả nhóm của bạn trong trang ({myIds.length})
              </span>
            </div>
          )}
          <div
            aria-busy={isFetching}
            className={cn(
              'grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3',
              isFetching && 'opacity-60',
            )}
          >
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                mine={group.author.id === user?.id}
                onDelete={() => setPendingDelete(group)}
                selected={selection.has(group.id)}
                onSelect={() => selection.toggle(group.id)}
              />
            ))}
          </div>
        </div>
      )}

      {meta && meta.total > 0 && (
        <div className="rounded-3xl border border-border bg-white px-5 py-4 shadow-2xs">
          <Pagination
            page={filters.page}
            totalPages={meta.totalPages}
            limit={filters.limit}
            pageSizes={GROUP_PAGE_SIZES}
            onPageChange={(page) => update({ page })}
            onLimitChange={(limit) => update({ limit })}
          />
        </div>
      )}

      <BulkActionBar
        count={selection.count}
        noun="nhóm"
        onClear={selection.clear}
        onDelete={openBulk}
      />

      <BulkDeleteDialog
        open={bulkOpen}
        count={selection.count}
        noun="nhóm câu"
        description="Nhóm bị xóa không còn trong danh sách. Nhóm có câu đang nằm trong đề đã xuất bản sẽ được bỏ qua."
        busy={bulkDeleting}
        error={bulkError}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => void confirmBulk()}
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={withQuestions}
            onChange={(event) => setWithQuestions(event.target.checked)}
            className="mt-0.5 size-4 rounded accent-destructive"
          />
          <span className="text-sm">
            <span className="block font-semibold text-foreground">
              Xóa cả các câu trong nhóm (tổng {selectedQuestions} câu)
            </span>
            <span className="text-muted-foreground">
              Bỏ tích thì chỉ xóa được nhóm chưa có câu, nhóm còn câu sẽ được bỏ qua.
            </span>
          </span>
        </label>
      </BulkDeleteDialog>

      <DeleteGroupDialog
        group={
          pendingDelete && {
            id: pendingDelete.id,
            title: `${SKILL_META[pendingDelete.skill].label} · Part ${pendingDelete.part} – ${pendingDelete.topic.name}`,
            questionCount: pendingDelete.questionCount,
          }
        }
        onClose={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          setFlash('Đã xóa nhóm câu');
        }}
      />
    </div>
  );
}

interface GroupFilterCardProps {
  filters: GroupFilters;
  hasFilters: boolean;
  onChange: (patch: Partial<GroupFilters>) => void;
  onClear: () => void;
}

function GroupFilterCard({ filters, hasFilters, onChange, onClear }: GroupFilterCardProps) {
  const { topics, isLoading: topicsLoading } = useToeicTopics(filters.skill, filters.part);

  return (
    <section
      aria-label="Bộ lọc nhóm câu"
      className="space-y-4 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedControl<Skill>
          label="Kỹ năng"
          value={filters.skill}
          onChange={(skill) => onChange({ skill })}
          options={[
            { label: <SkillCountLabel label="Tất cả" mine={filters.mine} /> },
            ...GROUP_SKILLS.map((skill) => ({
              value: skill,
              label: (
                <SkillCountLabel
                  label={SKILL_META[skill].label}
                  skill={skill}
                  mine={filters.mine}
                />
              ),
            })),
          ]}
          className="grid grid-cols-2 sm:flex"
        />
        <ToggleSwitch
          label="Chỉ nhóm của tôi"
          checked={filters.mine}
          onChange={(mine) => onChange({ mine })}
        />
      </div>

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
        <FilterSelect
          label="Part"
          value={filters.part ? String(filters.part) : ''}
          disabled={!filters.skill}
          onChange={(value) => onChange({ part: value ? Number(value) : undefined })}
          placeholder={filters.skill ? 'Tất cả Part' : 'Chọn kỹ năng trước'}
        >
          {filters.skill &&
            groupPartsOfSkill(filters.skill).map((rule) => (
              <option key={rule.part} value={rule.part}>
                {partLabel(rule)}
              </option>
            ))}
        </FilterSelect>
        <FilterSelect
          label="Chủ đề"
          value={filters.topicId ?? ''}
          disabled={!filters.skill || topicsLoading}
          onChange={(value) => onChange({ topicId: value || undefined })}
          placeholder={
            !filters.skill ? 'Chọn kỹ năng trước' : topicsLoading ? 'Đang tải…' : 'Tất cả chủ đề'
          }
        >
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Trạng thái"
          value={filters.status ?? ''}
          onChange={(value) => onChange({ status: (value || undefined) as QuestionStatus })}
          placeholder="Mọi trạng thái"
        >
          {(Object.keys(STATUS_META) as QuestionStatus[]).map((key) => (
            <option key={key} value={key}>
              {STATUS_META[key].label}
            </option>
          ))}
        </FilterSelect>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className="h-10 rounded-xl px-4 text-sm font-semibold whitespace-nowrap text-slate-600 transition-colors hover:bg-accent hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
        >
          Xóa bộ lọc
        </button>
      </div>
    </section>
  );
}

function SkillCountLabel({ label, skill, mine }: { label: string; skill?: Skill; mine: boolean }) {
  const count = useGroupCount(skill, mine);
  return (
    <>
      {label}
      <span className="ml-1.5 text-xs font-normal text-subtle tabular-nums">{count ?? '–'}</span>
    </>
  );
}
