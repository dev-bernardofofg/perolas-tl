import { useSyncExternalStore } from 'react'

// Store mínimo de toasts (sem lib externa e sem localStorage).

export type Toast = {
  id: number
  message: string
  kind: 'error' | 'success'
}

let toasts: Array<Toast> = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function pushToast(message: string, kind: Toast['kind']) {
  const toast: Toast = { id: nextId++, message, kind }
  toasts = [...toasts, toast]
  emit()
  setTimeout(() => dismissToast(toast.id), 5000)
}

export function showErrorToast(message: string) {
  pushToast(message, 'error')
}

export function showSuccessToast(message: string) {
  pushToast(message, 'success')
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
