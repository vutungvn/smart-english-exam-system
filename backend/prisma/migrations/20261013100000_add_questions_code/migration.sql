-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "code" VARCHAR(50);

-- Mã câu trong tệp nhập duy nhất trong các câu chưa xóa; câu tạo bằng form (code NULL) không bị ràng buộc.
-- Chỉ mục một phần viết tay: schema.prisma không biểu diễn được điều kiện WHERE
CREATE UNIQUE INDEX "uq_questions_code" ON "questions"("code")
  WHERE "deleted_at" IS NULL AND "code" IS NOT NULL;
