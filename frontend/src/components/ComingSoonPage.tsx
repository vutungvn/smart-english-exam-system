import { Construction } from 'lucide-react';
import { ButtonLink } from './ButtonLink';

// Trang giữ chỗ cho mục menu chưa làm, để điều hướng vẫn nằm trong layout thay vì về trang chủ
export function ComingSoonPage({ title, backTo }: { title: string; backTo: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-white px-6 py-16 text-center">
      <title>{`${title} – Smart English Exam`}</title>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <Construction className="size-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Tính năng này đang được phát triển, bạn quay lại sau nhé.
      </p>
      <ButtonLink to={backTo} className="mt-6 w-auto px-6">
        Về trang chủ
      </ButtonLink>
    </div>
  );
}
