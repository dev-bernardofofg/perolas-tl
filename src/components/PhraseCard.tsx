import { phrasesCollection } from '#/db-collections/phrases'
import { showErrorToast } from '#/lib/toast'
import type { Phrase } from '#/db-collections/phrases'

export default function PhraseCard({ phrase }: { phrase: Phrase }) {
  // Cards recém-inseridos ainda não confirmados pelo servidor têm id temporário
  // negativo — +1/−1 ficam travados até o id real do banco chegar.
  const isPending = phrase.id < 0

  const handlePlusOne = () => {
    const tx = phrasesCollection.update(phrase.id, (draft) => {
      draft.monthCount += 1
      draft.totalCount += 1
    })
    tx.isPersisted.promise.catch(() => {
      showErrorToast('Ops! Não conseguimos salvar o +1. Tenta de novo 🙈')
    })
  }

  const handleMinusOne = () => {
    if (phrase.totalCount <= 1) return
    const tx = phrasesCollection.update(phrase.id, (draft) => {
      // o -1 remove a utterance mais recente; se ela for deste mês, o contador
      // mensal desce junto (otimista — o refetch reconcilia o valor exato)
      if (draft.monthCount > 0) draft.monthCount -= 1
      draft.totalCount -= 1
    })
    tx.isPersisted.promise.catch(() => {
      showErrorToast('Ops! Não conseguimos desfazer o +1. Tenta de novo 🙈')
    })
  }

  return (
    <article className="pearl-card">
      <blockquote className="pearl-quote">“{phrase.text}”</blockquote>
      {phrase.context && <p className="pearl-context">{phrase.context}</p>}
      <div className="pearl-card-footer">
        <div className="pearl-meta">
          <span className="pearl-author">🗣️ {phrase.personName}</span>
          <time
            className="pearl-date"
            dateTime={new Date(phrase.createdAt).toISOString()}
          >
            {new Date(phrase.createdAt).toLocaleDateString('pt-BR')}
          </time>
        </div>
        <div className="pearl-counter-group">
          <span
            className="pearl-count-wrap"
            aria-label={`Dita ${phrase.monthCount} vezes este mês e ${phrase.totalCount} no total`}
          >
            <span key={phrase.monthCount} className="pearl-count pop">
              {phrase.monthCount}
            </span>
            <span className="pearl-count-label">este mês</span>
            <span className="pearl-total">{phrase.totalCount} no total</span>
          </span>
          <button
            type="button"
            className="btn-minus"
            onClick={handleMinusOne}
            disabled={isPending || phrase.totalCount <= 1}
            aria-label={`Desfazer um +1 da pérola de ${phrase.personName}`}
            title="Foi sem querer (desfaz um +1)"
          >
            −1
          </button>
          <button
            type="button"
            className="btn-plus"
            onClick={handlePlusOne}
            disabled={isPending}
            aria-label={`Disse de novo: somar 1 à pérola de ${phrase.personName}`}
            title="Disse de novo!"
          >
            +1
          </button>
        </div>
      </div>
    </article>
  )
}
