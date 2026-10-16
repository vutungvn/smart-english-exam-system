-- AlterTable
ALTER TABLE "attempt_answers" ADD COLUMN     "is_correct" BOOLEAN;

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "correct_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "raw_score" DECIMAL(7,2),
ADD COLUMN     "scaled_score" DECIMAL(7,2),
ADD COLUMN     "skill_scores" JSONB,
ADD COLUMN     "skipped_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wrong_count" INTEGER NOT NULL DEFAULT 0;

-- Viết tay: ràng buộc giữa các cột
ALTER TABLE "exam_attempts"
  ADD CONSTRAINT "ck_attempts_counts" CHECK ("correct_count" >= 0 AND "wrong_count" >= 0 AND "skipped_count" >= 0),
  -- Bài đã chấm xong phải có điểm (bài còn câu Speaking/Writing chờ AI chấm ở trạng thái SUBMITTED)
  ADD CONSTRAINT "ck_attempts_status_graded" CHECK ("status" <> 'GRADED' OR "scaled_score" IS NOT NULL);
