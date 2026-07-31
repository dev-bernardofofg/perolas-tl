import { prisma } from '#/db'

// Helper server-only da auditoria (módulo .server.ts separado das server
// functions pelo mesmo motivo de identity.server.ts).

type AuditEntry = {
  action: string
  actorId: number | null
  summary: string
  payload?: unknown
}

// Auditoria nunca derruba a ação que está sendo auditada.
export async function logAction(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        summary: entry.summary,
        payload: entry.payload as never,
      },
    })
  } catch (error) {
    console.error('auditoria falhou (ação seguiu normal):', error)
  }
}
