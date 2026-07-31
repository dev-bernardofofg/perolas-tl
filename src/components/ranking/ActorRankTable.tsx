import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export type ActorRank = { name: string; total: number }

const MEDALS = ['🥇', '🥈', '🥉']

function positionLabel(index: number) {
  const medal = MEDALS[index]
  return medal ? `${medal} ${index + 1}º` : `${index + 1}º`
}

const columnHelper = createColumnHelper<ActorRank>()

function buildColumns(totalHeader: string) {
  return [
    columnHelper.display({
      id: 'position',
      header: 'Posição',
      cell: ({ row }) => (
        <span className="position-cell">{positionLabel(row.index)}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Pessoa',
      cell: (info) => <span>🗣️ {info.getValue()}</span>,
    }),
    columnHelper.accessor('total', {
      header: totalHeader,
      cell: (info) => (
        <strong className="table-count">{info.getValue()}×</strong>
      ),
    }),
  ]
}

export default function ActorRankTable({
  data,
  totalHeader,
}: {
  data: Array<ActorRank>
  totalHeader: string
}) {
  const table = useReactTable({
    data,
    columns: buildColumns(totalHeader),
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
