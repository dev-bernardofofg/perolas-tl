import { createFileRoute } from '@tanstack/react-router'
import { phrasesCollection } from '#/db-collections/phrases'
import PhraseForm from '#/components/PhraseForm'
import PhraseList from '#/components/PhraseList'

export const Route = createFileRoute('/')({
  // Coleções TanStack DB são client-side: SSR desabilitado nesta rota
  // (skill @tanstack/db#meta-framework). O preload no loader inicia o sync
  // durante a navegação, evitando flash de loading.
  ssr: false,
  loader: async () => {
    try {
      await phrasesCollection.preload()
    } catch {
      // Falha de rede aqui vira o banner de erro da PhraseList — app não quebra
    }
    return null
  },
  component: HomePage,
})

function HomePage() {
  return (
    <main className="page-wrap page-main">
      <h1 className="page-title">💬 Pérolas do Escritório</h1>
      <p className="page-subtitle">
        Aquelas frases que ninguém esquece — agora com contador oficial.
      </p>
      <PhraseForm />
      <section aria-label="Lista de pérolas" className="list-section">
        <PhraseList />
      </section>
    </main>
  )
}
