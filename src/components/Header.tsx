import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useHotkeySequence } from '@tanstack/react-hotkeys'
import { masterQueryOptions } from '#/lib/master-query'

export default function Header() {
  const navigate = useNavigate()
  const { data: master } = useQuery(masterQueryOptions)

  // Navegação estilo Vim: "g h" home, "g r" ranking, "g p" pessoas.
  // Teclas simples são ignoradas enquanto o usuário digita em inputs (padrão da lib).
  useHotkeySequence(['G', 'H'], () => void navigate({ to: '/' }))
  useHotkeySequence(['G', 'R'], () => void navigate({ to: '/ranking' }))
  useHotkeySequence(['G', 'P'], () => void navigate({ to: '/pessoas' }))

  return (
    <header className="site-header">
      <nav className="page-wrap header-nav" aria-label="Navegação principal">
        <Link to="/" className="brand">
          <span aria-hidden="true">💬</span> Pérolas do Escritório
        </Link>
        <div className="header-links">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true }}
          >
            🏠 Início
          </Link>
          <Link
            to="/ranking"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            🏆 Ranking
          </Link>
          <Link
            to="/pessoas"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            👥 Pessoas
          </Link>
          <Link
            to="/retro"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            ✨ Retrô
          </Link>
          {master?.isMaster && (
            <Link
              to="/auditoria"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              🕵️ Auditoria
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
