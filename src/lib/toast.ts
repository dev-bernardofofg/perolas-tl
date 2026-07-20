import { useSyncExternalStore } from 'react'

// Store mínimo de toasts de erro (sem lib externa e sem localStorage).

export type Toast = {
  id: number
  message: string
}

let toasts: Array<Toast> = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function showErrorToast(message: string) {
  const toast: Toast = { id: nextId++, message }
  toasts = [...toasts, toast]
  emit()
  setTimeout(() => dismissToast(toast.id), 5000)
}

export function dismissToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  )
}
