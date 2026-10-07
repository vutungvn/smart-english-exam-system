import { BookOpen, Headphones, Mic, PenLine } from 'lucide-react';
import type { SkillKey } from './mock-data';

interface SkillMeta {
  label: string;
  icon: typeof Headphones;
  bar: string; // màu thanh tiến độ
  soft: string; // nền nhạt cho ô icon
  iconColor: string;
  aiScored: boolean; // Speaking/Writing do AI chấm, là điểm ước lượng (D19)
}

// Màu nhận diện 4 kỹ năng lấy từ token skill-* trong index.css
export const SKILL_META: Record<SkillKey, SkillMeta> = {
  LISTENING: {
    label: 'Listening',
    icon: Headphones,
    bar: 'bg-skill-listening',
    soft: 'bg-skill-listening/12',
    iconColor: 'text-skill-listening',
    aiScored: false,
  },
  READING: {
    label: 'Reading',
    icon: BookOpen,
    bar: 'bg-skill-reading',
    soft: 'bg-skill-reading/12',
    iconColor: 'text-skill-reading',
    aiScored: false,
  },
  SPEAKING: {
    label: 'Speaking',
    icon: Mic,
    bar: 'bg-skill-speaking',
    soft: 'bg-skill-speaking/12',
    iconColor: 'text-skill-speaking',
    aiScored: true,
  },
  WRITING: {
    label: 'Writing',
    icon: PenLine,
    bar: 'bg-skill-writing',
    soft: 'bg-skill-writing/15',
    iconColor: 'text-amber-500',
    aiScored: true,
  },
};
