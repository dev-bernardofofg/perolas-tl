import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { getRetro } from '#/server/retro'
import { PERIOD_REGEX, formatPeriod } from '#/lib/month'

const retroQueryOptions = (period: string | undefined) =>
  queryOptions({
    queryKey: ['retro', period ?? 'latest'],
    queryFn: () => getRetro({ data: { period } }),
  })

const RetroSearchSchema = z.object({
  periodo: z.string().regex(PERIOD_REGEX).optional().catch(undefined),
})

export const Route = createFileRoute('/retro')({
  validateSearch: RetroSearchSchema,
  loaderDeps: ({ search }) => ({ periodo: search.periodo }),
  loader: async ({ context, deps }) => {
    try {
      await context.queryClient.ensureQueryData(retroQueryOptions(deps.periodo))
    } catch {
      // Erro de rede cai no banner do componente — página continua de pé
    }
  },
  head: () => ({
    meta: [{ title: '✨ Retrô · Pérolas do Escritório' }],
  }),
  component: RetroPage,
})

function RetroPage() {
  const navigate = useNavigate({ from: '/retro' })
  const { periodo } = Route.useSearch()
  const { data, isLoading, isError, refetch } = useQuery(
    retroQueryOptions(periodo),
  )

  if (isError) {
    return (
      <main className="page-wrap page-main">
        <div className="error-banner" role="alert">
          <p>A retrô travou no projetor 😢 Verifique sua conexão.</p>
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
          Montando os slides… 📽️
        </p>
      </main>
    )
  }

  const hasData = data.totals.said > 0

  return (
    <main className="page-wrap page-main">
      <h1 className="page-title">✨ Retrô de {formatPeriod(data.period)}</h1>
      <p className="page-subtitle">
        O balanço oficial da zoeira — estilo Wrapped, só que do escritório.
      </p>

      {data.availableMonths.length > 1 && (
        <div className="period-picker" role="group" aria-label="Mês da retrô">
          <select
            className="period-select"
            value={data.period}
            onChange={(e) =>
              void navigate({ search: { periodo: e.target.value } })
            }
            aria-label="Escolher o mês"
          >
            {data.availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatPeriod(m)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!hasData ? (
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🦗
          </span>
          <p className="empty-title">Mês em branco…</p>
          <p className="empty-subtitle">
            Ou o escritório amadureceu, ou ninguém dedurou. Suspeito. 🤨
          </p>
        </div>
      ) : (
        <div className="retro-grid">
          {data.topPhrase && (
            <article className="retro-card retro-hero">
              <p className="retro-label">💎 Pérola do mês</p>
              <blockquote className="retro-quote">
                “{data.topPhrase.text}”
              </blockquote>
              <p className="retro-meta">
                🗣️ {data.topPhrase.personName} · dita {data.topPhrase.count}
                {data.topPhrase.count === 1 ? ' vez' : ' vezes'} no mês
              </p>
            </article>
          )}

          {data.topTalker && (
            <article className="retro-card">
              <p className="retro-label">🎤 Falador do mês</p>
              <p className="retro-big">{data.topTalker.name}</p>
              <p className="retro-meta">
                {data.topTalker.total}× em {data.topTalker.phraseCount}{' '}
                {data.topTalker.phraseCount === 1 ? 'pérola' : 'pérolas'}
              </p>
            </article>
          )}

          {data.busiestDay && (
            <article className="retro-card">
              <p className="retro-label">📢 Dia mais barulhento</p>
              <p className="retro-big">{data.busiestDay.day}</p>
              <p className="retro-meta">
                {data.busiestDay.count}{' '}
                {data.busiestDay.count === 1 ? 'pérola dita' : 'pérolas ditas'}
              </p>
            </article>
          )}

          {data.newcomer && (
            <article className="retro-card">
              <p className="retro-label">🌟 Revelação do mês</p>
              <p className="retro-big">{data.newcomer.name}</p>
              <p className="retro-meta">
                estreou no elenco já com {data.newcomer.total}×
              </p>
            </article>
          )}

          <article className="retro-card">
            <p className="retro-label">🧮 Números do mês</p>
            <p className="retro-meta retro-numbers">
              <strong>{data.totals.said}</strong> vezes ditas ·{' '}
              <strong>{data.totals.newPhrases}</strong>{' '}
              {data.totals.newPhrases === 1 ? 'pérola nova' : 'pérolas novas'} ·{' '}
              <strong>{data.totals.newPeople}</strong>{' '}
              {data.totals.newPeople === 1 ? 'estreia' : 'estreias'} no elenco
            </p>
          </article>
        </div>
      )}
    </main>
  )
}
