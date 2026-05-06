import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Building2 } from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { Button } from '../../../components/ui/button'

interface Imovel {
  id_imovel: number
  titulo:    string
  tipo:      string
  cidade:    string
  bairro:    string
  preco:     number
  quartos?:  number
  area?:     number
  foto?:     string
}

const TIPO_LABEL: Record<string, string> = {
  casa: 'Casa', apartamento: 'Apartamento', terreno: 'Terreno',
}
const TIPO_COR: Record<string, string> = {
  casa:        'bg-green-100 text-green-700',
  apartamento: 'bg-blue-100  text-blue-700',
  terreno:     'bg-orange-100 text-orange-700',
}

export function ImoveisList() {
  const navigate = useNavigate()
  const [imoveis,   setImoveis]   = useState<Imovel[]>([])
  const [loading,   setLoading]   = useState(true)
  const [erro,      setErro]      = useState('')
  const [excluindo, setExcluindo] = useState<number | null>(null)

  const carregar = async () => {
    try {
      setLoading(true)
      setErro('')
      const data = await apiFetch<any>(API.IMOVEIS_LISTA)
      const items: Imovel[] = Array.isArray(data) ? data : (data.items ?? [])
      setImoveis(items)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar imóveis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const excluir = async (id: number) => {
    if (!confirm('Excluir este imóvel? As fotos vinculadas também serão removidas.')) return
    setExcluindo(id)
    try {
      await apiFetch(API.IMOVEL_EXCLUIR(id), { method: 'POST' })
      setImoveis(prev => prev.filter(i => i.id_imovel !== id))
    } catch {
      alert('Erro ao excluir imóvel.')
    } finally {
      setExcluindo(null)
    }
  }

  const fmtPreco = (v: number) =>
    v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

  return (
    <div className="p-8">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
          <p className="text-slate-500 mt-1">
            {imoveis.length} {imoveis.length === 1 ? 'imóvel' : 'imóveis'} cadastrados
          </p>
        </div>
        <Link to="/sistema/imoveis/novo">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Plus size={17} />
            Novo Imóvel
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-amber-600" size={40} />
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-6">
          <AlertCircle size={20} />
          {erro}
        </div>
      )}

      {/* Vazio */}
      {!loading && !erro && imoveis.length === 0 && (
        <div className="text-center py-24 text-slate-400">
          <Building2 size={52} className="mx-auto mb-3" />
          <p className="text-lg font-medium text-slate-500">Nenhum imóvel cadastrado</p>
          <Link to="/sistema/imoveis/novo">
            <Button className="mt-5 bg-amber-600 hover:bg-amber-700 text-white gap-2">
              <Plus size={16} />
              Cadastrar primeiro imóvel
            </Button>
          </Link>
        </div>
      )}

      {/* Grid de cards */}
      {!loading && !erro && imoveis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {imoveis.map(imovel => (
            <div
              key={imovel.id_imovel}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Foto de capa */}
              <div className="h-44 bg-slate-100 overflow-hidden">
                {imovel.foto ? (
                  <img
                    src={imovel.foto}
                    alt={imovel.titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Building2 size={44} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 flex-1">
                    {imovel.titulo}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${TIPO_COR[imovel.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-2">
                  {[imovel.bairro, imovel.cidade].filter(Boolean).join(', ')}
                </p>
                <p className="text-amber-600 font-bold text-base">{fmtPreco(imovel.preco)}</p>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 border-slate-200 hover:border-amber-400 hover:text-amber-700"
                    onClick={() => navigate(`/sistema/imoveis/${imovel.id_imovel}/editar`)}
                  >
                    <Pencil size={14} />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 border-slate-200 hover:border-red-400 hover:text-red-600"
                    onClick={() => excluir(imovel.id_imovel)}
                    disabled={excluindo === imovel.id_imovel}
                  >
                    {excluindo === imovel.id_imovel
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
