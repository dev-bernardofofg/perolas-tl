import { useSyncExternalStore } from 'react'

// Qualquer botão de escrita pode pedir identificação: incrementa a versão e
// o modal do WhoAmI (montado no footer) abre. Sem contexto React — mesmo
// padrão do store de toasts.

let version = 0
const listeners = new Set<() => void>()

export function requestIdentity() {
  version += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useIdentityRequestVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
}
