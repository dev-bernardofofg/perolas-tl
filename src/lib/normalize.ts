// Normalização de nomes de pessoas — usada no cliente (match do combobox)
// e no servidor (dedupe por slug). Mesma regra nos dois lados.

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

// "João  Silva " -> "joao-silva": minúsculas, sem acento, espaços colapsados.
// É a chave única que impede "Rafael lins" e "Rafael Lins" de duplicar.
export function slugifyName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
