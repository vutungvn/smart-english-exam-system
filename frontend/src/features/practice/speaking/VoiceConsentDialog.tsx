import { useState } from 'react';
import { Loader2, Mic } from 'lucide-react';
import { toApiError } from '@/api/errors';
import { useGiveVoiceConsentMutation } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';

interface VoiceConsentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Đồng ý xong (đã lưu trên server) */
  onAgreed: () => void;
}

/**
 * Đồng ý xử lý giọng nói trước lần làm Speaking đầu tiên (D19): giọng nói là dữ liệu cá nhân nên
 * phải nói rõ ghi âm dùng vào việc gì, lưu bao lâu, gửi đi đâu
 */
export function VoiceConsentDialog({ open, onClose, onAgreed }: VoiceConsentDialogProps) {
  const [giveConsent, { isLoading }] = useGiveVoiceConsentMutation();
  const [error, setError] = useState<string>();

  const agree = async () => {
    setError(undefined);
    try {
      await giveConsent().unwrap();
      onAgreed();
    } catch (cause) {
      setError(toApiError(cause).message);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(value) => !value && onClose()}
      busy={isLoading}
      title="Đồng ý ghi âm giọng nói"
      description="Phần Speaking cần ghi âm câu trả lời của bạn."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onClose}
            className="h-10 rounded-xl px-4"
          >
            Để sau
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => void agree()}
            className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-5 font-semibold"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Mic />}
            Đồng ý và bắt đầu
          </Button>
        </>
      }
    >
      {error && <FormAlert message={error} onClose={() => setError(undefined)} />}
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Hệ thống dùng micro để ghi âm câu trả lời của bạn trong phần Speaking.</li>
        <li>
          Bài nói được AI chấm theo tiêu chí TOEIC. Dữ liệu gửi AI không kèm tên, email hay mã tài
          khoản của bạn.
        </li>
        <li>Bản ghi âm được lưu tối đa 30 ngày để bạn nghe lại, sau đó tự động xóa.</li>
        <li>Bạn chỉ cần đồng ý một lần; trình duyệt sẽ hỏi quyền dùng micro khi bắt đầu.</li>
      </ul>
    </AppDialog>
  );
}
