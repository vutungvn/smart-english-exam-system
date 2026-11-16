import { useEffect, useState } from 'react';
import type { ImportPreview, ImportResult } from '@/api/generated';
import { PageHeader } from '@/components/PageHeader';
import { QUESTION_LIST_PATH } from '@/features/question-bank/paths';
import { ImportStepper } from '../components/ImportStepper';
import { PreviewStep } from '../components/PreviewStep';
import { ResultStep } from '../components/ResultStep';
import { UploadStep } from '../components/UploadStep';

type ImportState =
  | { step: 'upload'; notice?: string; key: number }
  | { step: 'preview'; preview: ImportPreview }
  | { step: 'done'; result: ImportResult; fileName: string };

const STEP_INDEX = { upload: 0, preview: 1, done: 2 } as const;

/**
 * Nhập câu hỏi từ tệp .zip (SPRINT-45): 1) tải tệp lên, server kiểm tra toàn bộ và trả bản xem
 * trước → 2) xem lỗi theo sheet/dòng/cột, xác nhận → 3) kết quả. Trạng thái chỉ nằm trong trang
 * (token xem trước sống 1 giờ ở server), tải lại trang thì làm lại từ bước 1.
 */
export function QuestionImportPage() {
  const [state, setState] = useState<ImportState>({ step: 'upload', key: 0 });
  // key mới: UploadStep dựng lại, xóa tệp đã chọn và hiện thông báo mới
  const restart = (notice?: string) => setState({ step: 'upload', notice, key: Date.now() });

  // Sang bước mới thì về đầu trang (nút bấm thường nằm cuối trang)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.step]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Ngân hàng câu hỏi', to: QUESTION_LIST_PATH },
          { label: 'Nhập từ tệp' },
        ]}
        title="Nhập câu hỏi từ tệp"
        description="Tải tệp .zip gồm questions.xlsx và thư mục media/, xem trước lỗi rồi xác nhận nhập vào ngân hàng."
      />

      <ImportStepper current={STEP_INDEX[state.step]} />

      {state.step === 'upload' && (
        <UploadStep
          key={state.key}
          notice={state.notice}
          onPreviewed={(preview) => setState({ step: 'preview', preview })}
        />
      )}
      {state.step === 'preview' && (
        <PreviewStep
          key={state.preview.token}
          preview={state.preview}
          onBack={restart}
          onImported={(result) =>
            setState({ step: 'done', result, fileName: state.preview.fileName })
          }
        />
      )}
      {state.step === 'done' && (
        <ResultStep
          result={state.result}
          fileName={state.fileName}
          onImportAnother={() => restart()}
        />
      )}
    </div>
  );
}
