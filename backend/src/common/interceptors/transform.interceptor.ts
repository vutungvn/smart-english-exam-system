import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator.js';
import { SuccessEnvelope, WithMeta } from '../types/api-response.js';
import { Response } from 'express';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const skip = this.reflector.getAllAndOverride<boolean | undefined>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return next.handle();

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(map((body: unknown) => this.wrap(body, response.statusCode)));
  }

  private wrap(body: unknown, status: number): unknown {
    // Tệp tải xuống gửi nguyên luồng
    if (body instanceof StreamableFile) return body;

    if (body instanceof WithMeta) {
      return {
        success: true,
        status,
        data: body.data,
        meta: body.meta,
      } satisfies SuccessEnvelope<unknown>;
    }

    return { success: true, status, data: body ?? null } satisfies SuccessEnvelope<unknown>;
  }
}
