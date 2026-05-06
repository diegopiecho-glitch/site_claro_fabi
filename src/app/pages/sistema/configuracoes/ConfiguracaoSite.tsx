import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, AlertCircle, Upload } from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { Button }   from '../../../components/ui/button'
import { Input }    from '../../../components/ui/input'
import { Label }    from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { uploadParaOCI } from '../../../lib/ociUpload'

interface Config {
  id?:                         number
  titulo_home_site?:           string
  subtitulo_home_site?:        string
  url_imagem_home_site?:       string
  titulo_sobre_site?:          string
  subtitulo_sobre_site?:       string
  titulo_descricao_sobre_site?:string
  descricao_sobre_site?:       string
  url_foto_sobre_site?:        string
  url_logotipo?:               string
  descricao_rodape?:           string
  link_instagram?:             string
  link_faceboock?:             string
  whatsapp?:                   string
  nome_corretor?:              string
  endereco_contato_site?:      string
  frase_contato_site?:         string
  telefone_contato1?:          string
  telefone_contato2?:          string
  url_mapa_contato_site?:      string
  url_site?:                   string
  endereco_site?:              string
}

function obterCampoConfig(cfg: any, campo: string) {
  if (!cfg || typeof cfg !== 'object') return undefined

  const chave = Object.keys(cfg).find(
    (item) => item.toLowerCase() === campo.toLowerCase()
  )

  return chave ? cfg[chave] : undefined
}

function valorConfig(cfg: any, campo: string): string {
  const valor = obterCampoConfig(cfg, campo)
  return String(valor ?? '')
}

function numeroConfig(cfg: any, campo: string): number | null {
  const valor = obterCampoConfig(cfg, campo)
  const numero = Number(valor)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

function possuiAlgumValorConfig(cfg: any): boolean {
  if (!cfg || typeof cfg !== 'object') return false

  return Object.keys(cfg).some((chave) => {
    const valor = cfg[chave]
    return valor !== null && valor !== undefined && String(valor).trim() !== ''
  })
}

function possuiDadosPreenchidos(config: Config): boolean {
  return Object.entries(config).some(([chave, valor]) => {
    if (chave === 'id') return false
    return valor !== null && valor !== undefined && String(valor).trim() !== ''
  })
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900 mb-5">{titulo}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

function Campo({ label, span2, children }: {
  label: string
  span2?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${span2 ? 'md:col-span-2' : ''}`}>
      <Label className="text-slate-700">{label}</Label>
      {children}
    </div>
  )
}

function CampoImagem({
  label,
  valor,
  placeholder,
  onUrlChange,
  onUpload,
  onUploadErro,
  uploading,
}: {
  label: string
  valor: string
  placeholder: string
  onUrlChange: (valor: string) => void
  onUpload: (file: File) => Promise<void>
  onUploadErro: (mensagem: string) => void
  uploading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) return

    try {
      onUploadErro('')
      await onUpload(file)
    } catch (erro) {
      onUploadErro(erro instanceof Error ? erro.message : 'Erro ao enviar imagem')
    }
  }

  return (
    <Campo label={label} span2>
      <div className="space-y-3">
        <Input value={valor} onChange={(e) => onUrlChange(e.target.value)} placeholder={placeholder} />
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Enviando imagem...' : 'Escolher imagem'}
          </Button>
          <span className="text-xs text-slate-500">
            A imagem sera enviada para o bucket e a URL sera preenchida automaticamente.
          </span>
        </div>
        {valor && (
          <img
            src={valor}
            alt={label}
            className="mt-2 h-28 w-auto rounded-xl border border-slate-200 object-cover bg-white"
          />
        )}
      </div>
    </Campo>
  )
}

export function ConfiguracaoSite() {
  const [config,   setConfig]   = useState<Config>({})
  const [configId, setConfigId] = useState<number | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState('')
  const [sucesso,  setSucesso]  = useState('')
  const [uploadingField, setUploadingField] = useState<keyof Config | null>(null)
  const temDadosCarregados = possuiDadosPreenchidos(config)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data  = await apiFetch<any>(API.CONFIG_LISTA)
        const items = data.items ?? data
        const cfg   = Array.isArray(items) ? items[0] : items

        if (cfg && possuiAlgumValorConfig(cfg)) {
          setConfigId(numeroConfig(cfg, 'id') ?? 1)
          setConfig({
            titulo_home_site:            valorConfig(cfg, 'titulo_home_site'),
            subtitulo_home_site:         valorConfig(cfg, 'subtitulo_home_site'),
            url_imagem_home_site:        valorConfig(cfg, 'url_imagem_home_site'),
            titulo_sobre_site:           valorConfig(cfg, 'titulo_sobre_site'),
            subtitulo_sobre_site:        valorConfig(cfg, 'subtitulo_sobre_site'),
            titulo_descricao_sobre_site: valorConfig(cfg, 'titulo_descricao_sobre_site'),
            descricao_sobre_site:        valorConfig(cfg, 'descricao_sobre_site'),
            url_foto_sobre_site:         valorConfig(cfg, 'url_foto_sobre_site'),
            url_logotipo:                valorConfig(cfg, 'url_logotipo'),
            descricao_rodape:            valorConfig(cfg, 'descricao_rodape'),
            link_instagram:              valorConfig(cfg, 'link_instagram'),
            link_faceboock:              valorConfig(cfg, 'link_faceboock'),
            whatsapp:                    valorConfig(cfg, 'whatsapp'),
            nome_corretor:               valorConfig(cfg, 'nome_corretor'),
            endereco_contato_site:       valorConfig(cfg, 'endereco_contato_site'),
            frase_contato_site:          valorConfig(cfg, 'frase_contato_site'),
            telefone_contato1:           valorConfig(cfg, 'telefone_contato1'),
            telefone_contato2:           valorConfig(cfg, 'telefone_contato2'),
            url_mapa_contato_site:       valorConfig(cfg, 'url_mapa_contato_site'),
            url_site:                    valorConfig(cfg, 'url_site'),
            endereco_site:               valorConfig(cfg, 'endereco_site'),
          })
        } else {
          setConfigId(null)
          setConfig({})
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar configuracoes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const set = (field: keyof Config) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig(prev => ({ ...prev, [field]: e.target.value }))

  const setCampoDireto = (field: keyof Config, valor: string) => {
    setConfig(prev => ({ ...prev, [field]: valor }))
  }

  const criarUploadHandler = (field: keyof Config, pastaUpload: string) => async (file: File) => {
    setUploadingField(field)
    try {
      const url = await uploadParaOCI(file, pastaUpload)
      setCampoDireto(field, url)
    } finally {
      setUploadingField(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (configId === null) {
      setErro('Registro de configuracao nao encontrado. Verifique o banco de dados.')
      return
    }

    setSalvando(true)
    setErro('')
    setSucesso('')

    const payload = Object.fromEntries(
      Object.entries(config).map(([k, v]) => [k, v === '' ? null : v])
    )

    try {
      await apiFetch(API.CONFIG_ATUALIZAR(configId), {
        method: 'PUT',
        body:   JSON.stringify(payload),
      })
      setSucesso('Configuracoes salvas com sucesso!')
      localStorage.removeItem('site_config_home')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar configuracoes')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Loader2 className="animate-spin text-amber-600" size={36} />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Configuracoes do Site</h1>
        <p className="text-slate-500 mt-1">Personalize textos, imagens e informacoes de contato</p>
      </div>

      {sucesso && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {sucesso}
        </div>
      )}

      {configId === null && !loading && !temDadosCarregados && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          Nenhum registro encontrado na tabela <code className="font-mono bg-amber-100 px-1 rounded">customizacao_site</code>. Insira um registro no banco antes de usar esta tela.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Secao titulo="Identidade Visual e Corretor">
          <Campo label="Nome do corretor" span2>
            <Input value={config.nome_corretor ?? ''} onChange={set('nome_corretor')} placeholder="Ex: Fabiane Niewierowska" />
          </Campo>
          <CampoImagem
            label="URL do logotipo"
            valor={config.url_logotipo ?? ''}
            placeholder="https://..."
            uploading={uploadingField === 'url_logotipo'}
            onUpload={criarUploadHandler('url_logotipo', 'IMAGENS_SITE')}
            onUrlChange={(valor) => setCampoDireto('url_logotipo', valor)}
            onUploadErro={setErro}
          />
          <Campo label="URL do site e redirect do /sistema">
            <Input value={config.url_site ?? ''} onChange={set('url_site')} placeholder="https://www.seusite.com.br" />
          </Campo>
          <Campo label="Endereco do site">
            <Input value={config.endereco_site ?? ''} onChange={set('endereco_site')} placeholder="www.seusite.com.br" />
          </Campo>
        </Secao>

        <Secao titulo="Pagina Home">
          <Campo label="Titulo principal" span2>
            <Input value={config.titulo_home_site ?? ''} onChange={set('titulo_home_site')} placeholder="Seu proximo imovel esta aqui" />
          </Campo>
          <Campo label="Subtitulo" span2>
            <Input value={config.subtitulo_home_site ?? ''} onChange={set('subtitulo_home_site')} placeholder="Sua corretora de confianca..." />
          </Campo>
          <CampoImagem
            label="URL da imagem de fundo (hero)"
            valor={config.url_imagem_home_site ?? ''}
            placeholder="https://..."
            uploading={uploadingField === 'url_imagem_home_site'}
            onUpload={criarUploadHandler('url_imagem_home_site', 'IMAGENS_SITE')}
            onUrlChange={(valor) => setCampoDireto('url_imagem_home_site', valor)}
            onUploadErro={setErro}
          />
          <Campo label="Texto do rodape" span2>
            <Input value={config.descricao_rodape ?? ''} onChange={set('descricao_rodape')} placeholder="© 2026 - Todos os direitos reservados." />
          </Campo>
        </Secao>

        <Secao titulo="Pagina Sobre">
          <Campo label="Titulo">
            <Input value={config.titulo_sobre_site ?? ''} onChange={set('titulo_sobre_site')} placeholder="Sobre Mim" />
          </Campo>
          <Campo label="Subtitulo">
            <Input value={config.subtitulo_sobre_site ?? ''} onChange={set('subtitulo_sobre_site')} placeholder="Sua parceira de confianca..." />
          </Campo>
          <Campo label="Nome / Cabecalho da secao">
            <Input value={config.titulo_descricao_sobre_site ?? ''} onChange={set('titulo_descricao_sobre_site')} placeholder="Fabiane Niewierowska" />
          </Campo>
          <CampoImagem
            label="URL da foto"
            valor={config.url_foto_sobre_site ?? ''}
            placeholder="https://..."
            uploading={uploadingField === 'url_foto_sobre_site'}
            onUpload={criarUploadHandler('url_foto_sobre_site', 'IMAGENS_SITE')}
            onUrlChange={(valor) => setCampoDireto('url_foto_sobre_site', valor)}
            onUploadErro={setErro}
          />
          <Campo label="Descricao / Texto sobre a corretora" span2>
            <Textarea value={config.descricao_sobre_site ?? ''} onChange={set('descricao_sobre_site')} rows={5} placeholder="Texto de apresentacao..." className="resize-none" />
          </Campo>
        </Secao>

        <Secao titulo="Pagina Contato">
          <Campo label="Endereco">
            <Input value={config.endereco_contato_site ?? ''} onChange={set('endereco_contato_site')} placeholder="Rua, numero - Cidade" />
          </Campo>
          <Campo label="Frase de contato">
            <Input value={config.frase_contato_site ?? ''} onChange={set('frase_contato_site')} placeholder="Sera um prazer conversar..." />
          </Campo>
          <Campo label="Telefone 1">
            <Input value={config.telefone_contato1 ?? ''} onChange={set('telefone_contato1')} placeholder="(51) 98051-9696" />
          </Campo>
          <Campo label="Telefone 2">
            <Input value={config.telefone_contato2 ?? ''} onChange={set('telefone_contato2')} placeholder="(51) 98051-9696" />
          </Campo>
          <Campo label="URL do mapa (embed ou link do Google Maps)" span2>
            <Textarea value={config.url_mapa_contato_site ?? ''} onChange={set('url_mapa_contato_site')} rows={3} placeholder="https://www.google.com/maps/embed?... ou https://maps.app.goo.gl/..." className="resize-none font-mono text-xs" />
          </Campo>
        </Secao>

        <Secao titulo="Redes Sociais">
          <Campo label="WhatsApp (somente numeros)">
            <Input value={config.whatsapp ?? ''} onChange={set('whatsapp')} placeholder="5551980519696" />
          </Campo>
          <Campo label="Instagram (URL completa)">
            <Input value={config.link_instagram ?? ''} onChange={set('link_instagram')} placeholder="https://instagram.com/..." />
          </Campo>
          <Campo label="Facebook (URL completa)">
            <Input value={config.link_faceboock ?? ''} onChange={set('link_faceboock')} placeholder="https://facebook.com/..." />
          </Campo>
        </Secao>

        {erro && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            {erro}
          </div>
        )}

        <Button
          type="submit"
          disabled={salvando || uploadingField !== null || (configId === null && !temDadosCarregados)}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2 px-8 h-11"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {salvando ? 'Salvando...' : 'Salvar Configuracoes'}
        </Button>
      </form>
    </div>
  )
}
