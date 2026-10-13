-- CreateEnum
CREATE TYPE "scoring_scale" AS ENUM ('TOEIC_990', 'TOEIC_SW', 'PERCENT');

-- CreateEnum
CREATE TYPE "exam_kind" AS ENUM ('STANDARD', 'AI_PRACTICE');

-- CreateEnum
CREATE TYPE "exam_status" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "kind" "exam_kind" NOT NULL DEFAULT 'STANDARD',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "scoring_scale" "scoring_scale" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "max_attempts" INTEGER,
    "allow_part_practice" BOOLEAN NOT NULL DEFAULT true,
    "status" "exam_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_exams" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "skill" "skill" NOT NULL,
    "part" SMALLINT NOT NULL,
    "order_index" SMALLINT NOT NULL,

    CONSTRAINT "pk_exam_sections" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "pk_exam_questions" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_exams_author_id" ON "exams"("author_id");

-- CreateIndex
CREATE INDEX "ix_exams_subject_id" ON "exams"("subject_id");

-- CreateIndex
CREATE INDEX "ix_exam_sections_exam_order" ON "exam_sections"("exam_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "uq_exam_sections_exam_part" ON "exam_sections"("exam_id", "skill", "part");

-- CreateIndex
CREATE INDEX "ix_exam_questions_question_id" ON "exam_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_exam_questions_section_question" ON "exam_questions"("section_id", "question_id");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "fk_exams_author_id" FOREIGN KEY ("author_id") REFERENCES "teachers"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "fk_exams_subject_id" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "fk_exam_sections_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "fk_exam_questions_section_id" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "fk_exam_questions_question_id" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ================================================================
-- SQL viết tay: Prisma không khai báo được CHECK và chỉ mục một phần
-- ================================================================

ALTER TABLE "exams" ADD CONSTRAINT "ck_exams_duration_minutes" CHECK ("duration_minutes" > 0);
ALTER TABLE "exams" ADD CONSTRAINT "ck_exams_max_attempts" CHECK ("max_attempts" IS NULL OR "max_attempts" > 0);
-- Đề đã xuất bản phải có thời điểm xuất bản (Bảng 3.24)
ALTER TABLE "exams" ADD CONSTRAINT "ck_exams_published_at"
  CHECK ("status" <> 'PUBLISHED' OR "published_at" IS NOT NULL);

-- D17: cặp skill–part hợp lệ kiểm tra ở Service theo TOEIC_PARTS, DB chỉ chặn Part ngoài 1–7
ALTER TABLE "exam_sections" ADD CONSTRAINT "ck_exam_sections_part" CHECK ("part" BETWEEN 1 AND 7);
ALTER TABLE "exam_sections" ADD CONSTRAINT "ck_exam_sections_order_index" CHECK ("order_index" >= 0);
ALTER TABLE "exam_questions" ADD CONSTRAINT "ck_exam_questions_order_index" CHECK ("order_index" >= 0);

-- Danh sách đề đã xuất bản cho học viên (Giai đoạn 2): chỉ tính đề chưa xóa mềm
CREATE INDEX "ix_exams_status_published" ON "exams" ("status", "published_at" DESC)
  WHERE "deleted_at" IS NULL;
