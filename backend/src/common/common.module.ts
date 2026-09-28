import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';
import { createValidationPipe } from './pipes/validation.pipe.js';

// Đăng ký qua DI thay vì app.useGlobalXxx() để test dựng từ module cũng có đủ
@Module({
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class CommonModule {}
