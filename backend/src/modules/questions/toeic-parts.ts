import { QuestionType, Skill } from '../../generated/prisma/enums.js';

/**
 * Cấu trúc đề TOEIC 4 kỹ năng (D17; Ke_hoach_trien_khai.md Mục 7.3). Mỗi kỹ năng đánh số Part riêng,
 * nên cặp (skill, part) mới xác định một dạng câu. Thêm IELTS sau này thì viết thêm IELTS_PARTS.
 */
export interface PartRule {
  skill: Skill;
  part: number;
  /** Tên dạng câu theo ETS, hiện trong thông báo lỗi và giao diện */
  name: string;
  /** Mỗi Part chỉ dùng một loại câu */
  type: QuestionType;
  /** Số phương án của câu trắc nghiệm (Part 2 chỉ có A–C); không có với câu trả lời mở */
  optionCount?: number;
  /** required: câu phải thuộc một nhóm (dùng chung đoạn văn/audio, D15); none: câu đơn */
  group: 'required' | 'none';
  /** Nội dung bắt buộc của nhóm: đoạn văn/bảng thông tin hoặc lời thoại */
  groupContent?: 'passage' | 'transcript';
}

const { LISTENING, READING, SPEAKING, WRITING } = Skill;
const { SINGLE_CHOICE, SPOKEN_RESPONSE, WRITTEN_RESPONSE } = QuestionType;

export const TOEIC_PARTS: readonly PartRule[] = [
  {
    skill: LISTENING,
    part: 1,
    name: 'Photographs',
    type: SINGLE_CHOICE,
    optionCount: 4,
    group: 'none',
  },
  {
    skill: LISTENING,
    part: 2,
    name: 'Question-Response',
    type: SINGLE_CHOICE,
    optionCount: 3,
    group: 'none',
  },
  {
    skill: LISTENING,
    part: 3,
    name: 'Conversations',
    type: SINGLE_CHOICE,
    optionCount: 4,
    group: 'required',
    groupContent: 'transcript',
  },
  {
    skill: LISTENING,
    part: 4,
    name: 'Talks',
    type: SINGLE_CHOICE,
    optionCount: 4,
    group: 'required',
    groupContent: 'transcript',
  },
  {
    skill: READING,
    part: 5,
    name: 'Incomplete Sentences',
    type: SINGLE_CHOICE,
    optionCount: 4,
    group: 'none',
  },
  {
    skill: READING,
    part: 6,
    name: 'Text Completion',
    type: SINGLE_CHOICE,
    optionCount: 4,
    group: 'required',
    groupContent: 'passage',
  },
  {
    skill: READING,
    part: 7,
    name: 'Reading Comprehension',
    type: SINGLE_CHOICE,
    optionCount: 4,
    group: 'required',
    groupContent: 'passage',
  },
  { skill: SPEAKING, part: 1, name: 'Read a text aloud', type: SPOKEN_RESPONSE, group: 'none' },
  { skill: SPEAKING, part: 2, name: 'Describe a picture', type: SPOKEN_RESPONSE, group: 'none' },
  { skill: SPEAKING, part: 3, name: 'Respond to questions', type: SPOKEN_RESPONSE, group: 'none' },
  {
    skill: SPEAKING,
    part: 4,
    name: 'Respond to questions using information provided',
    type: SPOKEN_RESPONSE,
    group: 'required',
    groupContent: 'passage',
  },
  { skill: SPEAKING, part: 5, name: 'Express an opinion', type: SPOKEN_RESPONSE, group: 'none' },
  {
    skill: WRITING,
    part: 1,
    name: 'Write a sentence based on a picture',
    type: WRITTEN_RESPONSE,
    group: 'none',
  },
  {
    skill: WRITING,
    part: 2,
    name: 'Respond to a written request',
    type: WRITTEN_RESPONSE,
    group: 'none',
  },
  {
    skill: WRITING,
    part: 3,
    name: 'Write an opinion essay',
    type: WRITTEN_RESPONSE,
    group: 'none',
  },
];

export function findPartRule(skill: Skill, part: number): PartRule | undefined {
  return TOEIC_PARTS.find((rule) => rule.skill === skill && rule.part === part);
}

/** "Listening Part 3 (Conversations)" */
export function describePart(rule: PartRule): string {
  const skill = rule.skill.charAt(0) + rule.skill.slice(1).toLowerCase();
  return `${skill} Part ${rule.part} (${rule.name})`;
}
