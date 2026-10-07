import { ChevronDown } from 'lucide-react';
import { Section, SectionHeading } from './Section';

const FAQS = [
  {
    question: 'Điểm AI chấm Speaking, Writing có chính xác không?',
    answer:
      'Đây là điểm ước lượng theo tiêu chí chấm của TOEIC để bạn luyện tập, không thay thế điểm thi chính thức. Giáo viên có thể xem lại và chỉnh điểm do AI chấm.',
  },
  {
    question: 'Có mất phí không?',
    answer: 'Không. Học viên đăng ký tài khoản và luyện tập hoàn toàn miễn phí.',
  },
  {
    question: 'Có học được trên điện thoại không?',
    answer:
      'Có. Giao diện dùng được trên điện thoại; riêng bài Speaking và Writing nên làm trên máy tính để ghi âm và gõ phím thuận tiện hơn.',
  },
  {
    question: 'Làm sao để trở thành giáo viên?',
    answer:
      'Đăng ký tài khoản giáo viên kèm minh chứng chuyên môn. Quản trị viên duyệt hồ sơ, sau đó bạn có thể tạo khóa học và đề thi.',
  },
  {
    question: 'Dữ liệu ghi âm được lưu bao lâu?',
    answer:
      'Tệp ghi âm bài Speaking tự xóa sau 30 ngày. Hệ thống chỉ ghi âm khi bạn đã đồng ý riêng trước lần đầu.',
  },
];

// Dùng <details> có sẵn của trình duyệt: mở/đóng bằng bàn phím, không cần thêm thư viện
export function FaqSection() {
  return (
    <Section id="hoi-dap" className="bg-white">
      <SectionHeading eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" />

      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQS.map(({ question, answer }, index) => (
          <details
            key={question}
            open={index === 0}
            className="group rounded-2xl border border-border bg-background transition open:border-primary open:bg-white open:shadow-md open:shadow-primary/5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {question}
              <ChevronDown className="size-5 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 group-open:text-primary" />
            </summary>
            <p className="px-6 pb-5 leading-relaxed text-muted-foreground">{answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
