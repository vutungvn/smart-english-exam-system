import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { finalize, type Observable } from 'rxjs';
import { PaperCacheService } from './paper-cache.service.js';

/** Route của giáo viên, quản trị: nơi duy nhất sửa được câu hỏi, nhóm câu, media, đề */
const STAFF_PATH = /^\/api\/v\d+\/(teacher|admin)\//;

/**
 * Thao tác ghi của giáo viên, quản trị (sửa câu, nhóm, media, nhập tệp, xuất bản/gỡ đề...) xóa
 * cache đề sau khi chạy xong, kể cả khi lỗi giữa chừng. Gắn một chỗ thay vì nhớ gọi xóa ở từng
 * service; xóa thừa chỉ tốn một lần đọc lại đề.
 */
@Injectable()
export class PaperCacheInterceptor implements NestInterceptor {
  constructor(private readonly papers: PaperCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'GET' || !STAFF_PATH.test(request.path)) return next.handle();
    return next.handle().pipe(finalize(() => this.papers.clear()));
  }
}
