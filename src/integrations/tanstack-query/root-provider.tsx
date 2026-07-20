import { QueryClient } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1 },
    },
  })
}

// No browser o QueryClient precisa ser singleton: a coleção TanStack DB
// (src/db-collections/phrases.ts) e o router compartilham a mesma instância.
// No servidor, um client novo por request evita vazar cache entre usuários.
let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof document === 'undefined') return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function getContext() {
  return { queryClient: getQueryClient() }
}

export default function TanstackQueryProvider() {}
