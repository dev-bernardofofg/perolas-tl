import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { prisma } from '#/db'
import { masterMiddleware } from '#/server/auth'

// Trilha de auditoria: o resumo humano é desnormalizado de propósito —
// sobrevive à exclusão do que descreve. payload guarda antes/depois.
// (O helper logAction vive em audit.server.ts — server-only.)

export type AuditRow = {
  id: number
  action: string
  summary: string
  actorName: string | null
  createdAt: Date
}

export const getAuditLog = createServerFn({ method: 'GET' })
  .middleware([masterMiddleware])
  .handler(async () => {
    setResponseHeader('Cache-Control', 'no-store')
    const rows = await prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      take: 100,
      include: { actor: { select: { name: true } } },
    })
    return rows.map(
      (r): AuditRow => ({
        id: r.id,
        action: r.action,
        summary: r.summary,
        actorName: r.actor?.name ?? null,
        createdAt: r.createdAt,
      }),
    )
  })
