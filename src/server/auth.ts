import { createHmac, timingSafeEqual } from 'node:crypto'
import { createMiddleware, createServerFn } from '@tanstack/react-start'
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { z } from 'zod'

// Modo master: sessão STATELESS com senha única em env var.
// Token = `exp.HMAC-SHA256(exp, MASTER_PASSWORD)` num cookie HttpOnly —
// sem tabela de sessões, sem localStorage, e trocar a senha invalida
// todas as sessões de uma vez.

const COOKIE = 'perolas_master'
const SESSION_DAYS = 7

export const MASTER_ERROR = 'Acesso restrito ao modo master'

function getSecret(): string | null {
  // lido dentro de handler/middleware (nunca em module scope — regra da skill)
  return process.env.MASTER_PASSWORD || null
}

function sign(exp: number, secret: string) {
  return createHmac('sha256', secret).update(String(exp)).digest('base64url')
}

function makeToken(secret: string) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000
  return `${exp}.${sign(exp, secret)}`
}

function isValidToken(token: string | null, secret: string | null): boolean {
  if (!token || !secret) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const exp = Number(token.slice(0, dot))
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const expected = Buffer.from(sign(exp, secret))
  const given = Buffer.from(token.slice(dot + 1))
  return expected.length === given.length && timingSafeEqual(expected, given)
}

function readToken(): string | null {
  const header = getRequestHeader('cookie')
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === COOKIE) return part.slice(eq + 1)
  }
  return null
}

function setCookieHeader(value: string, maxAgeSeconds: number) {
  const attrs = [
    `${COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ]
  // Secure só em produção: localhost dev roda em http
  if (process.env.NODE_ENV === 'production') attrs.push('Secure')
  setResponseHeader('Set-Cookie', attrs.join('; '))
}

export const loginMaster = createServerFn({ method: 'POST' })
  .validator(z.object({ password: z.string().min(1, 'Digite a senha') }))
  .handler(async ({ data }) => {
    const secret = getSecret()
    if (!secret) {
      throw new Error(
        'Modo master não configurado — defina MASTER_PASSWORD no ambiente',
      )
    }
    const given = Buffer.from(data.password)
    const expected = Buffer.from(secret)
    const ok =
      given.length === expected.length && timingSafeEqual(given, expected)
    if (!ok) throw new Error('Senha incorreta 🔒')
    setCookieHeader(makeToken(secret), SESSION_DAYS * 86_400)
    return { ok: true }
  })

export const logoutMaster = createServerFn({ method: 'POST' }).handler(
  async () => {
    setCookieHeader('', 0)
    return { ok: true }
  },
)

export const getMasterStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    // status de auth nunca pode ser cacheado por intermediários
    setResponseHeader('Cache-Control', 'no-store')
    return { isMaster: isValidToken(readToken(), getSecret()) }
  },
)

// Fronteira de segurança: anexado a toda server function de curadoria.
// A UI só ESCONDE botões; quem manda é este middleware — a RPC é alcançável
// sem passar pela interface.
export const masterMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    if (!isValidToken(readToken(), getSecret())) {
      throw new Error(MASTER_ERROR)
    }
    return next()
  },
)
