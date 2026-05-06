const AUTH_KEY = 'sistema_imoveis_auth'

export const SISTEMA_USUARIO = 'admin'
export const SISTEMA_SENHA   = 'admin123' // Altere esta senha

export function login(usuario: string, senha: string): boolean {
  if (usuario === SISTEMA_USUARIO && senha === SISTEMA_SENHA) {
    sessionStorage.setItem(AUTH_KEY, '1')
    return true
  }
  return false
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}
