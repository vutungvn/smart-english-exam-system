import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto.js';

/**
 * PATCH: mọi trường của CreateQuestionDto đều không bắt buộc (PartialType giữ nguyên validator).
 * - Không gửi: giữ giá trị cũ · gửi null: xóa giá trị (explanation, groupId...)
 * - Gửi options: thay toàn bộ danh sách phương án
 */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'updatedAt nhận được lần đọc gần nhất; đã có người sửa sau đó thì trả 409',
  })
  @IsDateString({}, { message: 'updatedAt phải là thời điểm ISO 8601' })
  updatedAt: string;
}
