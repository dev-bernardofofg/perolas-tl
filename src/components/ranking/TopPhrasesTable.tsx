import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Phrase } from '#/db-collections/phrases'

const MEDALS = ['🥇', '🥈', '🥉']

function positionLabel(index: number) {
  const medal = MEDALS[index]
  return medal ? `${medal} ${index + 1}º` : `${index + 1}º`
}

const columnHelper = createColumnHelper<Phrase>()

const columns = [
  columnHelper.display({
    id: 'position',
    header: 'Posição',
    cell: ({ row }) => (
      <span className="position-cell">{positionLabel(row.index)}</span>
    ),
  }),
  columnHelper.accessor('text', {
    header: 'Pérola',
    cell: (info) => <span className="table-quote">“{info.getValue()}”</span>,
  }),
  columnHelper.accessor('author', {
    header: 'Quem disse',
  }),
  columnHelper.accessor('count', {
    header: 'Vezes dita',
    cell: (info) => <strong className="table-count">{info.getValue()}×</strong>,
  }),
]

export default function TopPhrasesTable({ data }: { data: Array<Phrase> }) {
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
