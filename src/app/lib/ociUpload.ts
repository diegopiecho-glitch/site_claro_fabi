// Configure uma PAR URL do Oracle OCI para uploads:
// Console OCI -> Object Storage -> bucket_imoveis -> Pre-Authenticated Requests
// Crie uma PAR com permissao de escrita no prefixo desejado.
// Observacao: PAR do OCI permite upload/leitura, mas nao exclusao de objetos.
// Exemplo de PAR URL: https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/SEU_TOKEN/n/grjkkkmo3naa/b/bucket_imoveis/o/
const OCI_PAR_URL_PADRAO =
  'https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/3JV4Zv8vTfzj6RuhiNrkHXkWbuOO07CiHwyZhAmsiReiP1z26aaLdxiv1D1uKuEG/n/grjkkkmo3naa/b/bucket_imoveis/o/'

// URL base usada para ler/exibir as imagens no site.
// Se o bucket nao for publico, troque para uma URL de leitura valida
// (por exemplo uma PAR separada com permissao de leitura).
const OCI_READ_BASE_PADRAO =
  'https://objectstorage.sa-saopaulo-1.oraclecloud.com/p/y67zc_llCHARisfUjSagLyCPIrghoSgC_nH2lNYF2iKUmTIO2OGt_ozKmiJ7QijI/n/grjkkkmo3naa/b/bucket_imoveis/o'

const OCI_PAR_URL_ENV = import.meta.env.VITE_OCI_PAR_URL
const OCI_READ_BASE_ENV = import.meta.env.VITE_OCI_READ_BASE

export const OCI_PAR_URL = String(OCI_PAR_URL_ENV ?? OCI_PAR_URL_PADRAO).trim()
export const OCI_READ_BASE = String(OCI_READ_BASE_ENV ?? OCI_READ_BASE_PADRAO).trim().replace(/\/+$/, '')

const OCI_IMOVEIS_ROOT = 'img_imoveis'

export function ociConfigurado(): boolean {
  return OCI_PAR_URL.trim().length > 0
}

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function uploadParaOCI(file: File, pasta?: string): Promise<string> {
  if (!ociConfigurado()) {
    throw new Error(
      'OCI_PAR_URL nao configurada. Edite src/app/lib/ociUpload.ts e insira sua PAR URL.'
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const slug = Math.random().toString(36).slice(2, 8)
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const safeBaseName = sanitizeFilenamePart(baseName) || 'foto'
  const safeFolder = pasta ? sanitizeFilenamePart(pasta) : ''
  const filename = `${safeBaseName}_${Date.now()}_${slug}.${ext}`
  const folderPath = safeFolder ? `${OCI_IMOVEIS_ROOT}/${safeFolder}` : OCI_IMOVEIS_ROOT
  const objectName = `${folderPath}/${filename}`

  const resp = await fetch(`${OCI_PAR_URL}${objectName}`, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })

  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error(
        'Upload falhou: a OCI_PAR_URL de escrita foi rejeitada pelo Oracle (401). Gere uma nova PAR com permissao de upload no bucket e configure VITE_OCI_PAR_URL.'
      )
    }

    throw new Error(`Upload falhou: ${resp.status}`)
  }

  const publicObjectName = encodeURIComponent(objectName)

  return `${OCI_READ_BASE}/${publicObjectName}`
}
