import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { Skill } from '../../../generated/prisma/enums.js';

export const REVIEW_TABS = ['WAITING', 'REVIEWED'] as const;
export const REVIEW_SCOPES = ['ALL', 'MINE'] as const;
const OPEN_SKILLS = [Skill.SPEAKING, Skill.WRITING] as const;
export const TEACHER_FEEDBACK_MAX = 2000;

export class TeacherAssessmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: REVIEW_TABS,
    default: 'WAITING',
    description: 'WAITING: chờ chấm (AI lỗi, học viên yêu cầu) · REVIEWED: giáo viên đã chấm',
  })
  @IsOptional()
  @IsIn(REVIEW_TABS, { message: 'tab chỉ nhận WAITING hoặc REVIEWED' })
  tab: (typeof REVIEW_TABS)[number] = 'WAITING';

  @ApiPropertyOptional({
    enum: REVIEW_SCOPES,
    default: 'ALL',
    description: 'ALL: mọi đề · MINE: chỉ đề do tôi soạn',
  })
  @IsOptional()
  @IsIn(REVIEW_SCOPES, { message: 'scope chỉ nhận ALL hoặc MINE' })
  scope: (typeof REVIEW_SCOPES)[number] = 'ALL';

  @ApiPropertyOptional({ enum: OPEN_SKILLS, enumName: 'Skill' })
  @IsOptional()
  @IsIn(OPEN_SKILLS, { message: 'skill chỉ nhận SPEAKING hoặc WRITING' })
  skill?: (typeof OPEN_SKILLS)[number];
}

/** Speaking Part 1: phát âm 0–3 + ngữ điệu 0–3 */
export class ReadAloudSubScoresDto {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 3 })
  @IsInt({ message: 'Điểm phát âm phải là số nguyên' })
  @Min(0, { message: 'Điểm phát âm từ 0 đến 3' })
  @Max(3, { message: 'Điểm phát âm từ 0 đến 3' })
  pronunciation: number;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 3 })
  @IsInt({ message: 'Điểm ngữ điệu phải là số nguyên' })
  @Min(0, { message: 'Điểm ngữ điệu từ 0 đến 3' })
  @Max(3, { message: 'Điểm ngữ điệu từ 0 đến 3' })
  intonation: number;
}

/** Giáo viên chấm (hoặc sửa bản đã chấm) một câu Speaking/Writing */
export class GradeAnswerDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 0,
    description:
      'Điểm câu theo thang của dạng câu; Speaking Part 1 gửi subScores thay cho trường này',
  })
  @IsOptional()
  @IsInt({ message: 'Điểm phải là số nguyên' })
  @Min(0, { message: 'Điểm không được âm' })
  score?: number;

  @ApiPropertyOptional({ type: ReadAloudSubScoresDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReadAloudSubScoresDto)
  subScores?: ReadAloudSubScoresDto;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'integer', minimum: 0, maximum: 5 },
    example: { grammar: 4, vocabulary: 3, coherence: 4, task: 5 },
    description: 'Điểm tiêu chí 0–5 (không bắt buộc), khóa theo criteriaOptions của câu',
  })
  @IsOptional()
  @IsObject({ message: 'criteria phải là object' })
  criteria?: Record<string, number>;

  @ApiProperty({
    minLength: 5,
    maxLength: TEACHER_FEEDBACK_MAX,
    description: 'Nhận xét cho học viên',
  })
  @Trim()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự' })
  @Length(5, TEACHER_FEEDBACK_MAX, {
    message: `Nhận xét dài từ 5 đến ${TEACHER_FEEDBACK_MAX} ký tự`,
  })
  feedback: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Bắt buộc khi sửa bản đã chấm: updatedAt của teacherAssessment lần đọc gần nhất',
  })
  @IsOptional()
  @IsDateString({}, { message: 'updatedAt phải là thời điểm ISO 8601' })
  updatedAt?: string;
}
