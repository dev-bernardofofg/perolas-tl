import { createFileRoute } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getRanking } from '#/server/phrases'
import TopPhrasesTable from '#/components/ranking/TopPhrasesTable'
import TopAuthorsTable from '#/components/ranking/TopAuthorsTable'

const rankingQueryOptions = queryOptions({
  queryKey: ['ranking'],
  queryFn: () => getRanking(),
})

export const Route = createFileRoute('/ranking')({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(rankingQueryOptions)
    } catch {
      // Erro de rede cai no banner do componente — página continua de pé
    }
  },
  head: () => ({
    meta: [{ title: '🏆 Ranking · Pérolas do Escritório' }],
  }),
  component: RankingPage,
})

function RankingPage() {
  const { data, isLoading, isError, refetch } = useQuery(rankingQueryOptions)

  if (isError) {
    return (
      <main className="page-wrap page-main">
        <div className="error-banner" role="alert">
          <p>O ranking fugiu da reunião 😢 Verifique sua conexão.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void refetch()}
          >
            Tentar de novo
          </button>
        </div>
      </main>
    )
  }

  if (isLoading || !data) {
    return (
      <main className="page-wrap page-main">
        <p className="loading-note" role="status">
          Apurando os votos… 🗳️
        </p>
      </main>
    )
  }

  const hasData = data.topPhrases.length > 0

  return (
    <main className="page-wrap page-main">
      <h1 className="page-title">🏆 Ranking das Pérolas</h1>
      <p className="page-subtitle">
        O hall da fama (ou da vergonha) do escritório.
      </p>

      {!hasData ? (
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🏜️
          </span>
          <p className="empty-title">Ranking vazio por enquanto…</p>
          <p className="empty-subtitle">
            Registre a primeira pérola e inaugure o pódio 🥇
          </p>
        </div>
      ) : (
        <>
          <section className="ranking-section" aria-labelledby="top-phrases">
            <h2 id="top-phrases" className="section-title">
              💎 Top Pérolas
            </h2>
            <TopPhrasesTable data={data.topPhrases} />
          </section>

          <section className="ranking-section" aria-labelledby="top-authors">
            <h2 id="top-authors" className="section-title">
              🗣️ Maiores Faladores de Pérolas
            </h2>
            <TopAuthorsTable data={data.topAuthors} />
          </section>
        </>
      )}
    </main>
  )
}
