import { API, apiFetch } from '../lib/api'

export type TipoCalculo = 'FIXA' | 'REAJUSTE_ANUAL' | 'ACRESCIMO_TOTAL'

export const REAJUSTE_ANUAL_CURTO_PRAZO_MESSAGE =
  'Reajuste anual nao gera correcao para parcelamentos de ate 12 meses. Para prazos curtos, utilize Parcela Fixa ou Acrescimo Percentual.'

export const SALDO_RESTANTE_ESTIMADO_MESSAGE =
  'Saldo restante estimado com base no saldo original parcelado, sem considerar correcoes financeiras complexas.'

export interface SimulacaoFormData {
  idSimulacao?: number | null
  idImovel?: number | null
  valorImovel: number
  valorEntrada: number
  valorVeiculo: number
  valorOutrosAbatimentos: number
  qtdParcelas: number
  tipoCalculo: TipoCalculo
  percentualReajusteAnual: number
  percentualAcrescimoTotal: number
  dataPrimeiraParcela: string
  observacao: string
  usuarioCriacao?: string
}

export interface SimulacaoItem {
  numeroParcela: number
  dataVencimento: string
  valorParcela: number
  valorBase: number
  percentualAplicado: number
  tipoCalculo: TipoCalculo
  saldoRestante: number
}

export interface SimulacaoResumo {
  saldoParcelado: number
  saldoCorrigido?: number
  totalParcelas: number
  totalAbatimentos: number
  primeiraParcela?: SimulacaoItem
  ultimaParcela?: SimulacaoItem
}

export interface SimulacaoResultado {
  simulacao: SimulacaoFormData
  resumo: SimulacaoResumo
  parcelas: SimulacaoItem[]
  aviso: string
}

export interface SimulacaoListItem {
  idSimulacao: number
  idImovel?: number | null
  valorImovel: number
  saldoParcelado: number
  qtdParcelas: number
  tipoCalculo: TipoCalculo
  dataCriacao?: string
  usuarioCriacao?: string
  observacao?: string
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function addMonths(dateString: string, monthsToAdd: number) {
  const [year, month, day] = dateString.split('-').map(Number)
  const baseDate = new Date(year, (month || 1) - 1, day || 1)
  const originalDay = baseDate.getDate()

  baseDate.setMonth(baseDate.getMonth() + monthsToAdd)

  if (baseDate.getDate() !== originalDay) {
    baseDate.setDate(0)
  }

  const yearResult = baseDate.getFullYear()
  const monthResult = String(baseDate.getMonth() + 1).padStart(2, '0')
  const dayResult = String(baseDate.getDate()).padStart(2, '0')
  return `${yearResult}-${monthResult}-${dayResult}`
}

function normalizeTipoCalculo(value: unknown): TipoCalculo {
  const tipo = String(value ?? '').toUpperCase()
  if (tipo === 'REAJUSTE_ANUAL' || tipo === 'ACRESCIMO_TOTAL') return tipo
  return 'FIXA'
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isReajusteAnualCurtoPrazo(formData: SimulacaoFormData) {
  return formData.tipoCalculo === 'REAJUSTE_ANUAL' && Math.trunc(normalizeNumber(formData.qtdParcelas)) <= 12
}

function buildAviso(formData: SimulacaoFormData) {
  const avisos = [SALDO_RESTANTE_ESTIMADO_MESSAGE]

  if (formData.tipoCalculo === 'REAJUSTE_ANUAL') {
    avisos.unshift('O reajuste anual passa a ser aplicado somente a partir da 13ª parcela.')
  }

  if (isReajusteAnualCurtoPrazo(formData)) {
    avisos.unshift(REAJUSTE_ANUAL_CURTO_PRAZO_MESSAGE)
  }

  if (formData.tipoCalculo === 'ACRESCIMO_TOTAL') {
    avisos.unshift('O acrescimo percentual total e aplicado desde a primeira parcela.')
  }

  return avisos.join(' ')
}

function mapPayload(formData: SimulacaoFormData) {
  return {
    ...formData,
    percentualJurosMensal: formData.percentualAcrescimoTotal,
    percentual_juros_mensal: formData.percentualAcrescimoTotal,
    percentualAcrescimoTotal: formData.percentualAcrescimoTotal,
    percentual_acrescimo_total: formData.percentualAcrescimoTotal,
  }
}

export function calcularSaldoParcelado(formData: SimulacaoFormData) {
  const saldo =
    normalizeNumber(formData.valorImovel) -
    normalizeNumber(formData.valorEntrada) -
    normalizeNumber(formData.valorVeiculo) -
    normalizeNumber(formData.valorOutrosAbatimentos)

  return roundCurrency(Math.max(0, saldo))
}

export function validarSimulacao(formData: SimulacaoFormData) {
  const errors: string[] = []
  const saldoParcelado = calcularSaldoParcelado(formData)

  if (normalizeNumber(formData.valorImovel) <= 0) errors.push('Informe um valor de imovel maior que zero.')
  if (!Number.isInteger(normalizeNumber(formData.qtdParcelas)) || normalizeNumber(formData.qtdParcelas) <= 0) {
    errors.push('Informe uma quantidade de parcelas valida.')
  }
  if (!formData.dataPrimeiraParcela) errors.push('Informe a data da primeira parcela.')
  if (saldoParcelado <= 0) errors.push('O saldo parcelado deve ser maior que zero.')

  if (
    normalizeNumber(formData.valorEntrada) < 0 ||
    normalizeNumber(formData.valorVeiculo) < 0 ||
    normalizeNumber(formData.valorOutrosAbatimentos) < 0
  ) {
    errors.push('Os abatimentos nao podem ser negativos.')
  }

  if (formData.tipoCalculo === 'REAJUSTE_ANUAL' && normalizeNumber(formData.percentualReajusteAnual) < 0) {
    errors.push('O reajuste anual nao pode ser negativo.')
  }

  if (formData.tipoCalculo === 'ACRESCIMO_TOTAL' && normalizeNumber(formData.percentualAcrescimoTotal) < 0) {
    errors.push('O acrescimo percentual total nao pode ser negativo.')
  }

  if (isReajusteAnualCurtoPrazo(formData)) {
    errors.push(REAJUSTE_ANUAL_CURTO_PRAZO_MESSAGE)
  }

  return errors
}

export function calcularSimulacaoLocal(formData: SimulacaoFormData): SimulacaoResultado {
  const saldoParcelado = calcularSaldoParcelado(formData)
  const qtdParcelas = Math.max(1, Math.trunc(normalizeNumber(formData.qtdParcelas)))
  const percentualReajusteAnual = normalizeNumber(formData.percentualReajusteAnual)
  const percentualAcrescimoTotal = normalizeNumber(formData.percentualAcrescimoTotal)
  const saldoCorrigido =
    formData.tipoCalculo === 'ACRESCIMO_TOTAL'
      ? roundCurrency(saldoParcelado * (1 + percentualAcrescimoTotal / 100))
      : saldoParcelado
  const valorBase =
    formData.tipoCalculo === 'ACRESCIMO_TOTAL'
      ? roundCurrency(saldoCorrigido / qtdParcelas)
      : roundCurrency(saldoParcelado / qtdParcelas)
  const parcelas: SimulacaoItem[] = []
  let totalParcelas = 0
  let amortizadoBase = 0

  for (let index = 0; index < qtdParcelas; index += 1) {
    const numeroParcela = index + 1
    const faixaAnual = Math.floor(index / 12)
    let percentualAplicado = 0
    let valorParcela = valorBase

    if (formData.tipoCalculo === 'REAJUSTE_ANUAL') {
      percentualAplicado = roundCurrency((Math.pow(1 + percentualReajusteAnual / 100, faixaAnual) - 1) * 100)
      valorParcela = roundCurrency(valorBase * Math.pow(1 + percentualReajusteAnual / 100, faixaAnual))
    }

    if (formData.tipoCalculo === 'ACRESCIMO_TOTAL') {
      percentualAplicado = percentualAcrescimoTotal
      valorParcela = valorBase
    }

    totalParcelas = roundCurrency(totalParcelas + valorParcela)
    amortizadoBase = roundCurrency(amortizadoBase + saldoParcelado / qtdParcelas)

    parcelas.push({
      numeroParcela,
      dataVencimento: addMonths(formData.dataPrimeiraParcela, index),
      valorParcela,
      valorBase,
      percentualAplicado,
      tipoCalculo: formData.tipoCalculo,
      saldoRestante: roundCurrency(Math.max(0, saldoParcelado - amortizadoBase)),
    })
  }

  if (parcelas.length > 0) {
    const baseTotalReferencia = formData.tipoCalculo === 'ACRESCIMO_TOTAL' ? saldoCorrigido : saldoParcelado
    const diferencaSaldo = roundCurrency(baseTotalReferencia - roundCurrency(valorBase * qtdParcelas))
    const ultimaParcelaIndex = parcelas.length - 1
    parcelas[ultimaParcelaIndex] = {
      ...parcelas[ultimaParcelaIndex],
      valorBase: roundCurrency(parcelas[ultimaParcelaIndex].valorBase + diferencaSaldo),
      saldoRestante: 0,
    }

    if (formData.tipoCalculo === 'FIXA' || formData.tipoCalculo === 'ACRESCIMO_TOTAL') {
      parcelas[ultimaParcelaIndex].valorParcela = roundCurrency(parcelas[ultimaParcelaIndex].valorParcela + diferencaSaldo)
    }

    if (formData.tipoCalculo === 'REAJUSTE_ANUAL') {
      const fator = Math.pow(1 + percentualReajusteAnual / 100, Math.floor(ultimaParcelaIndex / 12))
      parcelas[ultimaParcelaIndex].valorParcela = roundCurrency(parcelas[ultimaParcelaIndex].valorBase * fator)
    }

    totalParcelas = roundCurrency(parcelas.reduce((total, item) => total + item.valorParcela, 0))
  }

  const simulacaoNormalizada: SimulacaoFormData = {
    ...formData,
    saldoParcelado,
    qtdParcelas,
    percentualReajusteAnual,
    percentualAcrescimoTotal,
  } as SimulacaoFormData

  return {
    simulacao: simulacaoNormalizada,
    resumo: {
      saldoParcelado,
      saldoCorrigido,
      totalParcelas,
      totalAbatimentos: roundCurrency(
        normalizeNumber(formData.valorEntrada) +
          normalizeNumber(formData.valorVeiculo) +
          normalizeNumber(formData.valorOutrosAbatimentos)
      ),
      primeiraParcela: parcelas[0],
      ultimaParcela: parcelas[parcelas.length - 1],
    },
    parcelas,
    aviso: buildAviso(simulacaoNormalizada),
  }
}

function mapListItem(item: any): SimulacaoListItem {
  return {
    idSimulacao: normalizeNumber(item.idSimulacao ?? item.id_simulacao ?? item.ID_SIMULACAO),
    idImovel: normalizeNumber(item.idImovel ?? item.id_imovel ?? item.ID_IMOVEL) || null,
    valorImovel: normalizeNumber(item.valorImovel ?? item.valor_imovel ?? item.VALOR_IMOVEL),
    saldoParcelado: normalizeNumber(item.saldoParcelado ?? item.saldo_parcelado ?? item.SALDO_PARCELADO),
    qtdParcelas: normalizeNumber(item.qtdParcelas ?? item.qtd_parcelas ?? item.QTD_PARCELAS),
    tipoCalculo: normalizeTipoCalculo(item.tipoCalculo ?? item.tipo_calculo ?? item.TIPO_CALCULO),
    dataCriacao: String(item.dataCriacao ?? item.data_criacao ?? item.DATA_CRIACAO ?? ''),
    usuarioCriacao: String(item.usuarioCriacao ?? item.usuario_criacao ?? item.USUARIO_CRIACAO ?? ''),
    observacao: String(item.observacao ?? item.OBSERVACAO ?? ''),
  }
}

function mapResultado(payload: any): SimulacaoResultado {
  const simulacao = payload.simulacao ?? payload
  const itens = Array.isArray(payload.parcelas) ? payload.parcelas : Array.isArray(payload.itens) ? payload.itens : []

  const formData: SimulacaoFormData = {
    idSimulacao: normalizeNumber(simulacao.idSimulacao ?? simulacao.id_simulacao ?? simulacao.ID_SIMULACAO) || null,
    idImovel: normalizeNumber(simulacao.idImovel ?? simulacao.id_imovel ?? simulacao.ID_IMOVEL) || null,
    valorImovel: normalizeNumber(simulacao.valorImovel ?? simulacao.valor_imovel ?? simulacao.VALOR_IMOVEL),
    valorEntrada: normalizeNumber(simulacao.valorEntrada ?? simulacao.valor_entrada ?? simulacao.VALOR_ENTRADA),
    valorVeiculo: normalizeNumber(simulacao.valorVeiculo ?? simulacao.valor_veiculo ?? simulacao.VALOR_VEICULO),
    valorOutrosAbatimentos: normalizeNumber(
      simulacao.valorOutrosAbatimentos ?? simulacao.valor_outros_abatimentos ?? simulacao.VALOR_OUTROS_ABATIMENTOS
    ),
    qtdParcelas: normalizeNumber(simulacao.qtdParcelas ?? simulacao.qtd_parcelas ?? simulacao.QTD_PARCELAS),
    tipoCalculo: normalizeTipoCalculo(simulacao.tipoCalculo ?? simulacao.tipo_calculo ?? simulacao.TIPO_CALCULO),
    percentualReajusteAnual: normalizeNumber(
      simulacao.percentualReajusteAnual ?? simulacao.percentual_reajuste_anual ?? simulacao.PERCENTUAL_REAJUSTE_ANUAL
    ),
    percentualAcrescimoTotal: normalizeNumber(
      simulacao.percentualAcrescimoTotal ??
        simulacao.percentual_acrescimo_total ??
        simulacao.PERCENTUAL_ACRESCIMO_TOTAL ??
        simulacao.percentualJurosMensal ??
        simulacao.percentual_juros_mensal ??
        simulacao.PERCENTUAL_JUROS_MENSAL
    ),
    dataPrimeiraParcela: String(
      simulacao.dataPrimeiraParcela ?? simulacao.data_primeira_parcela ?? simulacao.DATA_PRIMEIRA_PARCELA ?? ''
    ).slice(0, 10),
    observacao: String(simulacao.observacao ?? simulacao.OBSERVACAO ?? ''),
    usuarioCriacao: String(simulacao.usuarioCriacao ?? simulacao.usuario_criacao ?? simulacao.USUARIO_CRIACAO ?? ''),
  }

  const parcelas: SimulacaoItem[] = itens.map((item: any) => ({
    numeroParcela: normalizeNumber(item.numeroParcela ?? item.numero_parcela ?? item.NUMERO_PARCELA),
    dataVencimento: String(item.dataVencimento ?? item.data_vencimento ?? item.DATA_VENCIMENTO ?? '').slice(0, 10),
    valorParcela: normalizeNumber(item.valorParcela ?? item.valor_parcela ?? item.VALOR_PARCELA),
    valorBase: normalizeNumber(item.valorBase ?? item.valor_base ?? item.VALOR_BASE),
    percentualAplicado: normalizeNumber(item.percentualAplicado ?? item.percentual_aplicado ?? item.PERCENTUAL_APLICADO),
    tipoCalculo: normalizeTipoCalculo(item.tipoCalculo ?? item.tipo_calculo ?? item.TIPO_CALCULO),
    saldoRestante: normalizeNumber(item.saldoRestante ?? item.saldo_restante ?? item.SALDO_RESTANTE),
  }))

  const calculada = calcularSimulacaoLocal(formData)

  return {
    simulacao: { ...calculada.simulacao, ...formData },
    resumo: {
      saldoParcelado: normalizeNumber(
        payload.resumo?.saldoParcelado ?? payload.resumo?.saldo_parcelado ?? payload.SALDO_PARCELADO ?? calculada.resumo.saldoParcelado
      ),
      saldoCorrigido: normalizeNumber(
        payload.resumo?.saldoCorrigido ??
          payload.resumo?.saldo_corrigido ??
          payload.SALDO_CORRIGIDO ??
          calculada.resumo.saldoCorrigido
      ),
      totalParcelas: normalizeNumber(
        payload.resumo?.totalParcelas ??
          payload.resumo?.total_parcelas ??
          payload.TOTAL_PARCELAS ??
          (parcelas.length > 0 ? parcelas.reduce((total, item) => total + item.valorParcela, 0) : calculada.resumo.totalParcelas)
      ),
      totalAbatimentos: normalizeNumber(
        payload.resumo?.totalAbatimentos ?? payload.resumo?.total_abatimentos ?? calculada.resumo.totalAbatimentos
      ),
      primeiraParcela: parcelas[0] ?? calculada.resumo.primeiraParcela,
      ultimaParcela: parcelas[parcelas.length - 1] ?? calculada.resumo.ultimaParcela,
    },
    parcelas: parcelas.length > 0 ? parcelas : calculada.parcelas,
    aviso: String(payload.aviso ?? '').trim() || buildAviso(formData),
  }
}

export async function listarSimulacoes() {
  const response = await apiFetch<any>(API.SIMULACAO_LISTA)
  const items = Array.isArray(response) ? response : (response.items ?? response.simulacoes ?? [])
  return items.map(mapListItem).filter((item: SimulacaoListItem) => item.idSimulacao > 0)
}

export async function consultarSimulacao(id: number) {
  const [headerResponse, parcelasResponse] = await Promise.all([
    apiFetch<any>(API.SIMULACAO_DETALHE(id)),
    apiFetch<any>(API.SIMULACAO_PARCELAS(id)),
  ])

  const simulacao = Array.isArray(headerResponse)
    ? headerResponse[0]
    : Array.isArray(headerResponse?.items)
      ? headerResponse.items[0]
      : headerResponse

  const parcelas = Array.isArray(parcelasResponse) ? parcelasResponse : (parcelasResponse?.items ?? [])

  return mapResultado({
    simulacao,
    parcelas,
  })
}

export async function salvarSimulacao(payload: SimulacaoFormData) {
  const response = await apiFetch<any>(API.SIMULACAO_SALVAR, {
    method: 'POST',
    body: JSON.stringify(mapPayload(payload)),
  })

  const idSimulacao = normalizeNumber(
    response?.simulacao?.idSimulacao ??
      response?.simulacao?.id_simulacao ??
      response?.idSimulacao ??
      response?.id_simulacao ??
      response?.ID_SIMULACAO
  )

  if (idSimulacao > 0 && !response?.simulacao && !response?.parcelas && !response?.itens) {
    try {
      return await consultarSimulacao(idSimulacao)
    } catch {
      const resultadoLocal = calcularSimulacaoLocal({
        ...payload,
        idSimulacao,
      })

      return {
        ...resultadoLocal,
        simulacao: {
          ...resultadoLocal.simulacao,
          idSimulacao,
        },
        aviso:
          'Simulacao salva. O detalhe completo ainda nao foi recarregado da API, entao a visualizacao atual usa o calculo local do frontend.',
      }
    }
  }

  return mapResultado(response)
}

export async function excluirSimulacao(id: number) {
  return apiFetch(API.SIMULACAO_EXCLUIR(id), {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function calcularSimulacaoApi(payload: SimulacaoFormData) {
  return mapResultado(
    await apiFetch<any>(API.SIMULACAO_CALCULAR, {
      method: 'POST',
      body: JSON.stringify(mapPayload(payload)),
    })
  )
}
