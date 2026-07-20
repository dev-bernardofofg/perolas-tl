-- Schema inicial do Pérolas do Escritório
-- Mantido em sincronia com prisma/schema.prisma (rodado pelo Neon Launchpad
-- no provisionamento; `pnpm db:push` reconcilia qualquer diferença)
CREATE TABLE IF NOT EXISTS "people" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "people_slug_key" ON "people"("slug");

CREATE TABLE IF NOT EXISTS "phrases" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "context" TEXT,
    "personId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phrases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phrases_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "utterances" (
    "id" SERIAL NOT NULL,
    "phraseId" INTEGER NOT NULL,
    "saidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "utterances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "utterances_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "utterances_phraseId_saidAt_idx" ON "utterances"("phraseId", "saidAt");
CREATE INDEX IF NOT EXISTS "utterances_saidAt_idx" ON "utterances"("saidAt");
