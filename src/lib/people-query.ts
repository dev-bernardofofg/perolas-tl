import { queryOptions } from '@tanstack/react-query'
import { listPeople } from '#/server/people'

// Compartilhado entre o combobox do formulário e a página /pessoas.
export const peopleQueryOptions = queryOptions({
  queryKey: ['people'],
  queryFn: () => listPeople(),
})
