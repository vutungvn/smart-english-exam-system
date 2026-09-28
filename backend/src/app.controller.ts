import { Controller, Get } from '@nestjs/common';
import { AppService, DatabaseCheckResult } from './app.service.js';

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
