import { ChevronDown, Plus, Trash2, TriangleAlert } from 'lucide-react';
import type { AutoFillCoveragePart, AutoFillScope, ScoringScale } from '@/api/generated';
import { inputClass } from '@/features/question-bank/form/styles';
import { cn } from '@/lib/utils';
import {
  configError,
  partKey,
  skillLabel,
  unitLabel,
  type PartConfig,
  type TopicRow,
} from './auto-fill-form';

interface MatrixEditorProps {
  parts: AutoFillCoveragePart[];
  configs: Record<string, PartConfig>;
  scale: ScoringScale;
  scope: AutoFillScope;
  onChange: (key: string, patch: Partial<PartConfig>) => void;
}

const smallInput = cn(inputClass, 'h-9 w-16 px-2 text-center tabular-nums');

/** Ma trận rút đề: mỗi Part một thẻ (số lượng, tỉ lệ độ khó, chủ đề tối thiểu, gợi ý ngân hàng) */
export function MatrixEditor({ parts, configs, scale, scope, onChange }: MatrixEditorProps) {
  return (
    <div className="space-y-3">
      {parts.map((part) => {
        const key = partKey(part);
        const config = configs[key];
        const error = configError(part, config, scale);
        const unit = unitLabel(part);
        const kept = scope === 'EMPTY_PARTS' && part.current > 0;
        const needed = part.reading7Profile ? 15 : (part.required ?? Number(config.count));
        const lacking = config.enabled && !kept && needed > part.available;

        return (
          <section
            key={key}
            className={cn(
              'rounded-2xl border bg-white p-4',
              error && config.enabled ? 'border-destructive/40' : 'border-border',
              !config.enabled && 'opacity-60',
            )}
          >
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
              <div className="min-w-0 flex-1 basis-56">
                <label className="flex items-center gap-2 font-semibold text-foreground">
                  {scale === 'PERCENT' && (
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) => onChange(key, { enabled: event.target.checked })}
                      className="size-4 accent-primary"
                    />
                  )}
                  {skillLabel(part.skill)} · Part {part.part}
                  <span className="truncate font-normal text-muted-foreground">{part.name}</span>
                </label>
                <p className="mt-1 text-xs text-subtle">
                  {part.reading7Profile
                    ? '54 câu theo cấu trúc ETS: 4 nhóm 2 câu, 3 nhóm 3 câu, 3 nhóm 4 câu, 5 nhóm 5 câu'
                    : part.required !== null
                      ? `Chuẩn: ${part.required} ${unit}${part.unit === 'GROUP' ? ` (${part.requiredQuestions} câu)` : ''}`
                      : `Đơn vị: ${unit}`}
                </p>
                <CoverageHint part={part} />
                {kept && (
                  <p className="mt-1 text-xs font-semibold text-brand">
                    Đề đang có {part.current} câu ở Part này: giữ nguyên, không rút
                  </p>
                )}
                {lacking && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <TriangleAlert className="size-3.5" />
                    Ngân hàng chỉ có {part.available}/{needed} {unit}, Part này sẽ thiếu
                  </p>
                )}
              </div>

              {scale === 'PERCENT' && (
                <label className="text-xs font-semibold text-slate-700">
                  Số {unit}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    disabled={!config.enabled}
                    value={config.count}
                    onChange={(event) => onChange(key, { count: event.target.value })}
                    className={cn(smallInput, 'mt-1 block')}
                  />
                </label>
              )}

              <fieldset disabled={!config.enabled || kept} className="flex gap-2">
                <legend className="sr-only">Tỉ lệ độ khó (%)</legend>
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <label key={level} className="text-xs font-semibold text-slate-700">
                    {{ easy: 'Dễ %', medium: 'Vừa %', hard: 'Khó %' }[level]}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config[level]}
                      onChange={(event) => onChange(key, { [level]: event.target.value })}
                      className={cn(smallInput, 'mt-1 block')}
                    />
                  </label>
                ))}
              </fieldset>
            </div>

            {config.enabled && !kept && (
              <div className="mt-3">
                <button
                  type="button"
                  aria-expanded={config.open}
                  onClick={() => onChange(key, { open: !config.open })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <ChevronDown
                    className={cn('size-4 transition-transform', config.open && 'rotate-180')}
                  />
                  Chủ đề tối thiểu
                  {config.topics.length > 0 && ` (${config.topics.length})`}
                </button>
                {config.open && (
                  <TopicRows
                    part={part}
                    rows={config.topics}
                    onChange={(topics) => onChange(key, { topics })}
                  />
                )}
              </div>
            )}

            {error && config.enabled && !kept && (
              <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CoverageHint({ part }: { part: AutoFillCoveragePart }) {
  const unit = unitLabel(part);
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Ngân hàng: <span className="font-semibold text-foreground">{part.available}</span> {unit} (Dễ{' '}
      {part.difficulty.easy} · Vừa {part.difficulty.medium} · Khó {part.difficulty.hard}) ·{' '}
      {part.unused} chưa dùng ở đề khác
      {part.sizes.length > 0 &&
        ` · ${part.sizes.map((item) => `${item.count} nhóm ${item.size} câu`).join(', ')}`}
      {part.graphics > 0 && ` · ${part.graphics} nhóm có biểu đồ`}
    </p>
  );
}

function TopicRows({
  part,
  rows,
  onChange,
}: {
  part: AutoFillCoveragePart;
  rows: TopicRow[];
  onChange: (rows: TopicRow[]) => void;
}) {
  const unit = unitLabel(part);
  const update = (index: number, patch: Partial<TopicRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
      {rows.length === 0 && (
        <p className="text-xs text-subtle">
          Chưa đặt chủ đề: hệ thống chọn tự do theo tỉ lệ độ khó.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Chủ đề"
            value={row.topicId}
            onChange={(event) => update(index, { topicId: event.target.value })}
            className={cn(inputClass, 'h-9 min-w-0 flex-1 basis-48')}
          >
            <option value="">Chọn chủ đề…</option>
            {part.topics.map((topic) => (
              <option key={topic.topicId} value={topic.topicId}>
                {topic.name} ({topic.count} {unit})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-700">
            ít nhất
            <input
              type="number"
              min={1}
              value={row.min}
              onChange={(event) => update(index, { min: event.target.value })}
              className={smallInput}
            />
            {unit}
          </label>
          <button
            type="button"
            aria-label="Xóa chủ đề"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="rounded-lg p-1.5 text-subtle hover:bg-white hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { topicId: '', min: '1' }])}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <Plus className="size-3.5" />
        Thêm chủ đề
      </button>
    </div>
  );
}
