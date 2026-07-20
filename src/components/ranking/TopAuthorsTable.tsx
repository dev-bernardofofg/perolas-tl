import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export type AuthorRanking = {
  author: string
  total: number
  phraseCount: number
}

const MEDALS = ['🥇', '🥈', '🥉']

function positionLabel(index: number) {
  const medal = MEDALS[index]
  return medal ? `${medal} ${index + 1}º` : `${index + 1}º`
}

const columnHelper = createColumnHelper<AuthorRanking>()

const columns = [
  columnHelper.display({
    id: 'position',
    header: 'Posição',
    cell: ({ row }) => (
      <span className="position-cell">{positionLabel(row.index)}</span>
    ),
  }),
  columnHelper.accessor('author', {
    header: 'Falador',
    cell: (info) => <span>🗣️ {info.getValue()}</span>,
  }),
  columnHelper.accessor('phraseCount', {
    header: 'Pérolas no catálogo',
    cell: (info) => `${info.getValue()}`,
  }),
  columnHelper.accessor('total', {
    header: 'Total de vezes ditas',
    cell: (info) => <strong className="table-count">{info.getValue()}×</strong>,
  }),
]

export default function TopAuthorsTable({
  data,
}: {
  data: Array<AuthorRanking>
}) {
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
            <tr
              key={row.id}
              className={row.index < 3 ? `podium podium-${row.index + 1}` : ''}
            >
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
