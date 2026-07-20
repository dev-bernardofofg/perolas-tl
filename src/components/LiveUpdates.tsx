import { useEffect, useRef } from 'react'
import { getQueryClient } from '#/integrations/tanstack-query/root-provider'
import { phrasesCollection } from '#/db-collections/phrases'

// Escuta o SSE de /api/events e refaz as queries quando a versão do banco
// muda — é assim que o +1 dado em outra máquina aparece aqui sem interação.
// Renderiza nada; montado uma vez no __root.
export default function LiveUpdates() {
  const lastVersion = useRef<string | null>(null)

  useEffect(() => {
    const source = new EventSource('/api/events')

    source.onmessage = (event) => {
      const version = event.data
      // a primeira versão após (re)conexão é linha de base: só refaz as
      // queries quando uma versão DIFERENTE da última vista chegar
      if (lastVersion.current !== null && version !== lastVersion.current) {
        void phrasesCollection.utils.refetch().catch(() => {})
        const queryClient = getQueryClient()
        void queryClient.invalidateQueries({ queryKey: ['feed'] })
        void queryClient.invalidateQueries({ queryKey: ['ranking'] })
        void queryClient.invalidateQueries({ queryKey: ['people'] })
      }
      lastVersion.current = version
    }
    // erros de conexão: o EventSource reconecta sozinho (retry do servidor)

    return () => source.close()
  }, [])

  return null
}
