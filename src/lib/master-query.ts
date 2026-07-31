import { queryOptions } from '@tanstack/react-query'
import { getMasterStatus } from '#/server/auth'

// Status do modo master para a UI (o servidor revalida em toda ação de
// curadoria — isto aqui só decide o que mostrar).
export const masterQueryOptions = queryOptions({
  queryKey: ['master'],
  queryFn: () => getMasterStatus(),
})
