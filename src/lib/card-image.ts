// Gera o PNG do card de uma pérola direto no canvas (zero dependências) e
// dispara o download — para mandar a imagem no grupo em vez de um link.

type CardData = {
  text: string
  context: string | null
  personName: string
  monthCount: number
  totalCount: number
}

const W = 1080
const H = 1080
const PAD = 96

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): Array<string> {
  const words = text.split(/\s+/)
  const lines: Array<string> = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function downloadCardImage(card: CardData) {
  // espera a Baloo 2 ficar utilizável no canvas, mas com teto: se a fonte
  // externa demorar (rede lenta/offline), gera com a fonte do sistema
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  // fundo no clima do app
  ctx.fillStyle = '#fdf6ec'
  ctx.fillRect(0, 0, W, H)
  const glowA = ctx.createRadialGradient(0, 0, 0, 0, 0, 700)
  glowA.addColorStop(0, 'rgba(255, 107, 107, 0.20)')
  glowA.addColorStop(1, 'rgba(255, 107, 107, 0)')
  ctx.fillStyle = glowA
  ctx.fillRect(0, 0, W, H)
  const glowB = ctx.createRadialGradient(W, H, 0, W, H, 760)
  glowB.addColorStop(0, 'rgba(124, 92, 255, 0.20)')
  glowB.addColorStop(1, 'rgba(124, 92, 255, 0)')
  ctx.fillStyle = glowB
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#6d5f8a'
  ctx.font = '800 34px "Baloo 2", "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('💬 Pérolas do Escritório', W / 2, PAD + 10)

  // frase: reduz a fonte até caber
  const maxWidth = W - PAD * 2
  let fontSize = 76
  let lines: Array<string> = []
  do {
    ctx.font = `800 ${fontSize}px "Baloo 2", "Segoe UI", sans-serif`
    lines = wrapText(ctx, `“${card.text}”`, maxWidth)
    if (lines.length * fontSize * 1.25 <= 520) break
    fontSize -= 4
  } while (fontSize > 34)

  ctx.fillStyle = '#33254d'
  const lineHeight = fontSize * 1.25
  const contextLines = card.context
    ? (() => {
        ctx.font = 'italic 400 34px "Segoe UI", sans-serif'
        return wrapText(ctx, card.context, maxWidth).slice(0, 3)
      })()
    : []
  const blockHeight = lines.length * lineHeight + contextLines.length * 46
  let y = (H - blockHeight) / 2 + fontSize * 0.6

  ctx.font = `800 ${fontSize}px "Baloo 2", "Segoe UI", sans-serif`
  for (const line of lines) {
    ctx.fillText(line, W / 2, y)
    y += lineHeight
  }

  if (contextLines.length) {
    y += 8
    ctx.fillStyle = '#6d5f8a'
    ctx.font = 'italic 400 34px "Segoe UI", sans-serif'
    for (const line of contextLines) {
      ctx.fillText(line, W / 2, y)
      y += 46
    }
  }

  ctx.fillStyle = '#33254d'
  ctx.font = '800 40px "Baloo 2", "Segoe UI", sans-serif'
  ctx.fillText(`🗣️ ${card.personName}`, W / 2, H - PAD - 70)
  ctx.fillStyle = '#7c5cff'
  ctx.font = '800 34px "Baloo 2", "Segoe UI", sans-serif'
  ctx.fillText(
    `${card.monthCount}× este mês · ${card.totalCount}× no total`,
    W / 2,
    H - PAD,
  )

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('Falha ao gerar a imagem')

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `perola-${card.personName.toLowerCase().replace(/\s+/g, '-')}.png`
  link.click()
  URL.revokeObjectURL(url)
}
