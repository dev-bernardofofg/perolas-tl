import { createFileRoute } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { getAuditLog } from '#/server/audit'
import { masterQueryOptions } from '#/lib/master-query'
import { formatRelative } from '#/lib/relative-time'
import type { AuditRow } from '#/server/audit'

const auditQueryOptions = queryOptions({
  queryKey: ['audit'],
  queryFn: () => getAuditLog(),
  retry: false,
})

const ACTION_LABELS: Record<string, string> = {
  'phrase.create': '📌 Registro',
  'utterance.add': '➕ Mais um',
  'utterance.undo': '↩️ Desfazer',
  'phrase.edit': '✏️ Edição',
  'phrase.delete': '🗑️ Exclusão',
  'people.merge': '🧬 Mesclagem',
  'person.delete': '👋 Remoção',
}

const columnHelper = createColumnHelper<AuditRow>()

const columns = [
  columnHelper.accessor('createdAt', {
    header: 'Quando',
    cell: (info) => (
      <time
        className="feed-time"
        dateTime={new Date(info.getValue()).toISOString()}
        title={new Date(info.getValue()).toLocaleString('pt-BR')}
      >
        {formatRelative(info.getValue())}
      </time>
    ),
  }),
  columnHelper.accessor('actorName', {
    header: 'Quem',
    cell: (info) => <strong>{info.getValue() ?? 'não identificado'}</strong>,
  }),
  columnHelper.accessor('action', {
    header: 'Ação',
    cell: (info) => (
      <span className="position-cell">
        {ACTION_LABELS[info.getValue()] ?? info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('summary', {
    header: 'O que aconteceu',
  }),
]

export const Route = createFileRoute('/auditoria')({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(auditQueryOptions)
    } catch {
      // sem master a query falha — o componente mostra o estado restrito
    }
  },
  head: () => ({
    meta: [{ title: '🕵️ Auditoria · Pérolas do Escritório' }],
  }),
  component: AuditPage,
})

function AuditTable({ data }: { data: Array<AuditRow> }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="table-shell">
      <table className="ranking-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AuditPage() {
  const { data: master } = useQuery(masterQueryOptions)
  const isMaster = master?.isMaster ?? false
  const { data, isLoading } = useQuery({
    ...auditQueryOptions,
    enabled: isMaster,
  })

  if (!isMaster) {
    return (
      <main className="page-wrap page-main">
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🔒
          </span>
          <p className="empty-title">Área do modo master…</p>
          <p className="empty-subtitle">
            Entre pelo "🔑 Modo master" no rodapé para ver a trilha completa.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap page-main">
      <h1 className="page-title">🕵️ Auditoria</h1>
      <p className="page-subtitle">
        Tudo que aconteceu, por quem — os últimos 100 eventos.
      </p>

      {isLoading || !data ? (
        <p className="loading-note" role="status">
          Revirando os arquivos… 🗄️
        </p>
      ) : data.length === 0 ? (
        <div className="empty-state" role="status">
          <span className="empty-emoji" aria-hidden="true">
            🗄️
          </span>
          <p className="empty-title">Trilha vazia por enquanto…</p>
          <p className="empty-subtitle">
            A partir de agora, toda ação assinada fica registrada aqui.
          </p>
        </div>
      ) : (
        <AuditTable data={data} />
      )}
    </main>
  )
}
