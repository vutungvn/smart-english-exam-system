import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { Skill, SubjectCategory } from '../../../generated/prisma/enums.js';
import { SUBJECT_CODE_PATTERN } from '../subject-rules.js';

const UPDATED_AT_DOC = {
  type: String,
  format: 'date-time',
  description: 'updatedAt nhận được lần đọc gần nhất; đã có người sửa sau đó thì trả 409',
} as const;
const UPDATED_AT_MESSAGE = { message: 'updatedAt phải là thời điểm ISO 8601' };

// ---------------------------------------------------------------------------------------------
// Chương trình thi

export class CreateSubjectDto {
  @ApiProperty({
    example: 'IELTS',
    pattern: SUBJECT_CODE_PATTERN.source,
    description: 'Chữ hoa, số, gạch dưới; không đổi được sau khi tạo (dùng trong tệp nhập câu hỏi)',
  })
  // Gõ chữ thường cũng nhận: đổi sang chữ hoa trước khi kiểm tra
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Mã phải là chuỗi ký tự' })
  @Matches(SUBJECT_CODE_PATTERN, {
    message: 'Mã gồm 2–50 ký tự: chữ hoa, số, gạch dưới (ví dụ IELTS_ACADEMIC)',
  })
  code: string;

  @ApiProperty({ example: 'IELTS Academic', minLength: 2, maxLength: 150 })
  @Trim()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @Length(2, 150, { message: 'Tên dài từ 2 đến 150 ký tự' })
  name: string;

  @ApiProperty({ enum: SubjectCategory, enumName: 'SubjectCategory' })
  @IsEnum(SubjectCategory, { message: 'Loại chương trình không hợp lệ' })
  category: SubjectCategory;
}

/** Mã và loại không đổi được; ẩn/hiện bằng isActive */
export class UpdateSubjectDto {
  @ApiProperty(UPDATED_AT_DOC)
  @IsDateString({}, UPDATED_AT_MESSAGE)
  updatedAt: string;

  @ApiPropertyOptional({ example: 'TOEIC 4 kỹ năng', minLength: 2, maxLength: 150 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @Length(2, 150, { message: 'Tên dài từ 2 đến 150 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'false: ẩn khỏi danh sách công khai, không chọn được khi tạo đề, câu hỏi',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Chủ đề

export class CreateTopicDto {
  @ApiProperty({ example: 'P5/P6 – Câu điều kiện', minLength: 2, maxLength: 150 })
  @Trim()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @Length(2, 150, { message: 'Tên dài từ 2 đến 150 ký tự' })
  name: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  @IsEnum(Skill, { message: 'Kỹ năng không hợp lệ' })
  skill: Skill;

  @ApiProperty({
    type: [Number],
    example: [5, 6],
    description: 'Part dùng được chủ đề, phải thuộc kỹ năng (Listening 1–4, Reading 5–7…)',
  })
  @IsArray({ message: 'parts phải là mảng' })
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 Part' })
  @ArrayMaxSize(7, { message: 'Tối đa 7 Part' })
  @IsInt({ each: true, message: 'Part phải là số nguyên' })
  @Min(1, { each: true, message: 'Part từ 1 đến 7' })
  @Max(7, { each: true, message: 'Part từ 1 đến 7' })
  parts: number[];

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  description?: string | null;
}

export class UpdateTopicDto extends PartialType(CreateTopicDto) {
  @ApiProperty(UPDATED_AT_DOC)
  @IsDateString({}, UPDATED_AT_MESSAGE)
  updatedAt: string;
}
