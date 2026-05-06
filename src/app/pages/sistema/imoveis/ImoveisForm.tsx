import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import {
  ArrowLeft, Save, Upload, Trash2, Loader2, ImageIcon, Star, GripVertical,
} from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { uploadParaOCI, ociConfigurado } from '../../../lib/ociUpload'
import { Button }   from '../../../components/ui/button'
import { Input }    from '../../../components/ui/input'
import { Label }    from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'

interface FormData {
  titulo:    string
  subtitulo: string
  descricao: string
  tipo:      string
  cidade:    string
  bairro:    string
  endereco:  string
  preco:     string
  quartos:   string
  banheiros: string
  garagem:   string
  area:      string
  ativo:     string
}

interface Foto {
  id_foto:   number
  id_imovel: number
  url:       string
  ordem?:    number
  foto_principal?: 'S' | 'N'
}

function normalizarFoto(raw: any): Foto | null {
  const idFoto = Number(raw?.id_foto ?? raw?.ID_FOTO ?? raw?.id ?? raw?.ID)
  const idImovel = Number(raw?.id_imovel ?? raw?.ID_IMOVEL)
  const url = String(raw?.url ?? raw?.URL ?? '').trim()
  const ordemBruta = raw?.ordem ?? raw?.ORDEM
  const ordem = ordemBruta == null ? undefined : Number(ordemBruta)
  const fotoPrincipal = String(
    raw?.foto_principal ?? raw?.FOTO_PRINCIPAL ?? raw?.principal ?? raw?.PRINCIPAL ?? 'N'
  ).trim().toUpperCase() === 'S' ? 'S' : 'N'

  if (!idFoto || !idImovel || !url) return null

  return {
    id_foto: idFoto,
    id_imovel: idImovel,
    url,
    ordem,
    foto_principal: fotoPrincipal,
  }
}

function ordenarFotos(lista: Foto[]): Foto[] {
  return [...lista].sort((a, b) => {
    if ((a.foto_principal ?? 'N') !== (b.foto_principal ?? 'N')) {
      return (b.foto_principal ?? 'N').localeCompare(a.foto_principal ?? 'N')
    }
    return (a.ordem ?? 0) - (b.ordem ?? 0)
  })
}

function reindexarFotos(lista: Foto[]): Foto[] {
  return lista.map((foto, index) => ({
    ...foto,
    ordem: index + 1,
  }))
}

const VAZIO: FormData = {
  titulo: '', subtitulo: '', descricao: '', tipo: '', cidade: '',
  bairro: '', endereco: '', preco: '', quartos: '', banheiros: '',
  garagem: '', area: '', ativo: '1',
}

function Campo({ label, obrigatorio, children }: {
  label: string
  obrigatorio?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-700">
        {label}{obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

export function ImoveisForm() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit   = Boolean(id)
  const imovelId = id ? Number(id) : null

  const [form,       setForm]       = useState<FormData>(VAZIO)
  const [fotos,      setFotos]      = useState<Foto[]>([])
  const [loading,    setLoading]    = useState(isEdit)
  const [salvando,   setSalvando]   = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [erro,       setErro]       = useState('')
  const [sucesso,    setSucesso]    = useState('')
  const [arrastandoId, setArrastandoId] = useState<number | null>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit || !imovelId) return
    ;(async () => {
      try {
        setLoading(true)
        const data    = await apiFetch<any>(API.IMOVEL_DETALHE(imovelId))
        const imovel  = data.items?.[0] ?? data[0] ?? data
        setForm({
          titulo:    imovel.titulo    ?? '',
          subtitulo: imovel.subtitulo ?? '',
          descricao: imovel.descricao ?? '',
          tipo:      imovel.tipo      ?? '',
          cidade:    imovel.cidade    ?? '',
          bairro:    imovel.bairro    ?? '',
          endereco:  imovel.endereco  ?? '',
          preco:     String(imovel.preco     ?? ''),
          quartos:   String(imovel.quartos   ?? ''),
          banheiros: String(imovel.banheiros ?? ''),
          garagem:   String(imovel.garagem   ?? ''),
          area:      String(imovel.area      ?? ''),
          ativo:     String(imovel.ativo ?? 1),
        })

        const fotosData = await apiFetch<any>(API.FOTOS_LISTA)
        const fotosBrutas = fotosData.items ?? fotosData ?? []
        const todas = fotosBrutas
          .map((foto: any) => normalizarFoto(foto))
          .filter((foto: Foto | null): foto is Foto => foto !== null)

        setFotos(
          ordenarFotos(
            todas.filter((f: Foto) => f.id_imovel === imovelId)
          )
        )
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar imóvel')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) { setErro('Título é obrigatório.'); return }
    if (!form.tipo)           { setErro('Tipo é obrigatório.');  return }

    setSalvando(true)
    setErro('')
    setSucesso('')

    const payload = {
      titulo:    form.titulo,
      subtitulo: form.subtitulo  || null,
      descricao: form.descricao  || null,
      tipo:      form.tipo,
      cidade:    form.cidade     || null,
      bairro:    form.bairro     || null,
      endereco:  form.endereco   || null,
      preco:     form.preco      ? parseFloat(form.preco)     : null,
      quartos:   form.quartos    ? parseInt(form.quartos)     : null,
      banheiros: form.banheiros  ? parseInt(form.banheiros)   : null,
      garagem:   form.garagem    ? parseInt(form.garagem)     : null,
      area:      form.area       ? parseFloat(form.area)      : null,
      ativo:     parseInt(form.ativo),
    }

    try {
      if (isEdit && imovelId) {
        await apiFetch(API.IMOVEL_ATUALIZAR(imovelId), {
          method: 'PUT',
          body:   JSON.stringify(payload),
        })
        setSucesso('Imóvel atualizado com sucesso!')
      } else {
        const criado = await apiFetch<any>(API.IMOVEL_CRIAR, {
          method: 'POST',
          body:   JSON.stringify(payload),
        })
        const novoId = criado?.id_imovel ?? criado?.ID_IMOVEL
        if (novoId) {
          navigate(`/sistema/imoveis/${novoId}/editar`, { replace: true })
          setTimeout(() => setSucesso('Imóvel criado! Adicione fotos abaixo.'), 100)
        } else {
          navigate('/sistema/imoveis')
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar imóvel')
    } finally {
      setSalvando(false)
    }
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputFotoRef.current) inputFotoRef.current.value = ''
    if (!file || !imovelId) return

    if (!ociConfigurado()) {
      alert('Configure OCI_PAR_URL em src/app/lib/ociUpload.ts para habilitar uploads.')
      return
    }

    setUploadando(true)
    try {
      const url = await uploadParaOCI(file, String(imovelId))
      const respostaFoto = await apiFetch<any>(API.FOTO_CRIAR, {
        method: 'POST',
        body:   JSON.stringify({ id_imovel: imovelId, url, ordem: fotos.length + 1 }),
      })

      const novaFoto = normalizarFoto(respostaFoto) ?? {
        id_foto: Date.now(),
        id_imovel: imovelId,
        url,
        ordem: fotos.length + 1,
        foto_principal: fotos.length === 0 ? 'S' : 'N',
      }

      setFotos(prev => ordenarFotos([...prev, novaFoto]))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao enviar foto')
    } finally {
      setUploadando(false)
    }
  }

  const salvarOrdenacaoFotos = async (lista: Foto[]) => {
    await Promise.all(
      lista.map((foto, index) =>
        apiFetch(API.FOTO_ATUALIZAR(foto.id_foto), {
          method: 'POST',
          body: JSON.stringify({
            ordem: index + 1,
            foto_principal: foto.foto_principal ?? 'N',
          }),
        })
      )
    )
  }

  const moverFoto = async (fotoArrastadaId: number, fotoDestinoId: number) => {
    if (fotoArrastadaId === fotoDestinoId) return

    const listaAnterior = fotos
    const origem = listaAnterior.findIndex(foto => foto.id_foto === fotoArrastadaId)
    const destino = listaAnterior.findIndex(foto => foto.id_foto === fotoDestinoId)

    if (origem < 0 || destino < 0) return

    const novaLista = [...listaAnterior]
    const [fotoMovida] = novaLista.splice(origem, 1)
    novaLista.splice(destino, 0, fotoMovida)

    const reordenadas = reindexarFotos(novaLista)
    setFotos(ordenarFotos(reordenadas))

    try {
      await salvarOrdenacaoFotos(reordenadas)
    } catch (e) {
      setFotos(listaAnterior)
      alert(e instanceof Error ? e.message : 'Erro ao salvar nova ordem das fotos.')
    }
  }

  const definirFotoPrincipal = async (fotoSelecionada: Foto) => {
    const listaAnterior = fotos
    const atualizadas = fotos.map(foto => ({
      ...foto,
      foto_principal: foto.id_foto === fotoSelecionada.id_foto ? 'S' : 'N',
    }))

    setFotos(ordenarFotos(atualizadas))

    try {
      await Promise.all(
        atualizadas.map(foto =>
          apiFetch(API.FOTO_ATUALIZAR(foto.id_foto), {
            method: 'POST',
            body: JSON.stringify({
              ordem: foto.ordem ?? 0,
              foto_principal: foto.foto_principal ?? 'N',
            }),
          })
        )
      )
    } catch (e) {
      setFotos(listaAnterior)
      alert(e instanceof Error ? e.message : 'Erro ao definir foto principal.')
    }
  }

  const excluirFoto = async (foto: Foto) => {
    if (!confirm('Remover esta foto?')) return
    try {
      await apiFetch(API.FOTO_EXCLUIR(foto.id_foto), { method: 'POST' })
      const restantes = reindexarFotos(fotos.filter(f => f.id_foto !== foto.id_foto))
      setFotos(ordenarFotos(restantes))

      if (restantes.length > 0) {
        const precisaPrincipal = !restantes.some(f => (f.foto_principal ?? 'N') === 'S')
        const final = precisaPrincipal
          ? restantes.map((f, index) => ({ ...f, foto_principal: index === 0 ? 'S' : 'N' as 'S' | 'N' }))
          : restantes

        setFotos(ordenarFotos(final))
        await Promise.all(
          final.map(f =>
            apiFetch(API.FOTO_ATUALIZAR(f.id_foto), {
              method: 'POST',
              body: JSON.stringify({
                ordem: f.ordem ?? 0,
                foto_principal: f.foto_principal ?? 'N',
              }),
            })
          )
        )
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover foto.')
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

      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/sistema/imoveis">
          <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
            <ArrowLeft size={15} />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEdit ? 'Editar Imóvel' : 'Novo Imóvel'}
          </h1>
          {isEdit && <p className="text-slate-500 text-sm mt-0.5">ID: {imovelId}</p>}
        </div>
      </div>

      {sucesso && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {sucesso}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Identificação */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Identificação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Campo label="Título" obrigatorio>
                <Input value={form.titulo} onChange={set('titulo')} placeholder="Ex: Casa com piscina no centro" />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Subtítulo">
                <Input value={form.subtitulo} onChange={set('subtitulo')} placeholder="Breve descrição exibida nos cards" />
              </Campo>
            </div>
            <Campo label="Tipo" obrigatorio>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Status">
              <Select value={form.ativo} onValueChange={v => setForm(p => ({ ...p, ativo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ativo — visível no site</SelectItem>
                  <SelectItem value="0">Inativo — oculto</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </section>

        {/* Localização */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Localização</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Cidade">
              <Input value={form.cidade} onChange={set('cidade')} placeholder="Ex: Porto Alegre" />
            </Campo>
            <Campo label="Bairro">
              <Input value={form.bairro} onChange={set('bairro')} placeholder="Ex: Bela Vista" />
            </Campo>
            <div className="md:col-span-2">
              <Campo label="Endereço completo">
                <Input value={form.endereco} onChange={set('endereco')} placeholder="Rua, número, complemento" />
              </Campo>
            </div>
          </div>
        </section>

        {/* Valores e características */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Valores e Características</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="col-span-2 lg:col-span-2">
              <Campo label="Preço (R$)">
                <Input value={form.preco} onChange={set('preco')} type="number" min="0" step="0.01" placeholder="0,00" />
              </Campo>
            </div>
            <Campo label="Quartos">
              <Input value={form.quartos} onChange={set('quartos')} type="number" min="0" placeholder="0" />
            </Campo>
            <Campo label="Banheiros">
              <Input value={form.banheiros} onChange={set('banheiros')} type="number" min="0" placeholder="0" />
            </Campo>
            <Campo label="Garagem">
              <Input value={form.garagem} onChange={set('garagem')} type="number" min="0" placeholder="0" />
            </Campo>
            <div className="col-span-2">
              <Campo label="Área (m²)">
                <Input value={form.area} onChange={set('area')} type="number" min="0" step="0.01" placeholder="0,00" />
              </Campo>
            </div>
          </div>
        </section>

        {/* Descrição */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Descrição</h2>
          <Campo label="Descrição completa">
            <Textarea
              value={form.descricao}
              onChange={set('descricao')}
              rows={8}
              placeholder="Descreva os detalhes, diferenciais e condições do imóvel..."
              className="min-h-[220px] resize-y"
            />
          </Campo>
        </section>

        {/* Mensagem de erro */}
        {erro && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
            {erro}
          </p>
        )}

        <Button
          type="submit"
          disabled={salvando}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2 px-8 h-11"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {salvando ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Imóvel'}
        </Button>
      </form>

      {/* ─────────────── GALERIA DE FOTOS (só no modo edição) ─────────────── */}
      {isEdit && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Galeria de Fotos</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} — as fotos são armazenadas no OCI Bucket
              </p>
            </div>

            <label
              className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                uploadando
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {uploadando
                ? <Loader2 size={15} className="animate-spin" />
                : <Upload size={15} />}
              {uploadando ? 'Enviando...' : 'Enviar Foto'}
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadFoto}
                disabled={uploadando}
              />
            </label>
          </div>

          {/* Aviso OCI não configurada */}
          {!ociConfigurado() && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <strong>OCI não configurada.</strong> Edite{' '}
              <code className="font-mono bg-amber-100 px-1 rounded text-amber-900">
                src/app/lib/ociUpload.ts
              </code>{' '}
              e insira sua <code className="font-mono bg-amber-100 px-1 rounded text-amber-900">OCI_PAR_URL</code> para habilitar o upload de fotos.
            </div>
          )}

          {/* Grid de fotos */}
          {fotos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
              <ImageIcon size={40} className="mx-auto mb-3" />
              <p className="text-sm">Nenhuma foto adicionada ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fotos.map((foto, i) => (
                <div
                  key={foto.id_foto}
                  draggable
                  onDragStart={() => setArrastandoId(foto.id_foto)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async () => {
                    if (arrastandoId == null) return
                    await moverFoto(arrastandoId, foto.id_foto)
                    setArrastandoId(null)
                  }}
                  onDragEnd={() => setArrastandoId(null)}
                  className={`relative group rounded-xl overflow-hidden border aspect-[4/3] bg-slate-100 shadow-sm ${
                    arrastandoId === foto.id_foto
                      ? 'border-amber-400 ring-2 ring-amber-200 opacity-80'
                      : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => window.open(foto.url, '_blank', 'noopener,noreferrer')}
                    className="block h-full w-full text-left"
                    title="Abrir foto em nova aba"
                  >
                    <img
                      src={foto.url}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </button>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <div className="bg-black/60 text-white p-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing">
                      <GripVertical size={16} />
                    </div>
                    <button
                      type="button"
                      onClick={() => definirFotoPrincipal(foto)}
                      className={`p-2 rounded-lg transition-colors shadow-sm ${
                        (foto.foto_principal ?? 'N') === 'S'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-slate-900/75 hover:bg-slate-900 text-white'
                      }`}
                      title={(foto.foto_principal ?? 'N') === 'S' ? 'Foto principal' : 'Tornar principal'}
                    >
                      <Star size={16} className={(foto.foto_principal ?? 'N') === 'S' ? 'fill-current' : ''} />
                    </button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={() => excluirFoto(foto)}
                      className="bg-red-600/95 hover:bg-red-700 text-white p-2 rounded-lg transition-colors shadow-sm"
                      title="Remover foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="absolute bottom-2 left-2 text-[11px] bg-black/60 text-white px-2 py-1 rounded-md">
                    {(foto.foto_principal ?? 'N') === 'S' ? 'Principal' : `#${foto.ordem ?? i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!isEdit && (
        <p className="text-slate-500 text-sm mt-4">
          Após criar o imóvel você será redirecionado para a tela de edição onde poderá adicionar fotos.
        </p>
      )}
    </div>
  )
}
