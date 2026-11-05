import { config } from 'dotenv';

// Nạp .env.test đè lên biến sẵn có. ConfigModule ưu tiên process.env hơn tệp .env nên app trong
// test dùng đúng DB test. Chạy trong globalSetup và đầu mỗi worker (setupFiles)
config({ path: '.env.test', override: true, quiet: true });

// Chốt chặn: test xóa sạch DB trước khi chạy, tuyệt đối không được trỏ vào DB dev
const url = process.env.DATABASE_URL ?? '';
if (!/\/[^/?]+_test(\?|$)/.test(url)) {
  throw new Error(
    'Test e2e chỉ chạy trên database có tên kết thúc bằng _test (kiểm tra backend/.env.test)',
  );
}
