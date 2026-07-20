import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '#/db'
import { PERIOD_REGEX, currentPeriod, monthRange } from '#/lib/month'

// Retrospectiva mensal: tudo derivado do ledger de utterances, zero schema novo.

const RetroSchema = z.object({
  // ausente = mês mais recente com registro (ou o corrente)
  period: z.string().regex(PERIOD_REGEX, 'Período inválido').optional(),
})

export const getRetro = createServerFn({ method: 'GET' })
  .validator(RetroSchema)
  .handler(async ({ data }) => {
    const months = await prisma.$queryRaw<Array<{ period: string }>>`
      SELECT DISTINCT to_char(
        (u."saidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Recife',
        'YYYY-MM'
      ) AS period
      FROM "utterances" u
      ORDER BY period DESC
    `
    const availableMonths = months.map((m) => m.period)
    const period = data.period ?? availableMonths[0] ?? currentPeriod()
    const { start, end } = monthRange(period)

    const [totals, topPhrase, topTalker, busiestDay, newcomer] =
      await Promise.all([
        prisma.$queryRaw<
          Array<{ said: number; newPhrases: number; newPeople: number }>
        >`
          SELECT
            (SELECT COUNT(*) FROM "utterances" WHERE "saidAt" >= ${start} AND "saidAt" < ${end})::int AS said,
            (SELECT COUNT(*) FROM "phrases" WHERE "createdAt" >= ${start} AND "createdAt" < ${end})::int AS "newPhrases",
            (SELECT COUNT(*) FROM "people" WHERE "createdAt" >= ${start} AND "createdAt" < ${end})::int AS "newPeople"
        `,
        prisma.$queryRaw<
          Array<{ text: string; personName: string; count: number }>
        >`
          SELECT ph.text, pe.name AS "personName", COUNT(u.id)::int AS count
          FROM "utterances" u
          JOIN "phrases" ph ON ph.id = u."phraseId"
          JOIN "people" pe ON pe.id = ph."personId"
          WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
          GROUP BY ph.id, pe.name
          ORDER BY count DESC, ph."createdAt" ASC
          LIMIT 1
        `,
        prisma.$queryRaw<
          Array<{ name: string; total: number; phraseCount: number }>
        >`
          SELECT pe.name, COUNT(u.id)::int AS total,
                 COUNT(DISTINCT ph.id)::int AS "phraseCount"
          FROM "utterances" u
          JOIN "phrases" ph ON ph.id = u."phraseId"
          JOIN "people" pe ON pe.id = ph."personId"
          WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
          GROUP BY pe.id, pe.name
          ORDER BY total DESC, pe.name ASC
          LIMIT 1
        `,
        prisma.$queryRaw<Array<{ day: string; count: number }>>`
          SELECT to_char(
                   (u."saidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Recife',
                   'DD/MM'
                 ) AS day,
                 COUNT(*)::int AS count
          FROM "utterances" u
          WHERE u."saidAt" >= ${start} AND u."saidAt" < ${end}
          GROUP BY day
          ORDER BY count DESC, day ASC
          LIMIT 1
        `,
        // revelação: quem entrou pro elenco NESTE mês e mais rendeu nele
        prisma.$queryRaw<Array<{ name: string; total: number }>>`
          SELECT pe.name, COUNT(u.id)::int AS total
          FROM "people" pe
          JOIN "phrases" ph ON ph."personId" = pe.id
          JOIN "utterances" u ON u."phraseId" = ph.id
          WHERE pe."createdAt" >= ${start} AND pe."createdAt" < ${end}
            AND u."saidAt" >= ${start} AND u."saidAt" < ${end}
          GROUP BY pe.id, pe.name
          ORDER BY total DESC, pe.name ASC
          LIMIT 1
        `,
      ])

    return {
      period,
      availableMonths,
      totals: totals[0] ?? { said: 0, newPhrases: 0, newPeople: 0 },
      topPhrase: topPhrase[0] ?? null,
      topTalker: topTalker[0] ?? null,
      busiestDay: busiestDay[0] ?? null,
      newcomer: newcomer[0] ?? null,
    }
  })
