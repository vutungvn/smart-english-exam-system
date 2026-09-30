import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthSession, RequestMeta } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Auth')
@IsPublic()
@Controller('auth')
export class AuthController {
  private readonly refreshCookieOptions: CookieOptions;
  private readonly refreshCookieMaxAge: number;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.refreshCookieOptions = {
      httpOnly: true, // JavaScript phía trình duyệt không đọc được, chống XSS lấy token
      sameSite: 'strict', // không gửi kèm request từ trang khác, chống CSRF
      path: REFRESH_COOKIE_PATH, // chỉ gửi kèm các route /api/v1/auth/*
      // Dev chạy http nên chỉ bật Secure ở production
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
    };
    this.refreshCookieMaxAge = config.get('JWT_REFRESH_TTL', { infer: true }) * 1000;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu (dùng chung cho mọi vai trò)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    const { refreshToken, ...session } = await this.authService.login(dto, this.requestMeta(req));
    this.setRefreshCookie(res, refreshToken);
    return session;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: 'Cấp lại access token, xoay vòng refresh token trong cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    try {
      const { refreshToken, ...session } = await this.authService.refresh(
        this.readRefreshCookie(req),
      );
      this.setRefreshCookie(res, refreshToken);
      return session;
    } catch (error) {
      // Phiên không cứu được nữa: xóa cookie để trình duyệt thôi gửi token hỏng.
      // Lỗi khác (Redis/DB tạm lỗi) thì giữ cookie để người dùng thử lại.
      if (error instanceof AppException && error.code === ErrorCode.AUTH_REFRESH_TOKEN_INVALID) {
        this.clearRefreshCookie(res);
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: 'Đăng xuất, thu hồi refresh token của phiên hiện tại' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(res);
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.refreshCookieOptions,
      maxAge: this.refreshCookieMaxAge,
    });
  }

  // Phải truyền cùng path, sameSite... như lúc đặt thì trình duyệt mới xóa đúng cookie
  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, this.refreshCookieOptions);
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[REFRESH_COOKIE_NAME];
  }

  private requestMeta(req: Request): RequestMeta {
    return { ipAddress: req.ip, userAgent: req.get('user-agent') };
  }
}
