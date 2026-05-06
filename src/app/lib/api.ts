export const ORDS_BASE =
  'https://gfeee0b664f71e7-imoveis.adb.sa-saopaulo-1.oraclecloudapps.com/ords/imoveis'

export const API = {
  // Leitura - modulos existentes
  IMOVEIS_LISTA:              `${ORDS_BASE}/cardhomesite/`,
  IMOVEL_DETALHE: (id: number | string) => `${ORDS_BASE}/imoveis/detalhe/${id}`,
  FOTOS_LISTA:                `${ORDS_BASE}/fotodetalheimovel/`,
  CONFIG_LISTA:               `${ORDS_BASE}/customizacao_site/`,

  // Escrita - auto-REST (requer create_ords_admin.sql)
  IMOVEL_CRIAR:               `${ORDS_BASE}/admin/imovel/`,
  IMOVEL_ATUALIZAR: (id: number) => `${ORDS_BASE}/admin/imovel/${id}`,
  IMOVEL_EXCLUIR:   (id: number) => `${ORDS_BASE}/admin/imovel/excluir/${id}`,
  FOTO_CRIAR:                 `${ORDS_BASE}/admin/foto/`,
  FOTO_ATUALIZAR:   (id: number) => `${ORDS_BASE}/admin/foto/atualizar/${id}`,
  FOTO_EXCLUIR:     (id: number) => `${ORDS_BASE}/admin/foto/excluir/${id}`,
  CONFIG_ATUALIZAR: (id: number) => `${ORDS_BASE}/admin/config/${id}`,
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const method  = (options?.method ?? 'GET').toUpperCase()
  const isWrite = ['POST', 'PUT', 'PATCH'].includes(method)

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(isWrite ? { 'Content-Type': 'text/plain', Accept: 'application/json' } : {}),
        ...options?.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Falha de conexão com a API: ${url}`)
    }
    throw error
  }

  if (!response.ok) {
    const texto = await response.text().catch(() => '')
    throw new Error(`Erro ${response.status}: ${texto || response.statusText}`)
  }
  if (response.status === 204) return {} as T

  const texto = await response.text().catch(() => '')
  if (!texto.trim()) return {} as T

  try {
    return JSON.parse(texto) as T
  } catch {
    throw new Error(`Resposta inválida da API: ${texto}`)
  }
}
