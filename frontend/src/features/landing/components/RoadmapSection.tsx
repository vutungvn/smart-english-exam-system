import { Sparkles, Target, Timer, TrendingUp } from 'lucide-react';
import { BrandPattern } from '@/components/brand/BrandPattern';
import { Section, SectionHeading } from './Section';

const STEPS = [
  {
    title: 'Đặt mục tiêu điểm',
    description: 'Tạo tài khoản miễn phí và chọn mức điểm TOEIC bạn muốn đạt được.',
    meta: 'Mục tiêu 550 – 900+',
    icon: Target,
  },
  {
    title: 'Thi thử đầu vào',
    description: 'Làm đề đúng cấu trúc và thời gian như thi thật để đo trình độ hiện tại.',
    meta: '200 câu LR · 120 phút',
    icon: Timer,
  },
  {
    title: 'Nhận phân tích từ AI',
    description: 'AI chỉ ra Part, dạng câu hỏi và kỹ năng bạn còn yếu cần cải thiện.',
    meta: 'Có ngay sau khi chấm xong',
    icon: Sparkles,
  },
  {
    title: 'Luyện tập mỗi ngày',
    description: 'Luyện theo gợi ý, làm lại đề và xem điểm số tăng dần qua biểu đồ.',
    meta: 'Biểu đồ tiến độ theo tuần',
    icon: TrendingUp,
  },
];

export function RoadmapSection() {
  return (
    <Section
      id="lo-trinh"
      className="relative overflow-hidden bg-linear-to-br from-brand via-primary to-primary-light"
    >
      <BrandPattern />

      <div className="relative">
        <SectionHeading
          inverse
          eyebrow="Lộ trình"
          title="Lộ trình 4 bước đơn giản"
          description="Bắt đầu dễ dàng, tiến bộ rõ ràng mỗi ngày cùng sự đồng hành của AI."
        />

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, description, meta, icon: Icon }, index) => (
            <li
              key={title}
              className="relative flex flex-col rounded-[20px] border border-white/20 bg-white/10 p-6 text-white backdrop-blur-md transition duration-300 hover:bg-white/15"
            >
              {/* Đường nét đứt nối sang bước kế tiếp */}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-12 -right-6 hidden w-6 border-t-2 border-dashed border-white/40 lg:block"
                />
              )}
              <span className="text-5xl leading-none font-extrabold text-white/35">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-blue-100">{description}</p>
              <p className="mt-6 flex items-center gap-2 border-t border-white/15 pt-4 text-xs font-medium text-blue-50">
                <Icon className="size-4 text-highlight" />
                {meta}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
