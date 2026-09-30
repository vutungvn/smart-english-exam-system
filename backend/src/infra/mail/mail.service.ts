import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { SMTPSentMessageInfo, SMTPTransportOptions, Transporter } from 'nodemailer';
import type { Env } from '../../config/env.schema.js';
import type { MailMessage } from './mail.types.js';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter<SMTPSentMessageInfo, SMTPTransportOptions>;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASS', { infer: true });

    this.transporter = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      // Mailpit không cần đăng nhập nên chỉ gắn auth khi có đủ user và pass
      auth: user && pass ? { user, pass } : undefined,
    });
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  // Kiểm tra đăng nhập SMTP lúc khởi động để phát hiện sớm App Password sai.
  // Chạy nền, không chặn app khởi động; lỗi chỉ ghi cảnh báo.
  onModuleInit(): void {
    this.transporter
      .verify()
      .then(() => this.logger.log('Đã kết nối máy chủ gửi mail (SMTP)'))
      .catch((error: unknown) =>
        this.logger.warn(`Không kết nối được SMTP: ${this.describe(error)}`),
      );
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }

  /**
   * Gửi mail mà không bắt request phải chờ (Gmail mất 1–3 giây mỗi thư).
   * Lỗi chỉ ghi log, người dùng có thể yêu cầu gửi lại. Sau này thay bằng job BullMQ để có retry.
   */
  sendInBackground(message: MailMessage): void {
    this.send(message).catch((error: unknown) => {
      // Không log địa chỉ người nhận và nội dung thư (chứa token)
      this.logger.error(`Gửi mail "${message.subject}" thất bại: ${this.describe(error)}`);
    });
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
