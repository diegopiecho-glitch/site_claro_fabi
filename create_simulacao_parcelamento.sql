-- =============================================================
-- MODULO: SIMULADOR / GERADOR DE PARCELAMENTO
-- SCHEMA: IMOVEIS
-- OBJETIVO:
--   Persistir simulacoes de venda direta de imoveis com
--   parcelamento simples, reajuste anual e acrescimo percentual total MVP.
-- =============================================================

-- =============================================================
-- TABELA PRINCIPAL
-- =============================================================
CREATE TABLE imoveis.simulacao_parcelamento (
    id_simulacao                  NUMBER(15)    NOT NULL,
    id_imovel                     NUMBER(15),
    valor_imovel                  NUMBER(15,2)  NOT NULL,
    valor_entrada                 NUMBER(15,2)  DEFAULT 0 NOT NULL,
    valor_veiculo                 NUMBER(15,2)  DEFAULT 0 NOT NULL,
    valor_outros_abatimentos      NUMBER(15,2)  DEFAULT 0 NOT NULL,
    saldo_parcelado               NUMBER(15,2)  NOT NULL,
    qtd_parcelas                  NUMBER(5)     NOT NULL,
    tipo_calculo                  VARCHAR2(30)  NOT NULL,
    percentual_reajuste_anual     NUMBER(9,4)   DEFAULT 0 NOT NULL,
    percentual_juros_mensal       NUMBER(9,4)   DEFAULT 0 NOT NULL,
    data_primeira_parcela         DATE          NOT NULL,
    observacao                    CLOB,
    data_criacao                  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    usuario_criacao               VARCHAR2(100) NOT NULL,
    data_atualizacao              TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    usuario_atualizacao           VARCHAR2(100),
    observacao_sistema            VARCHAR2(500),
    CONSTRAINT pk_simulacao_parcelamento PRIMARY KEY (id_simulacao),
    CONSTRAINT fk_simulacao_parcelamento_imovel
        FOREIGN KEY (id_imovel)
        REFERENCES imoveis.imoveis (id_imovel),
    CONSTRAINT ck_simulacao_tipo_calculo
        CHECK (tipo_calculo IN ('FIXA', 'REAJUSTE_ANUAL', 'ACRESCIMO_TOTAL')),
    CONSTRAINT ck_simulacao_valores
        CHECK (
            valor_imovel >= 0
            AND valor_entrada >= 0
            AND valor_veiculo >= 0
            AND valor_outros_abatimentos >= 0
            AND saldo_parcelado >= 0
            AND qtd_parcelas > 0
            AND percentual_reajuste_anual >= 0
            AND percentual_juros_mensal >= 0
        )
);

COMMENT ON TABLE imoveis.simulacao_parcelamento IS 'Cabecalho das simulacoes de parcelamento para venda direta.';
COMMENT ON COLUMN imoveis.simulacao_parcelamento.tipo_calculo IS 'Valores permitidos: FIXA, REAJUSTE_ANUAL, ACRESCIMO_TOTAL.';
COMMENT ON COLUMN imoveis.simulacao_parcelamento.observacao_sistema IS 'Mensagem interna de apoio, como aviso de simulacao estimada.';

-- =============================================================
-- TABELA DE PARCELAS
-- =============================================================
CREATE TABLE imoveis.simulacao_parcelamento_item (
    id_simulacao_item             NUMBER(15)    NOT NULL,
    id_simulacao                  NUMBER(15)    NOT NULL,
    numero_parcela                NUMBER(5)     NOT NULL,
    data_vencimento               DATE          NOT NULL,
    valor_base                    NUMBER(15,2)  NOT NULL,
    percentual_aplicado           NUMBER(9,4)   DEFAULT 0 NOT NULL,
    valor_parcela                 NUMBER(15,2)  NOT NULL,
    saldo_restante                NUMBER(15,2)  DEFAULT 0 NOT NULL,
    tipo_calculo                  VARCHAR2(30)  NOT NULL,
    data_criacao                  TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_simulacao_parcelamento_item PRIMARY KEY (id_simulacao_item),
    CONSTRAINT fk_simulacao_item_simulacao
        FOREIGN KEY (id_simulacao)
        REFERENCES imoveis.simulacao_parcelamento (id_simulacao)
        ON DELETE CASCADE,
    CONSTRAINT uk_simulacao_item_numero
        UNIQUE (id_simulacao, numero_parcela),
    CONSTRAINT ck_simulacao_item_tipo
        CHECK (tipo_calculo IN ('FIXA', 'REAJUSTE_ANUAL', 'ACRESCIMO_TOTAL'))
);

COMMENT ON TABLE imoveis.simulacao_parcelamento_item IS 'Parcelas estimadas geradas a partir da simulacao.';

-- =============================================================
-- SEQUENCES
-- =============================================================
CREATE SEQUENCE imoveis.seq_simulacao_parcelamento START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE imoveis.seq_simulacao_parcelamento_item START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- =============================================================
-- TRIGGERS DE CHAVE PRIMARIA E AUDITORIA BASICA
-- =============================================================
CREATE OR REPLACE TRIGGER imoveis.trg_bi_simulacao_parcelamento
BEFORE INSERT OR UPDATE ON imoveis.simulacao_parcelamento
FOR EACH ROW
DECLARE
    v_id_simulacao NUMBER;
BEGIN
    IF INSERTING AND :NEW.id_simulacao IS NULL THEN
        SELECT imoveis.seq_simulacao_parcelamento.NEXTVAL
          INTO v_id_simulacao
          FROM dual;

        :NEW.id_simulacao := v_id_simulacao;
    END IF;

    IF INSERTING THEN
        :NEW.data_criacao := NVL(:NEW.data_criacao, SYSTIMESTAMP);
    END IF;

    :NEW.data_atualizacao := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER imoveis.trg_bi_simulacao_parcelamento_item
BEFORE INSERT ON imoveis.simulacao_parcelamento_item
FOR EACH ROW
DECLARE
    v_id_simulacao_item NUMBER;
BEGIN
    IF :NEW.id_simulacao_item IS NULL THEN
        SELECT imoveis.seq_simulacao_parcelamento_item.NEXTVAL
          INTO v_id_simulacao_item
          FROM dual;

        :NEW.id_simulacao_item := v_id_simulacao_item;
    END IF;
END;
/

-- =============================================================
-- INDICES
-- =============================================================
CREATE INDEX imoveis.idx_simulacao_parcelamento_imovel ON imoveis.simulacao_parcelamento (id_imovel);
CREATE INDEX imoveis.idx_simulacao_parcelamento_tipo ON imoveis.simulacao_parcelamento (tipo_calculo);
CREATE INDEX imoveis.idx_simulacao_parcelamento_criacao ON imoveis.simulacao_parcelamento (data_criacao);
CREATE INDEX imoveis.idx_simulacao_parcelamento_usuario ON imoveis.simulacao_parcelamento (usuario_criacao);
CREATE INDEX imoveis.idx_simulacao_item_simulacao ON imoveis.simulacao_parcelamento_item (id_simulacao);
CREATE INDEX imoveis.idx_simulacao_item_vencimento ON imoveis.simulacao_parcelamento_item (id_simulacao, data_vencimento);

-- =============================================================
-- PACKAGE SPEC
-- =============================================================
CREATE OR REPLACE PACKAGE imoveis.pkg_simulacao_parcelamento AS
    c_tipo_fixa            CONSTANT VARCHAR2(30) := 'FIXA';
    c_tipo_reajuste_anual  CONSTANT VARCHAR2(30) := 'REAJUSTE_ANUAL';
    c_tipo_acrescimo_total CONSTANT VARCHAR2(30) := 'ACRESCIMO_TOTAL';

    FUNCTION fn_round_money(p_valor IN NUMBER) RETURN NUMBER;

    FUNCTION fn_validar_tipo(p_tipo_calculo IN VARCHAR2) RETURN VARCHAR2;

    FUNCTION fn_calcular_saldo(
        p_valor_imovel             IN NUMBER,
        p_valor_entrada            IN NUMBER,
        p_valor_veiculo            IN NUMBER,
        p_valor_outros_abatimentos IN NUMBER
    ) RETURN NUMBER;

    PROCEDURE prc_gerar_simulacao(
        p_id_simulacao                 IN OUT NUMBER,
        p_id_imovel                    IN NUMBER,
        p_valor_imovel                 IN NUMBER,
        p_valor_entrada                IN NUMBER,
        p_valor_veiculo                IN NUMBER,
        p_valor_outros_abatimentos     IN NUMBER,
        p_qtd_parcelas                 IN NUMBER,
        p_tipo_calculo                 IN VARCHAR2,
        p_percentual_reajuste_anual    IN NUMBER DEFAULT 0,
        p_percentual_juros_mensal      IN NUMBER DEFAULT 0,
        p_data_primeira_parcela        IN DATE,
        p_observacao                   IN CLOB DEFAULT NULL,
        p_usuario_criacao              IN VARCHAR2
    );

    PROCEDURE prc_gerar_parcelas(p_id_simulacao IN NUMBER);

    PROCEDURE prc_excluir_simulacao(p_id_simulacao IN NUMBER);

    FUNCTION fn_consultar_simulacoes(
        p_id_simulacao   IN NUMBER DEFAULT NULL,
        p_id_imovel      IN NUMBER DEFAULT NULL,
        p_usuario_criacao IN VARCHAR2 DEFAULT NULL
    ) RETURN SYS_REFCURSOR;

    FUNCTION fn_consultar_parcelas(p_id_simulacao IN NUMBER) RETURN SYS_REFCURSOR;
END pkg_simulacao_parcelamento;
/

-- =============================================================
-- PACKAGE BODY
-- =============================================================
CREATE OR REPLACE PACKAGE BODY imoveis.pkg_simulacao_parcelamento AS
    FUNCTION fn_round_money(p_valor IN NUMBER) RETURN NUMBER IS
    BEGIN
        RETURN ROUND(NVL(p_valor, 0), 2);
    END fn_round_money;

    FUNCTION fn_validar_tipo(p_tipo_calculo IN VARCHAR2) RETURN VARCHAR2 IS
        v_tipo VARCHAR2(30) := UPPER(TRIM(p_tipo_calculo));
    BEGIN
        IF v_tipo IS NULL THEN
            RAISE_APPLICATION_ERROR(-20001, 'Tipo de calculo invalido para simulacao.');
        END IF;

        IF v_tipo <> c_tipo_fixa
           AND v_tipo <> c_tipo_reajuste_anual
           AND v_tipo <> c_tipo_acrescimo_total THEN
            RAISE_APPLICATION_ERROR(-20001, 'Tipo de calculo invalido para simulacao.');
        END IF;
        RETURN v_tipo;
    END fn_validar_tipo;

    FUNCTION fn_calcular_saldo(
        p_valor_imovel             IN NUMBER,
        p_valor_entrada            IN NUMBER,
        p_valor_veiculo            IN NUMBER,
        p_valor_outros_abatimentos IN NUMBER
    ) RETURN NUMBER IS
        v_saldo NUMBER;
    BEGIN
        v_saldo := NVL(p_valor_imovel, 0)
                 - NVL(p_valor_entrada, 0)
                 - NVL(p_valor_veiculo, 0)
                 - NVL(p_valor_outros_abatimentos, 0);

        RETURN fn_round_money(GREATEST(v_saldo, 0));
    END fn_calcular_saldo;

    PROCEDURE prc_gerar_simulacao(
        p_id_simulacao                 IN OUT NUMBER,
        p_id_imovel                    IN NUMBER,
        p_valor_imovel                 IN NUMBER,
        p_valor_entrada                IN NUMBER,
        p_valor_veiculo                IN NUMBER,
        p_valor_outros_abatimentos     IN NUMBER,
        p_qtd_parcelas                 IN NUMBER,
        p_tipo_calculo                 IN VARCHAR2,
        p_percentual_reajuste_anual    IN NUMBER,
        p_percentual_juros_mensal      IN NUMBER,
        p_data_primeira_parcela        IN DATE,
        p_observacao                   IN CLOB,
        p_usuario_criacao              IN VARCHAR2
    ) IS
        v_saldo        NUMBER;
        v_tipo         VARCHAR2(30);
        v_count        NUMBER;
        v_observacao_sistema VARCHAR2(500);
    BEGIN
        v_tipo := fn_validar_tipo(p_tipo_calculo);
        v_saldo := fn_calcular_saldo(
            p_valor_imovel,
            p_valor_entrada,
            p_valor_veiculo,
            p_valor_outros_abatimentos
        );

        IF NVL(p_valor_imovel, 0) <= 0 THEN
            RAISE_APPLICATION_ERROR(-20002, 'Valor do imovel deve ser maior que zero.');
        END IF;

        IF NVL(p_qtd_parcelas, 0) <= 0 THEN
            RAISE_APPLICATION_ERROR(-20003, 'Quantidade de parcelas deve ser maior que zero.');
        END IF;

        IF p_data_primeira_parcela IS NULL THEN
            RAISE_APPLICATION_ERROR(-20004, 'Data da primeira parcela e obrigatoria.');
        END IF;

        IF v_saldo <= 0 THEN
            RAISE_APPLICATION_ERROR(-20005, 'Saldo parcelado deve ser maior que zero.');
        END IF;

        IF v_tipo = c_tipo_reajuste_anual AND NVL(p_qtd_parcelas, 0) <= 12 THEN
            RAISE_APPLICATION_ERROR(-20010, 'Reajuste anual nao gera correcao para parcelamentos de ate 12 meses. Para prazos curtos, utilize Parcela Fixa ou Acrescimo Percentual.');
        END IF;

        IF TRIM(p_usuario_criacao) IS NULL THEN
            RAISE_APPLICATION_ERROR(-20006, 'Usuario de criacao e obrigatorio.');
        END IF;

        v_observacao_sistema :=
            'Simulacao estimada. Saldo restante apenas informativo e sem amortizacao financeira complexa.';

        IF p_id_simulacao IS NULL THEN
            INSERT INTO imoveis.simulacao_parcelamento (
                id_simulacao,
                id_imovel,
                valor_imovel,
                valor_entrada,
                valor_veiculo,
                valor_outros_abatimentos,
                saldo_parcelado,
                qtd_parcelas,
                tipo_calculo,
                percentual_reajuste_anual,
                percentual_juros_mensal,
                data_primeira_parcela,
                observacao,
                usuario_criacao,
                usuario_atualizacao,
                observacao_sistema
            ) VALUES (
                imoveis.seq_simulacao_parcelamento.NEXTVAL,
                p_id_imovel,
                ROUND(NVL(p_valor_imovel, 0), 2),
                ROUND(NVL(p_valor_entrada, 0), 2),
                ROUND(NVL(p_valor_veiculo, 0), 2),
                ROUND(NVL(p_valor_outros_abatimentos, 0), 2),
                v_saldo,
                p_qtd_parcelas,
                v_tipo,
                NVL(p_percentual_reajuste_anual, 0),
                NVL(p_percentual_juros_mensal, 0),
                p_data_primeira_parcela,
                p_observacao,
                TRIM(p_usuario_criacao),
                TRIM(p_usuario_criacao),
                v_observacao_sistema
            )
            RETURNING id_simulacao INTO p_id_simulacao;
        ELSE
            SELECT COUNT(*)
              INTO v_count
              FROM imoveis.simulacao_parcelamento
             WHERE id_simulacao = p_id_simulacao;

            IF v_count = 0 THEN
                RAISE_APPLICATION_ERROR(-20007, 'Simulacao informada nao encontrada para atualizacao.');
            END IF;

            UPDATE imoveis.simulacao_parcelamento
               SET id_imovel                 = p_id_imovel,
                   valor_imovel               = ROUND(NVL(p_valor_imovel, 0), 2),
                   valor_entrada              = ROUND(NVL(p_valor_entrada, 0), 2),
                   valor_veiculo              = ROUND(NVL(p_valor_veiculo, 0), 2),
                   valor_outros_abatimentos   = ROUND(NVL(p_valor_outros_abatimentos, 0), 2),
                   saldo_parcelado            = v_saldo,
                   qtd_parcelas               = p_qtd_parcelas,
                   tipo_calculo               = v_tipo,
                   percentual_reajuste_anual  = NVL(p_percentual_reajuste_anual, 0),
                   percentual_juros_mensal    = NVL(p_percentual_juros_mensal, 0),
                   data_primeira_parcela      = p_data_primeira_parcela,
                   observacao                 = p_observacao,
                   usuario_atualizacao        = TRIM(p_usuario_criacao),
                   observacao_sistema         = v_observacao_sistema
             WHERE id_simulacao = p_id_simulacao;
        END IF;

        prc_gerar_parcelas(p_id_simulacao => p_id_simulacao);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE_APPLICATION_ERROR(-20050, 'Erro ao gerar simulacao: ' || SQLERRM);
    END prc_gerar_simulacao;

    PROCEDURE prc_gerar_parcelas(p_id_simulacao IN NUMBER) IS
        v_sim simulacao_parcelamento%ROWTYPE;
        v_valor_base         NUMBER;
        v_diferenca_base     NUMBER;
        v_percentual         NUMBER;
        v_valor_parcela      NUMBER;
        v_saldo_restante     NUMBER;
        v_saldo_corrigido    NUMBER;
        v_amortizado_base    NUMBER := 0;
        v_fator              NUMBER := 1;
    BEGIN
        SELECT *
          INTO v_sim
          FROM imoveis.simulacao_parcelamento
         WHERE id_simulacao = p_id_simulacao;

        DELETE FROM imoveis.simulacao_parcelamento_item
         WHERE id_simulacao = p_id_simulacao;

        v_saldo_corrigido := v_sim.saldo_parcelado;

        IF v_sim.tipo_calculo = c_tipo_acrescimo_total THEN
            v_saldo_corrigido := fn_round_money(v_sim.saldo_parcelado * (1 + (NVL(v_sim.percentual_juros_mensal, 0) / 100)));
        END IF;

        v_valor_base := fn_round_money(v_saldo_corrigido / v_sim.qtd_parcelas);
        v_diferenca_base := fn_round_money(v_saldo_corrigido - fn_round_money(v_valor_base * v_sim.qtd_parcelas));

        FOR i IN 1 .. v_sim.qtd_parcelas LOOP
            v_percentual := 0;
            v_fator := 1;

            IF v_sim.tipo_calculo = c_tipo_reajuste_anual THEN
                v_fator := POWER(1 + (NVL(v_sim.percentual_reajuste_anual, 0) / 100), FLOOR((i - 1) / 12));
                v_percentual := fn_round_money((v_fator - 1) * 100);
            ELSIF v_sim.tipo_calculo = c_tipo_acrescimo_total THEN
                v_fator := 1;
                v_percentual := NVL(v_sim.percentual_juros_mensal, 0);
            END IF;

            v_valor_parcela := fn_round_money(v_valor_base * v_fator);
            v_amortizado_base := fn_round_money(v_amortizado_base + fn_round_money(v_sim.saldo_parcelado / v_sim.qtd_parcelas));
            v_saldo_restante := fn_round_money(GREATEST(v_sim.saldo_parcelado - v_amortizado_base, 0));

            INSERT INTO imoveis.simulacao_parcelamento_item (
                id_simulacao_item,
                id_simulacao,
                numero_parcela,
                data_vencimento,
                valor_base,
                percentual_aplicado,
                valor_parcela,
                saldo_restante,
                tipo_calculo
            ) VALUES (
                imoveis.seq_simulacao_parcelamento_item.NEXTVAL,
                p_id_simulacao,
                i,
                ADD_MONTHS(v_sim.data_primeira_parcela, i - 1),
                v_valor_base,
                v_percentual,
                v_valor_parcela,
                v_saldo_restante,
                v_sim.tipo_calculo
            );
        END LOOP;

        UPDATE imoveis.simulacao_parcelamento_item
           SET valor_base = ROUND(NVL(valor_base + v_diferenca_base, 0), 2),
               valor_parcela =
                   CASE
                       WHEN v_sim.tipo_calculo = c_tipo_fixa
                           THEN ROUND(NVL(valor_parcela + v_diferenca_base, 0), 2)
                       WHEN v_sim.tipo_calculo = c_tipo_reajuste_anual
                           THEN ROUND(NVL((valor_base + v_diferenca_base) * POWER(1 + (NVL(v_sim.percentual_reajuste_anual, 0) / 100), FLOOR((numero_parcela - 1) / 12)), 0), 2)
                       WHEN v_sim.tipo_calculo = c_tipo_acrescimo_total
                           THEN ROUND(
                               NVL(
                                   (
                                       (v_sim.saldo_parcelado * (1 + (NVL(v_sim.percentual_juros_mensal, 0) / 100)))
                                       - (
                                           SELECT NVL(SUM(valor_parcela), 0)
                                             FROM imoveis.simulacao_parcelamento_item
                                            WHERE id_simulacao = p_id_simulacao
                                              AND numero_parcela < v_sim.qtd_parcelas
                                       )
                                   ),
                                   0
                               ),
                               2
                           )
                       ELSE valor_parcela
                   END,
               saldo_restante = 0
         WHERE id_simulacao = p_id_simulacao
           AND numero_parcela = v_sim.qtd_parcelas;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20008, 'Simulacao nao encontrada para gerar parcelas.');
        WHEN OTHERS THEN
            RAISE_APPLICATION_ERROR(-20051, 'Erro ao gerar parcelas da simulacao: ' || SQLERRM);
    END prc_gerar_parcelas;

    PROCEDURE prc_excluir_simulacao(p_id_simulacao IN NUMBER) IS
    BEGIN
        DELETE FROM imoveis.simulacao_parcelamento
         WHERE id_simulacao = p_id_simulacao;

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20009, 'Simulacao nao encontrada para exclusao.');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE_APPLICATION_ERROR(-20052, 'Erro ao excluir simulacao: ' || SQLERRM);
    END prc_excluir_simulacao;

    FUNCTION fn_consultar_simulacoes(
        p_id_simulacao   IN NUMBER DEFAULT NULL,
        p_id_imovel      IN NUMBER DEFAULT NULL,
        p_usuario_criacao IN VARCHAR2 DEFAULT NULL
    ) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT sp.id_simulacao,
                   sp.id_imovel,
                   sp.valor_imovel,
                   sp.valor_entrada,
                   sp.valor_veiculo,
                   sp.valor_outros_abatimentos,
                   sp.saldo_parcelado,
                   sp.qtd_parcelas,
                   sp.tipo_calculo,
                   sp.percentual_reajuste_anual,
                   sp.percentual_juros_mensal,
                   sp.data_primeira_parcela,
                   sp.observacao,
                   sp.observacao_sistema,
                   sp.data_criacao,
                   sp.usuario_criacao,
                   sp.data_atualizacao,
                   sp.usuario_atualizacao,
                   (SELECT SUM(si.valor_parcela)
                      FROM imoveis.simulacao_parcelamento_item si
                     WHERE si.id_simulacao = sp.id_simulacao) AS total_estimado_parcelas
              FROM imoveis.simulacao_parcelamento sp
             WHERE (p_id_simulacao IS NULL OR sp.id_simulacao = p_id_simulacao)
               AND (p_id_imovel IS NULL OR sp.id_imovel = p_id_imovel)
               AND (p_usuario_criacao IS NULL OR UPPER(sp.usuario_criacao) = UPPER(TRIM(p_usuario_criacao)))
             ORDER BY sp.id_simulacao DESC;

        RETURN v_cursor;
    END fn_consultar_simulacoes;

    FUNCTION fn_consultar_parcelas(p_id_simulacao IN NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT id_simulacao_item,
                   id_simulacao,
                   numero_parcela,
                   data_vencimento,
                   valor_base,
                   percentual_aplicado,
                   valor_parcela,
                   saldo_restante,
                   tipo_calculo,
                   data_criacao
              FROM imoveis.simulacao_parcelamento_item
             WHERE id_simulacao = p_id_simulacao
             ORDER BY numero_parcela;

        RETURN v_cursor;
    END fn_consultar_parcelas;
END pkg_simulacao_parcelamento;
/

-- =============================================================
-- EXEMPLOS DE USO
-- =============================================================
-- DECLARE
--   v_id_simulacao NUMBER;
-- BEGIN
--   imoveis.pkg_simulacao_parcelamento.prc_gerar_simulacao(
--       p_id_simulacao              => v_id_simulacao,
--       p_id_imovel                 => 10,
--       p_valor_imovel              => 280000,
--       p_valor_entrada             => 35000,
--       p_valor_veiculo             => 20000,
--       p_valor_outros_abatimentos  => 5000,
--       p_qtd_parcelas              => 36,
--       p_tipo_calculo              => 'REAJUSTE_ANUAL',
--       p_percentual_reajuste_anual => 8,
--       p_percentual_juros_mensal   => 0,
--       p_data_primeira_parcela     => DATE '2026-06-10',
--       p_observacao                => 'Simulacao estimada para imovel sem escritura.',
--       p_usuario_criacao           => 'admin'
--   );
-- END;
-- /

-- SELECT *
--   FROM TABLE(
--     CAST(NULL AS SYS.ODCIVARCHAR2LIST)
--   );

-- Consulta de cabecalho:
-- VAR rc REFCURSOR;
-- EXEC :rc := imoveis.pkg_simulacao_parcelamento.fn_consultar_simulacoes(p_id_simulacao => 1);
-- PRINT rc;

-- Consulta de parcelas:
-- VAR rc2 REFCURSOR;
-- EXEC :rc2 := imoveis.pkg_simulacao_parcelamento.fn_consultar_parcelas(1);
-- PRINT rc2;
