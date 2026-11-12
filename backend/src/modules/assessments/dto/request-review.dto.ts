import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

export const REVIEW_NOTE_MAX = 300;

/** Học viên yêu cầu giáo viên chấm lại một câu AI đã chấm */
export class RequestReviewDto {
  @ApiProperty({
    example: 'Em nghĩ bài nói đã trả lời đủ ý nhưng AI cho điểm thấp.',
    minLength: 5,
    maxLength: REVIEW_NOTE_MAX,
  })
  @Trim()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @Length(5, REVIEW_NOTE_MAX, {
    message: `Lý do dài từ 5 đến ${REVIEW_NOTE_MAX} ký tự`,
  })
  note: string;
}
