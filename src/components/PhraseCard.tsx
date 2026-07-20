import { phrasesCollection } from '#/db-collections/phrases'
import { showErrorToast } from '#/lib/toast'
import type { Phrase } from '#/db-collections/phrases'

export default function PhraseCard({ phrase }: { phrase: Phrase }) {
  // Cards recém-inseridos ainda não confirmados pelo servidor têm id temporário
  // negativo — o "+1" fica travado até o id real do banco chegar.
  const isPending = phrase.id < 0

  const handlePlusOne = () => {
    const tx = phrasesCollection.update(phrase.id, (draft) => {
      draft.count += 1
    })
    tx.isPersisted.promise.catch(() => {
      showErrorToast('Ops! Não conseguimos salvar o +1. Tenta de novo 🙈')
    })
  }

  const handleMinusOne = () => {
    if (phrase.count <= 1) return
    const tx = phrasesCollection.update(phrase.id, (draft) => {
      draft.count -= 1
    })
    tx.isPersisted.promise.catch(() => {
      showErrorToast('Ops! Não conseguimos desfazer o +1. Tenta de novo 🙈')
    })
  }

  return (
    <article className="pearl-card">
      <blockquote className="pearl-quote">“{phrase.text}”</blockquote>
      <div className="pearl-card-footer">
        <div className="pearl-meta">
          <span className="pearl-author">🗣️ {phrase.author}</span>
          <time
            className="pearl-date"
            dateTime={new Date(phrase.createdAt).toISOString()}
          >
            {new Date(phrase.createdAt).toLocaleDateString('pt-BR')}
          </time>
        </div>
        <div className="pearl-counter-group">
          <span className="pearl-count-wrap" aria-label={`Dita ${phrase.count} vezes`}>
            <span key={phrase.count} className="pearl-count pop">
              {phrase.count}
            </span>
            <span className="pearl-count-label">
              {phrase.count === 1 ? 'vez' : 'vezes'}
            </span>
          </span>
          <button
            type="button"
            className="btn-minus"
            onClick={handleMinusOne}
            disabled={isPending || phrase.count <= 1}
            aria-label={`Desfazer um +1 da pérola de ${phrase.author}`}
            title="Foi sem querer (desfaz um +1)"
          >
            −1
          </button>
          <button
            type="button"
            className="btn-plus"
            onClick={handlePlusOne}
            disabled={isPending}
            aria-label={`Disse de novo: somar 1 à pérola de ${phrase.author}`}
            title="Disse de novo!"
          >
            +1
          </button>
        </div>
      </div>
    </article>
  )
}
