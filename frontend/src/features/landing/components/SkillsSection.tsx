import { BookOpen, ChevronRight, Headphones, Mic, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Section, SectionHeading } from './Section';

// Cấu trúc đề TOEIC: LR 7 Part (thang 5–495 mỗi kỹ năng), Speaking 11 câu, Writing 8 câu (0–200).
// `text`: màu chữ đậm hơn màu nhận diện để đủ tương phản trên nền nhạt
const SKILLS = [
  {
    icon: Headphones,
    name: 'Listening',
    scale: '5–495',
    description: 'Part 1–4: mô tả tranh, hỏi đáp, hội thoại và bài nói. Xem lại kèm lời thoại.',
    count: '100 câu hỏi',
    border: 'border-l-skill-listening',
    soft: 'bg-skill-listening/12',
    iconColor: 'text-skill-listening',
    text: 'text-emerald-700',
  },
  {
    icon: BookOpen,
    name: 'Reading',
    scale: '5–495',
    description: 'Part 5–7: hoàn thành câu, hoàn thành đoạn văn, đọc hiểu đơn và đa văn bản.',
    count: '100 câu hỏi',
    border: 'border-l-skill-reading',
    soft: 'bg-skill-reading/12',
    iconColor: 'text-skill-reading',
    text: 'text-brand',
  },
  {
    icon: Mic,
    name: 'Speaking',
    scale: '0–200',
    description: 'Ghi âm ngay trên trình duyệt, có thời gian chuẩn bị và trả lời như thi thật.',
    count: '11 câu hỏi',
    border: 'border-l-skill-speaking',
    soft: 'bg-skill-speaking/12',
    iconColor: 'text-skill-speaking',
    text: 'text-violet-700',
  },
  {
    icon: PenLine,
    name: 'Writing',
    scale: '0–200',
    description: 'Từ viết câu theo tranh, trả lời email đến bài luận nêu quan điểm.',
    count: '8 câu hỏi',
    border: 'border-l-skill-writing',
    soft: 'bg-skill-writing/15',
    iconColor: 'text-amber-500',
    text: 'text-amber-700',
  },
];

export function SkillsSection() {
  return (
    <Section id="ky-nang" className="bg-white">
      <SectionHeading
        eyebrow="4 kỹ năng"
        title="Luyện đủ 4 kỹ năng theo cấu trúc đề TOEIC"
        description="Bao quát trọn vẹn từ nghe, đọc trắc nghiệm đến nói và viết tự luận."
      />

      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <li
              key={skill.name}
              className={cn(
                'flex flex-col rounded-[20px] border border-l-4 border-border bg-background p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/5',
                skill.border,
              )}
            >
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-[14px]',
                  skill.soft,
                  skill.iconColor,
                )}
              >
                <Icon className="size-6" />
              </span>
              <span
                className={cn(
                  'mt-5 w-fit rounded-full px-2.5 py-1 text-xs font-semibold',
                  skill.soft,
                  skill.text,
                )}
              >
                Thang điểm {skill.scale}
              </span>
              <h3 className="mt-3 text-lg font-bold text-foreground">{skill.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {skill.description}
              </p>
              <p className={cn('mt-5 flex items-center gap-1 text-sm font-semibold', skill.text)}>
                {skill.count}
                <ChevronRight className="size-4" />
              </p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
