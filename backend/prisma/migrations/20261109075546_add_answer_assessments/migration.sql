-- CreateEnum
CREATE TYPE "assessment_status" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "grader" AS ENUM ('AI', 'TEACHER');

-- AlterEnum
ALTER TYPE "ai_feature" ADD VALUE 'SW_GRADING';

-- CreateTable
CREATE TABLE "answer_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_answer_id" UUID NOT NULL,
    "grader" "grader" NOT NULL DEFAULT 'AI',
    "status" "assessment_status" NOT NULL DEFAULT 'PENDING',
    "score" DECIMAL(5,2),
    "max_score" DECIMAL(5,2) NOT NULL,
    "criteria" JSONB,
    "feedback" TEXT,
    "transcript" TEXT,
    "corrections" JSONB,
    "improved_answer" TEXT,
    "model" VARCHAR(100),
    "tries" SMALLINT NOT NULL DEFAULT 0,
    "regrade_count" SMALLINT NOT NULL DEFAULT 0,
    "error_message" VARCHAR(500),
    "next_run_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "graded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_answer_assessments" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_answer_assessments_status_updated" ON "answer_assessments"("status", "updated_at");

-- CreateIndex
CREATE INDEX "ix_answer_assessments_reviewed_by" ON "answer_assessments"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "uq_answer_assessments_answer_grader" ON "answer_assessments"("attempt_answer_id", "grader");

-- AddForeignKey
ALTER TABLE "answer_assessments" ADD CONSTRAINT "fk_answer_assessments_attempt_answer_id" FOREIGN KEY ("attempt_answer_id") REFERENCES "attempt_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_assessments" ADD CONSTRAINT "fk_answer_assessments_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Viết tay: điểm nằm trong thang của dạng câu; đã chấm xong thì phải có điểm và thời điểm chấm;
-- bản của giáo viên phải có người chấm; số lần thử, số lần chấm lại không âm
ALTER TABLE "answer_assessments"
  ADD CONSTRAINT "ck_answer_assessments_max_score" CHECK ("max_score" > 0),
  ADD CONSTRAINT "ck_answer_assessments_score" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= "max_score")),
  ADD CONSTRAINT "ck_answer_assessments_done" CHECK ("status" <> 'DONE' OR ("score" IS NOT NULL AND "graded_at" IS NOT NULL)),
  ADD CONSTRAINT "ck_answer_assessments_teacher" CHECK ("grader" <> 'TEACHER' OR "reviewed_by" IS NOT NULL),
  ADD CONSTRAINT "ck_answer_assessments_counts" CHECK ("tries" >= 0 AND "regrade_count" >= 0);
