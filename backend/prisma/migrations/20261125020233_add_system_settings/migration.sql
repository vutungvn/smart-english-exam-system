-- CreateTable
CREATE TABLE "system_settings" (
    "group" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_system_settings" PRIMARY KEY ("group")
);

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "fk_system_settings_updated_by_id" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ================================================================
-- SQL viết tay: mỗi nhóm cấu hình một dòng
-- ================================================================

-- updated_at cắt về mili giây vì Date của JavaScript không có micro giây; không cắt thì lần sửa đầu
-- tiên so khóa lạc quan không bao giờ khớp (luôn 409)
INSERT INTO "system_settings" ("group", "updated_at") VALUES
  ('scoring', date_trunc('milliseconds', CURRENT_TIMESTAMP)),
  ('ai', date_trunc('milliseconds', CURRENT_TIMESTAMP)),
  ('recording', date_trunc('milliseconds', CURRENT_TIMESTAMP));
