import { useEffect, useState } from 'react';
import { Filter, ScrollText, ShieldCheck, X } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useExportAuditLogsMutation,
  useListAuditLogsQuery,
  type AuditLogListItem,
} from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import {
  EmptyState,
  ErrorState,
  SuccessBanner,
} from '@/features/question-bank/components/ListStates';
import { AuditLogDetailDialog } from '../components/AuditLogDetailDialog';
import { AuditLogFilters } from '../components/AuditLogFilters';
import { AuditLogTable, AuditLogTableSkeleton } from '../components/AuditLogTable';
import { ExportMenu } from '../components/ExportMenu';
import { useAuditLabels } from '../hooks/use-audit-labels';
import {
  PAGE_SIZES,
  toExportArg,
  toListArg,
  useAuditLogFilters,
} from '../hooks/use-audit-log-filters';
import { shortId, type AuditExportFormat } from '../labels';

const FORMAT_NAMES: Record<AuditExportFormat, string> = { xlsx: 'Excel', csv: 'CSV' };

// Trang Nhật ký kiểm toán `/admin/audit-logs`: tra cứu thao tác quản trị, xem trước/sau, xuất tệp
export function AdminAuditLogsPage() {
  const { filters, update, quickRange, setQuickRange, hasFilters, clear } = useAuditLogFilters();
  const labels = useAuditLabels();
  // Nhật ký tăng sau mỗi thao tác quản trị ở trang khác: mở trang là tải lại, không dùng cache cũ
  const { data, error, isLoading, isFetching, refetch } = useListAuditLogsQuery(
    toListArg(filters),
    { refetchOnMountOrArgChange: true },
  );
  const [exportLogs, { isLoading: exporting }] = useExportAuditLogsMutation();

  const [selected, setSelected] = useState<AuditLogListItem | null>(null);
  const [flash, setFlash] = useState<string>();
  const [exportError, setExportError] = useState<string>();

  const meta = data?.meta;
  // Đang ở trang cuối mà bộ lọc mới có ít trang hơn: lùi về trang có dữ liệu
  useEffect(() => {
    if (meta && meta.totalPages > 0 && filters.page > meta.totalPages) {
      update({ page: meta.totalPages });
    }
  }, [meta, filters.page, update]);

  const logs = data?.data ?? [];

  const handleExport = async (format: AuditExportFormat) => {
    setFlash(undefined);
    setExportError(undefined);
    try {
      await exportLogs(toExportArg(filters, format)).unwrap();
      setFlash(`Đã tải xuống tệp ${FORMAT_NAMES[format]} theo bộ lọc hiện tại.`);
    } catch (err) {
      setExportError(toApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <title>Nhật ký kiểm toán – Smart English Exam</title>
      <PageHeader
        title="Nhật ký kiểm toán"
        description="Tra cứu các thao tác quản trị: ai làm, lúc nào, từ đâu và dữ liệu thay đổi ra sao."
        actions={
          <ExportMenu
            exporting={exporting}
            disabled={!meta || meta.total === 0}
            onExport={(format) => void handleExport(format)}
          />
        }
      />

      <p className="flex items-start gap-2.5 rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-slate-700">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        <span>
          Nhật ký được ghi tự động sau mỗi thao tác quản trị thành công, lưu tối thiểu 6 tháng và{' '}
          <span className="font-semibold">chỉ được xem</span>: không ai sửa hoặc xóa được, kể cả
          quản trị viên.
        </span>
      </p>

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}
      {exportError && <FormAlert message={exportError} onClose={() => setExportError(undefined)} />}

      <AuditLogFilters
        filters={filters}
        options={labels.options}
        optionsLoading={labels.loading}
        quickRange={quickRange}
        hasFilters={hasFilters}
        onChange={update}
        onQuickRange={setQuickRange}
        onClear={clear}
      />

      <section
        aria-label="Danh sách nhật ký"
        className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <ScrollText className="size-5 text-primary" />
            Bản ghi nhật ký
          </h2>
          {meta && (
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.total}</span> bản ghi
            </span>
          )}
        </div>

        {/* Mở từ trang chi tiết một đối tượng: nói rõ đang xem nhật ký của riêng đối tượng đó */}
        {filters.entityId && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/50 px-5 py-2.5 text-sm">
            <Filter className="size-4 text-primary" />
            <span className="text-slate-700">
              Đang xem nhật ký của{' '}
              <span className="font-semibold text-foreground">
                {filters.entity ? labels.entityLabel(filters.entity) : 'đối tượng'}
              </span>{' '}
              <span className="font-mono text-xs text-muted-foreground">
                #{shortId(filters.entityId)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => update({ entity: undefined, entityId: undefined })}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-white"
            >
              <X className="size-3.5" />
              Xem tất cả
            </button>
          </div>
        )}

        {isLoading ? (
          <AuditLogTableSkeleton rows={6} />
        ) : error && !data ? (
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        ) : logs.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="Không có bản ghi phù hợp"
              description="Thử mở rộng khoảng thời gian hoặc bỏ bớt điều kiện lọc."
            >
              <button
                type="button"
                onClick={clear}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 hover:bg-accent"
              >
                Xóa bộ lọc
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={ScrollText}
              title="Chưa có nhật ký nào"
              description="Các thao tác như khóa tài khoản, sửa thông tin, sửa điểm sẽ được ghi lại ở đây."
            />
          )
        ) : (
          <AuditLogTable logs={logs} fetching={isFetching} onOpen={setSelected} />
        )}

        {meta && meta.total > 0 && (
          <div className="border-t border-border px-5 py-4">
            <Pagination
              page={filters.page}
              totalPages={meta.totalPages}
              limit={filters.limit}
              pageSizes={PAGE_SIZES}
              onPageChange={(page) => update({ page })}
              onLimitChange={(limit) => update({ limit })}
            />
          </div>
        )}
      </section>

      <AuditLogDetailDialog log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
