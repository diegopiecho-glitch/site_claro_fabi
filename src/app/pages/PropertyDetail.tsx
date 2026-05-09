import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router'
import {
  ArrowLeft,
  MapPin,
  Home,
  Bed,
  Bath,
  Car,
  Ruler,
  MessageCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Seo } from '../components/Seo'
import { API } from '../lib/api'
import { PropertyCard } from '../components/PropertyCard'

interface PropertyDetails {
  id_imovel: number
  titulo: string
  subtitulo?: string
  descricao: string
  preco: number
  tipo: string
  cidade: string
  bairro: string
  quartos?: number
  banheiros?: number
  garagem?: number
  area?: number
  endereco?: string
  [key: string]: any
}

interface Photo {
  id: number
  id_imovel: number
  url: string
  ordem?: number
  foto_principal?: 'S' | 'N'
  [key: string]: any
}

interface PropertyFeature {
  id_caracteristica: number
  descricao: string
  qtd?: number
  observacao?: string
  sessao: string
}

interface SimilarPropertyCardData {
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

const FEATURE_SECTION_ORDER = ['Cômodos', 'Áreas', 'Área Externa', 'Valores', 'Outras Informações'] as const

const getPhotoPrincipal = (photo: Photo) =>
  String(
    photo.foto_principal ?? photo.FOTO_PRINCIPAL ?? photo.principal ?? photo.PRINCIPAL ?? 'N'
  ).trim().toUpperCase() === 'S' ? 'S' : 'N'

const getPhotoOrder = (photo: Photo) => {
  const rawOrder =
    photo.ordem ??
    photo.ORDEM ??
    photo.ordem_foto ??
    photo.ORDEM_FOTO ??
    photo.sequencia ??
    photo.SEQUENCIA

  if (rawOrder === null || rawOrder === undefined || rawOrder === '') {
    return Number.MAX_SAFE_INTEGER
  }

  const parsedOrder = Number(rawOrder)
  return Number.isFinite(parsedOrder) ? parsedOrder : Number.MAX_SAFE_INTEGER
}

const getPhotoId = (photo: Photo) => {
  const rawId = photo.id ?? photo.ID ?? photo.id_foto ?? photo.ID_FOTO
  const parsedId = Number(rawId)
  return Number.isFinite(parsedId) ? parsedId : Number.MAX_SAFE_INTEGER
}

const getPhotoUrl = (photo: Photo) =>
  photo.url ?? photo.URL ?? photo.foto ?? photo.FOTO ?? ''

const getPhotoOrderFromUrl = (photo: Photo) => {
  const photoUrl = getPhotoUrl(photo)

  if (!photoUrl) return Number.MAX_SAFE_INTEGER

  const filename = photoUrl.split('/').pop() ?? ''
  const explicitSuffixMatch = filename.match(/[_-]{1,2}(\d+)(?=[_.-][^.]+$)/)
  if (explicitSuffixMatch) return Number(explicitSuffixMatch[1])

  const numericChunks = [...filename.matchAll(/(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value < 1000)

  return numericChunks.length > 0
    ? numericChunks[numericChunks.length - 1]
    : Number.MAX_SAFE_INTEGER
}

const normalizePhotos = (photosData: unknown, propertyId?: number): Photo[] => {
  const items = Array.isArray(photosData)
    ? photosData
    : Array.isArray((photosData as { items?: unknown[] })?.items)
      ? (photosData as { items: unknown[] }).items
      : []

  return items
    .filter((item): item is Photo => Boolean(item && typeof item === 'object'))
    .map((photo, index) => ({
      ...photo,
      id: getPhotoId(photo),
      id_imovel: Number(photo.id_imovel ?? photo.ID_IMOVEL ?? 0),
      url: getPhotoUrl(photo),
      foto_principal: getPhotoPrincipal(photo),
      ordem:
        getPhotoOrder(photo) === Number.MAX_SAFE_INTEGER
          ? getPhotoOrderFromUrl(photo)
          : getPhotoOrder(photo),
      _originalIndex: index,
    }))
    .filter((photo) => (propertyId === undefined ? true : photo.id_imovel === propertyId))
    .filter((photo) => Boolean(photo.url))
    .sort((a, b) => {
      if ((a.foto_principal ?? 'N') !== (b.foto_principal ?? 'N')) {
        return (b.foto_principal ?? 'N').localeCompare(a.foto_principal ?? 'N')
      }

      const orderDiff = (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER)
      if (orderDiff !== 0) return orderDiff

      const idDiff = (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
      if (idDiff !== 0) return idDiff

      return (a._originalIndex ?? 0) - (b._originalIndex ?? 0)
    })
    .map(({ _originalIndex, ...photo }) => photo)
}

const normalizeFeatures = (featuresData: unknown): PropertyFeature[] => {
  const items = Array.isArray(featuresData)
    ? featuresData
    : Array.isArray((featuresData as { items?: unknown[] })?.items)
      ? (featuresData as { items: unknown[] }).items
      : []

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id_caracteristica: Number(item.id_caracteristica ?? item.ID_CARACTERISTICA ?? 0),
      descricao: String(item.descricao ?? item.DESCRICAO ?? '').trim(),
      qtd: Number(item.qtd ?? item.QTD ?? 0) || undefined,
      observacao: String(item.observacao ?? item.OBSERVACAO ?? '').trim() || undefined,
      sessao: String(item.sessao ?? item.SESSAO ?? 'Outras Informações').trim() || 'Outras Informações',
    }))
    .filter((item) => item.id_caracteristica > 0 && item.descricao)
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
}

const normalizeCardProperties = (propertiesData: unknown): SimilarPropertyCardData[] => {
  const items = Array.isArray(propertiesData)
    ? propertiesData
    : Array.isArray((propertiesData as { items?: unknown[] })?.items)
      ? (propertiesData as { items: unknown[] }).items
      : []

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const id = Number(item.id ?? item.ID ?? item.imovel_id ?? item.id_imovel ?? item.ID_IMOVEL ?? 0)
      const typeRaw = String(item.type ?? item.tipo ?? 'casa').trim().toLowerCase()
      const type = ['casa', 'apartamento', 'terreno'].includes(typeRaw)
        ? (typeRaw as SimilarPropertyCardData['type'])
        : 'casa'

      return {
        id,
        title: String(item.title ?? item.titulo ?? item.nome ?? 'Sem titulo').trim(),
        subtitle: String(
          item.subtitle ?? item.subtitulo ?? item.SUBTITLE ?? item.SUBTITULO ?? item.bairro ?? item.BAIRRO ?? item.endereco ?? item.descricao ?? ''
        ).trim(),
        price: Number(
          String(item.price ?? item.preco ?? item.valor ?? '0')
            .replace(/\./g, '')
            .replace(',', '.')
        ) || 0,
        type,
        city: String(item.city ?? item.cidade ?? '').trim(),
        image: String(
          item.image ??
          item.imagem ??
          item.foto ??
          'https://images.unsplash.com/photo-1760887497519-3b1c5a525836?w=400'
        ).trim(),
        quartos: Number(item.quartos ?? item.n_quartos ?? item.num_quartos ?? item.qtd_quartos ?? 0) || undefined,
        banheiros: Number(item.banheiros ?? item.n_banheiros ?? item.num_banheiros ?? item.qtd_banheiros ?? 0) || undefined,
        garagem: Number(item.garagem ?? item.n_garagem ?? item.vagas ?? item.n_vagas ?? item.num_vagas ?? 0) || undefined,
        area: Number(item.area ?? item.area_total ?? item.m2 ?? item.metragem ?? item.area_m2 ?? 0) || undefined,
      }
    })
    .filter((item) => item.id > 0 && item.title)
}

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<PropertyDetails | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [features, setFeatures] = useState<PropertyFeature[]>([])
  const [similarProperties, setSimilarProperties] = useState<SimilarPropertyCardData[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [similarVisibleCount, setSimilarVisibleCount] = useState(3)
  const [similarPage, setSimilarPage] = useState(0)

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        const [detailsResponse, photosResponse, featuresResponse] = await Promise.all([
          fetch(API.IMOVEL_DETALHE(id), { cache: 'no-store' }),
          fetch(API.FOTOS_LISTA, { cache: 'no-store' }),
          fetch(API.IMOVEL_CARACTERISTICAS(id), { cache: 'no-store' }),
        ])

        if (!detailsResponse.ok) {
          throw new Error('Erro ao carregar detalhes do imovel')
        }

        const detailsData = await detailsResponse.json()
        const details = detailsData.items?.[0] || detailsData[0] || detailsData
        setProperty(details)

        if (photosResponse.ok) {
          const photosData = await photosResponse.json()
          const photosList = normalizePhotos(photosData, Number(id))
          setPhotos(photosList)
          setCurrentPhotoIndex(0)
        }

        if (featuresResponse.ok) {
          const featuresData = await featuresResponse.json()
          setFeatures(normalizeFeatures(featuresData))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
        console.error('Erro ao buscar detalhes do imovel:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPropertyDetails()
  }, [id])

  useEffect(() => {
    const fetchSimilarProperties = async () => {
      if (!id || !property) return

      try {
        setSimilarLoading(true)
        setSimilarVisibleCount(3)
        setSimilarPage(0)

        const listResponse = await fetch(API.IMOVEIS_LISTA, { cache: 'no-store' })
        if (!listResponse.ok) {
          throw new Error('Erro ao carregar imoveis semelhantes')
        }

        const listData = await listResponse.json()
        const allProperties = normalizeCardProperties(listData)
          .filter((item) => item.id !== Number(id))

        if (allProperties.length === 0) {
          setSimilarProperties([])
          return
        }

        const currentFeatureIds = new Set(features.map((feature) => feature.id_caracteristica))

        const candidatesWithScores = await Promise.all(
          allProperties.map(async (candidate) => {
            let featureIds = new Set<number>()

            try {
              const response = await fetch(API.IMOVEL_CARACTERISTICAS(candidate.id), { cache: 'no-store' })
              if (response.ok) {
                const data = await response.json()
                featureIds = new Set(
                  normalizeFeatures(data).map((feature) => feature.id_caracteristica)
                )
              }
            } catch {
              featureIds = new Set<number>()
            }

            const commonCount = [...currentFeatureIds].filter((featureId) => featureIds.has(featureId)).length
            const sameType = candidate.type === String(property.tipo).trim().toLowerCase()
            const sameCity = candidate.city === String(property.cidade ?? '').trim()
            const score = commonCount * 100 + (sameType ? 10 : 0) + (sameCity ? 5 : 0)

            return { candidate, score, commonCount, sameType, sameCity }
          })
        )

        const ranked = candidatesWithScores
          .filter((item) => item.sameType)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            if (b.commonCount !== a.commonCount) return b.commonCount - a.commonCount
            return a.candidate.title.localeCompare(b.candidate.title, 'pt-BR')
          })
          .map((item) => item.candidate)

        const fallbackRanked = candidatesWithScores
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            if (b.commonCount !== a.commonCount) return b.commonCount - a.commonCount
            return a.candidate.title.localeCompare(b.candidate.title, 'pt-BR')
          })
          .map((item) => item.candidate)

        setSimilarProperties(ranked.length > 0 ? ranked : fallbackRanked)
      } catch (err) {
        console.error('Erro ao buscar imoveis semelhantes:', err)
        setSimilarProperties([])
      } finally {
        setSimilarLoading(false)
      }
    }

    fetchSimilarProperties()
  }, [id, property, features])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price)

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const openPhotoInNewTab = (photoUrl: string) => {
    const imageKey = `property-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      window.localStorage.setItem(imageKey, photoUrl)
      window.open(`/visualizar-imagem?image=${encodeURIComponent(imageKey)}`, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(`/visualizar-imagem?src=${encodeURIComponent(photoUrl)}`, '_blank', 'noopener,noreferrer')
    }
  }

  const propertyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/imovel/${id}`
    : ''

  const seoTitle = property
    ? `${property.titulo} | ${property.cidade || 'Imovel'}`
    : 'Detalhes do imovel'

  const seoDescription = property
    ? [
        property.tipo,
        property.bairro,
        property.cidade,
        formatPrice(property.preco),
        property.descricao,
      ]
        .filter(Boolean)
        .join(' - ')
        .slice(0, 320)
    : 'Detalhes completos do imovel.'

  const seoImage = photos[0]?.url || photos[0]?.foto

  const whatsappMessage = property
    ? `Ola! Tenho interesse no imovel: ${property.titulo} - ${formatPrice(property.preco)}\n${propertyUrl}`
    : ''

  const groupedFeatures = FEATURE_SECTION_ORDER
    .map((section) => ({
      section,
      items: features.filter((feature) => feature.sessao === section),
    }))
    .filter((group) => group.items.length > 0)

  const otherFeatures = features.filter(
    (feature) => !FEATURE_SECTION_ORDER.includes(feature.sessao as typeof FEATURE_SECTION_ORDER[number])
  )

  if (otherFeatures.length > 0) {
    groupedFeatures.push({
      section: 'Outras Informações',
      items: otherFeatures,
    })
  }

  const similarLoadedItems = similarProperties.slice(0, similarVisibleCount)
  const similarPageCount = Math.max(1, Math.ceil(similarLoadedItems.length / 3))
  const similarPageItems = similarLoadedItems.slice(similarPage * 3, similarPage * 3 + 3)
  const canGoPrevSimilar = similarPage > 0
  const canGoNextSimilar = similarPage < similarPageCount - 1
  const canLoadMoreSimilar = similarVisibleCount < similarProperties.length

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 mb-4" size={48} />
        <p className="text-slate-600">Carregando detalhes do imovel...</p>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6">
        <AlertCircle className="text-red-600 mb-4" size={48} />
        <h2 className="text-2xl mb-2 text-slate-900">Erro ao carregar imovel</h2>
        <p className="text-slate-600 mb-6">{error || 'Imovel nao encontrado'}</p>
        <Link
          to="/"
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Voltar para Home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Seo
        title={seoTitle}
        description={seoDescription}
        url={propertyUrl || undefined}
        image={seoImage}
      />

      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm md:text-base font-medium">Voltar</span>
          </Link>
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/sobre"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-700 hover:border-amber-200 hover:text-amber-700 transition-all"
            >
              Sobre
            </Link>
            <Link
              to="/contato"
              className="inline-flex items-center rounded-full bg-amber-600 text-white px-4 py-2 text-sm hover:bg-amber-700 transition-all"
            >
              Contato
            </Link>
          </div>
        </div>
      </div>

      <div className="relative bg-slate-50">
        <div className="max-w-7xl mx-auto">
          {photos.length > 0 ? (
            <div className="relative h-[280px] sm:h-[360px] md:h-[500px] overflow-hidden">
              <button
                type="button"
                onClick={() => openPhotoInNewTab(photos[currentPhotoIndex].url || photos[currentPhotoIndex].foto)}
                className="block h-full w-full"
                aria-label={`Abrir foto ${currentPhotoIndex + 1} em uma nova aba`}
              >
                <img
                  src={photos[currentPhotoIndex].url || photos[currentPhotoIndex].foto}
                  alt={`Foto ${currentPhotoIndex + 1} do imovel`}
                  className="w-full h-full object-cover cursor-zoom-in"
                />
              </button>
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/35 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/20 pointer-events-none" />
              <div className="absolute left-4 bottom-4 bg-slate-950/40 text-slate-100 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {currentPhotoIndex + 1}/{photos.length}
              </div>

              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white/90 p-2 backdrop-blur-sm transition-colors hover:bg-white/95 sm:left-4 sm:p-3"
                  >
                    <ChevronLeft size={24} className="text-slate-900" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white/90 p-2 backdrop-blur-sm transition-colors hover:bg-white/95 sm:right-4 sm:p-3"
                  >
                    <ChevronRight size={24} className="text-slate-900" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {photos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentPhotoIndex ? 'bg-amber-500 w-8' : 'bg-slate-400 hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-[280px] sm:h-[360px] md:h-[500px] bg-slate-200 flex items-center justify-center">
              <Home className="text-slate-400" size={64} />
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-start gap-3">
                    <h1 className="text-2xl md:text-4xl lg:text-5xl text-slate-900 tracking-tight drop-shadow-md">
                      {property.titulo}
                    </h1>
                    {String(property.subtitulo ?? property.SUBTITULO ?? '').trim() && (
                      <p className="text-xl md:text-2xl lg:text-[2rem] text-slate-600 tracking-tight">
                        {String(property.subtitulo ?? property.SUBTITULO ?? '').trim()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={18} />
                    <span>{property.bairro ? `${property.bairro}, ` : ''}{property.cidade}</span>
                  </div>
                </div>
                <div className="w-full rounded-lg bg-amber-600 px-4 py-3 md:w-auto">
                  <span className="text-sm text-amber-100">Investimento</span>
                  <p className="text-xl font-bold text-white sm:text-2xl">{formatPrice(property.preco)}</p>
                </div>
              </div>

              {property.endereco && (
                <p className="text-slate-600">{property.endereco}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <h2 className="text-xl mb-4 text-slate-900">Caracteristicas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {property.quartos && (
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Bed className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Quartos</p>
                      <p className="font-semibold text-slate-900">{property.quartos}</p>
                    </div>
                  </div>
                )}

                {property.banheiros && (
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Bath className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Banheiros</p>
                      <p className="font-semibold text-slate-900">{property.banheiros}</p>
                    </div>
                  </div>
                )}

                {property.garagem && (
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Car className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Garagem</p>
                      <p className="font-semibold text-slate-900">{property.garagem} {property.garagem === 1 ? 'vaga' : 'vagas'}</p>
                    </div>
                  </div>
                )}

                {property.area && (
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Ruler className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Area</p>
                      <p className="font-semibold text-slate-900">{property.area}m2</p>
                    </div>
                  </div>
                )}
              </div>

              {features.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-5">
                  <h3 className="text-xl mb-4 text-slate-900">Características do Imóvel</h3>
                  <div className="space-y-5">
                    {groupedFeatures.map((group) => (
                      <div key={group.section}>
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                          {group.section}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((feature) => {
                            const detalhe = [
                              feature.qtd != null && feature.qtd > 0 ? String(feature.qtd) : '',
                              feature.observacao ?? '',
                            ]
                              .filter(Boolean)
                              .join(' ')

                            return (
                              <div
                                key={`${group.section}-${feature.id_caracteristica}`}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                              >
                                <span className="font-medium">{feature.descricao}</span>
                                {detalhe && (
                                  <span className="ml-1 text-amber-700">{detalhe}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {false && <div className="flex flex-wrap gap-2">
                    {features.map((feature) => (
                      <div
                        key={feature.id_caracteristica}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      >
                        <span className="font-medium">{feature.descricao}</span>
                        {feature.qtd != null && feature.qtd > 0 && (
                          <span className="ml-1 text-amber-700">x{feature.qtd}</span>
                        )}
                        {feature.observacao && (
                          <span className="ml-2 text-amber-700">• {feature.observacao}</span>
                        )}
                      </div>
                    ))}
                  </div>}
                </div>
              )}
            </div>

            {property.descricao && (
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <h2 className="text-xl mb-4 text-slate-900">Descrição do Imóvel</h2>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {property.descricao}
                </p>
              </div>
            )}

            {(similarLoading || similarProperties.length > 0) && (
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <span className="inline-block mb-2 text-[1.35rem] font-medium uppercase tracking-[0.18em] text-amber-700">
                        Descubra mais
                      </span>
                    </div>

                  {!similarLoading && similarProperties.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSimilarPage((prev) => Math.max(prev - 1, 0))}
                        disabled={!canGoPrevSimilar}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:border-amber-200 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ChevronLeft size={16} />
                        Anteriores
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimilarPage((prev) => Math.min(prev + 1, similarPageCount - 1))}
                        disabled={!canGoNextSimilar}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:border-amber-200 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Proximos
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {similarLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-amber-600" size={36} />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {similarPageItems.map((similarProperty) => (
                        <PropertyCard key={similarProperty.id} property={similarProperty} />
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Exibindo {similarPageItems.length} de {similarLoadedItems.length} carregados
                        {similarProperties.length > similarLoadedItems.length && ` de ${similarProperties.length} encontrados`}
                      </p>

                      {canLoadMoreSimilar && (
                        <button
                          type="button"
                          onClick={() => setSimilarVisibleCount((prev) => prev + 3)}
                          className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                        >
                          Carregar mais imoveis
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 sticky top-24">
              <h3 className="text-xl mb-4 text-slate-900">Interessado?</h3>
              <p className="text-slate-600 mb-6">
                Entre em contato para agendar uma visita ou tirar duvidas sobre este imovel.
              </p>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/5551980519696?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  <span>Conversar no WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
