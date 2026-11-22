import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ExternalLink,
  Info,
  Monitor,
  RotateCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGetAuditLogQuery, type AuditLogDetail, type AuditLogListItem } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { Button } from '@/components/ui/button';
import { describeUserAgent } from '@/features/profile/format';
import { ToggleSwitch } from '@/features/question-bank/components/FilterControls';
import { cn } from '@/lib/utils';
import { useAuditLabels } from '../hooks/use-audit-labels';
import { fieldLabel, formatAuditTime, userPath, valueLabel } from '../labels';
import { ActionBadge, ActorCell, AuditRoleBadge } from './AuditBadges';

type AuditSnapshot = Record<string, unknown>;

interface AuditLogDetailDialogProps {
  /** Dòng đang chọn trong danh sách (null: đóng). Phần chung hiện ngay, trước/sau tải theo id */
  log: AuditLogListItem | null;
  onClose: () => void;
}

interface DiffRow {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

/** Ghép trường của before và after theo thứ tự xuất hiện, đánh dấu trường có giá trị khác nhau */
function diffRows(before: AuditSnapshot | null, after: AuditSnapshot | null): DiffRow[] {
  const keys = [...new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])];
  return keys.map((key) => ({
    key,
    before: before?.[key],
    after: after?.[key],
    changed: JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Hiện một giá trị trong nhật ký: mã enum đổi sang chữ, object thành danh sách "trường: giá trị" */
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-subtle italic">Không có</span>;
  }
  if (typeof value === 'boolean') return <>{value ? 'Có' : 'Không'}</>;
  if (typeof value === 'number') return <span className="tabular-nums">{value}</span>;
  if (typeof value === 'string') return <>{valueLabel(value)}</>;
  if (Array.isArray(value)) return <>{value.map(String).join(', ')}</>;
  if (isRecord(value)) {
    return (
      <span className="flex flex-wrap gap-1.5">
        {Object.entries(value).map(([key, item]) => (
          <span key={key} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
            {fieldLabel(key)}: <span className="font-semibold">{valueLabel(String(item))}</span>
          </span>
        ))}
      </span>
    );
  }
  return <>{JSON.stringify(value)}</>;
}

function InfoItem({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-semibold text-subtle">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-foreground">{children}</h3>
      {aside}
    </div>
  );
}

function ChangesTable({ log }: { log: AuditLogDetail }) {
  const [changedOnly, setChangedOnly] = useState(false);
  const rows = diffRows(log.before, log.after);
  const changedCount = rows.filter((row) => row.changed).length;
  const visible = changedOnly ? rows.filter((row) => row.changed) : rows;

  if (rows.length === 0) {
    return (
      <>
        <SectionTitle>Dữ liệu trước và sau khi thay đổi</SectionTitle>
        <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          Thao tác này không thay đổi dữ liệu.
        </p>
      </>
    );
  }

  return (
    <>
      <SectionTitle
        aside={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{changedCount}</span>/{rows.length}{' '}
              trường thay đổi
            </span>
            {changedCount < rows.length && (
              <ToggleSwitch
                label="Chỉ trường thay đổi"
                checked={changedOnly}
                onChange={setChangedOnly}
                className="h-8 text-xs"
              />
            )}
          </div>
        }
      >
        Dữ liệu trước và sau khi thay đổi
      </SectionTitle>

      {!log.before && (
        <p className="mb-3 text-xs text-muted-foreground">
          Không có dữ liệu trước: đây là lần thao tác đầu tiên trên đối tượng này.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        {/* Tiêu đề cột chỉ hiện từ sm; màn hẹp mỗi trường xếp dọc "Trước → Sau" */}
        <div className="hidden grid-cols-[9rem_1fr_1fr] gap-4 border-b border-border bg-slate-50 px-4 py-2.5 text-xs font-semibold tracking-wider text-subtle uppercase sm:grid">
          <span>Trường</span>
          <span>Trước</span>
          <span>Sau</span>
        </div>
        <ul className="divide-y divide-border">
          {visible.map((row) => (
            <li
              key={row.key}
              className={cn(
                'grid gap-1.5 px-4 py-3 text-sm sm:grid-cols-[9rem_1fr_1fr] sm:gap-4',
                row.changed && 'bg-amber-50/70',
              )}
            >
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                {row.changed && (
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                )}
                {fieldLabel(row.key)}
                {row.changed && <span className="sr-only">(đã thay đổi)</span>}
              </span>
              <span className={cn('min-w-0 wrap-break-word', row.changed && 'text-slate-500')}>
                <span className="mr-1.5 text-xs font-semibold text-subtle sm:hidden">Trước:</span>
                <Value value={row.before} />
              </span>
              <span
                className={cn(
                  'flex min-w-0 items-start gap-1.5 wrap-break-word',
                  row.changed && 'font-medium text-foreground',
                )}
              >
                <span className="text-xs font-semibold text-subtle sm:hidden">Sau:</span>
                {row.changed && (
                  <ArrowRight
                    aria-hidden
                    className="mt-0.5 hidden size-3.5 shrink-0 text-amber-600 sm:block"
                  />
                )}
                <span className="min-w-0">
                  <Value value={row.after} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** Chi tiết một bản ghi nhật ký: ai, lúc nào, ở đâu, làm gì, dữ liệu trước/sau. Chỉ xem */
export function AuditLogDetailDialog({ log, onClose }: AuditLogDetailDialogProps) {
  const { actionLabel } = useAuditLabels();
  return (
    <AppDialog
      open={log !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Chi tiết nhật ký"
      description={log ? actionLabel(log.action) : ''}
      size="lg"
      footer={
        <>
          <p className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" />
            Nhật ký chỉ được xem, không sửa hoặc xóa.
          </p>
          <Button variant="outline" className="h-10 rounded-xl px-5" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      {log && <DetailBody log={log} />}
    </AppDialog>
  );
}

function DetailBody({ log }: { log: AuditLogListItem }) {
  const { entityLabel } = useAuditLabels();
  const { data, error, isLoading, isFetching, refetch } = useGetAuditLogQuery(log.id);
  const detail = data?.data;
  const { date, time } = formatAuditTime(log.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <ActionBadge action={log.action} />
        <time dateTime={log.createdAt} className="text-sm text-muted-foreground tabular-nums">
          {date} · <span className="font-semibold text-foreground">{time}</span>
        </time>
      </div>

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <InfoItem label="Người thực hiện" wide>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActorCell actor={log.actor} />
            {log.actor && <AuditRoleBadge role={log.actor.role} />}
          </div>
        </InfoItem>
        <InfoItem label="Đối tượng">
          <p>{entityLabel(log.entity)}</p>
          {log.entityId ? (
            <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
              {log.entityId}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-subtle italic">Không gắn với bản ghi cụ thể</p>
          )}
          {log.entity === 'user' && log.entityId && (
            <Link
              to={userPath(log.entityId)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand"
            >
              Xem người dùng
              <ExternalLink className="size-3" />
            </Link>
          )}
        </InfoItem>
        <InfoItem label="Địa chỉ IP">
          <span className="font-mono">{log.ipAddress ?? '—'}</span>
        </InfoItem>
        <InfoItem label="Thiết bị">
          {detail ? (
            <Device userAgent={detail.userAgent} />
          ) : (
            <span className="block h-5 w-32 animate-pulse rounded bg-slate-100" />
          )}
        </InfoItem>
        <InfoItem label="Mã bản ghi">
          <span className="font-mono text-xs break-all text-muted-foreground">{log.id}</span>
        </InfoItem>
      </dl>

      {isLoading ? (
        <div aria-hidden className="space-y-3">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : error && !detail ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
        >
          <span>Không tải được dữ liệu thay đổi: {toApiError(error).message}</span>
          <Button
            variant="outline"
            className="h-9 rounded-xl bg-white px-3"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw />
            Thử lại
          </Button>
        </div>
      ) : (
        detail && <DetailSections detail={detail} />
      )}
    </div>
  );
}

function Device({ userAgent }: { userAgent: string | null }) {
  const device = describeUserAgent(userAgent);
  const Icon = device.mobile ? Smartphone : Monitor;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 text-subtle" />
      {device.label}
    </span>
  );
}

function DetailSections({ detail }: { detail: AuditLogDetail }) {
  const meta = detail.meta ? Object.entries(detail.meta) : [];
  return (
    <>
      {meta.length > 0 && (
        <section>
          <SectionTitle>Thông tin thêm</SectionTitle>
          <dl className="space-y-2.5 rounded-2xl border border-border px-4 py-3">
            {meta.map(([key, value]) => (
              <div key={key} className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="font-semibold text-slate-700">{fieldLabel(key)}</dt>
                <dd
                  className={cn(
                    'min-w-0 wrap-break-word',
                    key === 'reason' && 'text-foreground italic',
                  )}
                >
                  {key === 'reason' ? `“${String(value)}”` : <Value value={value} />}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <ChangesTable log={detail} />
      </section>
    </>
  );
}
