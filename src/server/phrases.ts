import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '#/db'
import { masterMiddleware } from '#/server/auth'
import { requireActorId } from '#/server/identity.server'
import { logAction } from '#/server/audit.server'
import { normalizeName, slugifyName } from '#/lib/normalize'
import { PERIOD_REGEX, PERIOD_TOTAL, currentPeriod, monthRange } from '#/lib/month'

// Único gateway para o banco: toda leitura/escrita passa por estas server functions.
// Cada "+1" é uma linha em utterances — total e mensal são COUNTs com filtro de data.

export type PhraseListRow = {
  id: number
  text: string
  context: string | null
  personId: number
  personName: string
  monthCount: number
  totalCount: number
  createdAt: Date
}

const CreatePhraseSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'A frase não pode ficar em branco')
      .max(500, 'Calma, isso já virou um discurso — máximo de 500 caracteres'),
    context: z
      .string()
      .trim()
      .max(500, 'A historinha passou do limite — máximo de 500 caracteres')
      .nullish()
      .transform((v) => (v ? v : undefined)),
    personId: z.number().int().positive().optional(),
    personName: z.string().trim().min(1).max(80).optional(),
  })
  .refine((d) => d.personId != null || !!d.personName, {
    message: 'Toda pérola tem um autor — diga quem soltou essa',
    path: ['personName'],
  })

const UtteranceSchema = z.object({
  phraseId: z.number().int().positive('Id inválido'),
  // times > 1 porque o TanStack DB pode mesclar cliques rápidos numa transação só
  times: z.number().int().min(1).max(50).default(1),
})

const RankingSchema = z.object({
  period: z.union([
    z.literal(PERIOD_TOTAL),
    z.string().regex(PERIOD_REGEX, 'Período inválido'),
  ]),
})

export const listPhrases = createServerFn({ method: 'GET' }).handler(async () => {
  const { start, end } = monthRange(currentPeriod())
  const rows = await prisma.$queryRaw<Array<PhraseListRow>>`
    SELECT ph.id, ph.text, ph.context, ph."personId", ph."createdAt",
           pe.name AS "personName",
           COUNT(u.id)::int AS "totalCount",
           (COUNT(u.id) FILTER (WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}))::int AS "monthCount"
    FROM "phrases" ph
    JOIN "people" pe ON pe.id = ph."personId"
    LEFT JOIN "utterances" u ON u."phraseId" = ph.id
    GROUP BY ph.id, pe.name
    ORDER BY "monthCount" DESC, "totalCount" DESC, ph."createdAt" ASC
  `
  return rows
})

export const getPhraseById = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.number().int().positive('Id inválido') }))
  .handler(async ({ data }) => {
    const { start, end } = monthRange(currentPeriod())
    const rows = await prisma.$queryRaw<Array<PhraseListRow>>`
      SELECT ph.id, ph.text, ph.context, ph."personId", ph."createdAt",
             pe.name AS "personName",
             COUNT(u.id)::int AS "totalCount",
             (COUNT(u.id) FILTER (WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}))::int AS "monthCount"
      FROM "phrases" ph
      JOIN "people" pe ON pe.id = ph."personId"
      LEFT JOIN "utterances" u ON u."phraseId" = ph.id
      WHERE ph.id = ${data.id}
      GROUP BY ph.id, pe.name
    `
    return rows[0] ?? null
  })

export const createPhrase = createServerFn({ method: 'POST' })
  .validator(CreatePhraseSchema)
  .handler(async ({ data }) => {
    let personId = data.personId
    if (personId == null) {
      const name = normalizeName(data.personName!)
      const slug = slugifyName(name)
      if (!slug) throw new Error('Nome de autor inválido')
      const person = await prisma.person.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      })
      personId = person.id
    }
    const actorId = await requireActorId()
    // a primeira utterance nasce junto: registrar a pérola = ela foi dita 1x
    const phrase = await prisma.phrase.create({
      data: {
        text: data.text,
        context: data.context,
        personId,
        utterances: { create: { actorId } },
      },
      include: { person: { select: { name: true } } },
    })
    await logAction({
      action: 'phrase.create',
      actorId,
      summary: `registrou “${phrase.text}” de ${phrase.person.name}`,
    })
    return phrase
  })

const UpdatePhraseSchema = z.object({
  id: z.number().int().positive('Id inválido'),
  text: z
    .string()
    .trim()
    .min(1, 'A frase não pode ficar em branco')
    .max(500, 'Calma, isso já virou um discurso — máximo de 500 caracteres'),
  // null explícito limpa o contexto (diferente do create, onde undefined = omitido)
  context: z
    .string()
    .trim()
    .max(500, 'A historinha passou do limite — máximo de 500 caracteres')
    .nullable(),
})

export const updatePhrase = createServerFn({ method: 'POST' })
  .middleware([masterMiddleware])
  .validator(UpdatePhraseSchema)
  .handler(async ({ data }) => {
    const actorId = await requireActorId()
    const before = await prisma.phrase.findUnique({
      where: { id: data.id },
      select: { text: true, context: true },
    })
    if (!before) throw new Error('Pérola não encontrada')
    const updated = await prisma.phrase.update({
      where: { id: data.id },
      data: { text: data.text, context: data.context || null },
    })
    await logAction({
      action: 'phrase.edit',
      actorId,
      summary: `editou “${before.text}”${before.text !== updated.text ? ` → “${updated.text}”` : ''}`,
      payload: {
        before,
        after: { text: updated.text, context: updated.context },
      },
    })
    return updated
  })

export const deletePhrase = createServerFn({ method: 'POST' })
  .middleware([masterMiddleware])
  .validator(z.object({ id: z.number().int().positive('Id inválido') }))
  .handler(async ({ data }) => {
    const actorId = await requireActorId()
    const phrase = await prisma.phrase.findUnique({
      where: { id: data.id },
      select: {
        text: true,
        context: true,
        person: { select: { name: true } },
        _count: { select: { utterances: true } },
      },
    })
    if (!phrase) return { deleted: false }
    // utterances caem em cascata (onDelete: Cascade no schema)
    await prisma.phrase.delete({ where: { id: data.id } })
    await logAction({
      action: 'phrase.delete',
      actorId,
      summary: `apagou “${phrase.text}” de ${phrase.person.name} (${phrase._count.utterances} registro(s))`,
      payload: { text: phrase.text, context: phrase.context },
    })
    return { deleted: true }
  })

export type FeedEntry = {
  id: number
  saidAt: Date
  text: string
  personName: string
  actorName: string | null
  isFirst: boolean
}

export const getFeed = createServerFn({ method: 'GET' }).handler(async () => {
  // isFirst distingue "registrou a pérola" de "disse de novo" (+1);
  // actorName é quem clicou (null na era pré-identidade)
  const rows = await prisma.$queryRaw<Array<FeedEntry>>`
    SELECT u.id, u."saidAt", ph.text, pe.name AS "personName",
           actor.name AS "actorName",
           (u.id = (SELECT MIN(id) FROM "utterances" WHERE "phraseId" = ph.id)) AS "isFirst"
    FROM "utterances" u
    JOIN "phrases" ph ON ph.id = u."phraseId"
    JOIN "people" pe ON pe.id = ph."personId"
    LEFT JOIN "people" actor ON actor.id = u."actorId"
    ORDER BY u."saidAt" DESC, u.id DESC
    LIMIT 8
  `
  return rows
})

export type DailyPearl = {
  id: number
  text: string
  context: string | null
  personName: string
  totalCount: number
  lastSaidAt: Date
}

const DailyPearlSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dia inválido'),
})

export const getDailyPearl = createServerFn({ method: 'GET' })
  .validator(DailyPearlSchema)
  .handler(async ({ data }) => {
    // Sorteio determinístico por dia (md5 do dia + id): todo mundo vê a mesma
    // pérola o dia inteiro. Prioriza as esquecidas — quem não é dita há mais
    // de 7 dias entra primeiro no sorteio.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const rows = await prisma.$queryRaw<Array<DailyPearl>>`
      WITH stats AS (
        SELECT ph.id, ph.text, ph.context, pe.name AS "personName",
               COUNT(u.id)::int AS "totalCount",
               MAX(u."saidAt") AS "lastSaidAt"
        FROM "phrases" ph
        JOIN "people" pe ON pe.id = ph."personId"
        LEFT JOIN "utterances" u ON u."phraseId" = ph.id
        GROUP BY ph.id, pe.name
      )
      SELECT * FROM stats
      ORDER BY ("lastSaidAt" >= ${sevenDaysAgo}) ASC NULLS FIRST,
               md5(${data.day} || id::text) ASC
      LIMIT 1
    `
    return rows[0] ?? null
  })

export const registerUtterance = createServerFn({ method: 'POST' })
  .validator(UtteranceSchema)
  .handler(async ({ data }) => {
    const actorId = await requireActorId()
    await prisma.utterance.createMany({
      data: Array.from({ length: data.times }, () => ({
        phraseId: data.phraseId,
        actorId,
      })),
    })
    const phrase = await prisma.phrase.findUnique({
      where: { id: data.phraseId },
      select: { text: true },
    })
    await logAction({
      action: 'utterance.add',
      actorId,
      summary: `deu +${data.times} em “${phrase?.text ?? `#${data.phraseId}`}”`,
    })
    return { registered: data.times }
  })

export const undoUtterance = createServerFn({ method: 'POST' })
  .validator(UtteranceSchema)
  .handler(async ({ data }) => {
    const actorId = await requireActorId()
    const result = await prisma.$transaction(async (tx) => {
      // Piso em 1: a pérola foi dita pelo menos uma vez ao ser registrada.
      // As vítimas são escolhidas por ordem determinística (mais recente
      // primeiro) — dois desfazeres concorrentes miram a mesma linha e o
      // segundo delete vira no-op em vez de furar o piso.
      const total = await tx.utterance.count({
        where: { phraseId: data.phraseId },
      })
      const deletable = Math.min(data.times, Math.max(total - 1, 0))
      if (deletable === 0) return { deleted: 0 }
      const victims = await tx.utterance.findMany({
        where: { phraseId: data.phraseId },
        orderBy: [{ saidAt: 'desc' }, { id: 'desc' }],
        take: deletable,
        select: { id: true },
      })
      await tx.utterance.deleteMany({
        where: { id: { in: victims.map((v) => v.id) } },
      })
      return { deleted: deletable }
    })
    if (result.deleted > 0) {
      const phrase = await prisma.phrase.findUnique({
        where: { id: data.phraseId },
        select: { text: true },
      })
      await logAction({
        action: 'utterance.undo',
        actorId,
        summary: `desfez ${result.deleted} registro(s) de “${phrase?.text ?? `#${data.phraseId}`}”`,
      })
    }
    return result
  })

export const getRanking = createServerFn({ method: 'GET' })
  .validator(RankingSchema)
  .handler(async ({ data }) => {
    const range = data.period === PERIOD_TOTAL ? null : monthRange(data.period)
    const start = range?.start ?? new Date(0)
    const end = range?.end ?? new Date('3000-01-01T00:00:00Z')

    const [topPhrases, topAuthors, incentivadores, deduradores, months] =
      await Promise.all([
      prisma.$queryRaw<
        Array<{ id: number; text: string; personName: string; count: number }>
      >`
        SELECT ph.id, ph.text, pe.name AS "personName", COUNT(u.id)::int AS count
        FROM "utterances" u
        JOIN "phrases" ph ON ph.id = u."phraseId"
        JOIN "people" pe ON pe.id = ph."personId"
        WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
        GROUP BY ph.id, pe.name
        ORDER BY count DESC, ph."createdAt" ASC
        LIMIT 10
      `,
      prisma.$queryRaw<
        Array<{ author: string; total: number; phraseCount: number }>
      >`
        SELECT pe.name AS author,
               COUNT(u.id)::int AS total,
               COUNT(DISTINCT ph.id)::int AS "phraseCount"
        FROM "utterances" u
        JOIN "phrases" ph ON ph.id = u."phraseId"
        JOIN "people" pe ON pe.id = ph."personId"
        WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
        GROUP BY pe.id, pe.name
        ORDER BY total DESC, author ASC
        LIMIT 10
      `,
      // Incentivadores: +1s dados (exclui a utterance de registro da pérola)
      prisma.$queryRaw<Array<{ name: string; total: number }>>`
        SELECT pe.name, COUNT(*)::int AS total
        FROM "utterances" u
        JOIN "people" pe ON pe.id = u."actorId"
        WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
          AND u.id <> (SELECT MIN(id) FROM "utterances" WHERE "phraseId" = u."phraseId")
        GROUP BY pe.id, pe.name
        ORDER BY total DESC, pe.name ASC
        LIMIT 10
      `,
      // Deduradores: registros de pérola (a primeira utterance de cada)
      prisma.$queryRaw<Array<{ name: string; total: number }>>`
        SELECT pe.name, COUNT(*)::int AS total
        FROM "utterances" u
        JOIN "people" pe ON pe.id = u."actorId"
        WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
          AND u.id = (SELECT MIN(id) FROM "utterances" WHERE "phraseId" = u."phraseId")
        GROUP BY pe.id, pe.name
        ORDER BY total DESC, pe.name ASC
        LIMIT 10
      `,
      // saidAt é timestamp naive em UTC: marca como UTC e converte pra Recife
      prisma.$queryRaw<Array<{ period: string }>>`
        SELECT DISTINCT to_char(
          (u."saidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Recife',
          'YYYY-MM'
        ) AS period
        FROM "utterances" u
        ORDER BY period DESC
      `,
    ])

    return {
      topPhrases,
      topAuthors,
      incentivadores,
      deduradores,
      availableMonths: months.map((m) => m.period),
    }
  })
