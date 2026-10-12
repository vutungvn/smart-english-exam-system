import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Difficulty, QuestionStatus, Skill } from '@/api/generated';
import { useToeicTopics } from '../hooks/use-toeic-topics';
import type { QuestionFilters as Filters, QuestionSort } from '../hooks/use-question-filters';
import { FilterSelect, SegmentedControl, ToggleSwitch } from './FilterControls';
import {
  DIFFICULTY_META,
  findPartRule,
  partLabel,
  partsOfSkill,
  SKILL_META,
  SKILLS,
  STATUS_META,
} from '../toeic';

interface QuestionFiltersProps {
  filters: Filters;
  hasFilters: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

const SORT_LABELS: Record<QuestionSort, string> = {
  'createdAt:desc': 'Mới tạo nhất',
  'createdAt:asc': 'Cũ nhất',
  'updatedAt:desc': 'Mới cập nhật',
  'updatedAt:asc': 'Lâu chưa cập nhật',
  'part:asc': 'Theo Part tăng dần',
  'part:desc': 'Theo Part giảm dần',
};
const SORT_OPTIONS: QuestionSort[] = [
  'createdAt:desc',
  'createdAt:asc',
  'updatedAt:desc',
  'part:asc',
];

export function QuestionFilters({ filters, hasFilters, onChange, onClear }: QuestionFiltersProps) {
  const { topics, isLoading: topicsLoading } = useToeicTopics(filters.skill, filters.part);

  return (
    <section
      aria-label="Bộ lọc câu hỏi"
      className="space-y-4 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SearchBox value={filters.q} onSearch={(q) => onChange({ q })} />

        {/* Kỹ năng dạng nút bấm: chỉ 4 lựa chọn, thấy hết không cần mở danh sách.
            Màn hẹp không đủ chỗ: lọc kỹ năng bằng 4 thẻ số liệu phía trên */}
        <SegmentedControl
          label="Kỹ năng"
          value={filters.skill}
          onChange={(skill) => onChange({ skill })}
          options={[
            { label: 'Tất cả' },
            ...SKILLS.map((skill) => ({ value: skill, label: SKILL_META[skill].label })),
          ]}
          className="hidden sm:flex"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <FilterSelect
          label="Part"
          value={filters.part ? String(filters.part) : ''}
          disabled={!filters.skill}
          onChange={(value) => onChange({ part: value ? Number(value) : undefined })}
          placeholder={filters.skill ? 'Tất cả Part' : 'Chọn kỹ năng trước'}
        >
          {filters.skill &&
            partsOfSkill(filters.skill).map((rule) => (
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
          label="Độ khó"
          value={filters.difficulty ?? ''}
          onChange={(value) => onChange({ difficulty: (value || undefined) as Difficulty })}
          placeholder="Mọi độ khó"
        >
          {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((key) => (
            <option key={key} value={key}>
              {DIFFICULTY_META[key].label}
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

        <FilterSelect
          label="Sắp xếp"
          value={filters.sort}
          onChange={(value) => onChange({ sort: value as QuestionSort })}
        >
          {SORT_OPTIONS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </FilterSelect>

        <ToggleSwitch
          label="Chỉ câu của tôi"
          checked={filters.mine}
          onChange={(mine) => onChange({ mine })}
          className="col-span-2 self-end lg:col-span-1"
        />
      </div>

      {hasFilters && (
        <ActiveChips
          filters={filters}
          topicName={topics.find((t) => t.id === filters.topicId)?.name}
          onChange={onChange}
          onClear={onClear}
        />
      )}
    </section>
  );
}

/**
 * Ô tìm kiếm gõ tới đâu lọc tới đó nhưng chỉ đẩy lên URL sau 400 ms ngừng gõ,
 * để không gọi API theo từng phím.
 */
function SearchBox({
  value,
  onSearch,
}: {
  value?: string;
  onSearch: (q: string | undefined) => void;
}) {
  const [text, setText] = useState(value ?? '');
  const [synced, setSynced] = useState(value);

  // URL đổi từ nơi khác (nút Xóa bộ lọc, Back): cập nhật lại ô nhập ngay trong lúc render
  if (value !== synced) {
    setSynced(value);
    if (text.trim() !== (value ?? '')) setText(value ?? '');
  }

  useEffect(() => {
    const next = text.trim();
    if (next === (value ?? '')) return;
    const timer = setTimeout(() => onSearch(next || undefined), 400);
    return () => clearTimeout(timer);
  }, [text, value, onSearch]);

  return (
    <div className="relative w-full xl:max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={text}
        maxLength={200}
        onChange={(event) => setText(event.target.value)}
        placeholder="Tìm theo nội dung câu hỏi…"
        aria-label="Tìm theo nội dung câu hỏi"
        className="h-10 w-full rounded-xl border border-border bg-slate-50 pr-9 pl-10 text-sm outline-none transition-colors placeholder:text-subtle hover:border-slate-300 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Xóa từ khóa"
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-subtle hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function ActiveChips({
  filters,
  topicName,
  onChange,
  onClear,
}: {
  filters: Filters;
  topicName?: string;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const rule =
    filters.skill && filters.part ? findPartRule(filters.skill, filters.part) : undefined;
  const chips: { key: string; label: string; remove: Partial<Filters> }[] = [];
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, remove: { q: undefined } });
  if (filters.skill)
    chips.push({
      key: 'skill',
      label: SKILL_META[filters.skill as Skill].label,
      remove: { skill: undefined },
    });
  if (rule) chips.push({ key: 'part', label: `Part ${rule.part}`, remove: { part: undefined } });
  if (filters.topicId)
    chips.push({ key: 'topic', label: topicName ?? 'Chủ đề', remove: { topicId: undefined } });
  if (filters.difficulty)
    chips.push({
      key: 'difficulty',
      label: DIFFICULTY_META[filters.difficulty].label,
      remove: { difficulty: undefined },
    });
  if (filters.status)
    chips.push({
      key: 'status',
      label: STATUS_META[filters.status].label,
      remove: { status: undefined },
    });
  if (filters.mine) chips.push({ key: 'mine', label: 'Câu của tôi', remove: { mine: false } });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <span className="text-xs font-semibold text-subtle">Đang lọc:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.remove)}
          aria-label={`Bỏ lọc ${chip.label}`}
          className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pr-2 pl-3 text-xs font-semibold text-brand transition-colors hover:bg-primary/15"
        >
          {chip.label}
          <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-semibold text-slate-600 underline-offset-4 hover:text-destructive hover:underline"
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}
