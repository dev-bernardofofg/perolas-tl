import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { phrasesCollection } from '#/db-collections/phrases'
import { dailyPearlQueryOptions, feedQueryOptions } from '#/lib/home-queries'
import DailyPearl from '#/components/DailyPearl'
import ActivityFeed from '#/components/ActivityFeed'
import PhraseBoard from '#/components/PhraseBoard'
import PhraseFormModal from '#/components/PhraseFormModal'
import SearchBar from '#/components/SearchBar'

export const Route = createFileRoute('/')({
  // Coleções TanStack DB são client-side: SSR desabilitado nesta rota
  // (skill @tanstack/db#meta-framework). O preload no loader inicia o sync
  // durante a navegação, evitando flash de loading.
  ssr: false,
  loader: async ({ context }) => {
    try {
      await Promise.all([
        phrasesCollection.preload(),
        context.queryClient.ensureQueryData(feedQueryOptions),
        context.queryClient.ensureQueryData(dailyPearlQueryOptions()),
      ])
    } catch {
      // Falha de rede aqui vira o banner de erro da PhraseBoard — app não quebra
    }
    return null
  },
  component: HomePage,
})

function HomePage() {
  const [query, setQuery] = useState('')

  return (
    <main className="page-main">
      <div className="page-wrap">
        <div className="home-header">
          <div>
            <h1 className="page-title">💬 Pérolas do Escritório</h1>
            <p className="page-subtitle">
              Aquelas frases que ninguém esquece — agora com contador oficial.
            </p>
          </div>
          <PhraseFormModal />
        </div>
        <DailyPearl />
        <ActivityFeed />
        <SearchBar query={query} onChange={setQuery} />
      </div>
      {/* fora do .page-wrap: o board rola na horizontal até a borda da tela */}
      <PhraseBoard query={query} />
    </main>
  )
}
