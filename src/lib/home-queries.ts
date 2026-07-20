import { queryOptions } from '@tanstack/react-query'
import { getDailyPearl, getFeed } from '#/server/phrases'
import { currentDay } from '#/lib/month'

export const feedQueryOptions = queryOptions({
  queryKey: ['feed'],
  queryFn: () => getFeed(),
})

// Chaveada pelo dia de Recife: vira a meia-noite, troca a pérola.
export const dailyPearlQueryOptions = () =>
  queryOptions({
    queryKey: ['daily-pearl', currentDay()],
    queryFn: () => getDailyPearl({ data: { day: currentDay() } }),
  })
