import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'

function RouterErrorFallback() {
  return (
    <main className="page-wrap page-main">
      <div className="error-banner" role="alert">
        <p>Alguém derrubou o servidor na mesa do café ☕💥</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Recarregar a página
        </button>
      </div>
    </main>
  )
}

function RouterNotFound() {
  return (
    <main className="page-wrap page-main">
      <div className="empty-state" role="status">
        <span className="empty-emoji" aria-hidden="true">
          🕵️
        </span>
        <p className="empty-title">Página não encontrada…</p>
        <p className="empty-subtitle">
          Essa aqui nem o estagiário sabe onde foi parar.{' '}
          <a href="/">Voltar pro início</a>
        </p>
      </div>
    </main>
  )
}

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouterErrorFallback,
    defaultNotFoundComponent: RouterNotFound,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
