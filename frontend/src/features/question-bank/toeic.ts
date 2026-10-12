import { BookOpen, Headphones, Mic, PenLine, type LucideIcon } from 'lucide-react';
import type { Difficulty, QuestionStatus, QuestionType, Skill } from '@/api/generated';

/**
 * Bản sao danh mục TOEIC_PARTS của backend (backend/src/modules/questions/toeic-parts.ts).
 * FE dùng để đổi form theo Part và báo lỗi ngay khi nhập; backend vẫn kiểm tra lại khi lưu.
 * Sửa bên nào thì sửa cả bên kia.
 */
export interface PartRule {
  skill: Skill;
  part: number;
  name: string;
  type: QuestionType;
  optionCount?: number;
  group: 'required' | 'none';
  groupContent?: 'passage' | 'transcript';
  /** Chỉ để hiển thị: tài nguyên câu cần (gắn khi nhập .zip) */
  media: 'none' | 'audio' | 'image' | 'audio+image';
  /** Gợi ý thời gian mặc định cho Speaking (giây), theo Ke_hoach_trien_khai Mục 7.3 */
  defaultSeconds?: { prep: number; response: number };
}

export const PART_RULES: readonly PartRule[] = [
  {
    skill: 'LISTENING',
    part: 1,
    name: 'Photographs',
    type: 'SINGLE_CHOICE',
    optionCount: 4,
    group: 'none',
    media: 'audio+image',
  },
  {
    skill: 'LISTENING',
    part: 2,
    name: 'Question-Response',
    type: 'SINGLE_CHOICE',
    optionCount: 3,
    group: 'none',
    media: 'audio',
  },
  {
    skill: 'LISTENING',
    part: 3,
    name: 'Conversations',
    type: 'SINGLE_CHOICE',
    optionCount: 4,
    group: 'required',
    groupContent: 'transcript',
    media: 'audio',
  },
  {
    skill: 'LISTENING',
    part: 4,
    name: 'Talks',
    type: 'SINGLE_CHOICE',
    optionCount: 4,
    group: 'required',
    groupContent: 'transcript',
    media: 'audio',
  },
  {
    skill: 'READING',
    part: 5,
    name: 'Incomplete Sentences',
    type: 'SINGLE_CHOICE',
    optionCount: 4,
    group: 'none',
    media: 'none',
  },
  {
    skill: 'READING',
    part: 6,
    name: 'Text Completion',
    type: 'SINGLE_CHOICE',
    optionCount: 4,
    group: 'required',
    groupContent: 'passage',
    media: 'none',
  },
  {
    skill: 'READING',
    part: 7,
    name: 'Reading Comprehension',
    type: 'SINGLE_CHOICE',
    optionCount: 4,
    group: 'required',
    groupContent: 'passage',
    media: 'none',
  },
  {
    skill: 'SPEAKING',
    part: 1,
    name: 'Read a text aloud',
    type: 'SPOKEN_RESPONSE',
    group: 'none',
    media: 'none',
    defaultSeconds: { prep: 45, response: 45 },
  },
  {
    skill: 'SPEAKING',
    part: 2,
    name: 'Describe a picture',
    type: 'SPOKEN_RESPONSE',
    group: 'none',
    media: 'image',
    defaultSeconds: { prep: 45, response: 30 },
  },
  {
    skill: 'SPEAKING',
    part: 3,
    name: 'Respond to questions',
    type: 'SPOKEN_RESPONSE',
    group: 'none',
    media: 'audio',
    defaultSeconds: { prep: 3, response: 15 },
  },
  {
    skill: 'SPEAKING',
    part: 4,
    name: 'Respond using information provided',
    type: 'SPOKEN_RESPONSE',
    group: 'required',
    groupContent: 'passage',
    media: 'audio',
    defaultSeconds: { prep: 3, response: 15 },
  },
  {
    skill: 'SPEAKING',
    part: 5,
    name: 'Express an opinion',
    type: 'SPOKEN_RESPONSE',
    group: 'none',
    media: 'none',
    defaultSeconds: { prep: 45, response: 60 },
  },
  {
    skill: 'WRITING',
    part: 1,
    name: 'Write a sentence based on a picture',
    type: 'WRITTEN_RESPONSE',
    group: 'none',
    media: 'image',
  },
  {
    skill: 'WRITING',
    part: 2,
    name: 'Respond to a written request',
    type: 'WRITTEN_RESPONSE',
    group: 'none',
    media: 'none',
  },
  {
    skill: 'WRITING',
    part: 3,
    name: 'Write an opinion essay',
    type: 'WRITTEN_RESPONSE',
    group: 'none',
    media: 'none',
  },
];

export function findPartRule(skill: Skill, part: number): PartRule | undefined {
  return PART_RULES.find((rule) => rule.skill === skill && rule.part === part);
}

export function partsOfSkill(skill: Skill): PartRule[] {
  return PART_RULES.filter((rule) => rule.skill === skill);
}

export const SKILLS: readonly Skill[] = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];

interface SkillMeta {
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Pill nhỏ: nền nhạt + chữ đậm theo màu kỹ năng */
  pill: string;
  /** Chấm màu, ô icon */
  dot: string;
  tile: string;
}

export const SKILL_META: Record<Skill, SkillMeta> = {
  LISTENING: {
    label: 'Listening',
    subtitle: 'Nghe hiểu',
    icon: Headphones,
    pill: 'bg-skill-listening/12 text-emerald-700',
    dot: 'bg-skill-listening',
    tile: 'bg-skill-listening/12 text-emerald-700',
  },
  READING: {
    label: 'Reading',
    subtitle: 'Đọc hiểu',
    icon: BookOpen,
    pill: 'bg-skill-reading/12 text-brand',
    dot: 'bg-skill-reading',
    tile: 'bg-skill-reading/12 text-brand',
  },
  SPEAKING: {
    label: 'Speaking',
    subtitle: 'Nói',
    icon: Mic,
    pill: 'bg-skill-speaking/12 text-violet-700',
    dot: 'bg-skill-speaking',
    tile: 'bg-skill-speaking/12 text-violet-700',
  },
  WRITING: {
    label: 'Writing',
    subtitle: 'Viết',
    icon: PenLine,
    pill: 'bg-skill-writing/15 text-amber-700',
    dot: 'bg-skill-writing',
    tile: 'bg-skill-writing/15 text-amber-700',
  },
};

export const DIFFICULTY_META: Record<Difficulty, { label: string; pill: string }> = {
  EASY: { label: 'Dễ', pill: 'bg-emerald-50 text-emerald-700' },
  MEDIUM: { label: 'Trung bình', pill: 'bg-amber-50 text-amber-700' },
  HARD: { label: 'Khó', pill: 'bg-rose-50 text-rose-700' },
};

export const STATUS_META: Record<QuestionStatus, { label: string; pill: string }> = {
  DRAFT: { label: 'Nháp', pill: 'bg-slate-100 text-slate-600' },
  ACTIVE: { label: 'Đang dùng', pill: 'bg-emerald-50 text-emerald-700' },
  INACTIVE: {
    label: 'Ngừng dùng',
    pill: 'bg-slate-100 text-slate-500 line-through decoration-slate-400/60',
  },
};

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

/** "Part 5 · Incomplete Sentences" */
export function partLabel(rule: Pick<PartRule, 'part' | 'name'>): string {
  return `Part ${rule.part} · ${rule.name}`;
}
