-- CreateEnum
CREATE TYPE "attempt_mode" AS ENUM ('FULL', 'PART');

-- CreateEnum
CREATE TYPE "attempt_status" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'CANCELLED');

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "mode" "attempt_mode" NOT NULL,
    "section_id" UUID,
    "status" "attempt_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_exam_attempts" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "exam_question_id" UUID NOT NULL,
    "selected_option_id" UUID,
    "text_answer" TEXT,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_attempt_answers" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_exam_attempts_student_exam" ON "exam_attempts"("student_id", "exam_id");

-- CreateIndex
CREATE INDEX "ix_exam_attempts_exam_id" ON "exam_attempts"("exam_id");

-- CreateIndex
CREATE INDEX "ix_attempt_answers_exam_question_id" ON "attempt_answers"("exam_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_attempt_answers_attempt_question" ON "attempt_answers"("attempt_id", "exam_question_id");

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_section_id" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "fk_attempt_answers_attempt_id" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "fk_attempt_answers_exam_question_id" FOREIGN KEY ("exam_question_id") REFERENCES "exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "fk_attempt_answers_selected_option_id" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Viết tay: ràng buộc giữa các cột (Prisma không biểu diễn được)
ALTER TABLE "exam_attempts"
  ADD CONSTRAINT "ck_attempts_expires" CHECK ("expires_at" IS NULL OR "expires_at" > "started_at"),
  ADD CONSTRAINT "ck_attempts_submitted" CHECK ("submitted_at" IS NULL OR "submitted_at" >= "started_at"),
  ADD CONSTRAINT "ck_attempts_status_submitted" CHECK ("status" NOT IN ('SUBMITTED', 'GRADED') OR "submitted_at" IS NOT NULL),
  -- Luyện theo Part thì có section_id, làm cả đề thì không
  ADD CONSTRAINT "ck_attempts_mode_section" CHECK (("mode" = 'PART') = ("section_id" IS NOT NULL));

-- Mỗi học viên chỉ có một lượt đang làm cho mỗi đề: chốt chặn cuối khi bấm "Bắt đầu" hai lần cùng lúc
CREATE UNIQUE INDEX "uq_attempts_one_in_progress" ON "exam_attempts"("student_id", "exam_id")
  WHERE "status" = 'IN_PROGRESS';

-- Job tự nộp bài khi hết giờ (SPRINT-52) quét các lượt đang làm có đếm giờ
CREATE INDEX "ix_attempts_expiring" ON "exam_attempts"("expires_at")
  WHERE "status" = 'IN_PROGRESS' AND "expires_at" IS NOT NULL;
