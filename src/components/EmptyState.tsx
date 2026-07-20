export default function EmptyState() {
  return (
    <div className="empty-state" role="status">
      <span className="empty-emoji" aria-hidden="true">
        👀
      </span>
      <p className="empty-title">Nenhuma pérola registrada ainda…</p>
      <p className="empty-subtitle">mas é questão de tempo 👀</p>
    </div>
  )
}
