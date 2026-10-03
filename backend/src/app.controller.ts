import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AppService, DatabaseCheckResult } from './app.service.js';
import { IsPublic } from './common/decorators/public.decorator.js';

// Route kiểm tra hệ thống, FE không dùng nên không đưa vào tài liệu API
@ApiExcludeController()
@IsPublic()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('db-check')
  checkDatabase(): Promise<DatabaseCheckResult> {
    return this.appService.checkDatabase();
  }
}
