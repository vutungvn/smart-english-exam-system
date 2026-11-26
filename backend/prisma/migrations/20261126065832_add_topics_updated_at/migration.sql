-- AlterTable
ALTER TABLE "topics" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- SQL viết tay: chủ đề có sẵn lấy updated_at = created_at, cắt về mili giây vì Date của JavaScript
-- không có micro giây (không cắt thì lần sửa đầu tiên so khóa lạc quan luôn lệch, trả 409)
UPDATE "topics" SET "updated_at" = date_trunc('milliseconds', "created_at");
