import { FileClock, ShieldCheck, UserCheck } from 'lucide-react';
import { Section, SectionHeading } from './Section';

// Theo chính sách dữ liệu của hệ thống (kế hoạch D14, D19): ẩn danh trước khi gửi AI,
// đồng ý riêng trước khi ghi âm, tệp ghi âm tự xóa sau số ngày cấu hình (mặc định 30)
const ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Ẩn danh trước khi gửi AI',
    description:
      'Tên, email và mã tài khoản được loại bỏ trước khi bài làm được gửi tới AI chấm điểm.',
  },
  {
    icon: FileClock,
    title: 'Ghi âm tự xóa sau 30 ngày',
    description: 'Bài nói Speaking chỉ dùng để chấm điểm và tự động xóa khỏi hệ thống sau 30 ngày.',
  },
  {
    icon: UserCheck,
    title: 'Bạn toàn quyền quyết định',
    description: 'Hệ thống chỉ ghi âm khi bạn đồng ý riêng trước bài Speaking đầu tiên.',
  },
];

export function DataSafetySection() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Bảo mật"
        title="Dữ liệu của bạn được bảo vệ"
        description="Cam kết minh bạch về cách hệ thống xử lý dữ liệu cá nhân và bài làm của bạn."
      />

      <ul className="mt-12 grid gap-5 rounded-3xl bg-accent p-5 sm:p-8 md:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="rounded-[20px] border border-border bg-white p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
