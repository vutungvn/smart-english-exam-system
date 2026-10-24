import { Lock } from 'lucide-react';
import type { ContentLock } from '@/api/generated';

interface ContentLockNoticeProps {
  lock: ContentLock;
  /** Nhóm câu chỉ khóa đoạn văn, âm thanh, hình ảnh */
  target: 'question' | 'group';
  /** Nhóm Listening: lời thoại chỉ hiện ở màn xem lại nên vẫn sửa được */
  transcript?: boolean;
}

/** Câu, nhóm đang được làm bài (D29): giải thích vì sao một số ô bị khóa và cách sửa */
export function ContentLockNotice({ lock, target, transcript = false }: ContentLockNoticeProps) {
  const editable =
    target === 'question'
      ? 'giải thích, câu trả lời mẫu, chủ đề, độ khó, trạng thái'
      : `${transcript ? 'lời thoại, ' : ''}chủ đề, trạng thái`;
  const exams = lock.exams.map((exam) => `«${exam.title}»`).join(', ');
  const noun = target === 'question' ? 'Câu hỏi' : 'Nhóm câu';
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">
          {lock.reason === 'PUBLISHED_EXAM'
            ? `${noun} đang nằm trong đề đã xuất bản ${exams}.`
            : `Đang có học viên làm đề ${exams} có ${target === 'question' ? 'câu' : 'nhóm'} này.`}
        </p>
        <p>
          Để bài làm của học viên không bị đổi giữa chừng, chỉ sửa được {editable}; các ô mờ bị
          khóa.
        </p>
        <p className="text-amber-800">
          {lock.reason === 'PUBLISHED_EXAM'
            ? 'Muốn sửa nội dung: gỡ xuất bản đề, chờ các bài đang làm nộp xong rồi sửa.'
            : 'Các bài này tự nộp khi hết giờ; sau đó sửa được bình thường.'}
        </p>
      </div>
    </div>
  );
}
