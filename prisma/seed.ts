import { PrismaClient } from '../src/generated/prisma/client.js'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

// Distribui utterances entre o mês corrente e meses anteriores para o
// ranking mensal ter o que mostrar.
function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('🌱 Semeando pérolas de demonstração...')

  await prisma.utterance.deleteMany()
  await prisma.phrase.deleteMany()
  await prisma.person.deleteMany()

  const carlos = await prisma.person.create({
    data: { name: 'Carlos do Comercial', slug: 'carlos-do-comercial' },
  })
  const junior = await prisma.person.create({
    data: { name: 'Dev Júnior', slug: 'dev-junior' },
  })
  const patricia = await prisma.person.create({
    data: { name: 'PM Patrícia', slug: 'pm-patricia' },
  })

  const seeds: Array<{ text: string; personId: number; saidDaysAgo: Array<number> }> = [
    {
      text: 'Vamos alinhar isso offline',
      personId: carlos.id,
      saidDaysAgo: [90, 60, 45, 20, 10, 5, 2, 1],
    },
    {
      text: 'Na minha máquina funciona',
      personId: junior.id,
      saidDaysAgo: [75, 40, 15, 8, 3, 1, 0],
    },
    {
      text: 'É só um ajuste rapidinho no CSS',
      personId: junior.id,
      saidDaysAgo: [50, 30, 12, 4],
    },
    {
      text: 'Isso é escopo pra V2',
      personId: patricia.id,
      saidDaysAgo: [65, 25, 6],
    },
    {
      text: 'Consegue entregar pra ontem?',
      personId: carlos.id,
      saidDaysAgo: [35, 9],
    },
  ]

  for (const seed of seeds) {
    await prisma.phrase.create({
      data: {
        text: seed.text,
        personId: seed.personId,
        utterances: {
          create: seed.saidDaysAgo.map((days) => ({ saidAt: daysAgo(days) })),
        },
      },
    })
  }

  console.log(`✅ ${seeds.length} pérolas criadas para 3 pessoas`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao semear o banco:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
