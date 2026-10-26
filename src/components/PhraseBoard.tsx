import { useLiveQuery } from '@tanstack/react-db'
import { phrasesCollection } from '#/db-collections/phrases'
import { searchable, slugifyName } from '#/lib/normalize'
import { showErrorToast } from '#/lib/toast'
import EmptyState from '#/components/EmptyState'
import PhraseCard from '#/components/PhraseCard'
import type { Phrase } from '#/db-collections/phrases'

type PersonColumn = {
  key: string
  personName: string
  phrases: Array<Phrase>
  monthCount: number
  totalCount: number
}

function groupByPerson(phrases: Array<Phrase>) {
  const columns = new Map<string, PersonColumn>()
  for (const phrase of phrases) {
    // chave por slug, não por personId: todo insert otimista de pessoa nova
    // chega com personId -1 e misturaria pessoas diferentes na mesma coluna
    const key = slugifyName(phrase.personName)
    let column = columns.get(key)
    if (!column) {
      column = {
        key,
        personName: phrase.personName,
        phrases: [],
        monthCount: 0,
        totalCount: 0,
      }
      columns.set(key, column)
    }
    column.phrases.push(phrase)
    column.monthCount += phrase.monthCount
    column.totalCount += phrase.totalCount
  }
  return [...columns.values()].sort(
    (a, b) =>
      b.monthCount - a.monthCount ||
      b.totalCount - a.totalCount ||
      a.personName.localeCompare(b.personName, 'pt-BR'),
  )
}

export default function PhraseBoard({ query = '' }: { query?: string }) {
  const { data, isLoading, isError } = useLiveQuery(
    (q) => q.from({ phrase: phrasesCollection }),
    [],
  )

  if (isError) {
    return (
      <div className="page-wrap">
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
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-wrap">
        <p className="loading-note" role="status">
          Garimpando as pérolas… 🦪
        </p>
      </div>
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
    return (
      <div className="page-wrap">
        <EmptyState />
      </div>
    )
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
      <div className="page-wrap">
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🔎
          </span>
          <p className="empty-title">Nenhuma pérola bate com essa busca…</p>
          <p className="empty-subtitle">ainda 👀</p>
        </div>
      </div>
    )
  }

  const columns = groupByPerson(visible)

  return (
    <section aria-label="Pérolas por pessoa">
      {needle && (
        <div className="page-wrap">
          <p className="search-count" role="status">
            {visible.length}{' '}
            {visible.length === 1 ? 'pérola encontrada' : 'pérolas encontradas'}
          </p>
        </div>
      )}
      <div className="pearl-board">
        {columns.map((column) => (
          <section
            key={column.key}
            className="board-column"
            aria-labelledby={`board-col-${column.key}`}
          >
            <header className="board-column-header">
              <h2 id={`board-col-${column.key}`} className="board-column-title">
                <span aria-hidden="true">🗣️</span> {column.personName}
              </h2>
              <p className="board-column-stats">
                {column.phrases.length}{' '}
                {column.phrases.length === 1 ? 'pérola' : 'pérolas'} ·{' '}
                {column.monthCount} este mês
              </p>
            </header>
            <div className="board-column-body">
              {column.phrases.map((phrase) => (
                <PhraseCard key={phrase.id} phrase={phrase} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
