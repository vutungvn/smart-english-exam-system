import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  breadcrumbs?: { label: string; to?: string }[]; // mục cuối là trang hiện tại, không có `to`
  title: string;
  description: ReactNode;
  backTo?: { label: string; to: string };
  actions?: ReactNode; // nút bên phải tiêu đề
}

// Đầu trang dùng chung: đường dẫn, nút quay lại, tiêu đề, mô tả, nút thao tác
export function PageHeader({ breadcrumbs, title, description, backTo, actions }: PageHeaderProps) {
  return (
    <header>
      {breadcrumbs && (
        <nav aria-label="Đường dẫn" className="text-sm text-subtle">
          <ol className="flex flex-wrap items-center gap-2">
            {breadcrumbs.map((item, index) => (
              <Fragment key={item.label}>
                {index > 0 && <li aria-hidden>/</li>}
                <li>
                  {item.to ? (
                    <Link to={item.to} className="hover:text-brand">
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-medium text-foreground">
                      {item.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}

      {backTo && (
        <Link
          to={backTo.to}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          {backTo.label}
        </Link>
      )}

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
