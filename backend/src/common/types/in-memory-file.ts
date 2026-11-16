/**
 * Tệp do FileInterceptor (multer, lưu trong bộ nhớ) đưa vào @UploadedFile().
 * Chỉ khai báo các trường dùng tới, khỏi cài @types/multer và khai báo kiểu global Express.Multer.
 */
export interface InMemoryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
