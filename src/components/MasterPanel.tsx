import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loginMaster, logoutMaster } from '#/server/auth'
import { masterQueryOptions } from '#/lib/master-query'
import { getQueryClient } from '#/integrations/tanstack-query/root-provider'
import { showErrorToast, showSuccessToast } from '#/lib/toast'

// Entrada discreta do modo master no footer: login por senha única via
// cookie HttpOnly. A UI só decide o que mostrar — o servidor revalida tudo.
export default function MasterPanel() {
  const { data } = useQuery(masterQueryOptions)
  const isMaster = data?.isMaster ?? false
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const refreshStatus = () =>
    void getQueryClient().invalidateQueries({ queryKey: ['master'] })

  const handleLogin = async () => {
    if (!password.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await loginMaster({ data: { password } })
      refreshStatus()
      setPassword('')
      dialogRef.current?.close()
      showSuccessToast('Modo master ativado 🔓')
    } catch (error) {
      showErrorToast(
        error instanceof Error && error.message
          ? error.message
          : 'Não conseguimos entrar. Tenta de novo 🙈',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutMaster()
      refreshStatus()
      showSuccessToast('Modo master desativado 🔒')
    } catch {
      showErrorToast('Não conseguimos sair. Tenta de novo 🙈')
    }
  }

  return (
    <>
      {isMaster ? (
        <button
          type="button"
          className="master-toggle"
          onClick={() => void handleLogout()}
        >
          🔓 Sair do modo master
        </button>
      ) : (
        <button
          type="button"
          className="master-toggle"
          onClick={() => dialogRef.current?.showModal()}
        >
          🔑 Modo master
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="app-modal master-modal"
        aria-labelledby="master-title"
      >
        <h2 id="master-title" className="panel-title">
          🔑 Modo master
        </h2>
        <p className="merge-hint">
          Libera apagar/editar pérolas e gerenciar pessoas neste navegador.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleLogin()
          }}
        >
          <div className="field-group">
            <label htmlFor="master-password" className="field-label">
              Senha
            </label>
            <input
              id="master-password"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
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
              disabled={!password.trim() || isSubmitting}
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
