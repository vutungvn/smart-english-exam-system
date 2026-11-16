import { ApiProperty } from '@nestjs/swagger';
import { Skill, SubjectCategory } from '../../generated/prisma/enums.js';

export class SubjectItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TOEIC' })
  code: string;

  @ApiProperty({ example: 'TOEIC 4 kỹ năng' })
  name: string;

  @ApiProperty({ enum: SubjectCategory, enumName: 'SubjectCategory' })
  category: SubjectCategory;
}

export class TopicItem {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Skill, enumName: 'Skill' })
  skill: Skill;

  @ApiProperty({ type: [Number], example: [3, 4], description: 'Các Part dùng được chủ đề này' })
  parts: number[];

  @ApiProperty({ example: 'P3/P4 – Chi tiết' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;
}
