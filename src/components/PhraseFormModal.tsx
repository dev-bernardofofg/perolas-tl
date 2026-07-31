import { useRef, useState } from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'
import PhraseForm from '#/components/PhraseForm'
import { showSuccessToast } from '#/lib/toast'

// Modal nativo (<dialog>): focus trap e Esc de graça, zero deps.
// O PhraseForm só monta com o modal aberto — assim o Ctrl+Enter dele
// não dispara com o modal fechado.
export default function PhraseFormModal() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = () => {
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
