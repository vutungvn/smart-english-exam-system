import { Readable } from 'node:stream';

export interface SaveObjectOptions {
  contentType: string;
  /** Header Cache-Control lưu kèm tệp, phát lại khi tải về */
  cacheControl?: string;
}

export interface StoredObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

/**
 * Kho tệp dùng chung (D10, D21). Nghiệp vụ chỉ biết interface này, không biết tệp nằm ở đâu:
 * hiện là RustFS qua giao thức S3, sau này đổi sang R2/AWS S3 chỉ cần đổi biến môi trường.
 * Dùng abstract class (không dùng interface) để làm token inject được trong Nest.
 */
export abstract class StorageService {
  /** Ghi đè nếu key đã tồn tại */
  abstract save(key: string, body: Buffer, options: SaveObjectOptions): Promise<void>;

  /** null khi key không tồn tại */
  abstract get(key: string): Promise<StoredObject | null>;

  /** Key không tồn tại cũng coi là thành công */
  abstract delete(key: string): Promise<void>;
}
