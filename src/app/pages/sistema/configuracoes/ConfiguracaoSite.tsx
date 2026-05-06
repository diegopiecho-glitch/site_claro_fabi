import { useState, useEffect } from 'react'
import { Save, Loader2, AlertCircle } from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { Button }   from '../../../components/ui/button'
import { Input }    from '../../../components/ui/input'
import { Label }    from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'

interface Config {
  id?:                         number
  rota_sistema_site?:          string
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

export function ConfiguracaoSite() {
  const [config,   setConfig]   = useState<Config>({})
  const [configId, setConfigId] = useState<number | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState('')
  const [sucesso,  setSucesso]  = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data  = await apiFetch<any>(API.CONFIG_LISTA)
        const items = data.items ?? data
        const cfg   = Array.isArray(items) ? items[0] : items
        if (cfg) {
          setConfigId(cfg.id ?? null)
          setConfig({
            rota_sistema_site:           String(cfg.rota_sistema_site           ?? ''),
            titulo_home_site:            String(cfg.titulo_home_site            ?? ''),
            subtitulo_home_site:         String(cfg.subtitulo_home_site         ?? ''),
            url_imagem_home_site:        String(cfg.url_imagem_home_site        ?? ''),
            titulo_sobre_site:           String(cfg.titulo_sobre_site           ?? ''),
            subtitulo_sobre_site:        String(cfg.subtitulo_sobre_site        ?? ''),
            titulo_descricao_sobre_site: String(cfg.titulo_descricao_sobre_site ?? ''),
            descricao_sobre_site:        String(cfg.descricao_sobre_site        ?? ''),
            url_foto_sobre_site:         String(cfg.url_foto_sobre_site         ?? ''),
            url_logotipo:                String(cfg.url_logotipo                ?? ''),
            descricao_rodape:            String(cfg.descricao_rodape            ?? ''),
            link_instagram:              String(cfg.link_instagram              ?? ''),
            link_faceboock:              String(cfg.link_faceboock              ?? ''),
            whatsapp:                    String(cfg.whatsapp                    ?? ''),
            nome_corretor:               String(cfg.nome_corretor               ?? ''),
            endereco_contato_site:       String(cfg.endereco_contato_site       ?? ''),
            frase_contato_site:          String(cfg.frase_contato_site          ?? ''),
            telefone_contato1:           String(cfg.telefone_contato1           ?? ''),
            telefone_contato2:           String(cfg.telefone_contato2           ?? ''),
            url_mapa_contato_site:       String(cfg.url_mapa_contato_site       ?? ''),
            url_site:                    String(cfg.url_site                    ?? ''),
            endereco_site:               String(cfg.endereco_site               ?? ''),
          })
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar configurações')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const set = (field: keyof Config) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configId) { setErro('Registro de configuração não encontrado. Verifique o banco de dados.'); return }
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
      setSucesso('Configurações salvas com sucesso!')
      // Limpar cache do site para forçar releitura
      localStorage.removeItem('site_config_home')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar configurações')
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
        <h1 className="text-3xl font-bold text-slate-900">Configurações do Site</h1>
        <p className="text-slate-500 mt-1">Personalize textos, imagens e informações de contato</p>
      </div>

      {sucesso && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {sucesso}
        </div>
      )}

      {!configId && !loading && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          Nenhum registro encontrado na tabela <code className="font-mono bg-amber-100 px-1 rounded">customizacao_site</code>. Insira um registro no banco antes de usar esta tela.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Identidade */}
        <Secao titulo="Identidade Visual e Corretor">
          <Campo label="Nome do corretor" span2>
            <Input value={config.nome_corretor ?? ''} onChange={set('nome_corretor')} placeholder="Ex: Fabiane Niewierowska" />
          </Campo>
          <Campo label="URL do logotipo" span2>
            <Input value={config.url_logotipo ?? ''} onChange={set('url_logotipo')} placeholder="https://..." />
            {config.url_logotipo && (
              <img src={config.url_logotipo} alt="Logo" className="mt-2 h-14 w-auto rounded-lg border border-slate-200 object-contain bg-white p-1" />
            )}
          </Campo>
          <Campo label="URL do site">
            <Input value={config.url_site ?? ''} onChange={set('url_site')} placeholder="https://www.seusite.com.br" />
          </Campo>
          <Campo label="Endereço do site">
            <Input value={config.endereco_site ?? ''} onChange={set('endereco_site')} placeholder="www.seusite.com.br" />
          </Campo>
          <Campo label="Rota do sistema (URL de redirect do /sistema)" span2>
            <Input value={config.rota_sistema_site ?? ''} onChange={set('rota_sistema_site')} placeholder="https://sistema.externo.com.br" />
          </Campo>
        </Secao>

        {/* Home */}
        <Secao titulo="Página Home">
          <Campo label="Título principal" span2>
            <Input value={config.titulo_home_site ?? ''} onChange={set('titulo_home_site')} placeholder="Seu próximo imóvel está aqui" />
          </Campo>
          <Campo label="Subtítulo" span2>
            <Input value={config.subtitulo_home_site ?? ''} onChange={set('subtitulo_home_site')} placeholder="Sua corretora de confiança..." />
          </Campo>
          <Campo label="URL da imagem de fundo (hero)" span2>
            <Input value={config.url_imagem_home_site ?? ''} onChange={set('url_imagem_home_site')} placeholder="https://..." />
            {config.url_imagem_home_site && (
              <img src={config.url_imagem_home_site} alt="Hero" className="mt-2 h-28 w-auto rounded-xl border border-slate-200 object-cover" />
            )}
          </Campo>
          <Campo label="Texto do rodapé" span2>
            <Input value={config.descricao_rodape ?? ''} onChange={set('descricao_rodape')} placeholder="© 2026 — Todos os direitos reservados." />
          </Campo>
        </Secao>

        {/* Sobre */}
        <Secao titulo="Página Sobre">
          <Campo label="Título">
            <Input value={config.titulo_sobre_site ?? ''} onChange={set('titulo_sobre_site')} placeholder="Sobre Mim" />
          </Campo>
          <Campo label="Subtítulo">
            <Input value={config.subtitulo_sobre_site ?? ''} onChange={set('subtitulo_sobre_site')} placeholder="Sua parceira de confiança..." />
          </Campo>
          <Campo label="Nome / Cabeçalho da seção">
            <Input value={config.titulo_descricao_sobre_site ?? ''} onChange={set('titulo_descricao_sobre_site')} placeholder="Fabiane Niewierowska" />
          </Campo>
          <Campo label="URL da foto">
            <Input value={config.url_foto_sobre_site ?? ''} onChange={set('url_foto_sobre_site')} placeholder="https://..." />
          </Campo>
          <Campo label="Descrição / Texto sobre a corretora" span2>
            <Textarea value={config.descricao_sobre_site ?? ''} onChange={set('descricao_sobre_site')} rows={5} placeholder="Texto de apresentação..." className="resize-none" />
          </Campo>
        </Secao>

        {/* Contato */}
        <Secao titulo="Página Contato">
          <Campo label="Endereço">
            <Input value={config.endereco_contato_site ?? ''} onChange={set('endereco_contato_site')} placeholder="Rua, número — Cidade" />
          </Campo>
          <Campo label="Frase de contato">
            <Input value={config.frase_contato_site ?? ''} onChange={set('frase_contato_site')} placeholder="Será um prazer conversar..." />
          </Campo>
          <Campo label="Telefone 1">
            <Input value={config.telefone_contato1 ?? ''} onChange={set('telefone_contato1')} placeholder="(51) 98051-9696" />
          </Campo>
          <Campo label="Telefone 2">
            <Input value={config.telefone_contato2 ?? ''} onChange={set('telefone_contato2')} placeholder="(51) 98051-9696" />
          </Campo>
          <Campo label="URL do mapa (iframe Google Maps)" span2>
            <Textarea value={config.url_mapa_contato_site ?? ''} onChange={set('url_mapa_contato_site')} rows={3} placeholder="https://www.google.com/maps/embed?..." className="resize-none font-mono text-xs" />
          </Campo>
        </Secao>

        {/* Redes sociais */}
        <Secao titulo="Redes Sociais">
          <Campo label="WhatsApp (somente números)">
            <Input value={config.whatsapp ?? ''} onChange={set('whatsapp')} placeholder="5551980519696" />
          </Campo>
          <Campo label="Instagram (URL completa)">
            <Input value={config.link_instagram ?? ''} onChange={set('link_instagram')} placeholder="https://instagram.com/..." />
          </Campo>
          <Campo label="Facebook (URL completa)">
            {/* Campo usa 'link_faceboock' — typo original mantido para compatibilidade */}
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
          disabled={salvando || !configId}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2 px-8 h-11"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {salvando ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </form>
    </div>
  )
}
