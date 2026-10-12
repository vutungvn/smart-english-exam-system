import { useWatch } from 'react-hook-form';
import { Check, Circle, Eye, Headphones, ImageIcon, ListChecks, Mic, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkillPill } from '../components/Pills';
import { findPartRule, OPTION_LABELS, partLabel, type PartRule } from '../toeic';
import type { QuestionFormValues } from './question-form';

// Cột phải: học viên sẽ thấy câu hỏi thế nào + các điều kiện còn thiếu trước khi lưu
/** `checklist`: tắt khi chỉ xem câu của người khác (không lưu được) */
export function QuestionSidePanel({ checklist: showChecklist = true }: { checklist?: boolean }) {
  const values = useWatch<QuestionFormValues>() as QuestionFormValues;
  const rule = values.skill ? findPartRule(values.skill, values.part) : undefined;

  return (
    <div className="space-y-4">
      <StudentPreview values={values} rule={rule} />
      {showChecklist && <RulesChecklist values={values} rule={rule} />}
    </div>
  );
}

function StudentPreview({ values, rule }: { values: QuestionFormValues; rule?: PartRule }) {
  const count = rule?.optionCount ?? 0;

  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Eye className="size-4 text-primary" />
        Học viên sẽ thấy
      </h2>

      <div className="mt-4 rounded-2xl border border-border bg-slate-50 p-4">
        {rule ? (
          <div className="flex flex-wrap items-center gap-2">
            <SkillPill skill={rule.skill} />
            <span className="text-xs font-medium text-slate-600">{partLabel(rule)}</span>
          </div>
        ) : (
          <p className="text-xs text-subtle">Chưa chọn kỹ năng và Part</p>
        )}

        {rule && rule.media !== 'none' && (
          <div className="mt-3 flex gap-2">
            {rule.media.includes('image') && (
              <span className="flex h-16 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-subtle">
                <ImageIcon className="size-5" />
              </span>
            )}
            {rule.media.includes('audio') && (
              <span className="flex h-16 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-xs text-subtle">
                <Headphones className="size-4" />
                Âm thanh
              </span>
            )}
          </div>
        )}

        <p
          className={cn(
            'mt-3 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap',
            values.content.trim() ? 'text-foreground' : 'text-subtle italic',
          )}
        >
          {values.content.trim() || 'Nội dung câu hỏi sẽ hiện ở đây'}
        </p>

        {rule?.type === 'SINGLE_CHOICE' && (
          // Không tô đáp án đúng: đúng như học viên thấy khi làm bài
          <ul className="mt-3 space-y-2">
            {OPTION_LABELS.slice(0, count).map((label, index) => (
              <li
                key={label}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-500">
                  {label}
                </span>
                <span
                  className={cn(
                    'min-w-0 wrap-break-word',
                    !values.options[index]?.content.trim() && 'text-subtle',
                  )}
                >
                  {values.options[index]?.content.trim() || '…'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {rule?.type === 'SPOKEN_RESPONSE' && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-xs text-slate-600">
            <span className="flex size-8 items-center justify-center rounded-full bg-skill-speaking/12 text-violet-700">
              <Mic className="size-4" />
            </span>
            <span>
              Chuẩn bị <b>{values.prepSeconds || '–'}s</b> · Trả lời{' '}
              <b>{values.responseSeconds || '–'}s</b>
            </span>
          </div>
        )}

        {rule?.type === 'WRITTEN_RESPONSE' && (
          <div className="mt-3 flex h-20 items-start gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-xs text-subtle">
            <PenLine className="size-4" />Ô nhập câu trả lời của học viên
          </div>
        )}
      </div>
    </section>
  );
}

function checklist(
  values: QuestionFormValues,
  rule?: PartRule,
): { label: string; done: boolean }[] {
  const items = [
    { label: 'Chọn kỹ năng và Part', done: !!rule },
    { label: 'Chọn chủ đề', done: !!values.topicId },
    { label: 'Nhập nội dung câu hỏi', done: !!values.content.trim() },
  ];
  if (!rule) return items;

  if (rule.type === 'SINGLE_CHOICE') {
    const count = rule.optionCount ?? 0;
    items.push(
      {
        label: `Đủ ${count} phương án (${OPTION_LABELS.slice(0, count).join(', ')})`,
        done: values.options.slice(0, count).every((option) => option.content.trim()),
      },
      {
        label: 'Chọn 1 đáp án đúng',
        done: OPTION_LABELS.slice(0, count).some((l) => l === values.correct),
      },
    );
  } else {
    items.push({ label: 'Có câu trả lời mẫu', done: !!values.sampleAnswer.trim() });
  }
  if (rule.skill === 'SPEAKING') {
    items.push({
      label: 'Thời gian chuẩn bị và trả lời',
      done: values.prepSeconds !== '' && values.responseSeconds !== '',
    });
  }
  if (rule.group === 'required') {
    items.push({
      label: 'Chọn nhóm câu và thứ tự',
      done: !!values.groupId && !!values.orderInGroup,
    });
  }
  return items;
}

function RulesChecklist({ values, rule }: { values: QuestionFormValues; rule?: PartRule }) {
  const items = checklist(values, rule);
  const done = items.filter((item) => item.done).length;

  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ListChecks className="size-4 text-primary" />
          Kiểm tra trước khi lưu
        </h2>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            done === items.length ? 'bg-success-soft text-success' : 'bg-slate-100 text-slate-600',
          )}
        >
          {done}/{items.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            {item.done ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-success text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <Circle className="size-5 text-slate-300" />
            )}
            <span className={item.done ? 'text-slate-500' : 'font-medium text-foreground'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
