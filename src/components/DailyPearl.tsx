import { useQuery } from '@tanstack/react-query'
import { dailyPearlQueryOptions } from '#/lib/home-queries'
import { formatRelative } from '#/lib/relative-time'

export default function DailyPearl() {
  const { data: pearl } = useQuery(dailyPearlQueryOptions())

  // sem acervo (ou erro de rede): a home vive sem o destaque
  if (!pearl) return null

  return (
    <aside className="daily-pearl" aria-labelledby="daily-title">
      <p id="daily-title" className="daily-kicker">
        💫 Pérola do dia — lembra dessa?
      </p>
      <blockquote className="daily-quote">“{pearl.text}”</blockquote>
      {pearl.context && <p className="daily-context">{pearl.context}</p>}
      <p className="daily-meta">
        🗣️ <strong>{pearl.personName}</strong> · dita {pearl.totalCount}
        {pearl.totalCount === 1 ? ' vez' : ' vezes'} · última{' '}
        {formatRelative(pearl.lastSaidAt)}
      </p>
    </aside>
  )
}
