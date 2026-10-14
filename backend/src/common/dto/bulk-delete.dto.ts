import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { MAX_PAGE_LIMIT } from './pagination-query.dto.js';

/** Xóa nhiều mục một lần: tối đa bằng một trang lớn nhất của danh sách */
export class BulkIdsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: MAX_PAGE_LIMIT,
    description: `Từ 1 đến ${MAX_PAGE_LIMIT} id, không trùng nhau`,
  })
  @IsArray({ message: 'ids phải là mảng' })
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 mục' })
  @ArrayMaxSize(MAX_PAGE_LIMIT, { message: `Mỗi lần xóa tối đa ${MAX_PAGE_LIMIT} mục` })
  @ArrayUnique({ message: 'ids không được trùng nhau' })
  @IsUUID('all', { each: true, message: 'Có id không hợp lệ' })
  ids: string[];
}

export const BULK_SKIP_REASONS = [
  'NOT_FOUND',
  'NOT_OWNER',
  'IN_PUBLISHED_EXAM',
  'NOT_EMPTY',
  'PUBLISHED',
] as const;
export type BulkSkipReason = (typeof BULK_SKIP_REASONS)[number];

/** Một mục không xóa được và lý do */
export class BulkSkippedItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'P5-001',
    description: 'Mã câu, tên đề hoặc đoạn đầu nội dung; null khi không tìm thấy',
  })
  label: string | null;

  @ApiProperty({
    enum: BULK_SKIP_REASONS,
    enumName: 'BulkSkipReason',
    description:
      'NOT_FOUND: không tồn tại hoặc đã xóa · NOT_OWNER: của giáo viên khác · ' +
      'IN_PUBLISHED_EXAM: đang nằm trong đề đã xuất bản · NOT_EMPTY: nhóm còn câu · ' +
      'PUBLISHED: đề đang xuất bản',
  })
  reason: BulkSkipReason;

  @ApiProperty({ example: 'Câu đang nằm trong đề đã xuất bản' })
  message: string;
}

/**
 * Xóa từng phần: mục hợp lệ được xóa (trong một transaction), mục vi phạm quy tắc bị bỏ qua
 * kèm lý do, thay vì hủy cả lần xóa vì một vài mục
 */
export class BulkDeleteResult {
  @ApiProperty({ type: 'integer', description: 'Số mục đã xóa' })
  deleted: number;

  @ApiProperty({ type: [BulkSkippedItem], description: 'Theo đúng thứ tự id gửi lên' })
  skipped: BulkSkippedItem[];
}

export const SKIP_MESSAGES: Record<BulkSkipReason, string> = {
  NOT_FOUND: 'Không tồn tại hoặc đã bị xóa',
  NOT_OWNER: 'Do giáo viên khác tạo',
  IN_PUBLISHED_EXAM: 'Đang nằm trong đề đã xuất bản, hãy gỡ xuất bản đề trước',
  NOT_EMPTY: 'Nhóm còn câu hỏi',
  PUBLISHED: 'Đề đang xuất bản, hãy gỡ xuất bản trước',
};

export function skip(id: string, label: string | null, reason: BulkSkipReason): BulkSkippedItem {
  return { id, label, reason, message: SKIP_MESSAGES[reason] };
}

/** Đoạn đầu nội dung để giáo viên nhận ra mục bị bỏ qua */
export function shortLabel(text: string | null | undefined, length = 40): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}
