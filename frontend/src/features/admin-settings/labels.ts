import { BotMessageSquare, Calculator, Mic, type LucideIcon } from 'lucide-react';
import type { ScoringSettingsDto, SettingGroup } from '@/api/generated';

export interface SettingTab {
  value: SettingGroup;
  label: string;
  icon: LucideIcon;
}

export const SETTING_TABS: SettingTab[] = [
  { value: 'scoring', label: 'Quy đổi điểm', icon: Calculator },
  { value: 'ai', label: 'Hạn mức AI', icon: BotMessageSquare },
  { value: 'recording', label: 'Ghi âm Speaking', icon: Mic },
];

export type ScoringSkill = keyof ScoringSettingsDto;

export interface ScoringSkillMeta {
  value: ScoringSkill;
  label: string;
  /** Ý nghĩa cột mốc: LR đếm số câu đúng, SW theo tỉ lệ điểm thô */
  rawLabel: string;
  color: string;
}

export const SCORING_SKILLS: ScoringSkillMeta[] = [
  {
    value: 'listening',
    label: 'Listening',
    rawLabel: 'Số câu đúng',
    color: 'var(--skill-listening)',
  },
  { value: 'reading', label: 'Reading', rawLabel: 'Số câu đúng', color: 'var(--skill-reading)' },
  { value: 'speaking', label: 'Speaking', rawLabel: '% điểm thô', color: 'var(--skill-speaking)' },
  { value: 'writing', label: 'Writing', rawLabel: '% điểm thô', color: 'var(--skill-writing)' },
];

export const rangeHint = ({ min, max }: { min: number; max: number }) =>
  `Từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')}`;
