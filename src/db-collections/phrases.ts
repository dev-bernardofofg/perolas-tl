import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { getQueryClient } from '#/integrations/tanstack-query/root-provider'
import {
  createPhrase,
  listPhrases,
  registerUtterance,
  undoUtterance,
} from '#/server/phrases'

export type Phrase = Awaited<ReturnType<typeof listPhrases>>[number]

// Pérolas alimentam também /ranking e /pessoas — depois de qualquer escrita,
// marca esses caches como stale (fire-and-forget: não segura a transação).
function invalidateDerivedQueries() {
  const queryClient = getQueryClient()
  void queryClient.invalidateQueries({ queryKey: ['ranking'] })
  void queryClient.invalidateQueries({ queryKey: ['people'] })
}

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
      // personId < 0 = pessoa nova digitada no combobox; o servidor faz o
      // upsert por slug (dedupe) antes de criar a frase
      await createPhrase({
        data:
          modified.personId > 0
            ? { text: modified.text, personId: modified.personId }
            : { text: modified.text, personName: modified.personName },
      })
      invalidateDerivedQueries()
    },
    onUpdate: async ({ transaction }) => {
      // Cliques rápidos no mesmo card podem ser mesclados pelo TanStack DB numa
      // transação só — por isso o delta inteiro é enviado, nunca um ±1 fixo.
      const { original, modified } = transaction.mutations[0]
      const delta = modified.totalCount - original.totalCount
      if (delta > 0) {
        await registerUtterance({
          data: { phraseId: original.id, times: delta },
        })
      } else if (delta < 0) {
        await undoUtterance({
          data: { phraseId: original.id, times: -delta },
        })
      }
      invalidateDerivedQueries()
    },
  }),
)

let tempId = 0

// Id temporário negativo: nunca colide com o autoincrement do Postgres e permite
// identificar cards ainda não confirmados (id < 0) para travar +1/−1.
export function nextTempId() {
  tempId -= 1
  return -Date.now() * 1000 + tempId
}
