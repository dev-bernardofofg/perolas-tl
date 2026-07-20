import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPhraseById } from '#/server/phrases'
import { downloadCardImage } from '#/lib/card-image'
import { showErrorToast, showSuccessToast } from '#/lib/toast'

// Página compartilhável de uma pérola: link com OG meta (preview no WhatsApp
// mostra frase + autor) e botão para baixar o card como PNG.
export const Route = createFileRoute('/p/$id')({
  loader: async ({ params }) => {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) throw notFound()
    const phrase = await getPhraseById({ data: { id } })
    if (!phrase) throw notFound()
    return phrase
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `“${loaderData.text}” · Pérolas do Escritório` },
          {
            property: 'og:title',
            content: `“${loaderData.text}”`,
          },
          {
            property: 'og:description',
            content: `🗣️ ${loaderData.personName} · dita ${loaderData.totalCount}x — Pérolas do Escritório`,
          },
          { property: 'og:type', content: 'article' },
          {
            name: 'description',
            content: `Pérola de ${loaderData.personName}, dita ${loaderData.totalCount}x`,
          },
        ]
      : [],
  }),
  component: SharePhrasePage,
})

function SharePhrasePage() {
  const phrase = Route.useLoaderData()

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showSuccessToast('Link copiado! Cola no grupo 📤')
    } catch {
      showErrorToast('Não deu para copiar — usa a barra de endereço mesmo 🙈')
    }
  }

  const download = async () => {
    try {
      await downloadCardImage(phrase)
      showSuccessToast('Card baixado! Agora é só espalhar 🖼️')
    } catch {
      showErrorToast('Não conseguimos gerar a imagem. Tenta de novo 🙈')
    }
  }

  return (
    <main className="page-wrap page-main">
      <article className="share-card">
        <p className="daily-kicker">💬 Pérola oficial do escritório</p>
        <blockquote className="share-quote">“{phrase.text}”</blockquote>
        {phrase.context && <p className="daily-context">{phrase.context}</p>}
        <p className="share-meta">
          🗣️ <strong>{phrase.personName}</strong> · {phrase.monthCount}× este
          mês · {phrase.totalCount}× no total
        </p>
        <div className="share-actions">
          <button type="button" className="btn-primary" onClick={() => void download()}>
            🖼️ Baixar card (PNG)
          </button>
          <button type="button" className="btn-secondary" onClick={() => void copyLink()}>
            🔗 Copiar link
          </button>
        </div>
      </article>
      <p className="share-back">
        <a href="/">← Voltar pro acervo completo</a>
      </p>
    </main>
  )
}
