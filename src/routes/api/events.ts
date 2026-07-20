import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '#/db'

// SSE de "algo mudou": o servidor faz um poll barato de versão no banco e
// empurra a versão nova quando ela muda. Serverless-friendly (Vercel): a
// conexão se encerra sozinha antes do timeout da function e o EventSource
// do browser reconecta nativamente — o cliente só refaz queries quando a
// versão recebida difere da última vista.

const POLL_MS = 4000
const KEEPALIVE_MS = 15000
// menor que o maxDuration padrão das functions; o browser reconecta em seguida
const MAX_LIFETIME_MS = 4 * 60 * 1000

async function dataVersion(): Promise<string> {
  // qualquer escrita muda a tupla: +1 (max/n de utterances), −1 (n cai),
  // pérola nova (max/n de phrases)
  const [row] = await prisma.$queryRaw<
    Array<{ maxU: number; nU: number; maxP: number; nP: number }>
  >`
    SELECT COALESCE(MAX(u.id), 0)::int AS "maxU",
           COUNT(u.id)::int            AS "nU",
           (SELECT COALESCE(MAX(id), 0) FROM "phrases")::int AS "maxP",
           (SELECT COUNT(*) FROM "phrases")::int             AS "nP"
    FROM "utterances" u
  `
  return `${row.maxU}:${row.nU}:${row.maxP}:${row.nP}`
}

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const encoder = new TextEncoder()
        let pollTimer: ReturnType<typeof setInterval> | undefined
        let kaTimer: ReturnType<typeof setInterval> | undefined
        let lifeTimer: ReturnType<typeof setTimeout> | undefined
        let closed = false

        const stream = new ReadableStream({
          async start(controller) {
            const send = (chunk: string) => {
              if (closed) return
              try {
                controller.enqueue(encoder.encode(chunk))
              } catch {
                close()
              }
            }
            const close = () => {
              if (closed) return
              closed = true
              clearInterval(pollTimer)
              clearInterval(kaTimer)
              clearTimeout(lifeTimer)
              try {
                controller.close()
              } catch {
                // stream já encerrado pelo peer
              }
            }

            request.signal.addEventListener('abort', close)

            // hint de reconexão + versão atual já na abertura
            send('retry: 3000\n\n')
            let lastVersion = await dataVersion().catch(() => null)
            if (lastVersion) send(`data: ${lastVersion}\n\n`)

            pollTimer = setInterval(() => {
              void dataVersion()
                .then((version) => {
                  if (version !== lastVersion) {
                    lastVersion = version
                    send(`data: ${version}\n\n`)
                  }
                })
                .catch(() => {
                  // banco indisponível: keepalive mantém a conexão; próximo poll tenta de novo
                })
            }, POLL_MS)
            kaTimer = setInterval(() => send(': ka\n\n'), KEEPALIVE_MS)
            lifeTimer = setTimeout(close, MAX_LIFETIME_MS)
          },
          cancel() {
            closed = true
            clearInterval(pollTimer)
            clearInterval(kaTimer)
            clearTimeout(lifeTimer)
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
            // proxies (nginx e afins) não devem bufferizar o stream
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
