// D3: email luôn ở dạng chữ thường, chuẩn hóa ở Service trước khi đọc/ghi DB
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
