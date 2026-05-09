import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Pencil, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { API, apiFetch } from '../../../lib/api'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

const SESSOES = ['Cômodos', 'Áreas', 'Área Externa', 'Valores', 'Outras Informações'] as const
type SessaoCaracteristica = typeof SESSOES[number]

interface Caracteristica {
  id_caracteristica: number
  descricao: string
  ativo: 'S' | 'N'
  sessao: SessaoCaracteristica
}

function numero(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function texto(v: unknown): string {
  return String(v ?? '').trim()
}

function normalizarCaracteristica(item: any): Caracteristica {
  const sessao = texto(item.sessao ?? item.SESSAO)

  return {
    id_caracteristica: numero(item.id_caracteristica ?? item.ID_CARACTERISTICA ?? item.id ?? item.ID),
    descricao: texto(item.descricao ?? item.DESCRICAO),
    ativo: String(item.ativo ?? item.ATIVO ?? 'S').trim().toUpperCase() === 'N' ? 'N' : 'S',
    sessao: SESSOES.includes(sessao as SessaoCaracteristica)
      ? (sessao as SessaoCaracteristica)
      : 'Outras Informações',
  }
}

const VAZIO = {
  descricao: '',
  ativo: 'S' as 'S' | 'N',
  sessao: 'Cômodos' as SessaoCaracteristica,
}

export function CaracteristicasPage() {
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([])
  const [form, setForm] = useState(VAZIO)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregar = async () => {
    try {
      setLoading(true)
      setErro('')
      const data = await apiFetch<any>(API.CARACTERISTICAS_LISTA)
      const items = Array.isArray(data) ? data : (data.items ?? [])
      setCaracteristicas(
        items
          .map(normalizarCaracteristica)
          .filter((item) => item.id_caracteristica > 0)
          .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar caracteristicas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const totalAtivas = useMemo(
    () => caracteristicas.filter((item) => item.ativo === 'S').length,
    [caracteristicas]
  )

  const limparFormulario = () => {
    setForm(VAZIO)
    setEditandoId(null)
    setErro('')
    setSucesso('')
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.descricao.trim()) {
      setErro('Descricao obrigatoria.')
      return
    }
    if (!form.sessao) {
      setErro('Sessao obrigatoria.')
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      if (editandoId) {
        await apiFetch(API.CARACTERISTICA_ATUALIZAR, {
          method: 'PUT',
          body: JSON.stringify({
            id: editandoId,
            descricao: form.descricao,
            ativo: form.ativo,
            sessao: form.sessao,
          }),
        })
        setSucesso('Caracteristica atualizada com sucesso.')
      } else {
        await apiFetch(API.CARACTERISTICA_CRIAR, {
          method: 'POST',
          body: JSON.stringify({
            descricao: form.descricao,
            ativo: form.ativo,
            sessao: form.sessao,
          }),
        })
        setSucesso('Caracteristica criada com sucesso.')
      }

      await carregar()
      setForm(VAZIO)
      setEditandoId(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar caracteristica')
    } finally {
      setSalvando(false)
    }
  }

  const editar = (item: Caracteristica) => {
    setForm({
      descricao: item.descricao,
      ativo: item.ativo,
      sessao: item.sessao,
    })
    setEditandoId(item.id_caracteristica)
    setErro('')
    setSucesso('')
  }

  const excluir = async (item: Caracteristica) => {
    if (!confirm(`Excluir a caracteristica "${item.descricao}"?`)) return

    try {
      setExcluindoId(item.id_caracteristica)
      setErro('')
      setSucesso('')
      await apiFetch(API.CARACTERISTICA_EXCLUIR, {
        method: 'POST',
        body: JSON.stringify({ id: item.id_caracteristica }),
      })
      setCaracteristicas((prev) => prev.filter((c) => c.id_caracteristica !== item.id_caracteristica))
      if (editandoId === item.id_caracteristica) {
        setForm(VAZIO)
        setEditandoId(null)
      }
      setSucesso('Caracteristica excluida com sucesso.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir caracteristica')
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Caracteristicas</h1>
          <p className="mt-1 text-slate-500">
            {caracteristicas.length} cadastradas
            {caracteristicas.length > 0 && ` • ${totalAtivas} ativas`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                {editandoId ? 'Editar caracteristica' : 'Nova caracteristica'}
              </h2>
              <p className="text-sm text-slate-500">
                Cadastre diferenciais e opcionais para usar nos imoveis.
              </p>
            </div>
            {editandoId && (
              <Button type="button" variant="outline" size="sm" onClick={limparFormulario} className="gap-2">
                <RotateCcw size={15} />
                Limpar
              </Button>
            )}
          </div>

          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descricao</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex: Suite, Churrasqueira, Piscina..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sessao</Label>
              <Select
                value={form.sessao}
                onValueChange={(value: SessaoCaracteristica) => setForm((prev) => ({ ...prev, sessao: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sessao" />
                </SelectTrigger>
                <SelectContent>
                  {SESSOES.map((sessao) => (
                    <SelectItem key={sessao} value={sessao}>
                      {sessao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, ativo: 'S' }))}
                  className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                    form.ativo === 'S'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Ativa
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, ativo: 'N' }))}
                  className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                    form.ativo === 'N'
                      ? 'border-slate-400 bg-slate-100 text-slate-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Inativa
                </button>
              </div>
            </div>

            {erro && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {sucesso}
              </div>
            )}

            <Button type="submit" disabled={salvando} className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : editandoId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alteracoes' : 'Criar caracteristica'}
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Lista cadastrada</h2>
              <p className="text-sm text-slate-500">
                Use esta lista para ativar, editar ou excluir caracteristicas.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-amber-600" size={32} />
            </div>
          ) : caracteristicas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
              Nenhuma caracteristica cadastrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {caracteristicas.map((item) => (
                <div
                  key={item.id_caracteristica}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{item.descricao}</p>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        {item.sessao}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={item.ativo === 'S' ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-300 bg-slate-100 text-slate-600'}
                      >
                        {item.ativo === 'S' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">ID {item.id_caracteristica}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => editar(item)}>
                      <Pencil size={15} />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={excluindoId === item.id_caracteristica}
                      onClick={() => excluir(item)}
                    >
                      {excluindoId === item.id_caracteristica ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && caracteristicas.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                {totalAtivas} ativas
              </span>
              <span className="inline-flex items-center gap-2">
                <XCircle size={16} className="text-slate-500" />
                {caracteristicas.length - totalAtivas} inativas
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
