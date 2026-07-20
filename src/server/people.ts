import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '#/db'
import { normalizeName, slugifyName } from '#/lib/normalize'
import { currentDay } from '#/lib/month'

export type PersonBadge = { emoji: string; label: string; title: string }

export type PersonRow = {
  id: number
  name: string
  phraseCount: number
  totalSaid: number
  createdAt: Date
  lastDay: string | null
  daysSinceLast: number | null
  currentStreak: number
  badges: Array<PersonBadge>
}

// 'YYYY-MM-DD' ± delta dias (meio-dia UTC evita rolagem de fuso na conta)
function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function diffDays(later: string, earlier: string) {
  return Math.round(
    (Date.parse(`${later}T12:00:00Z`) - Date.parse(`${earlier}T12:00:00Z`)) /
      86_400_000,
  )
}

export const listPeople = createServerFn({ method: 'GET' }).handler(async () => {
  // COUNT(DISTINCT ph.id) por causa do fan-out do join com utterances
  const [rows, dayRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: number
        name: string
        phraseCount: number
        totalSaid: number
        createdAt: Date
      }>
    >`
      SELECT pe.id, pe.name, pe."createdAt",
             COUNT(DISTINCT ph.id)::int AS "phraseCount",
             COUNT(u.id)::int           AS "totalSaid"
      FROM "people" pe
      LEFT JOIN "phrases" ph ON ph."personId" = pe.id
      LEFT JOIN "utterances" u ON u."phraseId" = ph.id
      GROUP BY pe.id
      ORDER BY "totalSaid" DESC, pe.name ASC
    `,
    // dias (fuso Recife) com pérola dita, por pessoa — base de streak e badges
    prisma.$queryRaw<Array<{ pid: number; day: string; n: number }>>`
      SELECT ph."personId" AS pid,
             to_char((u."saidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Recife', 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS n
      FROM "utterances" u
      JOIN "phrases" ph ON ph.id = u."phraseId"
      GROUP BY pid, day
    `,
  ])

  const byPerson = new Map<number, Array<{ day: string; n: number }>>()
  for (const r of dayRows) {
    const list = byPerson.get(r.pid) ?? []
    list.push({ day: r.day, n: r.n })
    byPerson.set(r.pid, list)
  }

  const today = currentDay()
  const maxTotal = Math.max(0, ...rows.map((r) => r.totalSaid))

  return rows.map((row): PersonRow => {
    const days = byPerson.get(row.id) ?? []
    const daySet = new Set(days.map((d) => d.day))
    const lastDay = days.length
      ? days.map((d) => d.day).sort((a, b) => b.localeCompare(a))[0]
      : null
    const maxInOneDay = days.reduce((max, d) => Math.max(max, d.n), 0)
    const distinctMonths = new Set(days.map((d) => d.day.slice(0, 7))).size

    // streak "vivo": conta dias consecutivos terminando hoje ou ontem
    let currentStreak = 0
    let cursor = daySet.has(today)
      ? today
      : daySet.has(shiftDay(today, -1))
        ? shiftDay(today, -1)
        : null
    while (cursor && daySet.has(cursor)) {
      currentStreak += 1
      cursor = shiftDay(cursor, -1)
    }

    const badges: Array<PersonBadge> = []
    if (row.totalSaid > 0 && row.totalSaid === maxTotal) {
      badges.push({
        emoji: '👑',
        label: 'Recordista',
        title: 'Maior contador de vezes ditas do escritório',
      })
    }
    if (distinctMonths >= 3) {
      badges.push({
        emoji: '🏛️',
        label: 'Lenda',
        title: 'Pérolas ditas em 3+ meses diferentes',
      })
    }
    if (maxInOneDay >= 3) {
      badges.push({
        emoji: '🔥',
        label: 'Metralhadora',
        title: '3+ pérolas ditas num único dia',
      })
    }
    if (row.phraseCount >= 3) {
      badges.push({
        emoji: '📚',
        label: 'Acervo vivo',
        title: '3+ pérolas no catálogo',
      })
    }
    if (Date.now() - new Date(row.createdAt).getTime() < 7 * 86_400_000) {
      badges.push({
        emoji: '🐣',
        label: 'Cria nova',
        title: 'Entrou pro elenco há menos de 7 dias',
      })
    }

    return {
      ...row,
      lastDay,
      daysSinceLast: lastDay ? diffDays(today, lastDay) : null,
      currentStreak,
      badges,
    }
  })
})

const MergePeopleSchema = z
  .object({
    sourceId: z.number().int().positive('Id inválido'),
    targetId: z.number().int().positive('Id inválido'),
  })
  .refine((d) => d.sourceId !== d.targetId, {
    message: 'Escolha duas pessoas diferentes para mesclar',
    path: ['targetId'],
  })

// Para quando o slug não pegou a duplicata (ex.: "Rafa" vs "Rafael Lins"):
// move todas as pérolas da origem para o destino e apaga a origem.
export const mergePeople = createServerFn({ method: 'POST' })
  .validator(MergePeopleSchema)
  .handler(({ data }) =>
    prisma.$transaction(async (tx) => {
      const [source, target] = await Promise.all([
        tx.person.findUnique({ where: { id: data.sourceId } }),
        tx.person.findUnique({ where: { id: data.targetId } }),
      ])
      if (!source || !target) throw new Error('Pessoa não encontrada')
      const moved = await tx.phrase.updateMany({
        where: { personId: data.sourceId },
        data: { personId: data.targetId },
      })
      await tx.person.delete({ where: { id: data.sourceId } })
      return { moved: moved.count, target: target.name }
    }),
  )

export const deletePerson = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive('Id inválido') }))
  .handler(async ({ data }) => {
    const phraseCount = await prisma.phrase.count({
      where: { personId: data.id },
    })
    if (phraseCount > 0) {
      throw new Error('Só dá para remover quem não tem pérolas no catálogo')
    }
    await prisma.person.delete({ where: { id: data.id } })
    return { deleted: true }
  })

export const createPerson = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z
        .string()
        .trim()
        .min(1, 'O nome não pode ficar em branco')
        .max(80, 'Nome grande demais — máximo de 80 caracteres'),
    }),
  )
  .handler(async ({ data }) => {
    const name = normalizeName(data.name)
    const slug = slugifyName(name)
    if (!slug) throw new Error('Nome inválido')
    // upsert por slug: registrar "rafael lins" de novo devolve o Rafael existente
    return prisma.person.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    })
  })
