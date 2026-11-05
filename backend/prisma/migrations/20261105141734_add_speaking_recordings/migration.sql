-- AlterTable
ALTER TABLE "attempt_answers" ADD COLUMN     "audio_key" VARCHAR(500);

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "voice_consent_at" TIMESTAMPTZ(6);
