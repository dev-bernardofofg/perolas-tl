import { queryOptions } from '@tanstack/react-query'
import { whoAmI } from '#/server/identity'

// Identidade atual (quem está usando este navegador) para a UI.
export const whoQueryOptions = queryOptions({
  queryKey: ['who'],
  queryFn: () => whoAmI(),
})
