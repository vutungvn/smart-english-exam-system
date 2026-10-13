import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { CircleAlert, Layers, ListChecks, Lock, Search, X } from 'lucide-react';
import type { Difficulty, QuestionStatus } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { FilterSelect, ToggleSwitch } from '@/features/question-bank/components/FilterControls';
import { EmptyState } from '@/features/question-bank/components/ListStates';
import { DifficultyPill, StatusPill } from '@/features/question-bank/components/Pills';
import {
  DIFFICULTY_META,
  findPartRule,
  groupSize,
  groupSizeLabel,
  groupText,
  SKILL_META,
} from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { quotaOf, sectionTitle } from '../exam-meta';
import { bankOf, MOCK_ME } from '../mock/mock-bank';
import type { ExamSectionItem, ScoringScale } from '../types';

interface QuestionPickerDialogProps {
  section: ExamSectionItem;
  scale: ScoringScale;
  /** Id câu (trong ngân hàng) đã có ở bất kỳ Part nào của đề */
  usedQuestionIds: Set<string>;
  onClose: () => void;
  onConfirm: (ids: { questionIds: string[]; groupIds: string[] }) => void;
}

/**
 * Chọn câu đơn hoặc nhóm câu từ ngân hàng cho một Part. Kỹ năng và Part đã khóa theo phần thi.
 * TẠM (lượt 1): lấy từ ngân hàng giả; lượt 2 dùng useListQuestionsQuery / useListQuestionGroupsQuery
 * với skill, part, q, topicId, difficulty, status, mine và phân trang của API.
 */
export function QuestionPickerDialog({
  section,
  scale,
  usedQuestionIds,
  onClose,
  onConfirm,
}: QuestionPickerDialogProps) {
  const grouped = findPartRule(section.skill, section.part)?.group === 'required';
  const bank = bankOf(section.skill, section.part);
  const [q, setQ] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [status, setStatus] = useState<QuestionStatus | ''>('ACTIVE');
  const [mine, setMine] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const keyword = q.trim().toLowerCase();
  const topics = [
    ...new Map(
      (grouped ? bank.groups.map((g) => g.group.topic) : bank.singles.map((s) => s.topic)).map(
        (topic) => [topic.id, topic],
      ),
    ).values(),
  ];

  // Câu/nhóm chọn được lên trước, cái đã có trong đề xuống cuối (sort giữ nguyên thứ tự còn lại)
  const usedLast = (used: boolean) => (used ? 1 : 0);
  const singles = bank.singles
    .filter(
      (question) =>
        question.status !== 'INACTIVE' && // câu ngừng dùng không thêm vào đề được
        (!status || question.status === status) &&
        (!difficulty || question.difficulty === difficulty) &&
        (!topicId || question.topic.id === topicId) &&
        (!mine || question.author.id === MOCK_ME.id) &&
        (!keyword || question.content.toLowerCase().includes(keyword)),
    )
    .sort((a, b) => usedLast(usedQuestionIds.has(a.id)) - usedLast(usedQuestionIds.has(b.id)));
  const groups = bank.groups
    .filter(
      ({ group, questions }) =>
        group.status !== 'INACTIVE' &&
        (!status || group.status === status) &&
        (!topicId || group.topic.id === topicId) &&
        (!mine || group.author.id === MOCK_ME.id) &&
        (!keyword ||
          groupText(group).toLowerCase().includes(keyword) ||
          questions.some((item) => item.content.toLowerCase().includes(keyword))),
    )
    .sort(
      (a, b) =>
        usedLast(a.questions.some((item) => usedQuestionIds.has(item.id))) -
        usedLast(b.questions.some((item) => usedQuestionIds.has(item.id))),
    );

  const groupQuestionCount = (id: string) =>
    bank.groups.find((g) => g.group.id === id)?.questions.length ?? 0;
  const selectedCount = grouped
    ? selected.reduce((sum, id) => sum + groupQuestionCount(id), 0)
    : selected.length;
  const expected = quotaOf(scale, section.skill, section.part);
  const after = section.questionCount + selectedCount;
  const overBy = expected !== null ? after - expected : 0;
  const over = overBy > 0;
  const available = grouped ? groups.length : singles.length;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
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
              className="-mt-1 -mr-1 rounded-lg p-1.5 text-subtle transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 border-b border-border bg-accent/50 px-5 py-4 sm:px-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
                <input
                  type="search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder={
                    grouped ? 'Tìm trong đoạn văn, câu hỏi…' : 'Tìm theo nội dung câu hỏi…'
                  }
                  aria-label="Tìm câu hỏi"
                  className="h-10 w-full rounded-xl border border-border bg-white pr-3 pl-10 text-sm outline-none placeholder:text-subtle focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20"
                />
              </div>
              <ToggleSwitch label="Chỉ câu của tôi" checked={mine} onChange={setMine} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 [&_label]:sr-only">
              <div className="col-span-2 md:col-span-1">
                <FilterSelect
                  label="Chủ đề"
                  value={topicId}
                  placeholder="Mọi chủ đề"
                  onChange={setTopicId}
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
                disabled={grouped}
                onChange={(value) => setDifficulty(value as Difficulty | '')}
              >
                {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((key) => (
                  <option key={key} value={key}>
                    {DIFFICULTY_META[key].label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Trạng thái"
                value={status}
                placeholder="Đang dùng và Nháp"
                onChange={(value) => setStatus(value as QuestionStatus | '')}
              >
                <option value="ACTIVE">Đang dùng</option>
                <option value="DRAFT">Nháp</option>
              </FilterSelect>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <p className="mb-3 text-xs text-subtle">
              {available} {grouped ? 'nhóm' : 'câu'} phù hợp
            </p>
            {available === 0 ? (
              <EmptyState
                title={grouped ? 'Không có nhóm phù hợp' : 'Không có câu phù hợp'}
                description="Thử đổi bộ lọc, hoặc soạn thêm ở Ngân hàng câu hỏi."
              />
            ) : grouped ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {groups.map(({ group, questions }) => {
                  const used = questions.some((item) => usedQuestionIds.has(item.id));
                  const checked = selected.includes(group.id);
                  const size = groupSize(group.skill, group.part);
                  const badSize =
                    size && (questions.length < size.min || questions.length > size.max);
                  return (
                    <li key={group.id}>
                      <label
                        className={cn(
                          'flex h-full cursor-pointer gap-3 rounded-2xl border p-4 transition-colors',
                          used && 'cursor-not-allowed opacity-55',
                          checked
                            ? 'border-primary bg-accent ring-1 ring-primary'
                            : 'border-border hover:border-slate-300',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={used}
                          onChange={() => toggle(group.id)}
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            <Layers className="size-4 shrink-0 text-primary" />
                            <span className="truncate">{group.topic.name}</span>
                          </span>
                          <span className="mt-1.5 line-clamp-3 block text-sm whitespace-pre-line text-slate-600">
                            {groupText(group)}
                          </span>
                          <span className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-border">
                              <ListChecks className="size-3.5" />
                              {questions.length} câu hỏi
                            </span>
                            <StatusPill status={group.status} />
                            {size && badSize && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                <CircleAlert className="size-3.5" />
                                Chuẩn {groupSizeLabel(size)}
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
                })}
              </ul>
            ) : (
              <ul className="space-y-2">
                {singles.map((question) => {
                  const used = usedQuestionIds.has(question.id);
                  const checked = selected.includes(question.id);
                  const draft = question.status === 'DRAFT';
                  return (
                    <li key={question.id}>
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
                          onChange={() => toggle(question.id)}
                          className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-sm font-medium wrap-break-word whitespace-pre-line text-foreground">
                            {question.content}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-subtle">
                            <span>#{question.topic.name}</span>
                            <span aria-hidden>·</span>
                            <span>
                              {question.author.id === MOCK_ME.id ? (
                                <span className="font-semibold text-primary">Bạn</span>
                              ) : (
                                question.author.fullName
                              )}
                            </span>
                            <DifficultyPill difficulty={question.difficulty} />
                            <StatusPill status={question.status} />
                            {used && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                Đã có trong đề
                              </span>
                            )}
                          </span>
                          {draft && !used && (
                            <span className="mt-1.5 block text-xs text-amber-700">
                              Câu Nháp vẫn thêm được, nhưng phải chuyển sang Đang dùng trước khi
                              xuất bản đề.
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
            <p className="min-w-0 flex-1 text-sm text-slate-700">
              Đã chọn{' '}
              <span className="font-semibold text-brand">
                {grouped
                  ? `${selected.length} nhóm (${selectedCount} câu)`
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
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={selected.length === 0}
                onClick={() =>
                  onConfirm(
                    grouped
                      ? { questionIds: [], groupIds: selected }
                      : { questionIds: selected, groupIds: [] },
                  )
                }
                className="h-10 flex-1 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold shadow-md shadow-primary/30 hover:brightness-95 sm:flex-none"
              >
                Thêm {selectedCount > 0 ? `${selectedCount} câu` : ''} vào đề
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
