import { fromBufferPromise, type Entry, type ZipFile } from 'yauzl';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';

export interface SafeZipLimits {
  maxEntries: number;
  /** Tổng kích thước sau giải nén (khai báo trong .zip) của mọi tệp */
  maxTotalBytes: number;
}

const MB = 1024 * 1024;

export function invalidFile(message: string): AppException {
  return new AppException(ErrorCode.QUESTION_IMPORT_INVALID_FILE, message);
}

function tooLarge(message: string): AppException {
  return new AppException(ErrorCode.PAYLOAD_TOO_LARGE, message);
}

/**
 * Đọc .zip trong bộ nhớ, không ghi ra đĩa nên không có chuyện giải nén đè tệp ngoài thư mục.
 * Chống "bom giải nén": kiểm tra số mục và tổng kích thước khai báo TRƯỚC khi giải nén; khi giải nén
 * yauzl (validateEntrySizes) báo lỗi nếu dữ liệu thật lớn hơn kích thước khai báo, và mỗi lần đọc
 * đều dừng ngay khi vượt giới hạn. Tên tệp tuyệt đối hoặc có "../" bị yauzl từ chối.
 */
export class SafeZip {
  private constructor(
    private readonly zip: ZipFile,
    /** Tên tệp (đã đổi "\" thành "/") → mục trong zip; không gồm thư mục */
    readonly entries: ReadonlyMap<string, Entry>,
  ) {}

  /** label: tên hiển thị trong thông báo lỗi ("Tệp .zip", "Tệp questions.xlsx") */
  static async open(buffer: Buffer, limits: SafeZipLimits, label: string): Promise<SafeZip> {
    let zip: ZipFile;
    try {
      zip = await fromBufferPromise(buffer, {
        lazyEntries: true,
        autoClose: false,
        decodeStrings: true,
        validateEntrySizes: true,
      });
    } catch {
      throw invalidFile(`${label} không phải tệp nén hợp lệ`);
    }

    if (zip.entryCount > limits.maxEntries) {
      throw tooLarge(`${label} có ${zip.entryCount} mục, tối đa ${limits.maxEntries}`);
    }

    const entries = new Map<string, Entry>();
    let total = 0;

    await new Promise<void>((resolve, reject) => {
      zip.on('entry', (entry: Entry) => {
        if (entry.isEncrypted()) {
          reject(invalidFile(`${label} có tệp đặt mật khẩu: ${entry.fileName}`));
          return;
        }
        total += entry.uncompressedSize;
        if (total > limits.maxTotalBytes) {
          reject(tooLarge(`${label} giải nén ra quá ${Math.round(limits.maxTotalBytes / MB)} MB`));
          return;
        }
        if (!entry.fileName.endsWith('/')) {
          if (entries.has(entry.fileName)) {
            reject(invalidFile(`${label} có hai tệp trùng tên: ${entry.fileName}`));
            return;
          }
          entries.set(entry.fileName, entry);
        }
        zip.readEntry();
      });
      zip.on('end', () => resolve());
      zip.on('error', (error: Error) => {
        // yauzl báo "absolute path…", "invalid relative path…" với tên tệp có ../ hoặc bắt đầu bằng /
        reject(
          invalidFile(
            /path/i.test(error.message)
              ? `${label} có tệp mang đường dẫn không hợp lệ (tuyệt đối hoặc chứa ../)`
              : `${label} bị hỏng, không đọc được`,
          ),
        );
      });
      zip.readEntry();
    });

    return new SafeZip(zip, entries);
  }

  /** Giải nén cả tệp, dừng ngay khi vượt maxBytes */
  async read(name: string, maxBytes: number): Promise<Buffer> {
    const entry = this.require(name);
    if (entry.uncompressedSize > maxBytes) {
      throw tooLarge(`Tệp ${name} lớn hơn ${Math.round(maxBytes / MB)} MB`);
    }
    return this.collect(entry, maxBytes, false);
  }

  /** Chỉ giải nén phần đầu tệp (đủ để nhận dạng định dạng theo nội dung) */
  async readHead(name: string, bytes: number): Promise<Buffer> {
    return this.collect(this.require(name), bytes, true);
  }

  private require(name: string): Entry {
    const entry = this.entries.get(name);
    if (!entry) throw invalidFile(`Không tìm thấy ${name} trong tệp nén`);
    return entry;
  }

  private async collect(entry: Entry, maxBytes: number, truncate: boolean): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      const stream = await this.zip.openReadStreamPromise(entry);
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        chunks.push(chunk);
        size += chunk.length;
        if (size >= maxBytes) {
          // Thoát vòng for await thì luồng tự hủy, phần còn lại không bị giải nén
          if (truncate) break;
          if (size > maxBytes) throw tooLarge(`Tệp ${entry.fileName} vượt giới hạn dung lượng`);
        }
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      // Kích thước thật khác kích thước khai báo, dữ liệu nén hỏng...
      throw invalidFile(`Không giải nén được ${entry.fileName}`);
    }
    const buffer = Buffer.concat(chunks, size);
    return truncate ? buffer.subarray(0, maxBytes) : buffer;
  }
}
