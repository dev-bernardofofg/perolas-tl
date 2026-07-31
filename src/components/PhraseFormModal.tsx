import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useHotkey } from '@tanstack/react-hotkeys'
import PhraseForm from '#/components/PhraseForm'
import { whoQueryOptions } from '#/lib/who-query'
import { requestIdentity } from '#/lib/identity-modal'
import { showSuccessToast } from '#/lib/toast'

// Modal nativo (<dialog>): focus trap e Esc de graça, zero deps.
// O PhraseForm só monta com o modal aberto — assim o Ctrl+Enter dele
// não dispara com o modal fechado.
export default function PhraseFormModal() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { data: who } = useQuery(whoQueryOptions)

  const open = () => {
    // escrever exige identidade: sem ela, abre o "Quem é você?" primeiro
    if (!who?.person) {
      requestIdentity()
      return
    }
    setIsOpen(true)
    dialogRef.current?.showModal()
  }

  useHotkey('Mod+K', open)

  return (
    <>
      <button type="button" className="btn-primary btn-open-form" onClick={open}>
        📌 Registrar pérola
      </button>

      <dialog
        ref={dialogRef}
        className="app-modal phrase-modal"
        onClose={() => setIsOpen(false)}
      >
        {isOpen && (
          <PhraseForm
            onSuccess={() => {
              dialogRef.current?.close()
              showSuccessToast('Pérola registrada! 📌')
            }}
          />
        )}
      </dialog>
    </>
  )
}
