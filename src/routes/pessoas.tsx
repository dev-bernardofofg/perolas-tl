import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { peopleQueryOptions } from '#/lib/people-query'
import PeopleTable from '#/components/PeopleTable'
import MergePeoplePanel from '#/components/MergePeoplePanel'

export const Route = createFileRoute('/pessoas')({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(peopleQueryOptions)
    } catch {
      // Erro de rede cai no banner do componente — página continua de pé
    }
  },
  head: () => ({
    meta: [{ title: '👥 Pessoas · Pérolas do Escritório' }],
  }),
  component: PeoplePage,
})

function PeoplePage() {
  const { data, isLoading, isError, refetch } = useQuery(peopleQueryOptions)

  if (isError) {
    return (
      <main className="page-wrap page-main">
        <div className="error-banner" role="alert">
          <p>A lista de pessoas sumiu da sala 😢 Verifique sua conexão.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void refetch()}
          >
            Tentar de novo
          </button>
        </div>
      </main>
    )
  }

  if (isLoading || !data) {
    return (
      <main className="page-wrap page-main">
        <p className="loading-note" role="status">
          Fazendo a chamada… 📋
        </p>
      </main>
    )
  }

  return (
    <main className="page-wrap page-main">
      <h1 className="page-title">👥 Pessoas</h1>
      <p className="page-subtitle">
        O elenco oficial de faladores de pérolas. Cadastro acontece direto no
        formulário da home — nomes repetidos viram a mesma pessoa.
      </p>

      {data.length === 0 ? (
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🪑
          </span>
          <p className="empty-title">Ninguém registrado ainda…</p>
          <p className="empty-subtitle">
            Registre a primeira pérola e o autor entra pro elenco.
          </p>
        </div>
      ) : (
        <>
          <PeopleTable data={data} />
          <MergePeoplePanel people={data} />
        </>
      )}
    </main>
  )
}
