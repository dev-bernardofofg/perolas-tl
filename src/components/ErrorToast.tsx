import { dismissToast, useToasts } from '#/lib/toast'

export default function ErrorToast() {
  const toasts = useToasts()

  return (
    <div className="toast-region" aria-live="assertive" aria-label="Avisos de erro">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="alert">
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
