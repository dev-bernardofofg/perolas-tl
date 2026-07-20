import { PrismaClient } from '#/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton para sobreviver ao HMR do Vite em dev sem esgotar conexões.
// Runtime usa o pooler (DATABASE_URL); a CLI usa DATABASE_URL_DIRECT (prisma.config.ts).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não definida. Rode `pnpm dev` para o Neon Launchpad provisionar o banco (.env.local).',
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
