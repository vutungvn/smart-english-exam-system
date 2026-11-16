-- Chỉ mục trigram ix_questions_content_trgm (tìm câu hỏi theo từ khóa) cần extension này
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "subject_category" AS ENUM ('TOEIC', 'IELTS');

-- CreateEnum
CREATE TYPE "skill" AS ENUM ('LISTENING', 'READING', 'SPEAKING', 'WRITING');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SPOKEN_RESPONSE', 'WRITTEN_RESPONSE');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "question_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "subject_category" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_subjects" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "skill" "skill" NOT NULL,
    "parts" SMALLINT[],
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_topics" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "skill" "skill" NOT NULL,
    "part" SMALLINT NOT NULL,
    "passage" TEXT,
    "transcript" TEXT,
    "audio_key" VARCHAR(500),
    "image_key" VARCHAR(500),
    "status" "question_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_question_groups" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "group_id" UUID,
    "order_in_group" SMALLINT,
    "type" "question_type" NOT NULL,
    "skill" "skill" NOT NULL,
    "part" SMALLINT NOT NULL,
    "difficulty" "difficulty" NOT NULL,
    "content" TEXT NOT NULL,
    "explanation" TEXT,
    "sample_answer" TEXT,
    "prep_seconds" SMALLINT,
    "response_seconds" SMALLINT,
    "audio_key" VARCHAR(500),
    "image_key" VARCHAR(500),
    "status" "question_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_questions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "label" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" SMALLINT NOT NULL,

    CONSTRAINT "pk_question_options" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_subjects_code" ON "subjects"("code");

-- CreateIndex
CREATE INDEX "ix_topics_subject_skill" ON "topics"("subject_id", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "uq_topics_subject_name" ON "topics"("subject_id", "name");

-- CreateIndex
CREATE INDEX "ix_question_groups_topic_id" ON "question_groups"("topic_id");

-- CreateIndex
CREATE INDEX "ix_question_groups_author_id" ON "question_groups"("author_id");

-- CreateIndex
CREATE INDEX "ix_questions_topic_id" ON "questions"("topic_id");

-- CreateIndex
CREATE INDEX "ix_questions_author_id" ON "questions"("author_id");

-- CreateIndex
CREATE INDEX "ix_questions_group_id" ON "questions"("group_id");

-- CreateIndex
CREATE INDEX "ix_questions_content_trgm" ON "questions" USING GIN ("content" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "uq_question_options_question_label" ON "question_options"("question_id", "label");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "fk_topics_subject_id" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_groups" ADD CONSTRAINT "fk_question_groups_topic_id" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_groups" ADD CONSTRAINT "fk_question_groups_author_id" FOREIGN KEY ("author_id") REFERENCES "teachers"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "fk_questions_topic_id" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "fk_questions_author_id" FOREIGN KEY ("author_id") REFERENCES "teachers"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "fk_questions_group_id" FOREIGN KEY ("group_id") REFERENCES "question_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "fk_question_options_question_id" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ================================================================
-- SQL viết tay: Prisma không khai báo được CHECK và chỉ mục một phần
-- ================================================================

-- D17: cặp skill–part hợp lệ kiểm tra ở Service theo TOEIC_PARTS, DB chỉ chặn Part ngoài 1–7
ALTER TABLE "questions" ADD CONSTRAINT "ck_questions_part" CHECK ("part" BETWEEN 1 AND 7);
ALTER TABLE "question_groups" ADD CONSTRAINT "ck_question_groups_part" CHECK ("part" BETWEEN 1 AND 7);

-- Câu thuộc nhóm thì phải có thứ tự trong nhóm, câu đơn thì không (D15)
ALTER TABLE "questions" ADD CONSTRAINT "ck_questions_group_order"
  CHECK (("group_id" IS NULL) = ("order_in_group" IS NULL));
ALTER TABLE "questions" ADD CONSTRAINT "ck_questions_order_in_group"
  CHECK ("order_in_group" IS NULL OR "order_in_group" >= 1);

-- Thời gian chuẩn bị/trả lời của câu Speaking (giây)
ALTER TABLE "questions" ADD CONSTRAINT "ck_questions_seconds"
  CHECK (("prep_seconds" IS NULL OR "prep_seconds" >= 0)
     AND ("response_seconds" IS NULL OR "response_seconds" > 0));

ALTER TABLE "question_options" ADD CONSTRAINT "ck_question_options_order_index" CHECK ("order_index" >= 0);

-- Chủ đề phải gắn ít nhất một Part, và chỉ Part 1–7 (D22)
ALTER TABLE "topics" ADD CONSTRAINT "ck_topics_parts"
  CHECK ("parts" IS NOT NULL AND cardinality("parts") > 0 AND "parts" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[]);

-- Bộ lọc ngân hàng câu hỏi và rút đề theo ma trận: chỉ tính bản ghi chưa xóa mềm
CREATE INDEX "ix_questions_filter" ON "questions" ("skill", "part", "difficulty", "status")
  WHERE "deleted_at" IS NULL;
CREATE INDEX "ix_question_groups_filter" ON "question_groups" ("skill", "part", "status")
  WHERE "deleted_at" IS NULL;

-- Mỗi vị trí trong nhóm chỉ có một câu còn hiệu lực; câu đã xóa mềm không giữ chỗ
CREATE UNIQUE INDEX "uq_questions_group_order" ON "questions" ("group_id", "order_in_group")
  WHERE "deleted_at" IS NULL AND "group_id" IS NOT NULL;
