/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" VARCHAR(255),
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_google_id" ON "users"("google_id");

-- Tài khoản phải có ít nhất một cách đăng nhập: mật khẩu hoặc Google
ALTER TABLE "users"
  ADD CONSTRAINT "ck_users_login_method"
  CHECK ("password_hash" IS NOT NULL OR "google_id" IS NOT NULL);
