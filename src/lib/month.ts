// Períodos mensais no fuso do escritório (America/Recife, UTC-3 fixo —
// sem horário de verão desde 2019). O corte do mês segue o relógio de Recife,
// não o UTC do servidor.

export const PERIOD_TOTAL = 'total'
export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

const RECIFE_OFFSET = '-03:00'

export function currentPeriod(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date())
}

export function monthRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number)
  const next =
    month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, '0')}`
  return {
    start: new Date(`${period}-01T00:00:00${RECIFE_OFFSET}`),
    end: new Date(`${next}-01T00:00:00${RECIFE_OFFSET}`),
  }
}

// "2026-07" -> "julho de 2026"
export function formatPeriod(period: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife',
    month: 'long',
    year: 'numeric',
  }).format(monthRange(period).start)
}
