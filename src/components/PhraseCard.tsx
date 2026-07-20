import { useState } from 'react'
import { phrasesCollection } from '#/db-collections/phrases'
import { showErrorToast, showSuccessToast } from '#/lib/toast'
import type { Phrase } from '#/db-collections/phrases'

export default function PhraseCard({ phrase }: { phrase: Phrase }) {
  // Cards recém-inseridos ainda não confirmados pelo servidor têm id temporário
  // negativo — ações ficam travadas até o id real do banco chegar.
  const isPending = phrase.id < 0
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [editContext, setEditContext] = useState('')

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

  const startEditing = () => {
    setEditText(phrase.text)
    setEditContext(phrase.context ?? '')
    setIsEditing(true)
  }

  const saveEdit = () => {
    const text = editText.trim()
    if (!text) return
    const context = editContext.trim() || null
    setIsEditing(false)
    if (text === phrase.text && context === phrase.context) return
    const tx = phrasesCollection.update(phrase.id, (draft) => {
      draft.text = text
      draft.context = context
    })
    tx.isPersisted.promise.catch(() => {
      showErrorToast('Ops! Não conseguimos salvar a edição. Tenta de novo 🙈')
    })
  }

  const handleDelete = () => {
    const ok = window.confirm(
      `Apagar a pérola "${phrase.text}" e todo o histórico dela? Essa não tem -1.`,
    )
    if (!ok) return
    const tx = phrasesCollection.delete(phrase.id)
    tx.isPersisted.promise.catch(() => {
      showErrorToast('Ops! Não conseguimos apagar a pérola. Tenta de novo 🙈')
    })
  }

  return (
    <article className="pearl-card">
      <div className="card-actions">
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            navigator.clipboard
              .writeText(`${window.location.origin}/p/${phrase.id}`)
              .then(() => showSuccessToast('Link copiado! Cola no grupo 📤'))
              .catch(() =>
                showErrorToast('Não deu para copiar o link. Tenta de novo 🙈'),
              )
          }}
          disabled={isPending}
          aria-label={`Copiar link da pérola de ${phrase.personName}`}
          title="Copiar link compartilhável"
        >
          📤
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={startEditing}
          disabled={isPending || isEditing}
          aria-label={`Editar a pérola de ${phrase.personName}`}
          title="Corrigir typo / editar historinha"
        >
          ✏️
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Apagar a pérola de ${phrase.personName}`}
          title="Apagar pérola (e histórico)"
        >
          🗑️
        </button>
      </div>

      {isEditing ? (
        <div className="edit-fields">
          <label className="field-label" htmlFor={`edit-text-${phrase.id}`}>
            Frase
          </label>
          <textarea
            id={`edit-text-${phrase.id}`}
            className="field-input field-textarea field-textarea-short"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
          />
          <label className="field-label" htmlFor={`edit-ctx-${phrase.id}`}>
            Como foi <span className="field-optional">(opcional)</span>
          </label>
          <textarea
            id={`edit-ctx-${phrase.id}`}
            className="field-input field-textarea field-textarea-short"
            value={editContext}
            onChange={(e) => setEditContext(e.target.value)}
            rows={2}
          />
          <div className="edit-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={saveEdit}
              disabled={!editText.trim()}
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          <blockquote className="pearl-quote">“{phrase.text}”</blockquote>
          {phrase.context && <p className="pearl-context">{phrase.context}</p>}
        </>
      )}

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
