import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '#/db'
import { normalizeName, slugifyName } from '#/lib/normalize'

export type PersonRow = {
  id: number
  name: string
  phraseCount: number
  totalSaid: number
  createdAt: Date
}

export const listPeople = createServerFn({ method: 'GET' }).handler(async () => {
  // COUNT(DISTINCT ph.id) por causa do fan-out do join com utterances
  const rows = await prisma.$queryRaw<Array<PersonRow>>`
    SELECT pe.id, pe.name, pe."createdAt",
           COUNT(DISTINCT ph.id)::int AS "phraseCount",
           COUNT(u.id)::int           AS "totalSaid"
    FROM "people" pe
    LEFT JOIN "phrases" ph ON ph."personId" = pe.id
    LEFT JOIN "utterances" u ON u."phraseId" = ph.id
    GROUP BY pe.id
    ORDER BY "totalSaid" DESC, pe.name ASC
  `
  return rows
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
