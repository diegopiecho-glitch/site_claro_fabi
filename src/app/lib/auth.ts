import { API, apiFetch } from './api'

const AUTH_TOKEN_KEY = 'sistema_imoveis_token'
const AUTH_USER_KEY = 'sistema_imoveis_usuario'

interface LoginResponse {
  token?: string
  TOKEN?: string
  usuario?: string
  USUARIO?: string
  valid?: number
  VALID?: number
  items?: Array<Record<string, unknown>>
}

function firstObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeLoginResponse(resposta: LoginResponse): Record<string, unknown> {
  const direto = firstObject(resposta)
  if (!direto) return {}

  const primeiroItem = Array.isArray(direto.items) ? firstObject(direto.items[0]) : null
  return primeiroItem ? { ...direto, ...primeiroItem } : direto
}

function setSession(token: string, usuario: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  window.sessionStorage.setItem(AUTH_USER_KEY, usuario)
}

function clearSession() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY)
  window.sessionStorage.removeItem(AUTH_USER_KEY)
}

export function getSessionToken(): string {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

export function getUsuarioAutenticado(): string {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(AUTH_USER_KEY) ?? ''
}

export async function login(usuario: string, senha: string): Promise<boolean> {
  try {
    const resposta = await apiFetch<LoginResponse>(API.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ usuario, senha }),
    })

    const payload = normalizeLoginResponse(resposta)
    const token = String(payload.token ?? payload.TOKEN ?? '').trim()
    if (!token) return false

    const usuarioResposta = String(payload.usuario ?? payload.USUARIO ?? usuario).trim()
    setSession(token, usuarioResposta)
    return true
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : ''
    if (mensagem.includes('Erro 401')) {
      return false
    }
    throw e
  }
}

export async function logout(): Promise<void> {
  try {
    if (getSessionToken()) {
      await apiFetch(API.AUTH_LOGOUT, { method: 'POST' })
    }
  } catch {
    // Ignora falha remota e encerra a sessao local mesmo assim.
  } finally {
    clearSession()
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getSessionToken())
}

export async function validateSession(): Promise<boolean> {
  if (!getSessionToken()) return false

  try {
    const resposta = await apiFetch<LoginResponse>(API.AUTH_VALIDATE, {
      method: 'POST',
    })
    const payload = normalizeLoginResponse(resposta)
    return Number(payload.valid ?? payload.VALID ?? 0) === 1
  } catch {
    clearSession()
    return false
  }
}

export function clearAuth(): void {
  clearSession()
}
