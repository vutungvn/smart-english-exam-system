import { Link } from 'react-router';
import { ArrowRight, CircleAlert, CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { questionPath } from '@/features/question-bank/paths';
import { cn } from '@/lib/utils';
import type { ExamIssue, ExamValidation } from '@/api/generated';

interface ValidationPanelProps {
  validation: ExamValidation;
  published: boolean;
  onGoToSection: (sectionId: string) => void;
}

// Kết quả kiểm tra trước khi xuất bản: lỗi chặn (đỏ) và nhắc nhở (vàng), bấm để tới chỗ cần sửa
export function ValidationPanel({ validation, published, onGoToSection }: ValidationPanelProps) {
  const errors = validation.issues.filter((issue) => issue.level === 'ERROR');
  const warnings = validation.issues.filter((issue) => issue.level === 'WARNING');

  return (
    <section
      aria-label="Kiểm tra trước khi xuất bản"
      className="rounded-3xl border border-border bg-white p-5 shadow-2xs"
    >
      <h2 className="font-bold text-foreground">Kiểm tra trước khi xuất bản</h2>

      <div
        className={cn(
          'mt-4 flex items-start gap-3 rounded-2xl p-3',
          validation.publishable ? 'bg-success-soft/30' : 'bg-danger-soft',
        )}
      >
        {validation.publishable ? (
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" />
        )}
        <div className="min-w-0">
          <p
            className={cn(
              'font-semibold',
              validation.publishable ? 'text-success' : 'text-destructive',
            )}
          >
            {published
              ? 'Đề đang xuất bản'
              : validation.publishable
                ? 'Đủ điều kiện xuất bản'
                : 'Chưa thể xuất bản'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {errors.length} lỗi cần sửa · {warnings.length} nhắc nhở · {validation.totalQuestions}{' '}
            câu
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <IssueList
          title="Lỗi cần sửa"
          icon={CircleAlert}
          tone="error"
          issues={errors}
          onGoToSection={onGoToSection}
        />
      )}
      {warnings.length > 0 && (
        <IssueList
          title="Nhắc nhở"
          icon={TriangleAlert}
          tone="warning"
          issues={warnings}
          onGoToSection={onGoToSection}
        />
      )}

      <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-subtle">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Lỗi đỏ chặn xuất bản. Nhắc nhở vàng vẫn xuất bản được; tệp âm thanh, hình ảnh tải ở form câu
        hỏi, trang nhóm câu hoặc chức năng Nhập từ tệp.
      </p>
    </section>
  );
}

function IssueList({
  title,
  icon: Icon,
  tone,
  issues,
  onGoToSection,
}: {
  title: string;
  icon: typeof CircleAlert;
  tone: 'error' | 'warning';
  issues: ExamIssue[];
  onGoToSection: (sectionId: string) => void;
}) {
  return (
    <div className="mt-5">
      <h3
        className={cn(
          'flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase',
          tone === 'error' ? 'text-destructive' : 'text-amber-600',
        )}
      >
        <Icon className="size-4" />
        {title} ({issues.length})
      </h3>
      {/* Đề lỗi nhiều (ví dụ 30 câu Nháp) thì cuộn trong khung, không đẩy dài cả trang */}
      <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
        {issues.map((issue, index) => (
          <li
            key={`${issue.code}-${issue.sectionId}-${issue.questionId}-${index}`}
            className={cn(
              'rounded-xl px-3 py-2.5 text-sm',
              tone === 'error' ? 'bg-slate-50' : 'bg-amber-50/70',
            )}
          >
            <p className="wrap-break-word text-slate-700">{issue.message}</p>
            {issue.questionId ? (
              <Link
                to={questionPath(issue.questionId)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand"
              >
                Mở câu hỏi
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              issue.sectionId && (
                <button
                  type="button"
                  onClick={() => issue.sectionId && onGoToSection(issue.sectionId)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand"
                >
                  Đi tới Part
                  <ArrowRight className="size-3.5" />
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
