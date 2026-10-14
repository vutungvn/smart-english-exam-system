import { useState } from 'react';
import { enhancedApi } from '@/api/enhance';
import { toApiError } from '@/api/errors';
import { useAppDispatch } from '@/hooks/hooks';

type DownloadKind = 'template' | 'issues';

/**
 * Tải tệp mẫu / tệp lỗi khi bấm nút. Gọi endpoint bằng initiate(..., { subscribe: false,
 * forceRefetch: true }): lần nào bấm cũng gọi lại server, kết quả không nằm lại trong cache.
 */
export function useFileDownload() {
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState<DownloadKind | null>(null);
  const [error, setError] = useState<string>();

  const run = async (kind: DownloadKind, action: () => Promise<unknown>) => {
    setPending(kind);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      setError(toApiError(cause).message);
    } finally {
      setPending(null);
    }
  };

  const { getQuestionImportTemplate, getQuestionImportErrors } = enhancedApi.endpoints;
  const options = { subscribe: false, forceRefetch: true } as const;

  return {
    pending,
    error,
    clearError: () => setError(undefined),
    downloadTemplate: () =>
      run('template', () =>
        dispatch(getQuestionImportTemplate.initiate(undefined, options)).unwrap(),
      ),
    downloadIssues: (token: string) =>
      run('issues', () => dispatch(getQuestionImportErrors.initiate(token, options)).unwrap()),
  };
}
