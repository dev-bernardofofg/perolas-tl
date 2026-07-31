import { useRef } from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'

export default function SearchBar({
  query,
  onChange,
}: {
  query: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" foca a busca (padrão consagrado; teclas simples ignoram inputs)
  useHotkey('/', () => inputRef.current?.focus())

  return (
    <div className="search-bar">
      <span className="search-icon" aria-hidden="true">
        🔎
      </span>
      <input
        ref={inputRef}
        type="search"
        className="field-input search-input"
        placeholder="Buscar pérola, autor ou historinha… (atalho: /)"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Buscar pérolas"
      />
      {query && (
        <button
          type="button"
          className="btn-icon"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          title="Limpar"
        >
          ✕
        </button>
      )}
    </div>
  )
}
