import { useQuery } from '@tanstack/react-query'
import { feedQueryOptions } from '#/lib/home-queries'
import { formatRelative } from '#/lib/relative-time'

export default function ActivityFeed() {
  const { data: entries } = useQuery(feedQueryOptions)

  // sem eventos (ou erro de rede): seção simplesmente não aparece
  if (!entries?.length) return null

  return (
    <section className="feed-section" aria-labelledby="feed-title">
      <h2 id="feed-title" className="section-title">
        🔥 Rolando agora
      </h2>
      <ul className="feed-list">
        {entries.map((entry) => (
          <li key={entry.id} className="feed-item">
            <span aria-hidden="true">{entry.isFirst ? '📌' : '🔁'}</span>
            <span className="feed-text">
              <strong>{entry.personName}</strong>{' '}
              {entry.isFirst ? 'entrou pro acervo com' : 'repetiu'}{' '}
              <em>“{entry.text}”</em>
            </span>
            <time
              className="feed-time"
              dateTime={new Date(entry.saidAt).toISOString()}
            >
              {formatRelative(entry.saidAt)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  )
}
