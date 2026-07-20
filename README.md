# 💬 Pérolas do Escritório

Contador de frases icônicas ditas pelas pessoas do escritório. Registre a
pérola, aponte o autor e vá somando `+1` toda vez que ela for dita de novo —
com ranking das frases mais faladas e dos maiores faladores.

## Stack

- **TanStack Start** (React 19 + Vite 8) com server functions como único
  gateway para o banco
- **TanStack Router** — rotas file-based (`/` e `/ranking`)
- **TanStack Query** — cache/sync (SSR no ranking)
- **TanStack DB** — coleção client-side com mutações otimistas e live queries
  na home
- **TanStack Form** — formulário de cadastro com validação
- **TanStack Table** — tabelas do ranking
- **TanStack Hotkeys** — `Ctrl+K`, `Ctrl+Enter`, `g h`, `g r`
- **Prisma 7 + Neon Postgres** (provisionado via Neon Launchpad)
- Tailwind CSS v4

Scaffold gerado com a **TanStack CLI** (`@tanstack/cli`) e skills de agente
instaladas via **TanStack Intent** — detalhes completos em [AGENTS.md](AGENTS.md).

## Rodando

```bash
pnpm install
pnpm dev          # primeiro run provisiona um Postgres Neon automaticamente
```

O app sobe em `http://localhost:3000`. As variáveis de banco ficam em
`.env.local` (criadas automaticamente pelo Neon Launchpad — reivindique o
banco pela claim URL antes de 72h, ou troque pela connection string do seu
projeto Neon).

## Scripts úteis

| Comando            | O que faz                          |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Dev server na porta 3000           |
| `pnpm build`       | Build de produção                  |
| `pnpm db:push`     | Sincroniza o schema Prisma no Neon |
| `pnpm db:studio`   | Prisma Studio                      |
| `pnpm db:seed`     | Popula pérolas de demonstração     |
| `pnpm test`        | Vitest                             |

## Regras do projeto

- Toda leitura/escrita passa por server functions (`src/server/phrases.ts`) —
  nada de estado persistido no cliente, **sem localStorage/sessionStorage**.
- Erros de rede mostram aviso na tela (banner/toast) sem quebrar o app.
- Interface 100% em português do Brasil.
