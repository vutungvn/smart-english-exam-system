-- CreateEnum
CREATE TYPE "ai_feature" AS ENUM ('EXPLANATION');

-- CreateEnum
CREATE TYPE "ai_call_status" AS ENUM ('SUCCESS', 'FAILED', 'INVALID_OUTPUT');

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "feature" "ai_feature" NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "status" "ai_call_status" NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL,
    "error_code" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_ai_usage_logs" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_explanations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "content" JSONB NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_ai_explanations" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_ai_usage_logs_user_created" ON "ai_usage_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_ai_usage_logs_created_at" ON "ai_usage_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_explanations_question_id" ON "ai_explanations"("question_id");

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "fk_ai_usage_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_explanations" ADD CONSTRAINT "fk_ai_explanations_question_id" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
