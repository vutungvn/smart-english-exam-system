import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Clock3 } from 'lucide-react';
import { IN_PROGRESS_EXAM } from '../mock-data';

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// TẠM: dữ liệu mẫu. Khi nối API: không có bài làm dở thì hiện gợi ý "Bắt đầu bài thi thử đầu tiên";
// đồng hồ đếm theo expires_at của server, link "Làm tiếp" mở đúng bài làm
export function InProgressExamCard() {
  const { title, meta, answered, total, remainingSeconds } = IN_PROGRESS_EXAM;
  const [remaining, setRemaining] = useState(remainingSeconds);
  const percent = Math.round((answered / total) * 100);

  useEffect(() => {
    const timer = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="flex flex-col rounded-3xl border border-l-4 border-border border-l-skill-writing bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <span className="size-1.5 rounded-full bg-skill-writing" />
          Đang làm dở
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 tabular-nums">
          <Clock3 className="size-4" />
          Còn {formatRemaining(remaining)}
        </span>
      </div>

      <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Tiến độ</span>
        <span className="font-semibold text-foreground">
          {answered}/{total} câu · {percent}%
        </span>
      </div>
      <div className="mt-2 mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-skill-writing" style={{ width: `${percent}%` }} />
      </div>

      <Link
        to="/app/exams"
        className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-brand font-semibold text-white shadow-md shadow-primary/30 transition hover:brightness-95"
      >
        Làm tiếp
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
