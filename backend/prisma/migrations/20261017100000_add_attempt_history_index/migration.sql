-- Lịch sử làm bài (GET /me/attempts) và biểu đồ điểm theo thời gian: bài đã nộp của một học viên, mới nhất trước
-- CreateIndex
CREATE INDEX "ix_exam_attempts_student_submitted" ON "exam_attempts"("student_id", "submitted_at" DESC);
