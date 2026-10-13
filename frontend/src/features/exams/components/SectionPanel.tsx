import { Link } from 'react-router';
import { CircleAlert, ExternalLink, FilePlus2, Layers, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifficultyPill, StatusPill } from '@/features/question-bank/components/Pills';
import { groupPath, questionPath } from '@/features/question-bank/paths';
import {
  findPartRule,
  groupSize,
  groupSizeLabel,
  SKILL_META,
} from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { quotaOf, sectionTitle } from '../exam-meta';
import type { ExamQuestionItem, ExamSectionItem, ScoringScale } from '../types';

interface SectionPanelProps {
  section: ExamSectionItem;
  scale: ScoringScale;
  readOnly: boolean;
  onAddQuestions: () => void;
  onRemoveQuestion: (examQuestionId: string) => void;
  onRemoveSection: () => void;
}

interface Block {
  groupId: string | null;
  items: ExamQuestionItem[];
}

/** Gom các câu liền nhau cùng nhóm thành một khối (nhóm luôn được thêm như một khối) */
function toBlocks(items: ExamQuestionItem[]): Block[] {
  const blocks: Block[] = [];
  for (const item of items) {
    const groupId = item.question.groupId;
    const last = blocks.at(-1);
    if (groupId && last?.groupId === groupId) last.items.push(item);
    else blocks.push({ groupId, items: [item] });
  }
  return blocks;
}

function partHint(section: ExamSectionItem): string {
  const rule = findPartRule(section.skill, section.part);
  if (!rule) return '';
  const size = groupSize(section.skill, section.part);
  const kind =
    rule.type === 'SINGLE_CHOICE'
      ? `${rule.optionCount} phương án`
      : rule.type === 'SPOKEN_RESPONSE'
        ? 'trả lời nói'
        : 'trả lời viết';
  return rule.group === 'required'
    ? `Nhóm câu · mỗi nhóm ${size ? groupSizeLabel(size) : 'nhiều câu'} · ${kind}`
    : `Câu đơn · ${kind}`;
}

export function SectionPanel({
  section,
  scale,
  readOnly,
  onAddQuestions,
  onRemoveQuestion,
  onRemoveSection,
}: SectionPanelProps) {
  const expected = quotaOf(scale, section.skill, section.part);
  const ok = expected === null || section.questionCount === expected;
  const grouped = findPartRule(section.skill, section.part)?.group === 'required';
  const blocks = toBlocks(section.questions);
  const size = groupSize(section.skill, section.part);
  let number = 0;

  return (
    <section className="rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-bold text-foreground">
            <span className={cn('size-2.5 rounded-full', SKILL_META[section.skill].dot)} />
            {sectionTitle(section.skill, section.part)} – {section.name}
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
                ok ? 'bg-success-soft/40 text-success' : 'bg-amber-50 text-amber-700',
              )}
            >
              {expected === null
                ? `${section.questionCount} câu`
                : `${section.questionCount}/${expected} câu`}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{partHint(section)}</p>
        </div>
        {!readOnly && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              type="button"
              onClick={onAddQuestions}
              className="h-10 flex-1 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold shadow-md shadow-primary/25 hover:brightness-95 sm:flex-none"
            >
              <Plus />
              {grouped ? 'Thêm nhóm từ ngân hàng' : 'Thêm câu từ ngân hàng'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Xóa ${sectionTitle(section.skill, section.part)}`}
              title="Xóa Part"
              onClick={onRemoveSection}
              className="size-10 rounded-xl text-subtle hover:bg-danger-soft hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {blocks.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <FilePlus2 className="size-6" />
          </span>
          <p className="mt-3 font-semibold text-foreground">Part chưa có câu hỏi</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {expected
              ? `Đề chuẩn TOEIC cần ${expected} câu cho Part này.`
              : 'Chọn câu từ ngân hàng câu hỏi.'}
          </p>
          {!readOnly && (
            <Button className="mt-4 h-10 rounded-xl px-4" onClick={onAddQuestions}>
              <Plus />
              {grouped ? 'Thêm nhóm đầu tiên' : 'Thêm câu đầu tiên'}
            </Button>
          )}
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {blocks.map((block) => {
            if (!block.groupId) {
              const item = block.items[0];
              return (
                <QuestionRow
                  key={item.id}
                  item={item}
                  number={++number}
                  readOnly={readOnly}
                  onRemove={() => onRemoveQuestion(item.id)}
                />
              );
            }
            const count = block.items.length;
            const badSize = size && (count < size.min || count > size.max);
            return (
              <li
                key={block.groupId}
                className="rounded-2xl border border-border bg-slate-50/70 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-foreground">
                    <Layers className="size-4 shrink-0 text-primary" />
                    <span className="truncate">Nhóm · {block.items[0].question.topic.name}</span>
                    <span className="shrink-0 font-normal text-subtle">· {count} câu</span>
                  </span>
                  {size && badSize && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <CircleAlert className="size-3.5" />
                      Chuẩn {groupSizeLabel(size)}
                    </span>
                  )}
                  <Link
                    to={groupPath(block.groupId)}
                    className="text-xs font-semibold text-primary hover:text-brand"
                  >
                    Xem nhóm
                  </Link>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveQuestion(block.items[0].id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-danger-soft hover:text-destructive"
                    >
                      <X className="size-3.5" />
                      Gỡ nhóm
                    </button>
                  )}
                </div>
                <ol className="mt-3 space-y-2">
                  {block.items.map((item) => (
                    <QuestionRow key={item.id} item={item} number={++number} readOnly compact />
                  ))}
                </ol>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function QuestionRow({
  item,
  number,
  readOnly,
  compact = false,
  onRemove,
}: {
  item: ExamQuestionItem;
  number: number;
  readOnly: boolean;
  compact?: boolean;
  onRemove?: () => void;
}) {
  const { question } = item;
  const inactive = question.status !== 'ACTIVE';

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-2xl border bg-white transition-colors',
        compact ? 'p-3' : 'p-3 sm:p-4',
        inactive ? 'border-destructive/40 border-l-4' : 'border-border',
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-brand tabular-nums">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium wrap-break-word whitespace-pre-line text-foreground">
          {question.content}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <DifficultyPill difficulty={question.difficulty} />
          <StatusPill status={question.status} />
          <span className="text-subtle">#{question.topic.name}</span>
        </div>
        {inactive && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive">
            <CircleAlert className="size-3.5" />
            Chưa ở trạng thái Đang dùng, cần đổi trước khi xuất bản
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Link
          to={questionPath(question.id)}
          aria-label={`Mở câu ${number}`}
          title="Mở câu hỏi"
          className="rounded-lg p-2 text-subtle transition-colors hover:bg-accent hover:text-brand"
        >
          <ExternalLink className="size-4" />
        </Link>
        {!readOnly && onRemove && (
          <button
            type="button"
            aria-label={`Gỡ câu ${number} khỏi đề`}
            title="Gỡ khỏi đề"
            onClick={onRemove}
            className="rounded-lg p-2 text-subtle transition-colors hover:bg-danger-soft hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}
