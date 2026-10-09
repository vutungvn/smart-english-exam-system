import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { IsPublic } from '../../common/decorators/public.decorator.js';
import { ApiEnvelope, ApiNullEnvelope } from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { ApiErrorSpec } from '../../common/swagger/api-errors.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import {
  AUTH_THROTTLE,
  GOOGLE_COOKIE_PATH,
  GOOGLE_COOKIE_TTL_SECONDS,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { AuthSession, RegisterResult } from './auth.types.js';
import type { RequestMeta } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { ResetPasswordDto, ResetPasswordTokenDto } from './dto/reset-password.dto.js';
import { GoogleOAuthService } from './google-oauth.service.js';

// Gửi mail (gửi lại xác minh, quên mật khẩu): 429 do giới hạn theo IP hoặc theo email
const EMAIL_REQUEST_ERRORS: ApiErrorSpec[] = [
  ErrorCode.TOO_MANY_REQUESTS,
  {
    code: ErrorCode.TOO_MANY_REQUESTS,
    message: 'Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau 15 phút',
  },
];

@ApiTags('Auth')
@IsPublic()
// Giới hạn theo IP cho mọi route auth (mức default); route nhạy cảm ghi đè bằng @Throttle
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly refreshCookieOptions: CookieOptions;
  private readonly refreshCookieMaxAge: number;
  private readonly googleCookieOptions: CookieOptions;
  private readonly appUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuth: GoogleOAuthService,
    config: ConfigService<Env, true>,
  ) {
    const secure = config.get('NODE_ENV', { infer: true }) === 'production';

    this.refreshCookieOptions = {
      httpOnly: true, // JavaScript phía trình duyệt không đọc được, chống XSS lấy token
      sameSite: 'strict', // không gửi kèm request từ trang khác, chống CSRF
      path: REFRESH_COOKIE_PATH, // chỉ gửi kèm các route /api/v1/auth/*
      // Dev chạy http nên chỉ bật Secure ở production
      secure,
    };
    this.refreshCookieMaxAge = config.get('JWT_REFRESH_TTL', { infer: true }) * 1000;

    this.googleCookieOptions = {
      httpOnly: true,
      // Callback là điều hướng từ accounts.google.com sang: cookie Strict sẽ KHÔNG được gửi kèm,
      // Lax thì được (chỉ với điều hướng GET cấp cao nhất)
      sameSite: 'lax',
      path: GOOGLE_COOKIE_PATH,
      secure,
    };

    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  @Post('register')
  @Throttle({ default: AUTH_THROTTLE.sensitive })
  @ApiOperation({ summary: 'Đăng ký tài khoản học viên và gửi email xác minh' })
  @ApiEnvelope(RegisterResult, { status: HttpStatus.CREATED })
  @ApiErrors(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS, ErrorCode.TOO_MANY_REQUESTS)
  register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác minh email bằng token trong liên kết, kích hoạt tài khoản' })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.AUTH_TOKEN_INVALID, ErrorCode.TOO_MANY_REQUESTS)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @Throttle({ default: AUTH_THROTTLE.sensitive })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi lại email xác minh',
    description: 'Luôn trả thành công để không lộ email nào đã đăng ký; tối đa 3 lần mỗi 15 phút.',
  })
  @ApiNullEnvelope()
  @ApiErrors(...EMAIL_REQUEST_ERRORS)
  resendVerification(@Body() dto: EmailDto): Promise<void> {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @Throttle({ default: AUTH_THROTTLE.sensitive })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu đặt lại mật khẩu, gửi liên kết qua email',
    description: 'Luôn trả thành công để không lộ email nào đã đăng ký; tối đa 3 lần mỗi 15 phút.',
  })
  @ApiNullEnvelope()
  @ApiErrors(...EMAIL_REQUEST_ERRORS)
  forgotPassword(@Body() dto: EmailDto): Promise<void> {
    return this.authService.forgotPassword(dto.email);
  }

  @Get('reset-password/validate')
  @ApiOperation({ summary: 'Kiểm tra liên kết đặt lại mật khẩu còn hiệu lực (không hủy token)' })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.AUTH_TOKEN_INVALID, ErrorCode.TOO_MANY_REQUESTS)
  validateResetToken(@Query() dto: ResetPasswordTokenDto): Promise<void> {
    return this.authService.validateResetToken(dto.token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt mật khẩu mới bằng token, đăng xuất mọi thiết bị' })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.AUTH_TOKEN_INVALID, ErrorCode.TOO_MANY_REQUESTS)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @Throttle({ default: AUTH_THROTTLE.login })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu (dùng chung cho mọi vai trò)' })
  @ApiEnvelope(AuthSession)
  @ApiErrors(
    ErrorCode.AUTH_INVALID_CREDENTIALS,
    ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
    ErrorCode.AUTH_ACCOUNT_PENDING_APPROVAL,
    ErrorCode.AUTH_ACCOUNT_LOCKED,
    {
      code: ErrorCode.AUTH_TOO_MANY_LOGIN_ATTEMPTS,
      details: { retryAfterSeconds: 900 },
    },
    ErrorCode.TOO_MANY_REQUESTS,
  )
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
  @ApiEnvelope(AuthSession)
  @ApiErrors(ErrorCode.AUTH_REFRESH_TOKEN_INVALID, ErrorCode.TOO_MANY_REQUESTS)
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
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.TOO_MANY_REQUESTS)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(res);
  }

  // Hai route Google là điều hướng trình duyệt (302), không gọi bằng fetch nên ẩn khỏi Swagger,
  // tránh codegen sinh hook RTK Query không dùng được
  @Get('google')
  @ApiExcludeEndpoint()
  async googleStart(@Res() res: Response): Promise<void> {
    if (!this.googleOAuth.enabled) {
      return this.redirectToLogin(res, ErrorCode.AUTH_GOOGLE_DISABLED);
    }

    const { url, state, codeVerifier } = await this.googleOAuth.createAuthRequest();
    const options = { ...this.googleCookieOptions, maxAge: GOOGLE_COOKIE_TTL_SECONDS * 1000 };

    res.cookie(GOOGLE_STATE_COOKIE, state, options);
    res.cookie(GOOGLE_VERIFIER_COOKIE, codeVerifier, options);
    res.redirect(url);
  }

  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') googleError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const savedState = cookies?.[GOOGLE_STATE_COOKIE];
    const codeVerifier = cookies?.[GOOGLE_VERIFIER_COOKIE];

    // Dùng một lần: xóa ngay dù thành công hay thất bại
    res.clearCookie(GOOGLE_STATE_COOKIE, this.googleCookieOptions);
    res.clearCookie(GOOGLE_VERIFIER_COOKIE, this.googleCookieOptions);

    // Người dùng bấm Hủy trên trang Google: quay lại trang đăng nhập, không coi là lỗi
    if (googleError === 'access_denied') return res.redirect(`${this.appUrl}/login`);

    try {
      if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
        throw new AppException(ErrorCode.AUTH_GOOGLE_FAILED);
      }

      const profile = await this.googleOAuth.exchangeCode(code, codeVerifier);

      const { refreshToken } = await this.authService.loginWithGoogle(
        profile,
        this.requestMeta(req),
      );

      // Không đưa access token lên URL: FE tải /app, restoreSession() tự gọi /auth/refresh
      this.setRefreshCookie(res, refreshToken);
      res.redirect(`${this.appUrl}/app`);
    } catch (error) {
      if (error instanceof AppException) return this.redirectToLogin(res, error.code);
      // Chỉ log message: object lỗi của gaxios chứa cả client_secret và code_verifier trong config
      this.logger.error(`Google OAuth lỗi: ${error instanceof Error ? error.message : 'unknown'}`);
      this.redirectToLogin(res, ErrorCode.AUTH_GOOGLE_FAILED);
    }
  }

  // Route điều hướng không trả JSON lỗi được: chuyển mã lỗi sang FE qua query
  private redirectToLogin(res: Response, code: ErrorCode): void {
    res.redirect(`${this.appUrl}/login?oauthError=${code}`);
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
