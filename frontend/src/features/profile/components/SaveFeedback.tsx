import { CircleCheck } from 'lucide-react';

// Dòng xác nhận nhỏ cạnh nút Lưu, đọc được bằng trình đọc màn hình (role="status")
export function SaveFeedback({ show, message }: { show: boolean; message: string }) {
  return (
    <p role="status" className="mr-auto flex items-center gap-1.5 text-sm font-medium text-success">
      {show && (
        <>
          <CircleCheck className="size-4" />
          {message}
        </>
      )}
    </p>
  );
}
