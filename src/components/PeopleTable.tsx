import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { deletePerson } from '#/server/people'
import { refreshAllData } from '#/db-collections/phrases'
import { showErrorToast, showSuccessToast } from '#/lib/toast'
import type { PersonRow } from '#/server/people'

function rhythmLabel(person: PersonRow) {
  if (!person.lastDay) return '—'
  if (person.currentStreak >= 2) return `🔥 ${person.currentStreak} dias seguidos`
  if (person.daysSinceLast === 0) return '⚡ ativo hoje'
  if (person.daysSinceLast === 1) return '👀 falou ontem'
  return `😴 há ${person.daysSinceLast} dias em silêncio`
}

async function handleRemove(person: PersonRow) {
  const ok = window.confirm(`Remover ${person.name} do elenco?`)
  if (!ok) return
  try {
    await deletePerson({ data: { id: person.id } })
    refreshAllData()
    showSuccessToast(`${person.name} saiu do elenco 👋`)
  } catch {
    showErrorToast('Não conseguimos remover. Tenta de novo 🙈')
  }
}

const columnHelper = createColumnHelper<PersonRow>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Pessoa',
    cell: (info) => <strong>🗣️ {info.getValue()}</strong>,
  }),
  columnHelper.accessor('phraseCount', {
    header: 'Pérolas',
  }),
  columnHelper.accessor('totalSaid', {
    header: 'Vezes ditas',
    cell: (info) => <strong className="table-count">{info.getValue()}×</strong>,
  }),
  columnHelper.display({
    id: 'rhythm',
    header: 'Ritmo',
    cell: ({ row }) => <span className="rhythm-cell">{rhythmLabel(row.original)}</span>,
  }),
  columnHelper.accessor('badges', {
    header: 'Conquistas',
    cell: (info) => {
      const badges = info.getValue()
      if (!badges.length) return <span className="badge-empty">—</span>
      return (
        <span className="badge-row">
          {badges.map((b) => (
            <span key={b.label} className="badge-chip" title={b.title}>
              {b.emoji} {b.label}
            </span>
          ))}
        </span>
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      row.original.phraseCount === 0 ? (
        <button
          type="button"
          className="btn-icon"
          onClick={() => void handleRemove(row.original)}
          aria-label={`Remover ${row.original.name} do elenco`}
          title="Remover (sem pérolas no catálogo)"
        >
          🗑️
        </button>
      ) : null,
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
