import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { getRanking } from '#/server/phrases'
import {
  PERIOD_REGEX,
  PERIOD_TOTAL,
  currentPeriod,
  formatPeriod,
} from '#/lib/month'
import TopPhrasesTable from '#/components/ranking/TopPhrasesTable'
import TopAuthorsTable from '#/components/ranking/TopAuthorsTable'

const rankingQueryOptions = (period: string) =>
  queryOptions({
    queryKey: ['ranking', period],
    queryFn: () => getRanking({ data: { period } }),
  })

// ?periodo=2026-07 | ?periodo=total | ausente = mês corrente.
// Valor inválido na URL não quebra: .catch descarta e cai no padrão.
const RankingSearchSchema = z.object({
  periodo: z
    .union([z.literal(PERIOD_TOTAL), z.string().regex(PERIOD_REGEX)])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/ranking')({
  validateSearch: RankingSearchSchema,
  loaderDeps: ({ search }) => ({
    periodo: search.periodo ?? currentPeriod(),
  }),
  loader: async ({ context, deps }) => {
    try {
      await context.queryClient.ensureQueryData(rankingQueryOptions(deps.periodo))
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
  const navigate = useNavigate({ from: '/ranking' })
  const { periodo } = Route.useSearch()
  const period = periodo ?? currentPeriod()
  const isTotal = period === PERIOD_TOTAL

  const { data, isLoading, isError, refetch } = useQuery(
    rankingQueryOptions(period),
  )

  const setPeriod = (value: string) =>
    void navigate({
      search: { periodo: value === currentPeriod() ? undefined : value },
    })

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
  // meses com registro + o corrente (mesmo vazio), sem duplicar
  const monthOptions = Array.from(
    new Set([currentPeriod(), ...data.availableMonths]),
  ).sort((a, b) => b.localeCompare(a))

  return (
    <main className="page-wrap page-main">
      <h1 className="page-title">🏆 Ranking das Pérolas</h1>
      <p className="page-subtitle">
        {isTotal
          ? 'O hall da fama de todos os tempos.'
          : `O hall da fama de ${formatPeriod(period)}.`}
      </p>

      <div
        className="period-picker"
        role="group"
        aria-label="Período do ranking"
      >
        <button
          type="button"
          className={`chip ${!isTotal ? 'is-active' : ''}`}
          onClick={() => setPeriod(currentPeriod())}
        >
          📅 Mensal
        </button>
        <button
          type="button"
          className={`chip ${isTotal ? 'is-active' : ''}`}
          onClick={() => setPeriod(PERIOD_TOTAL)}
        >
          🗄️ Total
        </button>
        {!isTotal && (
          <select
            className="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Escolher o mês"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatPeriod(m)}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasData ? (
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🏜️
          </span>
          <p className="empty-title">
            {isTotal
              ? 'Ranking vazio por enquanto…'
              : `Nenhuma pérola dita em ${formatPeriod(period)}…`}
          </p>
          <p className="empty-subtitle">
            {isTotal
              ? 'Registre a primeira pérola e inaugure o pódio 🥇'
              : 'Mês calmo demais. Suspeito. 🤨'}
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
