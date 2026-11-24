-- CreateIndex
CREATE INDEX "ix_exam_attempts_started_at" ON "exam_attempts"("started_at");

-- CreateIndex
CREATE INDEX "ix_login_histories_created_at" ON "login_histories"("created_at");

-- CreateIndex
CREATE INDEX "ix_users_created_at" ON "users"("created_at");
