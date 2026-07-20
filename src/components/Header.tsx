import { Link, useNavigate } from '@tanstack/react-router'
import { useHotkeySequence } from '@tanstack/react-hotkeys'

export default function Header() {
  const navigate = useNavigate()

  // Navegação estilo Vim: "g h" volta pra home, "g r" abre o ranking.
  // Teclas simples são ignoradas enquanto o usuário digita em inputs (padrão da lib).
  useHotkeySequence(['G', 'H'], () => void navigate({ to: '/' }))
  useHotkeySequence(['G', 'R'], () => void navigate({ to: '/ranking' }))

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
        </div>
      </nav>
    </header>
  )
}
