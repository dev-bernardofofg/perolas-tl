// "há 2 horas", "agora mesmo" — tempo relativo em pt-BR para o feed.

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const STEPS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 86400 * 30, divisor: 86400, unit: 'day' },
  { limit: 86400 * 365, divisor: 86400 * 30, unit: 'month' },
  { limit: Infinity, divisor: 86400 * 365, unit: 'year' },
]

export function formatRelative(date: Date | string) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000
  const elapsed = Math.abs(seconds)
  if (elapsed < 30) return 'agora mesmo'
  const step = STEPS.find((s) => elapsed < s.limit) ?? STEPS[STEPS.length - 1]
  return rtf.format(Math.round(seconds / step.divisor), step.unit)
}
