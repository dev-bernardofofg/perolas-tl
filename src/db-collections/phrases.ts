import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { getQueryClient } from '#/integrations/tanstack-query/root-provider'
import {
  adjustPhraseCount,
  createPhrase,
  listPhrases,
} from '#/server/phrases'

export type Phrase = Awaited<ReturnType<typeof listPhrases>>[number]

// Coleção client-side (SSR desabilitado na rota que a usa — ver routes/index.tsx).
// Mutações otimistas: a UI atualiza na hora; se o servidor falhar, o TanStack DB
// desfaz sozinho e o erro chega em tx.isPersisted.promise.
export const phrasesCollection = createCollection(
  queryCollectionOptions<Phrase>({
    queryKey: ['phrases'],
    queryFn: () => listPhrases(),
    queryClient: getQueryClient(),
    getKey: (phrase) => phrase.id,
    // Sem refetch manual aqui: o wrapper da query-db-collection já faz
    // `await refetch()` após cada handler resolver (e só então descarta o
    // estado otimista). Refetch duplicado criava corrida de queries stale.
    onInsert: async ({ transaction }) => {
      const { modified } = transaction.mutations[0]
      await createPhrase({
        data: { text: modified.text, author: modified.author },
      })
    },
    onUpdate: async ({ transaction }) => {
      // Cliques rápidos no mesmo card podem ser mesclados pelo TanStack DB numa
      // transação só — por isso o delta inteiro é enviado (não um ±1 fixo);
      // o servidor aplica atômico com piso em 1.
      const { original, modified } = transaction.mutations[0]
      const delta = modified.count - original.count
      if (delta !== 0) {
        await adjustPhraseCount({ data: { id: original.id, delta } })
      }
    },
  }),
)

let tempId = 0

// Id temporário negativo: nunca colide com o autoincrement do Postgres e permite
// identificar cards ainda não confirmados (id < 0) para desabilitar o "+1".
export function nextTempId() {
  tempId -= 1
  return -Date.now() * 1000 + tempId
}
