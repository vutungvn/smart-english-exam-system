import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResult } from './auth.types.js';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @IsPublic()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu (dùng chung cho mọi vai trò)' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResult> {
    return this.authService.login(dto, { ipAddress: req.ip, userAgent: req.get('user-agent') });
  }
}
