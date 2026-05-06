import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Building2,
  Search,
  MapPin,
  Home,
  Eye,
  Bath,
  Bed,
  Car,
  Ruler,
} from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { Button } from '../../../components/ui/button'

interface Imovel {
  id_imovel: number
  titulo: string
  subtitulo?: string
  tipo: 'casa' | 'apartamento' | 'terreno'
  cidade: string
  bairro: string
  endereco?: string
  preco: number
  quartos?: number
  banheiros?: number
  garagem?: number
  area?: number
  imagem?: string
  ativo?: number | string
}

interface CardHomeItem {
  id: number
  image: string
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1760887497519-3b1c5a525836?w=400'

function numero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function texto(v: unknown): string {
  return String(v ?? '').trim()
}

function formatPrice(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(v)
}

function getTypeLabel(type: Imovel['tipo']) {
  const labels = {
    casa: 'Casa',
    apartamento: 'Apartamento',
    terreno: 'Terreno',
  }
  return labels[type]
}

function normalizeType(raw: unknown): Imovel['tipo'] {
  const type = texto(raw).toLowerCase()
  return ['casa', 'apartamento', 'terreno'].includes(type)
    ? (type as Imovel['tipo'])
    : 'casa'
}

function ativoFlag(valor: unknown): boolean {
  return String(valor ?? '1') === '1'
}

function normalizarImovel(item: any): Imovel {
  return {
    id_imovel: numero(item.id_imovel ?? item.ID_IMOVEL ?? item.id ?? item.ID),
    titulo: texto(item.titulo ?? item.TITULO ?? item.title ?? item.TITLE),
    subtitulo: texto(item.subtitulo ?? item.SUBTITULO),
    tipo: normalizeType(item.tipo ?? item.TIPO ?? item.type ?? item.TYPE),
    cidade: texto(item.cidade ?? item.CIDADE ?? item.city ?? item.CITY),
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

function normalizarCardHome(item: any): CardHomeItem {
  return {
    id: numero(item.id_imovel ?? item.ID_IMOVEL ?? item.id ?? item.ID),
    image:
      texto(item.foto ?? item.FOTO ?? item.imagem ?? item.IMAGEM ?? item.image ?? item.IMAGE) ||
      FALLBACK_IMAGE,
  }
}

export function ImoveisList() {
  const navigate = useNavigate()
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [imagensPublicas, setImagensPublicas] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [priceRange, setPriceRange] = useState('')

  const carregar = async () => {
    try {
      setLoading(true)
      setErro('')

      const [dataImoveis, dataCards] = await Promise.all([
        apiFetch<any>(API.IMOVEIS_SISTEMA_LISTA),
        apiFetch<any>(API.IMOVEIS_LISTA),
      ])

      const itemsImoveis = Array.isArray(dataImoveis) ? dataImoveis : (dataImoveis.items ?? [])
      setImoveis(itemsImoveis.map(normalizarImovel).filter((item) => item.id_imovel > 0))

      const itemsCards = Array.isArray(dataCards) ? dataCards : (dataCards.items ?? [])
      const mapa = new Map<number, string>()
      itemsCards
        .map(normalizarCardHome)
        .filter((item) => item.id > 0)
        .forEach((item) => {
          mapa.set(item.id, item.image)
        })
      setImagensPublicas(mapa)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar imóveis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const excluir = async (id: number) => {
    if (!confirm('Excluir este imóvel? As fotos vinculadas também serão removidas.')) return
    setExcluindo(id)
    try {
      await apiFetch(API.IMOVEL_EXCLUIR(id), { method: 'POST' })
      setImoveis((prev) => prev.filter((i) => i.id_imovel !== id))
    } catch {
      alert('Erro ao excluir imóvel.')
    } finally {
      setExcluindo(null)
    }
  }

  const cities = useMemo(
    () => Array.from(new Set(imoveis.map((item) => item.cidade).filter(Boolean))).sort(),
    [imoveis]
  )

  const filteredImoveis = useMemo(() => {
    return [...imoveis]
      .filter((imovel) => {
        const typeMatch = !selectedType || imovel.tipo === selectedType
        const cityMatch = !selectedCity || imovel.cidade === selectedCity

        let priceMatch = true
        if (priceRange) {
          const price = imovel.preco
          switch (priceRange) {
            case '0-500k':
              priceMatch = price <= 500000
              break
            case '500k-1m':
              priceMatch = price > 500000 && price <= 1000000
              break
            case '1m-2m':
              priceMatch = price > 1000000 && price <= 2000000
              break
            case '2m+':
              priceMatch = price > 2000000
              break
          }
        }

        return typeMatch && cityMatch && priceMatch
      })
      .sort((a, b) => b.id_imovel - a.id_imovel)
  }, [imoveis, priceRange, selectedCity, selectedType])

  const totalAtivos = imoveis.filter((item) => ativoFlag(item.ativo)).length

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
          <p className="mt-1 text-slate-500">
            {imoveis.length} {imoveis.length === 1 ? 'imóvel cadastrado' : 'imóveis cadastrados'}
            {imoveis.length > 0 && ` • ${totalAtivos} ativos`}
          </p>
        </div>

        <Link to="/sistema/imoveis/novo">
          <Button className="gap-2 bg-amber-600 text-white hover:bg-amber-700">
            <Plus size={17} />
            Novo Imóvel
          </Button>
        </Link>
      </div>

      {!loading && !erro && imoveis.length > 0 && (
        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">Tipo de Imóvel</label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition-colors hover:border-amber-400 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Todos</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="terreno">Terreno</option>
                </select>
                <Home
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">Cidade</label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition-colors hover:border-amber-400 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Todas</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <MapPin
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">Faixa de Preço</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition-colors hover:border-amber-400 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Qualquer valor</option>
                <option value="0-500k">Até R$ 500.000</option>
                <option value="500k-1m">R$ 500.000 - R$ 1.000.000</option>
                <option value="1m-2m">R$ 1.000.000 - R$ 2.000.000</option>
                <option value="2m+">Acima de R$ 2.000.000</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="invisible text-sm text-slate-600">Ações</label>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('')
                  setSelectedCity('')
                  setPriceRange('')
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3 text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-amber-700 hover:to-amber-600 hover:shadow-amber-500/30"
              >
                <Search size={20} />
                <span>Limpar filtros</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-amber-600" size={40} />
        </div>
      )}

      {erro && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} />
          {erro}
        </div>
      )}

      {!loading && !erro && imoveis.length === 0 && (
        <div className="py-24 text-center text-slate-400">
          <Building2 size={52} className="mx-auto mb-3" />
          <p className="text-lg font-medium text-slate-500">Nenhum imóvel cadastrado</p>
          <Link to="/sistema/imoveis/novo">
            <Button className="mt-5 gap-2 bg-amber-600 text-white hover:bg-amber-700">
              <Plus size={16} />
              Cadastrar primeiro imóvel
            </Button>
          </Link>
        </div>
      )}

      {!loading && !erro && imoveis.length > 0 && (
        <>
          <div className="mb-8">
            <span className="mb-3 inline-block text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
              Gestão de imóveis
            </span>
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
              Catálogo administrativo
            </h2>
            <p className="text-slate-600">
              {filteredImoveis.length} {filteredImoveis.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredImoveis.map((imovel) => {
              const image = imagensPublicas.get(imovel.id_imovel) || imovel.imagem || FALLBACK_IMAGE
              const subtitle =
                imovel.bairro || imovel.subtitulo || imovel.endereco || ''
              const city = imovel.cidade || ''
              const isAtivo = ativoFlag(imovel.ativo)

              return (
                <div
                  key={imovel.id_imovel}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:border-amber-600/50 hover:shadow-lg"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={image}
                      alt={imovel.titulo}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                    />

                    <div className="absolute right-4 top-4 rounded-full border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-900 backdrop-blur-sm">
                      {getTypeLabel(imovel.tipo)}
                    </div>

                    {city && (
                      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-sm text-slate-900 shadow-sm backdrop-blur-sm">
                        <MapPin size={14} className="shrink-0 text-amber-600" />
                        <span>{city}</span>
                      </div>
                    )}

                    <div className="absolute left-4 top-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                          isAtivo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-900/80 text-white'
                        }`}
                      >
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="mb-2 text-slate-900 transition-colors hover:text-amber-600">
                      {imovel.titulo}
                    </h3>

                    {subtitle && (
                      <div className="mb-4 flex items-start gap-2">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                        <p className="line-clamp-2 text-sm text-slate-600">{subtitle}</p>
                      </div>
                    )}

                    {((imovel.quartos && imovel.quartos > 0) ||
                      (imovel.banheiros && imovel.banheiros > 0) ||
                      (imovel.garagem && imovel.garagem > 0) ||
                      (imovel.area && imovel.area > 0)) && (
                      <div className="mb-4">
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {imovel.quartos && imovel.quartos > 0 && (
                            <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                              <Bed size={16} className="shrink-0 text-amber-600" />
                              <div className="min-w-0 leading-tight">
                                <span className="block text-[11px] text-slate-600">Quartos</span>
                                <span className="block text-xs font-medium text-slate-900">{imovel.quartos}</span>
                              </div>
                            </div>
                          )}

                          {imovel.banheiros && imovel.banheiros > 0 && (
                            <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                              <Bath size={16} className="shrink-0 text-amber-600" />
                              <div className="min-w-0 leading-tight">
                                <span className="block text-[11px] text-slate-600">Banheiros</span>
                                <span className="block text-xs font-medium text-slate-900">{imovel.banheiros}</span>
                              </div>
                            </div>
                          )}

                          {imovel.garagem && imovel.garagem > 0 && (
                            <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                              <Car size={16} className="shrink-0 text-amber-600" />
                              <div className="min-w-0 leading-tight">
                                <span className="block text-[11px] text-slate-600">Garagem</span>
                                <span className="block text-xs font-medium text-slate-900">
                                  {imovel.garagem} {imovel.garagem === 1 ? 'vaga' : 'vagas'}
                                </span>
                              </div>
                            </div>
                          )}

                          {imovel.area && imovel.area > 0 && (
                            <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                              <Ruler size={16} className="shrink-0 text-amber-600" />
                              <div className="min-w-0 leading-tight">
                                <span className="block text-[11px] text-slate-600">Área</span>
                                <span className="block text-xs font-medium text-slate-900">{imovel.area}m²</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-4">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="mb-1 text-xs text-slate-500">Valor</p>
                          <p className="text-xl font-bold leading-none text-amber-600">
                            {formatPrice(imovel.preco)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => window.open(`/imovel/${imovel.id_imovel}`, '_blank', 'noopener,noreferrer')}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-amber-300 hover:text-amber-700 sm:w-auto"
                        >
                          <Eye size={15} />
                          Ver no site
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          className="gap-2 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                          onClick={() => navigate(`/sistema/imoveis/${imovel.id_imovel}/editar`)}
                        >
                          <Pencil size={15} />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 border-slate-200 hover:border-red-400 hover:text-red-600"
                          onClick={() => excluir(imovel.id_imovel)}
                          disabled={excluindo === imovel.id_imovel}
                        >
                          {excluindo === imovel.id_imovel ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredImoveis.length === 0 && (
            <div className="py-16 text-center">
              <Building2 className="mx-auto mb-4 text-slate-400" size={64} />
              <h3 className="mb-2 text-xl font-semibold text-slate-600">
                Nenhum imóvel encontrado
              </h3>
              <p className="text-slate-500">Tente ajustar os filtros de busca.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
