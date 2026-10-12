// Lớp CSS dùng chung cho ô nhập của form soạn câu hỏi (cùng giao diện với NativeSelect)

const field =
  'w-full rounded-xl border border-border bg-white text-sm text-foreground outline-none transition-colors placeholder:text-subtle hover:border-slate-300 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15';

export const inputClass = `${field} h-10 px-3.5`;
export const textareaClass = `${field} min-h-28 resize-y px-3.5 py-3 leading-relaxed`;
