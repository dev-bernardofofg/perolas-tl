import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '#/db'

// Único gateway para o banco: toda leitura/escrita passa por estas server functions.

const CreatePhraseSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'A frase não pode ficar em branco')
    .max(500, 'Calma, isso já virou um discurso — máximo de 500 caracteres'),
  author: z
    .string()
    .trim()
    .min(1, 'Toda pérola tem um autor — diga quem soltou essa')
    .max(80, 'Nome grande demais — máximo de 80 caracteres'),
})

const AdjustCountSchema = z.object({
  id: z.number().int().positive('Id inválido'),
  delta: z
    .number()
    .int()
    .min(-50, 'Delta fora do limite')
    .max(50, 'Delta fora do limite')
    .refine((d) => d !== 0, 'Delta não pode ser zero'),
})

export const listPhrases = createServerFn({ method: 'GET' }).handler(() =>
  prisma.phrase.findMany({
    orderBy: [{ count: 'desc' }, { createdAt: 'asc' }],
  }),
)

export const createPhrase = createServerFn({ method: 'POST' })
  .validator(CreatePhraseSchema)
  .handler(({ data }) =>
    prisma.phrase.create({
      data: {
        text: data.text,
        // Colapsa espaços internos para o ranking por autor não duplicar "João  Silva"
        author: data.author.replace(/\s+/g, ' '),
      },
    }),
  )

export const adjustPhraseCount = createServerFn({ method: 'POST' })
  .validator(AdjustCountSchema)
  .handler(async ({ data }) => {
    // Delta aplicado em um único UPDATE atômico (seguro sob cliques concorrentes
    // em várias abas) com GREATEST como piso: o contador nunca desce abaixo de 1
    // — a pérola foi dita pelo menos uma vez quando registrada. Aceita delta > 1
    // porque o TanStack DB pode mesclar cliques rápidos numa transação só.
    const updated = await prisma.$executeRaw`
      UPDATE "phrases"
      SET "count" = GREATEST("count" + ${data.delta}, 1)
      WHERE "id" = ${data.id}
    `
    return { updated }
  })

export const getRanking = createServerFn({ method: 'GET' }).handler(async () => {
  const [topPhrases, topAuthors] = await Promise.all([
    prisma.phrase.findMany({
      orderBy: [{ count: 'desc' }, { createdAt: 'asc' }],
      take: 10,
    }),
    prisma.phrase.groupBy({
      by: ['author'],
      _sum: { count: true },
      _count: { _all: true },
      orderBy: { _sum: { count: 'desc' } },
      take: 10,
    }),
  ])

  return {
    topPhrases,
    topAuthors: topAuthors.map((a) => ({
      author: a.author,
      total: a._sum.count ?? 0,
      phraseCount: a._count._all,
    })),
  }
})
