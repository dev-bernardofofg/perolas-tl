import { useState } from 'react'
import { mergePeople } from '#/server/people'
import { refreshAllData } from '#/db-collections/phrases'
import { showErrorToast, showSuccessToast } from '#/lib/toast'
import type { PersonRow } from '#/server/people'

// A dedupe por slug pega grafias ("rafael lins" vs "Rafael Lins"), mas não
// apelidos ("Rafa" vs "Rafael Lins") — este painel resolve na mão.
export default function MergePeoplePanel({ people }: { people: Array<PersonRow> }) {
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [isMerging, setIsMerging] = useState(false)

  if (people.length < 2) return null

  const canMerge = sourceId && targetId && sourceId !== targetId && !isMerging

  const handleMerge = async () => {
    const source = people.find((p) => String(p.id) === sourceId)
    const target = people.find((p) => String(p.id) === targetId)
    if (!source || !target) return
    const ok = window.confirm(
      `Mesclar ${source.name} dentro de ${target.name}? ` +
        `As ${source.phraseCount} pérola(s) de ${source.name} passam a ser de ${target.name}, e ${source.name} sai do elenco.`,
    )
    if (!ok) return
    setIsMerging(true)
    try {
      const result = await mergePeople({
        data: { sourceId: source.id, targetId: target.id },
      })
      refreshAllData()
      setSourceId('')
      setTargetId('')
      showSuccessToast(
        `Mesclado! ${result.moved} pérola(s) agora são de ${result.target} 🧬`,
      )
    } catch {
      showErrorToast('Não conseguimos mesclar. Tenta de novo 🙈')
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <section className="merge-panel" aria-labelledby="merge-title">
      <h2 id="merge-title" className="section-title">
        🧬 Mesclar pessoas
      </h2>
      <p className="merge-hint">
        Para quando a mesma pessoa entrou duas vezes (apelido vs nome completo).
      </p>
      <div className="merge-controls">
        <label className="merge-field">
          <span className="field-label">Quem some</span>
          <select
            className="period-select"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">Escolha…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.phraseCount} pérolas)
              </option>
            ))}
          </select>
        </label>
        <span className="merge-arrow" aria-hidden="true">
          →
        </span>
        <label className="merge-field">
          <span className="field-label">Quem fica</span>
          <select
            className="period-select"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Escolha…</option>
            {people
              .filter((p) => String(p.id) !== sourceId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phraseCount} pérolas)
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void handleMerge()}
          disabled={!canMerge}
        >
          {isMerging ? 'Mesclando…' : 'Mesclar'}
        </button>
      </div>
    </section>
  )
}
