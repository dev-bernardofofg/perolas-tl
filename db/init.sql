-- Schema inicial do Pérolas do Escritório
-- Mantido em sincronia com prisma/schema.prisma (model Phrase -> tabela "phrases")
CREATE TABLE IF NOT EXISTS "phrases" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phrases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "phrases_count_idx" ON "phrases"("count" DESC);
