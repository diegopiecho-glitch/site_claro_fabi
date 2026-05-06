import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Building2, Settings, Plus, Eye, Home, CheckCircle2, XCircle, MapPinned, Loader2, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { API, apiFetch } from '../../lib/api'
import { PropertyCard } from '../../components/PropertyCard'

const ATALHOS = [
  {
    to:    '/sistema/imoveis',
    Icon:  Building2,
    label: 'Imóveis',
    desc:  'Listar e gerenciar imóveis',
    cor:   'bg-amber-600 shadow-amber-600/30',
  },
  {
    to:    '/sistema/imoveis/novo',
    Icon:  Plus,
    label: 'Novo Imóvel',
    desc:  'Cadastrar nova propriedade',
    cor:   'bg-green-600 shadow-green-600/30',
  },
  {
    to:    '/sistema/configuracoes',
    Icon:  Settings,
    label: 'Configurações do Site',
    desc:  'Textos, fotos e redes sociais',
    cor:   'bg-slate-600 shadow-slate-600/30',
  },
  {
    to:       '/',
    Icon:     Eye,
    label:    'Ver Site',
    desc:     'Abrir site público',
    cor:      'bg-blue-600 shadow-blue-600/30',
    external: true,
  },
]

interface ImovelSistema {
  id_imovel: number
  titulo: string
  subtitulo?: string
  tipo?: string
  cidade?: string
  bairro?: string
  endereco?: string
  preco?: number
  quartos?: number
  banheiros?: number
  garagem?: number
  area?: number
  imagem?: string
  ativo?: number | string
}

interface CardProperty {
  id: number
  title: string
  subtitle: string
  price: number
  type: 'casa' | 'apartamento' | 'terreno'
  city: string
  image: string
  quartos?: number
  banheiros?: number
  garagem?: number
  area?: number
}

const CORES_GRAFICO = ['#f59e0b', '#0f766e', '#2563eb', '#dc2626', '#7c3aed', '#475569']

function numero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function texto(v: unknown): string {
  return String(v ?? '').trim()
}

function normalizarImovel(item: any): ImovelSistema {
  return {
    id_imovel: numero(item.id_imovel ?? item.ID_IMOVEL ?? item.id ?? item.ID),
    titulo: texto(item.titulo ?? item.TITULO ?? item.title ?? item.TITLE),
    subtitulo: texto(item.subtitulo ?? item.SUBTITULO ?? item.bairro ?? item.BAIRRO),
    tipo: texto(item.tipo ?? item.TIPO).toLowerCase(),
    cidade: texto(item.cidade ?? item.CIDADE),
    bairro: texto(item.bairro ?? item.BAIRRO),
    endereco: texto(item.endereco ?? item.ENDERECO),
    preco: numero(item.preco ?? item.PRECO ?? item.price ?? item.PRICE),
    quartos: numero(item.quartos ?? item.QUARTOS) || undefined,
    banheiros: numero(item.banheiros ?? item.BANHEIROS) || undefined,
    garagem: numero(item.garagem ?? item.GARAGEM) || undefined,
    area: numero(item.area ?? item.AREA) || undefined,
    imagem: texto(item.imagem ?? item.IMAGEM ?? item.foto ?? item.FOTO),
    ativo: item.ativo ?? item.ATIVO,
  }
}

function normalizarCardHome(item: any): CardProperty {
  const tipoTexto = texto(item.tipo ?? item.TIPO ?? item.type ?? item.TYPE).toLowerCase()
  const tipo = ['casa', 'apartamento', 'terreno'].includes(tipoTexto)
    ? (tipoTexto as 'casa' | 'apartamento' | 'terreno')
    : 'casa'

  return {
    id: numero(item.id_imovel ?? item.ID_IMOVEL ?? item.id ?? item.ID),
    title: texto(item.titulo ?? item.TITULO ?? item.title ?? item.TITLE) || 'Sem titulo',
    subtitle:
      texto(item.bairro ?? item.BAIRRO) ||
      texto(item.subtitulo ?? item.SUBTITULO ?? item.subtitle ?? item.SUBTITLE) ||
      texto(item.endereco ?? item.ENDERECO),
    price: numero(item.preco ?? item.PRECO ?? item.price ?? item.PRICE),
    type: tipo,
    city: texto(item.cidade ?? item.CIDADE ?? item.city ?? item.CITY),
    image:
      texto(item.foto ?? item.FOTO ?? item.imagem ?? item.IMAGEM ?? item.image ?? item.IMAGE) ||
      'https://images.unsplash.com/photo-1760887497519-3b1c5a525836?w=400',
    quartos: numero(item.quartos ?? item.QUARTOS) || undefined,
    banheiros: numero(item.banheiros ?? item.BANHEIROS) || undefined,
    garagem: numero(item.garagem ?? item.GARAGEM) || undefined,
    area: numero(item.area ?? item.AREA) || undefined,
  }
}

function ativoFlag(valor: unknown): boolean {
  return String(valor ?? '1') === '1'
}

export function SistemaHome() {
  const [imoveis, setImoveis] = useState<ImovelSistema[]>([])
  const [cardsHome, setCardsHome] = useState<CardProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setErro('')
        const [dataImoveis, dataCardsPublicos] = await Promise.all([
          apiFetch<any>(API.IMOVEIS_SISTEMA_LISTA),
          apiFetch<any>(API.IMOVEIS_LISTA),
        ])

        const itemsImoveis = Array.isArray(dataImoveis) ? dataImoveis : (dataImoveis.items ?? [])
        setImoveis(itemsImoveis.map(normalizarImovel).filter((item) => item.id_imovel > 0))

        const itemsCards = Array.isArray(dataCardsPublicos) ? dataCardsPublicos : (dataCardsPublicos.items ?? [])
        setCardsHome(itemsCards.map(normalizarCardHome).filter((item) => item.id > 0))
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const totalImoveis = imoveis.length
  const totalAtivos = imoveis.filter((item) => ativoFlag(item.ativo)).length
  const totalInativos = totalImoveis - totalAtivos

  const graficoCidades = useMemo(() => {
    const agrupado = new Map<string, number>()

    imoveis.forEach((item) => {
      const cidade = item.cidade || 'Nao informada'
      agrupado.set(cidade, (agrupado.get(cidade) ?? 0) + 1)
    })

    return Array.from(agrupado.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [imoveis])

  const ultimosImoveis = useMemo(
    () => [...cardsHome].sort((a, b) => b.id - a.id).slice(0, 4),
    [cardsHome]
  )

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Bem-vindo ao sistema de gerenciamento</p>
      </div>

      {erro && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          {erro}
        </div>
      )}

      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max gap-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          {ATALHOS.map(({ to, Icon, label, desc, cor, external }) => (
            <Link
              key={to}
              to={to}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="group flex min-w-[220px] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-white hover:shadow-md"
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${cor} text-white shadow-lg transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Building2 size={24} />
          </div>
          <p className="text-sm text-slate-500">Total de imoveis cadastrados</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? <Loader2 className="animate-spin text-amber-600" size={28} /> : totalImoveis}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm text-slate-500">Imoveis ativos</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? <Loader2 className="animate-spin text-amber-600" size={28} /> : totalAtivos}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
            <XCircle size={24} />
          </div>
          <p className="text-sm text-slate-500">Imoveis inativos</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? <Loader2 className="animate-spin text-amber-600" size={28} /> : totalInativos}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <MapPinned size={24} />
          </div>
          <p className="text-sm text-slate-500">Cidades com cadastro</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? <Loader2 className="animate-spin text-amber-600" size={28} /> : graficoCidades.length}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Imoveis por cidade</h2>
            <p className="text-sm text-slate-500">Distribuicao dos cadastros por municipio</p>
          </div>

          {loading ? (
            <div className="flex h-[320px] items-center justify-center">
              <Loader2 className="animate-spin text-amber-600" size={34} />
            </div>
          ) : graficoCidades.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-slate-400">
              Nenhum dado disponivel para o grafico.
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={graficoCidades}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {graficoCidades.map((entry, index) => (
                      <Cell key={entry.name} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} imovel(is)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Resumo por cidade</h2>
            <p className="text-sm text-slate-500">As cidades com mais cadastros no sistema</p>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-amber-600" size={30} />
              </div>
            )}

            {!loading && graficoCidades.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Nenhuma cidade encontrada.
              </div>
            )}

            {!loading && graficoCidades.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CORES_GRAFICO[index % CORES_GRAFICO.length] }}
                  />
                  <span className="font-medium text-slate-800">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-600">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">Ultimos 4 imoveis cadastrados</h2>
          <p className="text-sm text-slate-500">Visualizacao rapida dos cadastros mais recentes</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-amber-600" size={34} />
          </div>
        ) : ultimosImoveis.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            Nenhum imovel cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {ultimosImoveis.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                to={`/sistema/imoveis/${property.id}/editar`}
                actionLabel="Ver Detalhes"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
