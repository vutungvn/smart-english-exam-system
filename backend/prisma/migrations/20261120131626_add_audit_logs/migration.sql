-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_audit_logs_entity_created" ON "audit_logs"("entity", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_audit_logs_actor_created" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_audit_logs_created" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_actor_id" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
