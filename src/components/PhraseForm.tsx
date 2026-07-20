import { useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { useHotkey } from '@tanstack/react-hotkeys'
import { nextTempId, phrasesCollection } from '#/db-collections/phrases'
import { showErrorToast } from '#/lib/toast'

function validateText(value: string) {
  return value.trim() ? undefined : 'A frase não pode ficar em branco 😅'
}

function validateAuthor(value: string) {
  return value.trim() ? undefined : 'Toda pérola tem um autor — entrega quem foi 👉'
}

export default function PhraseForm() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const form = useForm({
    defaultValues: { text: '', author: '' },
    onSubmit: async ({ value }) => {
      const tx = phrasesCollection.insert({
        id: nextTempId(),
        text: value.text.trim(),
        author: value.author.trim().replace(/\s+/g, ' '),
        count: 1,
        createdAt: new Date(),
      })
      try {
        await tx.isPersisted.promise
        form.reset()
        textareaRef.current?.focus()
      } catch {
        // O TanStack DB já desfez o card otimista; só avisamos e preservamos o form
        showErrorToast('Ops! Não conseguimos registrar a pérola. Tenta de novo 🙈')
      }
    },
  })

  useHotkey('Mod+K', () => textareaRef.current?.focus())
  useHotkey('Mod+Enter', () => void form.handleSubmit())

  return (
    <section className="pearl-panel" aria-labelledby="form-title">
      <h2 id="form-title" className="panel-title">
        ✍️ Registrar nova pérola
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
        noValidate
      >
        <form.Field
          name="text"
          validators={{ onChange: ({ value }) => validateText(value) }}
        >
          {(field) => (
            <div className="field-group">
              <label htmlFor={field.name} className="field-label">
                Frase
              </label>
              <textarea
                ref={textareaRef}
                id={field.name}
                name={field.name}
                className="field-input field-textarea"
                placeholder='"Vamos alinhar isso offline…"'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
                rows={3}
              />
              {field.state.meta.errors.length > 0 && (
                <em role="alert" className="field-error">
                  {field.state.meta.errors[0]}
                </em>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="author"
          validators={{ onChange: ({ value }) => validateAuthor(value) }}
        >
          {(field) => (
            <div className="field-group">
              <label htmlFor={field.name} className="field-label">
                Quem disse
              </label>
              <input
                id={field.name}
                name={field.name}
                type="text"
                className="field-input"
                placeholder="Carlos do Comercial"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 && (
                <em role="alert" className="field-error">
                  {field.state.meta.errors[0]}
                </em>
              )}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando…' : '📌 Registrar pérola'}
            </button>
          )}
        </form.Subscribe>
      </form>
    </section>
  )
}
