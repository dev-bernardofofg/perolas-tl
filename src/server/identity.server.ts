import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { prisma } from '#/db'

// Helpers server-only da identidade. Vivem num módulo .server.ts separado das
// server functions: exports puros não viram stub no client e arrastariam
// react-start/server + prisma pro bundle do browser (import-protection barra).

export const WHO_COOKIE = 'perolas_who'
export const WHO_MAX_AGE_DAYS = 180

export const IDENTIFY_ERROR = 'Identifique-se para participar 👤'

export function readWhoCookie(): number | null {
  const header = getRequestHeader('cookie')
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === WHO_COOKIE) {
      const id = Number(part.slice(eq + 1))
      return Number.isInteger(id) && id > 0 ? id : null
    }
  }
  return null
}

export function setWhoCookie(value: string, maxAgeSeconds: number) {
  const attrs = [
    `${WHO_COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (process.env.NODE_ENV === 'production') attrs.push('Secure')
  setResponseHeader('Set-Cookie', attrs.join('; '))
}

// Usado por todo handler de escrita: valida que a identidade do cookie
// ainda existe no banco.
export async function requireActorId(): Promise<number> {
  const id = readWhoCookie()
  if (id) {
    const person = await prisma.person.findUnique({
      where: { id },
      select: { id: true },
    })
    if (person) return id
  }
  throw new Error(IDENTIFY_ERROR)
}
