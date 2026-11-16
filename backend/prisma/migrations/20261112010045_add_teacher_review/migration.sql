-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'TEACHER_REVIEWED';

-- AlterTable
ALTER TABLE "attempt_answers" ADD COLUMN     "review_request_note" VARCHAR(300),
ADD COLUMN     "review_requested_at" TIMESTAMPTZ(6);
