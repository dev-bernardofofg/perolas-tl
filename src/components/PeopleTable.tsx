import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { PersonRow } from '#/server/people'

const columnHelper = createColumnHelper<PersonRow>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Pessoa',
    cell: (info) => <strong>🗣️ {info.getValue()}</strong>,
  }),
  columnHelper.accessor('phraseCount', {
    header: 'Pérolas no catálogo',
  }),
  columnHelper.accessor('totalSaid', {
    header: 'Total de vezes ditas',
    cell: (info) => <strong className="table-count">{info.getValue()}×</strong>,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Registrada em',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('pt-BR'),
  }),
]

export default function PeopleTable({ data }: { data: Array<PersonRow> }) {
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
