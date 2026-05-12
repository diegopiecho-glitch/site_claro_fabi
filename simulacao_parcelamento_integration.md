# Simulador de Parcelamento

## Endpoints sugeridos

`POST /simulacoes/calcular`

```json
{
  "idImovel": 125,
  "valorImovel": 320000,
  "valorEntrada": 40000,
  "valorVeiculo": 25000,
  "valorOutrosAbatimentos": 5000,
  "qtdParcelas": 36,
  "tipoCalculo": "REAJUSTE_ANUAL",
  "percentualReajusteAnual": 8,
  "percentualJurosMensal": 0,
  "dataPrimeiraParcela": "2026-06-10",
  "observacao": "Simulação estimada para venda direta.",
  "usuarioCriacao": "admin"
}
```

`POST /simulacoes`

```json
{
  "idSimulacao": null,
  "idImovel": 125,
  "valorImovel": 320000,
  "valorEntrada": 40000,
  "valorVeiculo": 25000,
  "valorOutrosAbatimentos": 5000,
  "qtdParcelas": 36,
  "tipoCalculo": "REAJUSTE_ANUAL",
  "percentualReajusteAnual": 8,
  "percentualJurosMensal": 0,
  "dataPrimeiraParcela": "2026-06-10",
  "observacao": "Imóvel sem escritura. Aceita veículo sob avaliação.",
  "usuarioCriacao": "admin"
}
```

`GET /simulacoes/:id`

```json
{
  "simulacao": {
    "idSimulacao": 14,
    "idImovel": 125,
    "valorImovel": 320000,
    "valorEntrada": 40000,
    "valorVeiculo": 25000,
    "valorOutrosAbatimentos": 5000,
    "saldoParcelado": 250000,
    "qtdParcelas": 36,
    "tipoCalculo": "REAJUSTE_ANUAL",
    "percentualReajusteAnual": 8,
    "percentualJurosMensal": 0,
    "dataPrimeiraParcela": "2026-06-10",
    "observacao": "Imóvel sem escritura. Aceita veículo sob avaliação.",
    "usuarioCriacao": "admin"
  },
  "parcelas": [
    {
      "numeroParcela": 1,
      "dataVencimento": "2026-06-10",
      "valorBase": 6944.44,
      "percentualAplicado": 0,
      "valorParcela": 6944.44,
      "saldoRestante": 243055.56,
      "tipoCalculo": "REAJUSTE_ANUAL"
    }
  ],
  "aviso": "Simulação estimada. MVP sem PRICE, SAC ou índice inflacionário real."
}
```

`DELETE /simulacoes/:id`

Resposta esperada:

```json
{
  "success": true,
  "message": "Simulação excluída com sucesso."
}
```

## Mapeamento frontend

- Página: `src/app/pages/sistema/simulador/SimuladorParcelamento.tsx`
- CSS: `src/app/pages/sistema/simulador/simuladorParcelamento.css`
- Service: `src/app/services/simulacaoParcelamentoService.ts`
- Menu/rota: `src/app/pages/sistema/SistemaLayout.tsx` e `src/app/routes.tsx`
- SQL Oracle: `create_simulacao_parcelamento.sql`

## Estrutura de integração

- O botão `Calcular` usa cálculo local para resposta imediata no MVP.
- O botão `Salvar simulação` usa `POST` no endpoint administrativo.
- A lista lateral usa `GET /simulacoes`.
- O carregamento de detalhe usa `GET /simulacoes/:id`.
- A exclusão usa `DELETE /simulacoes/:id`.
- Se preferir ORDS com handlers customizados, mantenha o payload do service e adapte apenas as URLs em `src/app/lib/api.ts`.

## Melhorias futuras

- Gerar PDF e minuta de contrato com dados do comprador e cláusulas padrão.
- Permitir comissão, sinal separado e parcelas intermediárias.
- Diferenciar carro, moto e outros abatimentos em campos independentes no banco.
- Versionar simulações para histórico de renegociação.
- Adicionar aprovação gerencial e trilha de auditoria.
- Integrar assinatura eletrônica e geração de proposta comercial.
