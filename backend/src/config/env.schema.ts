import { z } from 'zod';

// Chỉ khai báo biến đang dùng; thêm biến mới thì cập nhật cả .env.example
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
    JWT_ACCESS_SECRET: z.string().min(32, 'Secret JWT phải dài ít nhất 32 ký tự'),
    // Thời hạn access token, đơn vị giây (15 phút)
    JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_SECRET: z.string().min(32, 'Secret JWT phải dài ít nhất 32 ký tự'),
    // Thời hạn refresh token, đơn vị giây (7 ngày)
    JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604_800),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau',
    path: ['JWT_REFRESH_SECRET'],
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Biến môi trường không hợp lệ:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
