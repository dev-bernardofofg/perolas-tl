import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { z } from 'zod'
import { prisma } from '#/db'
import { normalizeName, slugifyName } from '#/lib/normalize'
import {
  WHO_MAX_AGE_DAYS,
  readWhoCookie,
  setWhoCookie,
} from '#/server/identity.server'

// Identidade leve baseada em confiança (app de escritório): a pessoa escolhe
// quem é uma vez e um cookie HttpOnly guarda o personId. Sem senha — assinar
// o cookie seria teatro, já que escolher qualquer identidade é livre pela
// própria UI; o que protege o histórico é a AUDITORIA de tudo que cada
// identidade faz. Escrever exige identidade (decisão de produto).
// Este arquivo só tem server functions (helpers puros ficam no .server.ts —
// exports não-serverFn vazariam imports server-only pro bundle client).

export const whoAmI = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'no-store')
  const id = readWhoCookie()
  if (!id) return { person: null }
  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  return { person: person ?? null }
})

export const identify = createServerFn({ method: 'POST' })
  .validator(
    z
      .object({
        personId: z.number().int().positive().optional(),
        personName: z.string().trim().min(1).max(80).optional(),
      })
      .refine((d) => d.personId != null || !!d.personName, {
        message: 'Diga quem você é',
        path: ['personName'],
      }),
  )
  .handler(async ({ data }) => {
    let person: { id: number; name: string }
    if (data.personId != null) {
      const found = await prisma.person.findUnique({
        where: { id: data.personId },
        select: { id: true, name: true },
      })
      if (!found) throw new Error('Pessoa não encontrada')
      person = found
    } else {
      const name = normalizeName(data.personName!)
      const slug = slugifyName(name)
      if (!slug) throw new Error('Nome inválido')
      person = await prisma.person.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
        select: { id: true, name: true },
      })
    }
    setWhoCookie(String(person.id), WHO_MAX_AGE_DAYS * 86_400)
    return { person }
  })
