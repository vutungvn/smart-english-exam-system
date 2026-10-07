import { Link } from 'react-router';
import { ArrowRight, Zap } from 'lucide-react';
import { AI_SUGGESTIONS } from '../mock-data';

// TẠM: dữ liệu mẫu; nối API gợi ý của AI (Sprint 5), "Luyện ngay" mở bộ câu hỏi luyện tập tương ứng
export function AiSuggestionsCard() {
  return (
    <section className="flex flex-col rounded-3xl border border-border bg-white p-6 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-skill-listening/12 text-skill-listening">
            <Zap className="size-5" />
          </span>
          Gợi ý từ AI
        </h2>
        <span className="rounded-full bg-skill-listening/12 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          AI phân tích
        </span>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-3">
        {AI_SUGGESTIONS.map(({ title, description }) => (
          <li key={title} className="rounded-2xl border border-border bg-background p-4">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            <Link
              to="/app/exams"
              className="mt-2 flex items-center justify-end gap-1 text-sm font-semibold text-primary hover:text-brand"
            >
              Luyện ngay
              <ArrowRight className="size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
