export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-wrap footer-inner">
        <p className="footer-hotkeys">
          ⌨️ Atalhos: <kbd>Ctrl</kbd>+<kbd>K</kbd> foca o formulário ·{' '}
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> registra · <kbd>g</kbd> <kbd>r</kbd>{' '}
          ranking · <kbd>g</kbd> <kbd>p</kbd> pessoas · <kbd>g</kbd>{' '}
          <kbd>h</kbd> início
        </p>
        <p className="footer-credit">
          Feito com TanStack Start + Prisma + Neon · Sem pérolas foram feridas na
          produção deste app 🦪
        </p>
      </div>
    </footer>
  )
}
