import * as z from 'zod';
import { STRONG_PASSWORD_REGEX } from '@/features/auth/password-rules';

// Luật khớp DTO ở backend/src/modules/me/dto; server vẫn kiểm tra lại

export const personalInfoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập họ và tên')
    .min(2, 'Họ tên dài từ 2 đến 100 ký tự')
    .max(100, 'Họ tên dài từ 2 đến 100 ký tự'),
});

// Điểm TOEIC Listening + Reading mục tiêu: 10–990, bước 5 điểm
export const TARGET_SCORE_MIN = 10;
export const TARGET_SCORE_MAX = 990;
export const TARGET_SCORE_STEP = 5;

export const targetScoreSchema = z.object({
  targetScore: z
    .number({ error: 'Vui lòng nhập điểm mục tiêu' })
    .int('Điểm mục tiêu phải là số nguyên')
    .min(TARGET_SCORE_MIN, `Điểm mục tiêu tối thiểu là ${TARGET_SCORE_MIN}`)
    .max(TARGET_SCORE_MAX, `Điểm mục tiêu tối đa là ${TARGET_SCORE_MAX}`)
    .multipleOf(TARGET_SCORE_STEP, `Điểm mục tiêu phải là bội số của ${TARGET_SCORE_STEP}`),
});

export const changePasswordSchema = z
  .object({
    // Không áp luật mật khẩu mạnh cho mật khẩu cũ (giống backend)
    currentPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu hiện tại')
      .max(72, 'Mật khẩu tối đa 72 ký tự'),
    newPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu mới')
      .regex(STRONG_PASSWORD_REGEX, 'Mật khẩu chưa đáp ứng đủ các điều kiện'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Xác nhận mật khẩu không khớp',
  })
  .refine((data) => !data.currentPassword || data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    error: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  });

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type TargetScoreValues = z.infer<typeof targetScoreSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
