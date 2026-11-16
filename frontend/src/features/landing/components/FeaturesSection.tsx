import { Bot, ChartColumn, Layers, Mic, Sparkles, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Section, SectionHeading } from './Section';

const FEATURES = [
  {
    icon: Timer,
    title: 'Thi thử như thật',
    description:
      'Đồng hồ tính giờ như phòng thi, tự nộp khi hết giờ, lưu bài liên tục để không mất kết quả.',
    tone: 'bg-accent text-primary',
  },
  {
    icon: Mic,
    title: 'AI chấm Speaking & Writing',
    description: 'Điểm theo từng tiêu chí, kèm nhận xét chi tiết và câu trả lời mẫu để tham khảo.',
    tone: 'bg-skill-speaking/12 text-skill-speaking',
  },
  {
    icon: ChartColumn,
    title: 'Phân tích năng lực',
    description: 'Biểu đồ trực quan chỉ ra Part và dạng câu hỏi bạn hay sai nhất.',
    tone: 'bg-skill-listening/12 text-skill-listening',
  },
  {
    icon: Sparkles,
    title: 'Gợi ý bài luyện',
    description: 'Bộ câu hỏi riêng nhắm đúng vào những điểm yếu mà AI phát hiện.',
    tone: 'bg-accent text-primary',
  },
  {
    icon: Bot,
    title: 'Trợ giảng AI 24/7',
    description: 'Hỏi giải thích đáp án, ngữ pháp, nghĩa từ vựng bất cứ lúc nào.',
    tone: 'bg-skill-speaking/12 text-skill-speaking',
  },
  {
    icon: Layers,
    title: 'Flashcard từ vựng',
    description: 'Ôn từ trọng tâm theo lịch nhắc lại ngắt quãng, nhớ lâu hơn.',
    tone: 'bg-skill-listening/12 text-skill-listening',
  },
];

export function FeaturesSection() {
  return (
    <Section id="tinh-nang">
      <SectionHeading
        eyebrow="Tính năng"
        title="Mọi thứ bạn cần để luyện thi hiệu quả"
        description="Công nghệ hỗ trợ trọn vẹn từng bước trên hành trình chạm tới mục tiêu điểm số."
      />

      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description, tone }) => (
          <li
            key={title}
            className="rounded-[20px] border border-border bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#c5d0fa] hover:shadow-xl hover:shadow-primary/10"
          >
            <span className={cn('flex size-12 items-center justify-center rounded-[14px]', tone)}>
              <Icon className="size-6" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
