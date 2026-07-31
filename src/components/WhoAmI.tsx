import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { identify } from '#/server/identity'
import { whoQueryOptions } from '#/lib/who-query'
import { peopleQueryOptions } from '#/lib/people-query'
import { useIdentityRequestVersion } from '#/lib/identity-modal'
import { getQueryClient } from '#/integrations/tanstack-query/root-provider'
import { normalizeName, slugifyName } from '#/lib/normalize'
import { showErrorToast, showSuccessToast } from '#/lib/toast'

// "Quem é você?" — identidade leve por navegador (cookie HttpOnly).
// Montado no footer; abre sozinho quando algum botão de escrita pede
// identificação (useIdentityRequestVersion).
export default function WhoAmI() {
  const { data: who } = useQuery(whoQueryOptions)
  const { data: people } = useQuery(peopleQueryOptions)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const requestVersion = useIdentityRequestVersion()

  useEffect(() => {
    if (requestVersion > 0) dialogRef.current?.showModal()
  }, [requestVersion])

  const handleIdentify = async () => {
    const typed = normalizeName(name)
    if (!typed || isSubmitting) return
    setIsSubmitting(true)
    try {
      const existing = people?.find(
        (p) => slugifyName(p.name) === slugifyName(typed),
      )
      const result = await identify({
        data: existing ? { personId: existing.id } : { personName: typed },
      })
      const queryClient = getQueryClient()
      // aguarda o refetch de ['who'] aterrissar antes de fechar: o próximo
      // clique já encontra a identidade fresca (sem janela de gate falso)
      await queryClient.invalidateQueries({ queryKey: ['who'] })
      void queryClient.invalidateQueries({ queryKey: ['people'] })
      setName('')
      dialogRef.current?.close()
      showSuccessToast(`Salve, ${result.person.name}! 👊 Agora é contigo.`)
    } catch {
      showErrorToast('Não conseguimos te identificar. Tenta de novo 🙈')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`who-chip ${who?.person ? '' : 'is-unknown'}`}
        onClick={() => dialogRef.current?.showModal()}
        title={
          who?.person
            ? 'Trocar de identidade'
            : 'Escolha quem você é para participar'
        }
      >
        {who?.person ? `👤 ${who.person.name}` : '👤 Quem é você?'}
      </button>

      <dialog
        ref={dialogRef}
        className="app-modal master-modal"
        aria-labelledby="who-title"
      >
        <h2 id="who-title" className="panel-title">
          👤 Quem é você?
        </h2>
        <p className="merge-hint">
          Registrar pérolas e dar +1 fica no seu nome — é assim que o feed e a
          auditoria sabem quem foi.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleIdentify()
          }}
        >
          <div className="field-group">
            <label htmlFor="who-name" className="field-label">
              Seu nome
            </label>
            <input
              id="who-name"
              type="text"
              list="pessoas-identidade"
              className="field-input"
              placeholder="Escolha ou digite um nome novo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
            <datalist id="pessoas-identidade">
              {people?.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div className="edit-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Salvando…' : 'Sou eu!'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
