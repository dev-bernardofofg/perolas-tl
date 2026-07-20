import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // CLI (db push / migrate / studio) usa a conexão direta; o runtime do app
    // usa o pooler (DATABASE_URL) via PrismaPg em src/db.ts.
    url: process.env.DATABASE_URL_DIRECT
      ? env('DATABASE_URL_DIRECT')
      : env('DATABASE_URL'),
  },
})
