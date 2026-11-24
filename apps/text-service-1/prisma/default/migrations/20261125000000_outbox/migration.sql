-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "text_service_1";

-- CreateTable
CREATE TABLE "outbox" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_published_at_created_at_idx" ON "outbox"("published_at", "created_at");

