import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AlertCircle, Calculator, Eraser, FileText, Landmark, Loader2, Save, Search, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { API, apiFetch } from '../../../lib/api'
import {
  REAJUSTE_ANUAL_CURTO_PRAZO_MESSAGE,
  SALDO_RESTANTE_ESTIMADO_MESSAGE,
  SimulacaoFormData,
  SimulacaoListItem,
  SimulacaoResultado,
  TipoCalculo,
  calcularSaldoParcelado,
  calcularSimulacaoLocal,
  consultarSimulacao,
  excluirSimulacao,
  listarSimulacoes,
  salvarSimulacao,
  validarSimulacao,
} from '../../../services/simulacaoParcelamentoService'
import './simuladorParcelamento.css'

const EMPTY_FORM: SimulacaoFormData = {
  idSimulacao: null,
  idImovel: null,
  valorImovel: 0,
  valorEntrada: 0,
  valorVeiculo: 0,
  valorOutrosAbatimentos: 0,
  qtdParcelas: 12,
  tipoCalculo: 'FIXA',
  percentualReajusteAnual: 0,
  percentualAcrescimoTotal: 0,
  dataPrimeiraParcela: new Date().toISOString().slice(0, 10),
  observacao: '',
}

const TIPO_LABEL: Record<TipoCalculo, string> = {
  FIXA: 'Parcela Fixa',
  REAJUSTE_ANUAL: 'Reajuste Anual Percentual',
  ACRESCIMO_TOTAL: 'Acréscimo Percentual Total',
}

interface ImovelOption {
  id: number
  titulo: string
  preco: number
  cidade: string
  bairro: string
}

interface TipoInfoContent {
  badge: string
  title: string
  intro: string[]
  rangesTitle: string
  ranges: Array<{ label: string; value: string }>
  recommendationTitle: string
  recommendationValue: string
  recommendationReasons: string[]
  practiceTitle?: string
  practices?: Array<{ label: string; value: string }>
}

const TIPO_INFO: Partial<Record<TipoCalculo, TipoInfoContent>> = {
  REAJUSTE_ANUAL: {
    badge: '🥇',
    title: 'Reajuste Anual Percentual',
    intro: [
      'Esse percentual normalmente tenta proteger a inflação e manter o valor do dinheiro no tempo.',
      'Não costuma ser visto como lucro agressivo.',
    ],
    rangesTitle: 'Faixa ideal',
    ranges: [
      { label: '4%', value: 'leve' },
      { label: '5%', value: 'excelente padrão' },
      { label: '6%', value: 'comum' },
      { label: '8%', value: 'mais pesado' },
    ],
    recommendationTitle: 'Minha recomendação',
    recommendationValue: 'Default do sistema: 5% ao ano',
    recommendationReasons: [
      'parece justo',
      'fácil de explicar',
      'muito próximo da inflação média histórica',
    ],
  },
  ACRESCIMO_TOTAL: {
    badge: '🥈',
    title: 'Acréscimo Percentual Total',
    intro: [
      'Aqui o vendedor está financiando direto, assumindo risco e abrindo mão de receber à vista.',
      'Por isso o mercado informal costuma aplicar um ágio no parcelamento.',
    ],
    rangesTitle: 'Faixa comum',
    ranges: [
      { label: '10%', value: 'leve' },
      { label: '15%', value: 'muito comum' },
      { label: '20%', value: 'padrão forte' },
      { label: '30%', value: 'pesado' },
    ],
    recommendationTitle: 'Minha recomendação',
    recommendationValue: 'Default do sistema: 15%',
    recommendationReasons: [
      'valor ainda aceitável',
      'compensa parcelamento',
      'não assusta tanto',
    ],
    practiceTitle: 'Regra prática muito boa',
    practices: [
      { label: 'Prazo curto (6-12 parcelas)', value: 'usa 10% a 15%' },
      { label: 'Prazo médio (24-36 parcelas)', value: 'usa 15% a 20%' },
      { label: 'Prazo longo (48-60 parcelas)', value: 'melhor usar reajuste anual' },
    ],
  },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) / 100 : 0
}

function formatDateBr(value?: string) {
  if (!value) return '--'
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toInteger(value: string) {
  const onlyDigits = value.replace(/\D/g, '')
  return onlyDigits ? Number(onlyDigits) : 0
}

function toPercent(value: string) {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}

function isNotFoundError(error: unknown) {
  const message = getErrorMessage(error)
  return message.includes('Erro 404') || message.includes('NotFound')
}

function mapImovelOption(item: any): ImovelOption | null {
  const id = Number(item?.id_imovel ?? item?.ID_IMOVEL ?? item?.id ?? item?.ID)
  const titulo = String(item?.titulo ?? item?.TITULO ?? '').trim()

  if (!id || !titulo) return null

  return {
    id,
    titulo,
    preco: Number(item?.preco ?? item?.PRECO ?? 0) || 0,
    cidade: String(item?.cidade ?? item?.CIDADE ?? '').trim(),
    bairro: String(item?.bairro ?? item?.BAIRRO ?? '').trim(),
  }
}

export function SimuladorParcelamento() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState<SimulacaoFormData>(EMPTY_FORM)
  const [resultado, setResultado] = useState<SimulacaoResultado | null>(null)
  const [simulacoes, setSimulacoes] = useState<SimulacaoListItem[]>([])
  const [imoveis, setImoveis] = useState<ImovelOption[]>([])
  const [loadingImoveis, setLoadingImoveis] = useState(true)
  const [loadingList, setLoadingList] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [infoModalTipo, setInfoModalTipo] = useState<TipoCalculo | null>(null)

  const saldoParcelado = useMemo(() => calcularSaldoParcelado(form), [form])
  const imovelSelecionado = imoveis.find((item) => item.id === form.idImovel)
  const reajusteCurtoPrazo = form.tipoCalculo === 'REAJUSTE_ANUAL' && form.qtdParcelas > 0 && form.qtdParcelas <= 12
  const infoModalContent = infoModalTipo ? TIPO_INFO[infoModalTipo] : null

  const carregarSimulacoes = async () => {
    try {
      setLoadingList(true)
      const data = await listarSimulacoes()
      setSimulacoes(data.sort((a, b) => b.idSimulacao - a.idSimulacao))
    } catch (err) {
      if (isNotFoundError(err)) {
        setSimulacoes([])
      } else {
        setError(getErrorMessage(err))
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    carregarSimulacoes()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setLoadingImoveis(true)
        const response = await apiFetch<any>(API.IMOVEIS_SISTEMA_LISTA)
        const items = Array.isArray(response) ? response : (response.items ?? [])
        setImoveis(
          items
            .map((item: any) => mapImovelOption(item))
            .filter((item: ImovelOption | null): item is ImovelOption => item !== null)
            .sort((a: ImovelOption, b: ImovelOption) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
        )
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoadingImoveis(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (loadingImoveis) return

    const queryImovelId = Number(searchParams.get('imovelId') ?? 0)
    if (!queryImovelId) return

    const imovel = imoveis.find((item) => item.id === queryImovelId)
    if (!imovel) return

    setForm((current) => {
      if (current.idImovel === imovel.id) return current

      return {
        ...current,
        idImovel: imovel.id,
        valorImovel: current.valorImovel > 0 ? current.valorImovel : imovel.preco,
      }
    })
  }, [imoveis, loadingImoveis, searchParams])

  const updateMoneyField = (field: keyof SimulacaoFormData, rawValue: string) => {
    setForm((current) => ({
      ...current,
      [field]: parseCurrencyInput(rawValue),
    }))
  }

  const handleImovelChange = (rawValue: string) => {
    const idImovel = Number(rawValue) || null
    const imovel = imoveis.find((item) => item.id === idImovel)

    setForm((current) => ({
      ...current,
      idImovel,
      valorImovel:
        imovel && (current.valorImovel <= 0 || current.idImovel !== imovel.id)
          ? imovel.preco
          : current.valorImovel,
    }))

    const nextParams = new URLSearchParams(searchParams)
    if (idImovel) nextParams.set('imovelId', String(idImovel))
    else nextParams.delete('imovelId')
    setSearchParams(nextParams, { replace: true })
  }

  const calcular = () => {
    setFeedback('')
    const errors = validarSimulacao(form)
    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setError('')
    setResultado(calcularSimulacaoLocal(form))
  }

  const limpar = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('imovelId')
    setSearchParams(nextParams, { replace: true })

    setForm({
      ...EMPTY_FORM,
      dataPrimeiraParcela: new Date().toISOString().slice(0, 10),
    })
    setResultado(null)
    setSelectedId(null)
    setError('')
    setFeedback('')
  }

  const salvar = async () => {
    const errors = validarSimulacao(form)
    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setProcessing(true)
    setError('')
    setFeedback('')

    try {
      const response = await salvarSimulacao({
        ...form,
        idSimulacao: selectedId,
      })
      setResultado(response)
      setSelectedId(response.simulacao.idSimulacao ?? selectedId ?? null)
      setForm(response.simulacao)
      setFeedback('Simulação salva com sucesso.')
      await carregarSimulacoes()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  const carregar = async (id: number) => {
    setProcessing(true)
    setError('')
    setFeedback('')

    try {
      const response = await consultarSimulacao(id)
      setSelectedId(id)
      setForm(response.simulacao)
      setResultado(response)
      setFeedback(`Simulação ${id} carregada.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  const excluir = async () => {
    if (!selectedId) {
      setError('Selecione uma simulação carregada para excluir.')
      return
    }

    if (!window.confirm(`Excluir a simulação ${selectedId}?`)) return

    setProcessing(true)
    setError('')
    setFeedback('')

    try {
      await excluirSimulacao(selectedId)
      setFeedback(`Simulação ${selectedId} excluída com sucesso.`)
      limpar()
      await carregarSimulacoes()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  const gerarPdf = () => {
    if (!resultado) {
      setError('Calcule ou carregue uma simulação antes de gerar o PDF.')
      return
    }

    const propostaId = resultado.simulacao.idSimulacao || selectedId || ''
    const tituloImovel = imovelSelecionado ? imovelSelecionado.titulo : 'Imóvel não identificado'
    const localizacaoImovel = imovelSelecionado
      ? [imovelSelecionado.cidade, imovelSelecionado.bairro].filter(Boolean).join(' - ')
      : ''
    const observacoes: string[] = []

    if (resultado.simulacao.observacao.trim()) observacoes.push(resultado.simulacao.observacao.trim())
    if (resultado.simulacao.tipoCalculo === 'REAJUSTE_ANUAL') {
      observacoes.push('O reajuste anual passa a ser aplicado somente a partir da 13ª parcela.')
      if (resultado.simulacao.qtdParcelas <= 12) observacoes.push(REAJUSTE_ANUAL_CURTO_PRAZO_MESSAGE)
    }
    if (resultado.simulacao.tipoCalculo === 'ACRESCIMO_TOTAL') {
      observacoes.push(`Acréscimo percentual total: ${String(resultado.simulacao.percentualAcrescimoTotal).replace('.', ',')}%.`)
      observacoes.push(`Saldo original parcelado: ${formatCurrency(resultado.resumo.saldoParcelado)}.`)
      observacoes.push(`Saldo corrigido: ${formatCurrency(resultado.resumo.saldoCorrigido ?? resultado.resumo.totalParcelas)}.`)
      observacoes.push(`Valor da parcela: ${formatCurrency(resultado.resumo.primeiraParcela?.valorParcela ?? 0)}.`)
    }
    observacoes.push(SALDO_RESTANTE_ESTIMADO_MESSAGE)

    const linhasParcelas = resultado.parcelas
      .map(
        (item) => `
          <tr>
            <td>${item.numeroParcela}</td>
            <td>${escapeHtml(formatDateBr(item.dataVencimento))}</td>
            <td>${escapeHtml(formatCurrency(item.valorBase))}</td>
            <td>${escapeHtml(String(item.percentualAplicado).replace('.', ','))}%</td>
            <td>${escapeHtml(formatCurrency(item.valorParcela))}</td>
            <td>${escapeHtml(formatCurrency(item.saldoRestante))}</td>
          </tr>
        `
      )
      .join('')

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Proposta de Parcelamento ${propostaId ? `#${propostaId}` : ''}</title>
          <style>
            body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1, h2, h3, p { margin: 0; }
            .header { border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 24px; }
            .tag { color: #b45309; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
            .title { font-size: 28px; margin-top: 8px; }
            .subtitle { color: #475569; margin-top: 8px; font-size: 14px; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
            .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
            .label { color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
            .value { font-size: 22px; font-weight: 700; }
            .meta { margin-bottom: 20px; display: grid; gap: 8px; }
            .meta-row { font-size: 14px; }
            .meta-row strong { display: inline-block; min-width: 180px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 8px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; }
            .obs { margin-top: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fffdf7; }
            .obs ul { margin: 12px 0 0; padding-left: 20px; }
            .obs li + li { margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="tag">Proposta de parcelamento</div>
            <h1 class="title">Venda direta de imóvel</h1>
            <p class="subtitle">Simulação ${propostaId ? `#${propostaId}` : ''} gerada em ${escapeHtml(formatDateBr(new Date().toISOString()))}</p>
          </div>
          <div class="meta">
            <div class="meta-row"><strong>Imóvel:</strong> ${escapeHtml(tituloImovel)}</div>
            <div class="meta-row"><strong>Localização:</strong> ${escapeHtml(localizacaoImovel || '--')}</div>
            <div class="meta-row"><strong>Tipo de cálculo:</strong> ${escapeHtml(TIPO_LABEL[resultado.simulacao.tipoCalculo])}</div>
            <div class="meta-row"><strong>Primeira parcela:</strong> ${escapeHtml(formatDateBr(resultado.simulacao.dataPrimeiraParcela))}</div>
            ${resultado.simulacao.tipoCalculo === 'ACRESCIMO_TOTAL' ? `<div class="meta-row"><strong>Acréscimo total:</strong> ${escapeHtml(String(resultado.simulacao.percentualAcrescimoTotal).replace('.', ','))}%</div>` : ''}
          </div>
          <div class="grid">
            <div class="card"><div class="label">Valor do imóvel</div><div class="value">${escapeHtml(formatCurrency(resultado.simulacao.valorImovel))}</div></div>
            <div class="card"><div class="label">Abatimentos</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.totalAbatimentos))}</div></div>
            <div class="card"><div class="label">Saldo parcelado</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.saldoParcelado))}</div></div>
          </div>
          ${resultado.simulacao.tipoCalculo === 'ACRESCIMO_TOTAL' ? `<div class="grid"><div class="card"><div class="label">Saldo original</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.saldoParcelado))}</div></div><div class="card"><div class="label">Saldo corrigido</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.saldoCorrigido ?? resultado.resumo.totalParcelas))}</div></div><div class="card"><div class="label">Parcela estimada</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.primeiraParcela?.valorParcela ?? 0))}</div></div></div>` : ''}
          <div class="grid">
            <div class="card"><div class="label">Parcelas</div><div class="value">${resultado.simulacao.qtdParcelas}</div></div>
            <div class="card"><div class="label">Total estimado</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.totalParcelas))}</div></div>
            <div class="card"><div class="label">Última parcela</div><div class="value">${escapeHtml(formatCurrency(resultado.resumo.ultimaParcela?.valorParcela ?? 0))}</div></div>
          </div>
          <h2>Tabela de parcelas</h2>
          <table>
            <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor base</th><th>% aplicado</th><th>Valor parcela</th><th>Saldo restante</th></tr></thead>
            <tbody>${linhasParcelas}</tbody>
          </table>
          <div class="obs"><h3>Observações</h3><ul>${observacoes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
        </body>
      </html>
    `

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const printWindow = window.open(blobUrl, '_blank')
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl)
      setError('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou o pop-up.')
      return
    }

    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
    }, 600)
  }

  return (
    <div className="parcelamento-shell min-h-screen p-4 sm:p-6 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="parcelamento-hero rounded-[28px] px-6 py-8 text-white sm:px-8">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div>
              <span className="parcelamento-tag">Simulação estimada</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Simulador de parcelamento para venda direta de imóveis
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
                Monte cenarios com entrada, veículo, outros abatimentos e saldo parcelado sem financiamento bancário.
                O MVP usa calculo simples, acréscimo total para prazos curtos e ajusta a ultima parcela para diferenca de centavos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Saldo parcelado</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(saldoParcelado)}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Parcelas</p>
                <p className="mt-2 text-2xl font-semibold">{form.qtdParcelas || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Modalidade</p>
                <p className="mt-2 text-lg font-semibold">{TIPO_LABEL[form.tipoCalculo]}</p>
              </div>
            </div>
          </div>
        </section>

        {(error || feedback) && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <AlertCircle size={18} />
            <span>{error || feedback}</span>
          </div>
        )}

        {reajusteCurtoPrazo && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{REAJUSTE_ANUAL_CURTO_PRAZO_MESSAGE}</span>
          </div>
        )}

        {infoModalContent && (
          <div className="parcelamento-modal-backdrop" onClick={() => setInfoModalTipo(null)}>
            <div className="parcelamento-modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                    {infoModalContent.badge} Guia da modalidade
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{infoModalContent.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoModalTipo(null)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 space-y-5 text-sm text-slate-700">
                <div className="space-y-2">
                  {infoModalContent.intro.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">{infoModalContent.rangesTitle}</p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full border-collapse bg-white">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Percentual</th>
                          <th className="px-4 py-3">Perfil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infoModalContent.ranges.map((item) => (
                          <tr key={item.label} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-slate-900">{item.label}</td>
                            <td className="px-4 py-3">{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{infoModalContent.recommendationTitle}</p>
                    <p className="mt-2 text-base font-semibold text-amber-800">{infoModalContent.recommendationValue}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {infoModalContent.recommendationReasons.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                {infoModalContent.practices && infoModalContent.practiceTitle && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{infoModalContent.practiceTitle}</p>
                    <div className="mt-3 space-y-3">
                      {infoModalContent.practices.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-slate-700">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card className="parcelamento-premium-card rounded-[28px]">
            <CardHeader>
              <CardTitle className="text-slate-900">Dados da simulação</CardTitle>
              <CardDescription>
                Informe os valores da negociação e escolha a logica de cálculo do parcelamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="idImovel" className="text-sm text-slate-700">Imóvel</label>
                  <select
                    id="idImovel"
                    value={form.idImovel ? String(form.idImovel) : ''}
                    onChange={(event) => handleImovelChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-400"
                    disabled={loadingImoveis}
                  >
                    <option value="">{loadingImoveis ? 'Carregando imóveis...' : 'Selecione um imóvel cadastrado'}</option>
                    {imoveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} - {item.titulo}
                      </option>
                    ))}
                  </select>
                  {imovelSelecionado && (
                    <div className="space-y-1 text-xs text-slate-500">
                      <p>
                        {imovelSelecionado.cidade || 'Cidade nao informada'}
                        {imovelSelecionado.bairro ? ` - ${imovelSelecionado.bairro}` : ''}
                      </p>
                      <p>
                        Valor cadastrado: {formatCurrency(imovelSelecionado.preco)}
                        {' - '}
                        <Link to={`/sistema/imoveis/${imovelSelecionado.id}/editar`} className="text-amber-700 hover:text-amber-800">
                          abrir imóvel
                        </Link>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="valorImovel" className="text-sm text-slate-700">Valor total do imóvel</label>
                  <Input
                    id="valorImovel"
                    inputMode="numeric"
                    value={formatCurrency(form.valorImovel)}
                    onChange={(event) => updateMoneyField('valorImovel', event.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="valorEntrada" className="text-sm text-slate-700">Entrada em dinheiro</label>
                  <Input
                    id="valorEntrada"
                    inputMode="numeric"
                    value={formatCurrency(form.valorEntrada)}
                    onChange={(event) => updateMoneyField('valorEntrada', event.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="valorVeiculo" className="text-sm text-slate-700">Carro, moto ou veículo</label>
                  <Input
                    id="valorVeiculo"
                    inputMode="numeric"
                    value={formatCurrency(form.valorVeiculo)}
                    onChange={(event) => updateMoneyField('valorVeiculo', event.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="valorOutrosAbatimentos" className="text-sm text-slate-700">Outros abatimentos</label>
                  <Input
                    id="valorOutrosAbatimentos"
                    inputMode="numeric"
                    value={formatCurrency(form.valorOutrosAbatimentos)}
                    onChange={(event) => updateMoneyField('valorOutrosAbatimentos', event.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="saldoParcelado" className="text-sm text-slate-700">Saldo a parcelar</label>
                  <Input
                    id="saldoParcelado"
                    value={formatCurrency(saldoParcelado)}
                    readOnly
                    className="h-11 rounded-xl border-amber-200 bg-amber-50 text-amber-900"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="qtdParcelas" className="text-sm text-slate-700">Quantidade de parcelas</label>
                  <Input
                    id="qtdParcelas"
                    inputMode="numeric"
                    value={form.qtdParcelas || ''}
                    onChange={(event) => setForm((current) => ({ ...current, qtdParcelas: toInteger(event.target.value) }))}
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="tipoCalculo" className="text-sm text-slate-700">Tipo de cálculo</label>
                  <select
                    id="tipoCalculo"
                    value={form.tipoCalculo}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tipoCalculo: event.target.value as TipoCalculo,
                        percentualReajusteAnual:
                          event.target.value === 'REAJUSTE_ANUAL'
                            ? (current.percentualReajusteAnual > 0 ? current.percentualReajusteAnual : 5)
                            : 0,
                        percentualAcrescimoTotal:
                          event.target.value === 'ACRESCIMO_TOTAL'
                            ? (current.percentualAcrescimoTotal > 0 ? current.percentualAcrescimoTotal : 15)
                            : 0,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-400"
                  >
                    <option value="FIXA">Parcela Fixa</option>
                    <option value="REAJUSTE_ANUAL">Reajuste Anual Percentual</option>
                    <option value="ACRESCIMO_TOTAL">Acréscimo Percentual Total</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dataPrimeiraParcela" className="text-sm text-slate-700">Data da primeira parcela</label>
                  <Input
                    id="dataPrimeiraParcela"
                    type="date"
                    value={form.dataPrimeiraParcela}
                    onChange={(event) => setForm((current) => ({ ...current, dataPrimeiraParcela: event.target.value }))}
                    className="h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>

                {form.tipoCalculo === 'REAJUSTE_ANUAL' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="percentualReajusteAnual" className="text-sm text-slate-700">Percentual de reajuste anual</label>
                      <button
                        type="button"
                        onClick={() => setInfoModalTipo('REAJUSTE_ANUAL')}
                        className="text-xs font-medium text-slate-500 underline underline-offset-4 transition hover:text-slate-700"
                      >
                        Ver recomendação
                      </button>
                    </div>
                    <Input
                      id="percentualReajusteAnual"
                      inputMode="decimal"
                      value={String(form.percentualReajusteAnual).replace('.', ',')}
                      onChange={(event) => setForm((current) => ({ ...current, percentualReajusteAnual: toPercent(event.target.value) }))}
                      placeholder="Ex.: 5"
                      className="h-11 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                )}

                {form.tipoCalculo === 'ACRESCIMO_TOTAL' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="percentualAcrescimoTotal" className="text-sm text-slate-700">Percentual de acréscimo total</label>
                      <button
                        type="button"
                        onClick={() => setInfoModalTipo('ACRESCIMO_TOTAL')}
                        className="text-xs font-medium text-slate-500 underline underline-offset-4 transition hover:text-slate-700"
                      >
                        Ver recomendação
                      </button>
                    </div>
                    <Input
                      id="percentualAcrescimoTotal"
                      inputMode="decimal"
                      value={String(form.percentualAcrescimoTotal).replace('.', ',')}
                      onChange={(event) => setForm((current) => ({ ...current, percentualAcrescimoTotal: toPercent(event.target.value) }))}
                      placeholder="Ex.: 10"
                      className="h-11 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="observacao" className="text-sm text-slate-700">Observações</label>
                <Textarea
                  id="observacao"
                  value={form.observacao}
                  onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))}
                  className="min-h-28 rounded-2xl border-slate-200 bg-white"
                  placeholder="Ex.: proposta sujeita a conferência documental e avaliação final dos abatimentos."
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={calcular} className="parcelamento-gold-button h-11 rounded-xl px-5 text-white" disabled={processing}>
                  <Calculator size={18} />
                  Calcular
                </Button>

                <Button type="button" onClick={salvar} className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800" disabled={processing}>
                  {processing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar simulação
                </Button>

                <Button type="button" onClick={limpar} variant="outline" className="parcelamento-muted-button h-11 rounded-xl px-5">
                  <Eraser size={18} />
                  Limpar
                </Button>

                <Button
                  type="button"
                  onClick={excluir}
                  variant="outline"
                  className="h-11 rounded-xl border-red-200 px-5 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={processing || !selectedId}
                >
                  <Trash2 size={18} />
                  Excluir
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="parcelamento-muted-button h-11 rounded-xl px-5"
                  onClick={gerarPdf}
                  disabled={processing || !resultado}
                >
                  <FileText size={18} />
                  Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="parcelamento-premium-card rounded-[28px]">
              <CardHeader>
                <CardTitle className="text-slate-900">Resumo da proposta</CardTitle>
                <CardDescription>
                  Conferência rápida do cenário atual antes de salvar ou compartilhar com o cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="parcelamento-metric rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Valor do imóvel</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(form.valorImovel)}</p>
                </div>
                <div className="parcelamento-metric rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Abatimentos</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(form.valorEntrada + form.valorVeiculo + form.valorOutrosAbatimentos)}
                  </p>
                </div>
                <div className="parcelamento-metric rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Saldo parcelado</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(saldoParcelado)}</p>
                </div>
                <div className="parcelamento-metric rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Saldo corrigido</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(resultado?.resumo.saldoCorrigido ?? saldoParcelado)}
                  </p>
                </div>
                <div className="parcelamento-metric rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Primeira parcela</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {resultado?.resumo.primeiraParcela
                      ? `${formatDateBr(resultado.resumo.primeiraParcela.dataVencimento)} - ${formatCurrency(resultado.resumo.primeiraParcela.valorParcela)}`
                      : '--'}
                  </p>
                </div>
                <div className="parcelamento-metric rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Última parcela</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {resultado?.resumo.ultimaParcela
                      ? `${formatDateBr(resultado.resumo.ultimaParcela.dataVencimento)} - ${formatCurrency(resultado.resumo.ultimaParcela.valorParcela)}`
                      : '--'}
                  </p>
                </div>
                <div className="parcelamento-metric rounded-2xl p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Total estimado</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(resultado?.resumo.totalParcelas ?? 0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="parcelamento-premium-card rounded-[28px]">
              <CardHeader>
              <CardTitle className="text-slate-900">Simulações salvas</CardTitle>
                <CardDescription>
                  Consulte simulações anteriores e recarregue o histórico no formulário.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Histórico administrativo</p>
                    <p className="text-xs text-slate-500">Clique em uma simulação para consultar os detalhes.</p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={carregarSimulacoes}>
                    <Search size={16} />
                    Atualizar
                  </Button>
                </div>

                {loadingList ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-amber-600" size={28} />
                  </div>
                ) : simulacoes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                    Nenhuma simulação salva ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {simulacoes.map((item) => (
                      <button
                        key={item.idSimulacao}
                        type="button"
                        onClick={() => carregar(item.idSimulacao)}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                          selectedId === item.idSimulacao
                            ? 'border-amber-300 bg-amber-50/70'
                            : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5 rounded-2xl bg-slate-900 p-2 text-white">
                          <Landmark size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">Simulação #{item.idSimulacao}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {TIPO_LABEL[item.tipoCalculo]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            Imovel {item.idImovel || '--'} - {item.qtdParcelas} parcelas - saldo {formatCurrency(item.saldoParcelado)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.dataCriacao ? formatDateBr(item.dataCriacao) : 'Sem data'} - {item.usuarioCriacao || 'Sem usuário'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="parcelamento-premium-card rounded-[28px]">
          <CardHeader>
            <CardTitle className="text-slate-900">Tabela de parcelas</CardTitle>
            <CardDescription>
              A simulação é estimada. O saldo restante permanece apenas informativo com base no saldo original parcelado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultado?.aviso && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {resultado.aviso}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {SALDO_RESTANTE_ESTIMADO_MESSAGE}
            </div>

            {!resultado ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                Calcule uma proposta para visualizar a tabela completa de parcelamento.
              </div>
            ) : (
              <div className="parcelamento-table-wrap">
                <table className="parcelamento-table">
                  <thead>
                    <tr>
                      <th>Parcela</th>
                      <th>Vencimento</th>
                      <th>Valor da parcela</th>
                      <th>Valor base</th>
                      <th>Percentual aplicado</th>
                      <th>Tipo de cálculo</th>
                      <th>Saldo restante aprox.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.parcelas.map((item) => (
                      <tr key={item.numeroParcela}>
                        <td>{item.numeroParcela}</td>
                        <td>{formatDateBr(item.dataVencimento)}</td>
                        <td className="font-semibold text-slate-900">{formatCurrency(item.valorParcela)}</td>
                        <td>{formatCurrency(item.valorBase)}</td>
                        <td>{item.percentualAplicado.toFixed(2).replace('.', ',')}%</td>
                        <td>{TIPO_LABEL[item.tipoCalculo]}</td>
                        <td>{formatCurrency(item.saldoRestante)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
