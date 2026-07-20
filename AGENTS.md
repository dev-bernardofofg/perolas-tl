<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# Pérolas do Escritório

Contador de frases icônicas do escritório. UI 100% em pt-BR, tom de zoeira.
Cadastro de pérolas (frase + autor), botão "+1" com atualização otimista e
ranking de frases/autores. Toda leitura/escrita passa por server functions +
Prisma + Neon Postgres — **nunca** usar localStorage/sessionStorage.

## Scaffold (como este projeto nasceu)

Comando exato usado (TanStack CLI 0.69.6, 2026-07-20):

```
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind --add-ons tanstack-query,prisma,neon
```

- React, starter blank, toolchain padrão. `--tailwind` está deprecated (sempre ativo) mas foi mantido no comando.
- O conteúdo de `my-tanstack-app/` foi movido para a raiz do repo e o pacote renomeado para `perolas`.
- Pós-scaffold: `npx @tanstack/intent@latest install` e `npx @tanstack/intent@latest list`.

## Gotcha de ambiente: pnpm global quebrado nesta máquina

O shim `C:\Users\User\AppData\Local\pnpm\bin\pnpm.ps1` aponta para um
`@pnpm/exe` que nunca terminou o build (`.pnpm-needs-build` presente, sem
`pnpm.exe`). Enquanto não for corrigido (ex.: `npm i -g pnpm`), use:

```
npx -y pnpm@latest <comando>
```

pnpm 11: aprovação de build scripts fica em `pnpm-workspace.yaml` →
`allowBuilds` (o campo `pnpm.onlyBuiltDependencies` do package.json foi
descontinuado). Prisma engines/esbuild já estão aprovados lá.

## Stack e versões relevantes

- TanStack Start 1.168 + Router (file-based em `src/routes/`), Vite 8, React 19, Tailwind v4
- TanStack Query 5 (QueryClient compartilhado — ver Arquitetura)
- TanStack DB `@tanstack/react-db` 0.1.x + `@tanstack/query-db-collection` 1.1 (pre-1.0, API pode mudar)
- TanStack Form 1.33, Table 8.21, Hotkeys 0.10 (**alpha** — pinada por `^`, cuidado ao atualizar)
- Prisma 7 (generator `prisma-client`, output `src/generated/prisma/`, driver adapter `@prisma/adapter-pg`, sem engines binárias no runtime)

## Banco de dados (Neon Launchpad)

- `vite-plugin-neon-new` (em `neon-vite-plugin.ts`, configurado com `dotEnvFile: '.env.local'`) provisiona um Postgres Neon **claimable** no primeiro `pnpm dev` se `DATABASE_URL` não existir, e roda o seed `db/init.sql`.
- Variáveis em `.env.local` (gitignored): `DATABASE_URL` (pooler, runtime) e `DATABASE_URL_DIRECT` (direta, CLI). O banco foi **reivindicado na conta Neon do usuário em 2026-07-20** (sem prazo de expiração; gerenciável em console.neon.tech). Se um dia `DATABASE_URL` for removida, o plugin provisiona um novo banco claimable no próximo `pnpm dev`.
- `prisma.config.ts` usa `DATABASE_URL_DIRECT` para a CLI (push/migrate/studio não podem passar pelo pooler); o runtime usa o pooler via `PrismaPg` em `src/db.ts`.
- Scripts: `pnpm db:push`, `pnpm db:generate`, `pnpm db:studio`, `pnpm db:seed` (todos com `dotenv -e .env.local`).
- **Após `pnpm db:generate`, reinicie o `pnpm dev`**: o singleton do PrismaClient (`src/db.ts`) sobrevive ao HMR de propósito (evita esgotar conexões) e fica com o client ANTIGO — colunas novas dão `Unknown argument` até reiniciar o processo.
- Nunca prefixar segredos com `VITE_` (vão para o bundle client). A claim URL é a única exceção intencional do plugin (dev-only).
- Schema: `Person` (dedupe por `slug` único) → `Phrase` (FK `personId`) → `Utterance` (cada "+1" é um evento com `saidAt`). **Não existe coluna de contador**: total e mensal são `COUNT` com filtro de data — qualquer recorte futuro (semana, ano) sai sem migração. Manter `db/init.sql` em sincronia com `prisma/schema.prisma` (o init.sql roda só no provisionamento; o push reconcilia).
- Fuso do corte mensal: America/Recife (UTC-3 fixo, sem horário de verão) — helpers em `src/lib/month.ts`. `saidAt` é gravado em UTC; a conversão acontece na comparação/formatação.

## Arquitetura

- **Server functions** (`src/server/phrases.ts` + `src/server/people.ts`): único gateway para o banco. `createServerFn().validator(zod)` — nesta versão do Start, `.validator()` é o método atual; `.inputValidator()` está deprecated. `+1` = `registerUtterance` (createMany de N eventos), `−1` = `undoUtterance` (apaga as N utterances mais recentes com **piso em 1**, vítimas em ordem determinística para desfazeres concorrentes não furarem o piso). Pessoas: upsert por `slug` normalizado (`src/lib/normalize.ts`) — "rafael lins" e "Rafael Lins" são a mesma pessoa; a criação inline acontece dentro de `createPhrase` quando vem `personName` em vez de `personId`.
- **Coleção TanStack DB** (`src/db-collections/phrases.ts`): linhas são `{ id, text, personId, personName, monthCount, totalCount, createdAt }`. **Não chamar `utils.refetch()` dentro dos handlers**: o wrapper da query-db-collection já faz `await refetch()` após o handler resolver (e só então descarta o otimista) — refetch duplicado cria corrida de queries stale (bug real que travou a UI num valor velho). Cliques rápidos no mesmo card podem ser **mesclados numa transação só** pelo TanStack DB; por isso `onUpdate` calcula o delta de `totalCount` e envia `times: N`, nunca um ±1 fixo. Após persistir, os handlers invalidam `['ranking']` e `['people']` (caches derivados). Rollback automático em falha; erros chegam por `tx.isPersisted.promise`.
- **SSR × TanStack DB**: coleções são client-side only. A rota `/` tem `ssr: false` + `await phrasesCollection.preload()` no loader (skill `@tanstack/db#meta-framework`). Não remover o `ssr: false`.
- **QueryClient**: singleton no browser (`getQueryClient()` em `src/integrations/tanstack-query/root-provider.tsx`) — a coleção DB e o router PRECISAM compartilhar a mesma instância; dois clients = dados fantasma. No servidor, um client novo por request.
- **Ids temporários**: inserts otimistas usam id negativo (`nextTempId()`); cards com `id < 0` têm o "+1" desabilitado até o refetch trazer o id real.
- **/ranking**: TanStack Query puro (`useQuery` + `ensureQueryData` no loader, SSR ativo) + TanStack Table. Período via **search param** (`?periodo=YYYY-MM|total`, `validateSearch` com zod + `.catch` para URL inválida não quebrar; ausente = mês corrente). Agregações via `$queryRaw` (COUNT com `FILTER`/faixa de datas; `::int` nos COUNTs — sem cast o pg devolve BigInt e a serialização quebra).
- **/pessoas**: listagem via `peopleQueryOptions` compartilhada (`src/lib/people-query.ts`) com o combobox do formulário (datalist nativo — sem lib de combobox). `listPeople` calcula **ritmo** (streak de dias consecutivos, dias em silêncio) e **badges** (Recordista, Lenda, Metralhadora, Acervo vivo, Cria nova) a partir de uma query de dias-por-pessoa em fuso Recife. Painel de **mesclagem** (`mergePeople`: move pérolas e apaga a origem — para apelidos que o slug não pega) e remoção de pessoa **sem pérolas** (`deletePerson`, guardado no servidor).
- **Curadoria de pérolas**: editar texto/contexto e excluir direto no card (hover mostra as ações). Tudo via coleção: `onUpdate` também detecta mudança de texto/contexto e chama `updatePhrase`; `onDelete` chama `deletePhrase` (utterances caem em cascata). Otimista com rollback, como o resto.
- **/retro** (`src/server/retro.ts`): retrospectiva mensal estilo Wrapped — pérola do mês, falador do mês, dia mais barulhento, revelação (quem estreou no mês) e totais. `period` ausente = mês mais recente com registro. Search param `?periodo=YYYY-MM`.
- **/p/$id**: página compartilhável com OG meta (preview de link mostra frase + autor) e **download do card em PNG** gerado no canvas (`src/lib/card-image.ts`, zero deps; espera `document.fonts.ready` com teto de 2,5s para não travar se a fonte externa demorar). Botão de copiar link em cada card da home.
- **Home extra** (`src/lib/home-queries.ts`): feed "Rolando agora" (`getFeed`, últimas 8 utterances; `isFirst` distingue registro de repetição) e **pérola do dia** (`getDailyPearl`, sorteio determinístico por `md5(dia-de-Recife || id)` priorizando frases sem utterance há 7+ dias — todo mundo vê a mesma o dia inteiro). `Phrase.context` é a historinha opcional. A invalidação pós-escrita da coleção cobre `['feed']` também.
- **Hotkeys**: `useHotkey`/`useHotkeySequence` direto (o manager é singleton; `HotkeysProvider` é opcional e não foi usado). `Mod+K` foca o form, `Mod+Enter` submete, sequências `g h`/`g r` navegam. Teclas simples ignoram inputs por padrão.
- **Tempo real (SSE)**: `src/routes/api/events.ts` é uma server route que faz poll de uma tupla de versão no banco (max/count de utterances e phrases) a cada 4s e empurra a versão via `text/event-stream`. `LiveUpdates` (montado no `__root`) abre um `EventSource` e, quando a versão muda, refaz a coleção + invalida feed/ranking/pessoas — a primeira versão pós-(re)conexão é só linha de base, não dispara refetch. A conexão se auto-encerra em 4min (abaixo do maxDuration de function na Vercel) e o `EventSource` reconecta nativamente (`retry: 3000`). Custo: uma function fica viva por aba aberta — ok para escala de escritório; se crescer, migrar para Electric SQL (exige replicação lógica no Neon, hoje desligada).
- **Erros de rede**: banner com "Tentar de novo" para falha de leitura; toast (`src/lib/toast.ts`, store com `useSyncExternalStore`, sem lib externa) para falha de escrita; `defaultErrorComponent`/`defaultNotFoundComponent` no router. Nada pode estourar tela branca.
- **Tema**: dark mode só via `prefers-color-scheme` (o ThemeToggle do scaffold foi removido porque usava localStorage, proibido neste projeto).
- **Devtools**: `consolePiping` desabilitado no `vite.config.ts` — o eco client↔server de console entra em loop de feedback quando um warning do React (ex.: hydration) aparece, inundando o terminal com GB de log.

## Deploy

- O plugin `nitro()` no `vite.config.ts` empacota o servidor por alvo: na Vercel (CI detectado) emite `.vercel/output` (Build Output API, serverless function); localmente emite `.output` (node-server). Sem ele, o deploy na Vercel publica só o `dist/` e todas as rotas dão 404.
- `pnpm build` roda `prisma generate` antes do Vite (o client gerado é gitignored) e o plugin Neon é inerte em produção.
- O ambiente de deploy precisa de `DATABASE_URL` real (a pooled do `.env.local` ou do console Neon) — o build passa sem ela, o runtime não.

## Próximos passos possíveis

- Busca/filtro por pessoa na home (live queries da coleção fazem client-side).
- Auth leve ("quem registrou" via cookie de sessão server-side — sem localStorage) e ranking de deduradores.
- Reações além do +1 (chorei/gelei/clássico); som de replay no +1.
- Imagem OG server-side por pérola (satori/@vercel/og) para o preview do link já vir com o card renderizado.
