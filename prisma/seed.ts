import { PrismaClient } from '../src/generated/prisma/client.js'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Semeando pérolas de demonstração...')

  await prisma.phrase.deleteMany()

  const phrases = await prisma.phrase.createMany({
    data: [
      { text: 'Vamos alinhar isso offline', author: 'Carlos do Comercial', count: 12 },
      { text: 'É só um ajuste rapidinho no CSS', author: 'Dev Júnior', count: 9 },
      { text: 'Na minha máquina funciona', author: 'Dev Júnior', count: 15 },
      { text: 'Isso é escopo pra V2', author: 'PM Patrícia', count: 7 },
      { text: 'Consegue entregar pra ontem?', author: 'Carlos do Comercial', count: 5 },
    ],
  })

  console.log(`✅ ${phrases.count} pérolas criadas`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao semear o banco:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
