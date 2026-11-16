import { Global, Module } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service.js';
import { StorageService } from './storage.service.js';

// Inject StorageService (abstract) ở mọi nơi; đổi cách lưu chỉ cần đổi useClass ở đây
@Global()
@Module({
  providers: [{ provide: StorageService, useClass: S3StorageService }],
  exports: [StorageService],
})
export class StorageModule {}
