import type { BulkSkippedItem } from '@/api/generated';

export interface BulkOutcome {
  /** "Đã xóa 45 câu hỏi" */
  message: string;
  skipped: BulkSkippedItem[];
  /** Không xóa được mục nào: banner màu cam thay vì xanh */
  nothingDeleted: boolean;
}

/** Ghép thông báo từ kết quả API xóa nhiều */
export function toOutcome(
  result: { deleted: number; skipped: BulkSkippedItem[] },
  noun: string,
  extra = '',
): BulkOutcome {
  const message =
    result.deleted > 0 ? `Đã xóa ${result.deleted} ${noun}${extra}` : `Không xóa được ${noun} nào`;
  return { message, skipped: result.skipped, nothingDeleted: result.deleted === 0 };
}
