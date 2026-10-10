import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema.js';
import { SaveObjectOptions, StorageService, StoredObject } from './storage.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { Readable } from 'node:stream';
// Chỉ dùng các lệnh S3 chuẩn → chạy được với RustFS, MinIO, Cloudflare R2, AWS S3
@Injectable()
export class S3StorageService
  extends StorageService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      // RustFS/MinIO cần URL dạng endpoint/bucket/key; AWS S3 dùng bucket.endpoint/key (false)
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  /**
   * Tạo bucket nếu chưa có. Lỗi thì chỉ cảnh báo, không làm sập app: trên R2/AWS bucket thường
   * tạo tay và key của app không có quyền tạo bucket; RustFS chưa bật thì chỉ phần upload lỗi.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Đã kết nối kho tệp, bucket "${this.bucket}"`);
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NotFound') {
        await this.createBucket();
        return;
      }
      this.logger.warn(`Chưa kết nối được kho tệp: ${this.describe(error)}`);
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  async save(key: string, body: Buffer, options: SaveObjectOptions): Promise<void> {
    await this.run('save', key, () =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: options.contentType,
          CacheControl: options.cacheControl,
        }),
      ),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      // Trên Node, SDK trả Body là IncomingMessage (một Readable)
      if (!(object.Body instanceof Readable)) throw new Error('Body không phải Readable');
      return {
        body: object.Body,
        contentType: object.ContentType,
        contentLength: object.ContentLength,
      };
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NoSuchKey') return null;
      this.logger.error(`Lỗi đọc tệp ${key}: ${this.describe(error)}`);
      throw new AppException(ErrorCode.STORAGE_UNAVAILABLE);
    }
  }

  async delete(key: string): Promise<void> {
    await this.run('delete', key, () =>
      this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      ),
    );
  }

  private async createBucket(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Đã tạo bucket "${this.bucket}"`);
    } catch (error) {
      this.logger.warn(`Không tạo được bucket "${this.bucket}": ${this.describe(error)}`);
    }
  }

  // Mọi lỗi kho tệp (mất kết nối, sai key...) trả 503 cho client, chi tiết chỉ ghi log
  private async run(action: string, key: string, command: () => Promise<unknown>): Promise<void> {
    try {
      await command();
    } catch (error) {
      this.logger.error(`Lỗi ${action} tệp ${key}: ${this.describe(error)}`);
      throw new AppException(ErrorCode.STORAGE_UNAVAILABLE);
    }
  }

  // Chỉ log tên và message: object lỗi của SDK chứa cả cấu hình request
  private describe(error: unknown): string {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}
