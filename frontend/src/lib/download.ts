/** Lấy tên tệp trong header Content-Disposition: attachment; filename="abc.zip" */
function fileNameOf(response: Response, fallback: string): string {
  const header = response.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Cho trình duyệt lưu một Blob thành tệp */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Thu hồi URL sau khi trình duyệt đọc xong tệp (thu hồi ngay thì có trình duyệt lưu ra tệp rỗng)
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * responseHandler cho fetchBaseQuery của route trả tệp: thành công thì lưu tệp và trả null
 * (không đưa Blob vào Redux store vì Blob không serialize được); lỗi thì đọc JSON như mọi
 * route khác để toApiError() dùng được.
 */
export function downloadResponse(fallbackName: string) {
  return async (response: Response): Promise<unknown> => {
    if (!response.ok) return response.json();
    saveBlob(await response.blob(), fileNameOf(response, fallbackName));
    return null;
  };
}
