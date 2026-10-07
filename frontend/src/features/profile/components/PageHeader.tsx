import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  breadcrumbs: { label: string; to?: string }[]; // mục cuối là trang hiện tại, không có `to`
  title: string;
  description: ReactNode;
  backTo?: { label: string; to: string };
}

// Đầu trang dùng chung cho Hồ sơ cá nhân và Đổi mật khẩu
export function PageHeader({ breadcrumbs, title, description, backTo }: PageHeaderProps) {
  return (
    <header>
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

      {backTo && (
        <Link
          to={backTo.to}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          {backTo.label}
        </Link>
      )}

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </header>
  );
}
