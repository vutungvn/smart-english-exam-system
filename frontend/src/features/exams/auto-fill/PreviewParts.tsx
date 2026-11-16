import { BarChart3, CircleCheck, Lock, TriangleAlert } from 'lucide-react';
import type { AutoFillPreview } from '@/api/generated';
import { cn } from '@/lib/utils';
import { DIFFICULTY_LABEL, partKey, skillLabel } from './auto-fill-form';

/** Kết quả xem trước: mỗi Part một thẻ (đủ / thiếu, ràng buộc đã nới, phân bố, danh sách câu) */
export function PreviewParts({ preview }: { preview: AutoFillPreview }) {
  const short = preview.parts.filter((part) => part.shortage > 0);
  const filled = preview.parts.filter((part) => !part.kept && part.shortage === 0).length;

  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-slate-700">
        Sau khi áp dụng, đề có{' '}
        <span className="font-bold text-brand">{preview.totalQuestions}</span> câu · đủ {filled}/
        {preview.parts.filter((part) => !part.kept).length} Part cần rút
        {short.length > 0 &&
          ` · thiếu: ${short.map((part) => `${skillLabel(part.skill)} Part ${part.part} (${part.shortage})`).join(', ')}`}
      </p>

      {preview.parts.map((part) => {
        const unit = part.reading7Profile ? 'câu' : part.unit === 'GROUP' ? 'nhóm' : 'câu';
        return (
          <section key={partKey(part)} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">
                {skillLabel(part.skill)} · Part {part.part}{' '}
                <span className="font-normal text-muted-foreground">{part.name}</span>
              </h3>
              {part.kept ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <Lock className="size-3.5" />
                  Giữ nguyên {part.questionCount} câu
                </span>
              ) : part.shortage > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-destructive">
                  <TriangleAlert className="size-3.5" />
                  Thiếu {part.shortage} {unit}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success">
                  <CircleCheck className="size-3.5" />
                  Đủ
                </span>
              )}
            </div>

            {!part.kept && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {part.selected}/{part.required} {unit} · {part.questionCount} câu · Dễ{' '}
                  {part.difficulty.easy} · Vừa {part.difficulty.medium} · Khó {part.difficulty.hard}
                  {part.unit === 'GROUP' && ' (tính theo nhóm)'}
                </p>
                {part.topics.length > 0 && (
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <BarChart3 className="size-3.5 text-subtle" />
                    {part.topics.map((topic) => (
                      <span key={topic.topicId} className="rounded-full bg-slate-100 px-2 py-0.5">
                        {topic.name}: {topic.count}
                      </span>
                    ))}
                  </p>
                )}
                {part.relaxed.length > 0 && (
                  <ul className="mt-2 space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {part.relaxed.map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                )}
                {part.items.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-primary">
                      Xem {part.items.length} {part.unit === 'GROUP' ? 'nhóm' : 'câu'} được chọn
                    </summary>
                    <ol className="mt-2 space-y-1 text-xs">
                      {part.items.map((item, index) => (
                        <li
                          key={item.questionId ?? item.groupId}
                          className="flex flex-wrap items-baseline gap-x-2 rounded-lg px-2 py-1 odd:bg-slate-50"
                        >
                          <span className="w-6 shrink-0 text-subtle tabular-nums">
                            {index + 1}.
                          </span>
                          <span className="min-w-0 flex-1 text-foreground">{item.label}</span>
                          <span className="text-subtle">
                            {DIFFICULTY_LABEL[item.difficulty]} · {item.topicName}
                            {item.questionCount > 1 && ` · ${item.questionCount} câu`}
                            {item.hasGraphic && ' · biểu đồ'}
                          </span>
                          <span
                            className={cn(
                              'text-subtle',
                              item.usedCount > 0 && 'font-semibold text-amber-700',
                            )}
                          >
                            {item.usedCount > 0 ? `đã dùng ở ${item.usedCount} đề` : 'chưa dùng'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
