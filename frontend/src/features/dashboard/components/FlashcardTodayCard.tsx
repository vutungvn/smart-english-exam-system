import { Link } from 'react-router';
import { Layers, Play } from 'lucide-react';
import { FLASHCARD_STATS } from '../mock-data';

// TẠM: dữ liệu mẫu; nối API flashcard. Hết thẻ cần ôn thì đổi nút thành "Thêm từ mới"
export function FlashcardTodayCard() {
  const { due, remembered } = FLASHCARD_STATS;

  return (
    <section className="flex flex-col rounded-3xl border border-primary/20 bg-accent p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-primary shadow-xs">
          <Layers className="size-5" />
        </span>
        <span className="rounded-full border border-primary/25 bg-white/70 px-3 py-1 text-xs font-semibold text-brand">
          Ôn tập ngắt quãng (SRS)
        </span>
      </div>

      <h2 className="mt-5 text-lg font-bold text-foreground">Flashcard hôm nay</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Lặp lại thông minh giúp ghi nhớ từ vựng TOEIC vào trí nhớ dài hạn.
      </p>

      <div className="mt-5 mb-6 grid grid-cols-2 gap-3">
        <p className="rounded-2xl bg-white p-4">
          <span className="block text-3xl font-extrabold text-primary">{due}</span>
          <span className="mt-1 block text-sm text-muted-foreground">Thẻ cần ôn hôm nay</span>
        </p>
        <p className="rounded-2xl bg-white p-4">
          <span className="block text-3xl font-extrabold text-foreground">{remembered}</span>
          <span className="mt-1 block text-sm text-muted-foreground">Từ đã nhớ</span>
        </p>
      </div>

      <Link
        to="/app/flashcards"
        className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-brand font-semibold text-white shadow-md shadow-primary/30 transition hover:brightness-95"
      >
        Ôn ngay
        <Play className="size-4" />
      </Link>
    </section>
  );
}
