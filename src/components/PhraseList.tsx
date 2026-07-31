import { useLiveQuery } from '@tanstack/react-db'
import { phrasesCollection } from '#/db-collections/phrases'
import { searchable } from '#/lib/normalize'
import { showErrorToast } from '#/lib/toast'
import EmptyState from '#/components/EmptyState'
import PhraseCard from '#/components/PhraseCard'

export default function PhraseList({ query = '' }: { query?: string }) {
  const { data, isLoading, isError } = useLiveQuery(
    (q) => q.from({ phrase: phrasesCollection }),
    [],
  )

  if (isError) {
    return (
      <div className="error-banner" role="alert">
        <p>Não conseguimos falar com o servidor 😢 Verifique sua conexão.</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            phrasesCollection.utils.refetch().catch(() => {
              showErrorToast('Ainda sem conexão com o servidor 😢')
            })
          }}
        >
          Tentar de novo
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <p className="loading-note" role="status">
        Garimpando as pérolas… 🦪
      </p>
    )
  }

  // o que está quente primeiro: mês corrente, depois total, depois antiguidade
  const phrases = [...(data ?? [])].sort(
    (a, b) =>
      b.monthCount - a.monthCount ||
      b.totalCount - a.totalCount ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  if (phrases.length === 0) {
    return <EmptyState />
  }

  // busca client-side acento-insensível em frase, historinha e autor
  const needle = searchable(query.trim())
  const visible = needle
    ? phrases.filter((p) =>
        searchable(`${p.text} ${p.context ?? ''} ${p.personName}`).includes(
          needle,
        ),
      )
    : phrases

  if (visible.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-emoji" aria-hidden="true">
          🔎
        </span>
        <p className="empty-title">Nenhuma pérola bate com essa busca…</p>
        <p className="empty-subtitle">ainda 👀</p>
      </div>
    )
  }

  return (
    <>
      {needle && (
        <p className="search-count" role="status">
          {visible.length}{' '}
          {visible.length === 1 ? 'pérola encontrada' : 'pérolas encontradas'}
        </p>
      )}
      <div className="pearl-grid">
        {visible.map((phrase) => (
          <PhraseCard key={phrase.id} phrase={phrase} />
        ))}
      </div>
    </>
  )
}
