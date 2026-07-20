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
    // Placeholder quando nenhuma env existe: `prisma generate` não conecta no
    // banco mas o env() do Prisma 7 lança erro na carga da config se a var
    // faltar — sem isso o generate quebra em CI sem segredos (ex.: Vercel build
    // step antes das envs, forks). Comandos que conectam de verdade falham
    // ruidosamente na conexão se cair no placeholder.
    url: process.env.DATABASE_URL_DIRECT
      ? env('DATABASE_URL_DIRECT')
      : process.env.DATABASE_URL
        ? env('DATABASE_URL')
        : 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
})
