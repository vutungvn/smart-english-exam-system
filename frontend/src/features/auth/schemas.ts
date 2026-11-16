import z from 'zod';
import { STRONG_PASSWORD_REGEX } from './password-rules';

const emailField = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .max(255, 'Email tối đa 255 ký tự')
  .pipe(z.email('Email không hợp lệ'));

const newPasswordField = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu')
  .regex(STRONG_PASSWORD_REGEX, 'Mật khẩu chưa đáp ứng đủ các điều kiện');

const confirmPasswordField = z.string().min(1, 'Vui lòng nhập lại mật khẩu');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(72, 'Mật khẩu tối đa 72 ký tự'),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập họ và tên')
      .min(2, 'Họ tên dài từ 2 đến 100 ký tự')
      .max(100, 'Họ tên dài từ 2 đến 100 ký tự'),
    email: emailField,
    password: newPasswordField,
    confirmPassword: confirmPasswordField,
    acceptTerms: z
      .boolean()
      .refine((v) => v, 'Bạn cần đồng ý Điều khoản sử dụng và Chính sách xử lý dữ liệu cá nhân'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Xác nhận mật khẩu không khớp',
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Xác nhận mật khẩu không khớp',
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
