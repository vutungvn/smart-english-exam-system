import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Skill } from '../../../generated/prisma/enums.js';

export class AddExamSectionDto {
  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  @IsEnum(Skill, { message: 'skill không hợp lệ' })
  skill: Skill;

  @ApiProperty({ minimum: 1, maximum: 7, description: 'LR 1–7; Speaking 1–5; Writing 1–3' })
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part từ 1 đến 7' })
  @Max(7, { message: 'part từ 1 đến 7' })
  part: number;
}

export class AddExamQuestionsDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    maxItems: 100,
    description: 'Câu đơn (Part không có nhóm), thêm theo đúng thứ tự gửi lên',
  })
  @IsOptional()
  @IsArray({ message: 'questionIds phải là mảng' })
  @ArrayMaxSize(100, { message: 'Mỗi lần thêm tối đa 100 câu' })
  @IsUUID('all', { each: true, message: 'questionIds có id không hợp lệ' })
  questionIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    maxItems: 30,
    description: 'Nhóm câu (L3, L4, R6, R7, S4): thêm toàn bộ câu của nhóm theo thứ tự trong nhóm',
  })
  @IsOptional()
  @IsArray({ message: 'groupIds phải là mảng' })
  @ArrayMaxSize(30, { message: 'Mỗi lần thêm tối đa 30 nhóm' })
  @IsUUID('all', { each: true, message: 'groupIds có id không hợp lệ' })
  groupIds?: string[];
}
