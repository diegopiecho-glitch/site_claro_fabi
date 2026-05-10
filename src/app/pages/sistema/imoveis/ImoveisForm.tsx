import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import {
  ArrowLeft, Save, Upload, Trash2, Loader2, ImageIcon, Star, GripVertical, ChevronDown,
} from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { uploadParaOCI, ociConfigurado } from '../../../lib/ociUpload'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../components/ui/collapsible'

interface FormData {
  titulo: string
  subtitulo: string
  descricao: string
  tipo: string
  cidade: string
  bairro: string
  endereco: string
  preco: string
  quartos: string
  banheiros: string
  garagem: string
  area: string
  ativo: string
}

interface Foto {
  id_foto: number
  id_imovel: number
  url: string
  ordem?: number
  foto_principal?: 'S' | 'N'
}

interface CaracteristicaBase {
  id_caracteristica: number
  descricao: string
  ativo: 'S' | 'N'
}

interface CaracteristicaImovel {
  id_caracteristica: number
  descricao: string
  qtd: string
  observacao: string
}

function numero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function texto(v: unknown): string {
  return String(v ?? '').trim()
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

function normalizarCaracteristicaBase(raw: any): CaracteristicaBase | null {
  const id = numero(raw?.id_caracteristica ?? raw?.ID_CARACTERISTICA ?? raw?.id ?? raw?.ID)
  const descricao = texto(raw?.descricao ?? raw?.DESCRICAO)
  const ativo = String(raw?.ativo ?? raw?.ATIVO ?? 'S').trim().toUpperCase() === 'N' ? 'N' : 'S'

  if (!id || !descricao) return null

  return {
    id_caracteristica: id,
    descricao,
    ativo,
  }
}

function normalizarCaracteristicaImovel(raw: any): CaracteristicaImovel | null {
  const id = numero(raw?.id_caracteristica ?? raw?.ID_CARACTERISTICA)
  const descricao = texto(raw?.descricao ?? raw?.DESCRICAO)

  if (!id || !descricao) return null

  return {
    id_caracteristica: id,
    descricao,
    qtd: String(raw?.qtd ?? raw?.QTD ?? '1'),
    observacao: texto(raw?.observacao ?? raw?.OBSERVACAO),
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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const imovelId = id ? Number(id) : null

  const [form, setForm] = useState<FormData>(VAZIO)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [catalogoCaracteristicas, setCatalogoCaracteristicas] = useState<CaracteristicaBase[]>([])
  const [caracteristicasSelecionadas, setCaracteristicasSelecionadas] = useState<CaracteristicaImovel[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [arrastandoId, setArrastandoId] = useState<number | null>(null)
  const [caracteristicasAbertas, setCaracteristicasAbertas] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit || !imovelId) return

    ;(async () => {
      try {
        setLoading(true)

        const [data, fotosData, catalogoData, vinculosData] = await Promise.all([
          apiFetch<any>(API.IMOVEL_DETALHE(imovelId)),
          apiFetch<any>(API.FOTOS_LISTA),
          apiFetch<any>(API.CARACTERISTICAS_LISTA),
          apiFetch<any>(API.IMOVEL_CARACTERISTICAS(imovelId)),
        ])

        const imovel = data.items?.[0] ?? data[0] ?? data
        setForm({
          titulo: imovel.titulo ?? '',
          subtitulo: imovel.subtitulo ?? '',
          descricao: imovel.descricao ?? '',
          tipo: imovel.tipo ?? '',
          cidade: imovel.cidade ?? '',
          bairro: imovel.bairro ?? '',
          endereco: imovel.endereco ?? '',
          preco: String(imovel.preco ?? ''),
          quartos: String(imovel.quartos ?? ''),
          banheiros: String(imovel.banheiros ?? ''),
          garagem: String(imovel.garagem ?? ''),
          area: String(imovel.area ?? ''),
          ativo: String(imovel.ativo ?? 1),
        })

        const fotosBrutas = fotosData.items ?? fotosData ?? []
        const todasFotos = fotosBrutas
          .map((foto: any) => normalizarFoto(foto))
          .filter((foto: Foto | null): foto is Foto => foto !== null)

        setFotos(ordenarFotos(todasFotos.filter((f: Foto) => f.id_imovel === imovelId)))

        const catalogoBruto = catalogoData.items ?? catalogoData ?? []
        setCatalogoCaracteristicas(
          catalogoBruto
            .map((item: any) => normalizarCaracteristicaBase(item))
            .filter((item: CaracteristicaBase | null): item is CaracteristicaBase => item !== null)
            .sort((a: CaracteristicaBase, b: CaracteristicaBase) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
        )

        const vinculosBrutos = vinculosData.items ?? vinculosData ?? []
        setCaracteristicasSelecionadas(
          vinculosBrutos
            .map((item: any) => normalizarCaracteristicaImovel(item))
            .filter((item: CaracteristicaImovel | null): item is CaracteristicaImovel => item !== null)
        )
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar imovel')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, imovelId, isEdit])

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const caracteristicaSelecionada = (idCaracteristica: number) =>
    caracteristicasSelecionadas.some((item) => item.id_caracteristica === idCaracteristica)

  const alternarCaracteristica = (item: CaracteristicaBase) => {
    setCaracteristicasSelecionadas((prev) => {
      const existe = prev.some((atual) => atual.id_caracteristica === item.id_caracteristica)

      if (existe) {
        return prev.filter((atual) => atual.id_caracteristica !== item.id_caracteristica)
      }

      return [
        ...prev,
        {
          id_caracteristica: item.id_caracteristica,
          descricao: item.descricao,
          qtd: '1',
          observacao: '',
        },
      ]
    })
  }

  const atualizarCaracteristicaSelecionada = (
    idCaracteristica: number,
    campo: 'qtd' | 'observacao',
    valor: string
  ) => {
    setCaracteristicasSelecionadas((prev) =>
      prev.map((item) =>
        item.id_caracteristica === idCaracteristica
          ? { ...item, [campo]: valor }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) { setErro('Titulo e obrigatorio.'); return }
    if (!form.tipo) { setErro('Tipo e obrigatorio.'); return }

    setSalvando(true)
    setErro('')
    setSucesso('')

    const payload = {
      titulo: form.titulo,
      subtitulo: form.subtitulo || null,
      descricao: form.descricao || null,
      tipo: form.tipo,
      cidade: form.cidade || null,
      bairro: form.bairro || null,
      endereco: form.endereco || null,
      preco: form.preco ? parseFloat(form.preco) : null,
      quartos: form.quartos ? parseInt(form.quartos, 10) : null,
      banheiros: form.banheiros ? parseInt(form.banheiros, 10) : null,
      garagem: form.garagem ? parseInt(form.garagem, 10) : null,
      area: form.area ? parseFloat(form.area) : null,
      ativo: parseInt(form.ativo, 10),
    }

      try {
        if (isEdit && imovelId) {
          await apiFetch(API.IMOVEL_ATUALIZAR(imovelId), {
            method: 'PUT',
            body: JSON.stringify(payload),
          })

        await apiFetch(API.IMOVEL_CARACTERISTICAS_SINCRONIZAR, {
          method: 'POST',
          body: JSON.stringify({
            id: imovelId,
            itens: caracteristicasSelecionadas.map((item) => ({
              id_caracteristica: item.id_caracteristica,
              qtd: item.qtd ? parseInt(item.qtd, 10) : 0,
              observacao: item.observacao || null,
            })),
          }),
        })

        setSucesso('Imovel atualizado com sucesso!')
      } else {
        const criado = await apiFetch<any>(API.IMOVEL_CRIAR, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        const novoId = criado?.id_imovel ?? criado?.ID_IMOVEL
        if (novoId) {
          navigate(`/sistema/imoveis/${novoId}/editar`, { replace: true })
          setTimeout(() => setSucesso('Imovel criado! Agora voce pode adicionar fotos e caracteristicas.'), 100)
        } else {
          navigate('/sistema/imoveis')
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar imovel')
    } finally {
      setSalvando(false)
    }
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputFotoRef.current) inputFotoRef.current.value = ''
    if (!file || !imovelId) return

    if (!ociConfigurado()) {
      alert('Configure VITE_OCI_PAR_URL no ambiente local ou no deploy da Vercel para habilitar uploads.')
      return
    }

    setUploadando(true)
    try {
      const url = await uploadParaOCI(file, String(imovelId))
      const respostaFoto = await apiFetch<any>(API.FOTO_CRIAR, {
        method: 'POST',
        body: JSON.stringify({ id_imovel: imovelId, url, ordem: fotos.length + 1 }),
      })

      const novaFoto = normalizarFoto(respostaFoto) ?? {
        id_foto: Date.now(),
        id_imovel: imovelId,
        url,
        ordem: fotos.length + 1,
        foto_principal: fotos.length === 0 ? 'S' : 'N',
      }

      setFotos((prev) => ordenarFotos([...prev, novaFoto]))
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
    const origem = listaAnterior.findIndex((foto) => foto.id_foto === fotoArrastadaId)
    const destino = listaAnterior.findIndex((foto) => foto.id_foto === fotoDestinoId)

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
    const atualizadas = fotos.map((foto) => ({
      ...foto,
      foto_principal: foto.id_foto === fotoSelecionada.id_foto ? 'S' : 'N' as 'S' | 'N',
    }))

    setFotos(ordenarFotos(atualizadas))

    try {
      await Promise.all(
        atualizadas.map((foto) =>
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
      await apiFetch(API.FOTO_EXCLUIR(foto.id_foto), {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const restantes = reindexarFotos(fotos.filter((f) => f.id_foto !== foto.id_foto))
      setFotos(ordenarFotos(restantes))

      if (restantes.length > 0) {
        const precisaPrincipal = !restantes.some((f) => (f.foto_principal ?? 'N') === 'S')
        const final = precisaPrincipal
          ? restantes.map((f, index) => ({ ...f, foto_principal: index === 0 ? 'S' : 'N' as 'S' | 'N' }))
          : restantes

        setFotos(ordenarFotos(final))
        await Promise.all(
          final.map((f) =>
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
    <div className="max-w-5xl px-8 pb-8 pt-32 md:pt-36">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEdit ? 'Editar Imovel' : 'Novo Imovel'}
          </h1>
          {isEdit && <p className="text-slate-500 text-sm mt-0.5">ID: {imovelId}</p>}
        </div>
      </div>

      {sucesso && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {sucesso}
        </div>
      )}

      <form id="imovel-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Identificacao</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Campo label="Titulo" obrigatorio>
                <Input value={form.titulo} onChange={set('titulo')} placeholder="Ex: Casa com piscina no centro" />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Subtitulo">
                <Input value={form.subtitulo} onChange={set('subtitulo')} placeholder="Breve descricao exibida nos cards" />
              </Campo>
            </div>
            <Campo label="Tipo" obrigatorio>
              <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Status">
              <Select value={form.ativo} onValueChange={(v) => setForm((p) => ({ ...p, ativo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ativo - visivel no site</SelectItem>
                  <SelectItem value="0">Inativo - oculto</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Localizacao</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Cidade">
              <Input value={form.cidade} onChange={set('cidade')} placeholder="Ex: Porto Alegre" />
            </Campo>
            <Campo label="Bairro">
              <Input value={form.bairro} onChange={set('bairro')} placeholder="Ex: Bela Vista" />
            </Campo>
            <div className="md:col-span-2">
              <Campo label="Endereco completo">
                <Input value={form.endereco} onChange={set('endereco')} placeholder="Rua, numero, complemento" />
              </Campo>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Valores e Caracteristicas Principais</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="col-span-2 lg:col-span-2">
              <Campo label="Preco (R$)">
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
              <Campo label="Area (m2)">
                <Input value={form.area} onChange={set('area')} type="number" min="0" step="0.01" placeholder="0,00" />
              </Campo>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <Collapsible open={caracteristicasAbertas} onOpenChange={setCaracteristicasAbertas}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Caracteristicas Adicionais</h2>
                <p className="text-sm text-slate-500">
                  Vincule itens do cadastro mestre ao imovel atual.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isEdit && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Disponivel apos criar o imovel
                  </span>
                )}

                {isEdit && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {caracteristicasSelecionadas.length} selecionada{caracteristicasSelecionadas.length === 1 ? '' : 's'}
                  </span>
                )}

                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2 border-slate-200">
                    {caracteristicasAbertas ? 'Minimizar' : 'Expandir'}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${caracteristicasAbertas ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent className="pt-5">
              {!isEdit ? (
                <p className="text-sm text-slate-500">
                  Salve o imovel primeiro para depois selecionar caracteristicas e observacoes.
                </p>
              ) : catalogoCaracteristicas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Nenhuma caracteristica cadastrada ainda. Cadastre as caracteristicas pelo menu principal do sistema.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {catalogoCaracteristicas.map((item) => {
                      const selecionada = caracteristicaSelecionada(item.id_caracteristica)
                      const dados = caracteristicasSelecionadas.find((atual) => atual.id_caracteristica === item.id_caracteristica)

                      return (
                        <div
                          key={item.id_caracteristica}
                          className={`rounded-2xl border p-4 transition-colors ${
                            selecionada
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{item.descricao}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => alternarCaracteristica(item)}
                              className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                                selecionada
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-300'
                              }`}
                            >
                              {selecionada ? 'Selecionada' : 'Selecionar'}
                            </button>
                          </div>

                          {selecionada && dados && (
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                              <Campo label="Quantidade">
                                <Input
                                  value={dados.qtd}
                                  onChange={(e) => atualizarCaracteristicaSelecionada(item.id_caracteristica, 'qtd', e.target.value)}
                                  type="number"
                                  min="0"
                                />
                              </Campo>
                              <Campo label="Observacao">
                                <Input
                                  value={dados.observacao}
                                  onChange={(e) => atualizarCaracteristicaSelecionada(item.id_caracteristica, 'observacao', e.target.value)}
                                  placeholder="Opcional"
                                />
                              </Campo>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-5">Descricao</h2>
          <Campo label="Descricao completa">
            <Textarea
              value={form.descricao}
              onChange={set('descricao')}
              rows={8}
              placeholder="Descreva os detalhes, diferenciais e condicoes do imovel..."
              className="min-h-[220px] resize-y"
            />
          </Campo>
        </section>

        {erro && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
            {erro}
          </p>
        )}

      </form>

      <div className="fixed left-0 right-0 top-[69px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:left-60 md:top-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <Link to="/sistema/imoveis">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
              <ArrowLeft size={15} />
              Voltar
            </Button>
          </Link>

          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {isEdit ? 'Edição do imóvel' : 'Novo imóvel'}
            </p>
            <p className="text-xs text-slate-500">
              {salvando ? 'Salvando alterações no imóvel...' : 'As alterações ficam disponíveis após salvar.'}
            </p>
          </div>

          <Button
            type="submit"
            form="imovel-form"
            disabled={salvando}
            className="h-11 shrink-0 gap-2 bg-amber-600 px-8 text-white hover:bg-amber-700"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {salvando ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar imóvel'}
          </Button>
        </div>
      </div>

      {isEdit && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Galeria de Fotos</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} - as fotos sao armazenadas no OCI Bucket
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

          {!ociConfigurado() && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <strong>OCI nao configurada.</strong> Defina{' '}
              <code className="font-mono bg-amber-100 px-1 rounded text-amber-900">
                VITE_OCI_PAR_URL
              </code>{' '}
              no ambiente local ou no deploy da Vercel para habilitar o upload de fotos.
            </div>
          )}

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
          Apos criar o imovel voce sera redirecionado para a tela de edicao onde podera adicionar fotos e caracteristicas.
        </p>
      )}
    </div>
  )
}
