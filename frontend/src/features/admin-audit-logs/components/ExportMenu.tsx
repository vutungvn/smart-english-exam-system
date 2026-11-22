import { DropdownMenu } from 'radix-ui';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AuditExportFormat } from '../labels';

const EXPORT_MAX_ROWS = '10.000';

const FORMATS: {
  value: AuditExportFormat;
  label: string;
  hint: string;
  icon: typeof FileText;
}[] = [
  {
    value: 'xlsx',
    label: 'Excel (.xlsx)',
    hint: 'Mở bằng Excel, có lọc theo cột',
    icon: FileSpreadsheet,
  },
  {
    value: 'csv',
    label: 'CSV (.csv)',
    hint: 'Dạng văn bản, nhập vào công cụ khác',
    icon: FileText,
  },
];

const menuItem =
  'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm outline-none select-none data-highlighted:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50';

interface ExportMenuProps {
  /** Đang tạo tệp: khóa nút, hiện vòng quay */
  exporting?: boolean;
  disabled?: boolean;
  onExport: (format: AuditExportFormat) => void;
}

/** Xuất kết quả tra cứu theo đúng bộ lọc đang áp dụng */
export function ExportMenu({ exporting = false, disabled = false, onExport }: ExportMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled || exporting}>
        <Button className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 shadow-md shadow-primary/30">
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          {exporting ? 'Đang xuất…' : 'Xuất nhật ký'}
          <ChevronDown className="-mr-1 opacity-80" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-72 rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 pt-1.5 pb-2 text-xs text-muted-foreground">
            Theo bộ lọc hiện tại, tối đa {EXPORT_MAX_ROWS} dòng
          </DropdownMenu.Label>
          {FORMATS.map(({ value, label, hint, icon: Icon }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={() => onExport(value)}
              className={cn(menuItem, 'text-foreground')}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
