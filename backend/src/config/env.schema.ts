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

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    // true: mã hóa TLS ngay từ đầu (Gmail cổng 465); false: cổng 587 (STARTTLS)
    SMTP_SECURE: z.stringbool().default(false),
    // Để trống khi SMTP không cần đăng nhập
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().min(1),
    // URL frontend, dùng tạo link trong email
    APP_URL: z.url().default('http://localhost:5173'),
    // Google OAuth: để trống cả hai thì /auth/google báo AUTH_GOOGLE_DISABLED
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.url().default('http://localhost:5173/api/v1/auth/google/callback'),

    // Kho tệp S3 (D21): dev dùng RustFS trong infra/docker-compose.yml; deploy có thể đổi sang R2/AWS S3
    S3_ENDPOINT: z.url().default('http://localhost:9000'),
    // RustFS bỏ qua region nhưng SDK bắt buộc có; Cloudflare R2 dùng "auto"
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(8, 'S3_SECRET_KEY phải dài ít nhất 8 ký tự'),
    // Quy tắc tên bucket của S3: chữ thường, số, dấu chấm, gạch ngang; 3–63 ký tự
    S3_BUCKET: z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, 'Tên bucket không hợp lệ')
      .default('smart-english-exam'),
    // true cho RustFS/MinIO (endpoint/bucket/key); false cho AWS S3 (bucket.endpoint/key)
    S3_FORCE_PATH_STYLE: z.stringbool().default(true),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS), {
    message: 'SMTP_USER và SMTP_PASS phải cùng có hoặc cùng để trống',
    path: ['SMTP_PASS'],
  })
  .refine((env) => Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET), {
    message: 'GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET phải cùng có hoặc cùng để trống',
    path: ['GOOGLE_CLIENT_SECRET'],
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Biến môi trường không hợp lệ:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
