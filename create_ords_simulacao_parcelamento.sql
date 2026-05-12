-- =============================================================
-- ORDS - MODULO DE SIMULACAO DE PARCELAMENTO
-- Schema: IMOVEIS
-- Padrao adotado:
--   - consultas com ORDS.source_type_collection_feed
--   - escritas e calculo com ORDS.source_type_plsql
--   - sem uso de bind :status
-- =============================================================

BEGIN ORDS.DELETE_MODULE(p_module_name => 'simulacoes'); EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_simulacoes'); EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- =============================================================
-- MODULO: simulacoes
-- Endpoints:
--   GET /ords/imoveis/simulacoes/
--   GET /ords/imoveis/simulacoes/:id
--   GET /ords/imoveis/simulacoes/:id/parcelas
-- =============================================================
BEGIN
  ORDS.DEFINE_MODULE(
    p_module_name    => 'simulacoes',
    p_base_path      => '/simulacoes/',
    p_items_per_page => 100,
    p_status         => 'PUBLISHED',
    p_comments       => 'Consulta de simulacoes de parcelamento'
  );

  ORDS.DEFINE_TEMPLATE(
    p_module_name => 'simulacoes',
    p_pattern     => '.'
  );

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'simulacoes',
    p_pattern        => '.',
    p_method         => 'GET',
    p_source_type    => ORDS.source_type_collection_feed,
    p_items_per_page => 100,
    p_comments       => 'Lista simulacoes cadastradas',
    p_source         => q'~
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
       ORDER BY sp.id_simulacao DESC
    ~'
  );

  ORDS.DEFINE_TEMPLATE(
    p_module_name => 'simulacoes',
    p_pattern     => ':id'
  );

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'simulacoes',
    p_pattern        => ':id',
    p_method         => 'GET',
    p_source_type    => ORDS.source_type_collection_feed,
    p_items_per_page => 1,
    p_comments       => 'Retorna cabecalho da simulacao por ID',
    p_source         => q'~
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
       WHERE sp.id_simulacao = :id
    ~'
  );

  ORDS.DEFINE_TEMPLATE(
    p_module_name => 'simulacoes',
    p_pattern     => ':id/parcelas'
  );

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'simulacoes',
    p_pattern        => ':id/parcelas',
    p_method         => 'GET',
    p_source_type    => ORDS.source_type_collection_feed,
    p_items_per_page => 500,
    p_comments       => 'Retorna parcelas da simulacao informada',
    p_source         => q'~
      SELECT si.id_simulacao_item,
             si.id_simulacao,
             si.numero_parcela,
             si.data_vencimento,
             si.valor_base,
             si.percentual_aplicado,
             si.valor_parcela,
             si.saldo_restante,
             si.tipo_calculo,
             si.data_criacao
        FROM imoveis.simulacao_parcelamento_item si
       WHERE si.id_simulacao = :id
       ORDER BY si.numero_parcela
    ~'
  );

  COMMIT;
END;
/

-- =============================================================
-- MODULO: admin_simulacoes
-- Endpoints:
--   POST /ords/imoveis/admin/simulacoes
--   POST /ords/imoveis/admin/simulacoes/calcular
--   POST /ords/imoveis/admin/simulacoes/excluir/:id
-- =============================================================
BEGIN
  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_simulacoes',
    p_base_path      => '/admin/simulacoes/',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED',
    p_comments       => 'Escrita administrativa das simulacoes'
  );

  ORDS.DEFINE_TEMPLATE(
    p_module_name => 'admin_simulacoes',
    p_pattern     => '.'
  );

  ORDS.DEFINE_HANDLER(
    p_module_name   => 'admin_simulacoes',
    p_pattern       => '.',
    p_method        => 'POST',
    p_source_type   => ORDS.source_type_plsql,
    p_mimes_allowed => '',
    p_source        => q'~
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
        v_id_simulacao NUMBER;
        v_id_simulacao_original NUMBER;
        v_id_imovel NUMBER;
        v_valor_imovel NUMBER;
        v_valor_entrada NUMBER;
        v_valor_veiculo NUMBER;
        v_valor_outros NUMBER;
        v_qtd_parcelas NUMBER;
        v_tipo_calculo VARCHAR2(30);
        v_percentual_reajuste NUMBER;
        v_percentual_juros NUMBER;
        v_data_primeira DATE;
        v_observacao CLOB;
        v_usuario_criacao VARCHAR2(100);
      BEGIN
        v_body := :body_text;

        v_token := COALESCE(
          JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR)
        );
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          OWA_UTIL.status_line(401, 'Unauthorized', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
          RETURN;
        END IF;

        v_id_simulacao := COALESCE(
          JSON_VALUE(v_body, '$.idSimulacao' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.id_simulacao' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID_SIMULACAO' RETURNING NUMBER NULL ON ERROR)
        );
        v_id_simulacao_original := v_id_simulacao;

        v_id_imovel := COALESCE(
          JSON_VALUE(v_body, '$.idImovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.id_imovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID_IMOVEL' RETURNING NUMBER NULL ON ERROR)
        );
        v_valor_imovel := COALESCE(
          JSON_VALUE(v_body, '$.valorImovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_imovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_IMOVEL' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_valor_entrada := COALESCE(
          JSON_VALUE(v_body, '$.valorEntrada' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_entrada' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_ENTRADA' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_valor_veiculo := COALESCE(
          JSON_VALUE(v_body, '$.valorVeiculo' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_veiculo' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_VEICULO' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_valor_outros := COALESCE(
          JSON_VALUE(v_body, '$.valorOutrosAbatimentos' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_outros_abatimentos' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_OUTROS_ABATIMENTOS' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_qtd_parcelas := COALESCE(
          JSON_VALUE(v_body, '$.qtdParcelas' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.qtd_parcelas' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.QTD_PARCELAS' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_tipo_calculo := COALESCE(
          JSON_VALUE(v_body, '$.tipoCalculo' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.tipo_calculo' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TIPO_CALCULO' RETURNING VARCHAR2(30) NULL ON ERROR)
        );
        v_percentual_reajuste := COALESCE(
          JSON_VALUE(v_body, '$.percentualReajusteAnual' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentual_reajuste_anual' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.PERCENTUAL_REAJUSTE_ANUAL' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_percentual_juros := COALESCE(
          JSON_VALUE(v_body, '$.percentualAcrescimoTotal' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentualJurosMensal' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentual_acrescimo_total' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentual_juros_mensal' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.PERCENTUAL_ACRESCIMO_TOTAL' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.PERCENTUAL_JUROS_MENSAL' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_data_primeira := TO_DATE(
          COALESCE(
            JSON_VALUE(v_body, '$.dataPrimeiraParcela' RETURNING VARCHAR2(10) NULL ON ERROR),
            JSON_VALUE(v_body, '$.data_primeira_parcela' RETURNING VARCHAR2(10) NULL ON ERROR),
            JSON_VALUE(v_body, '$.DATA_PRIMEIRA_PARCELA' RETURNING VARCHAR2(10) NULL ON ERROR)
          ),
          'YYYY-MM-DD'
        );
        v_observacao := COALESCE(
          JSON_VALUE(v_body, '$.observacao' RETURNING VARCHAR2(32767) NULL ON ERROR),
          JSON_VALUE(v_body, '$.OBSERVACAO' RETURNING VARCHAR2(32767) NULL ON ERROR)
        );
        v_usuario_criacao := COALESCE(
          JSON_VALUE(v_body, '$.usuarioCriacao' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.usuario_criacao' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.USUARIO_CRIACAO' RETURNING VARCHAR2(100) NULL ON ERROR),
          'admin'
        );

        pkg_simulacao_parcelamento.prc_gerar_simulacao(
          p_id_simulacao              => v_id_simulacao,
          p_id_imovel                 => v_id_imovel,
          p_valor_imovel              => v_valor_imovel,
          p_valor_entrada             => v_valor_entrada,
          p_valor_veiculo             => v_valor_veiculo,
          p_valor_outros_abatimentos  => v_valor_outros,
          p_qtd_parcelas              => v_qtd_parcelas,
          p_tipo_calculo              => v_tipo_calculo,
          p_percentual_reajuste_anual => v_percentual_reajuste,
          p_percentual_juros_mensal   => v_percentual_juros,
          p_data_primeira_parcela     => v_data_primeira,
          p_observacao                => v_observacao,
          p_usuario_criacao           => v_usuario_criacao
        );

        COMMIT;

        IF v_id_simulacao_original IS NULL THEN
          OWA_UTIL.status_line(201, 'Created', FALSE);
        ELSE
          OWA_UTIL.status_line(200, 'OK', FALSE);
        END IF;

        OWA_UTIL.mime_header('application/json', FALSE);
        OWA_UTIL.http_header_close;
        HTP.p('{"id_simulacao":' || v_id_simulacao || '}');
      EXCEPTION
        WHEN OTHERS THEN
          ROLLBACK;
          OWA_UTIL.status_line(400, 'Bad Request', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"' || REPLACE(SQLERRM, '"', '\"') || '"}');
      END;
    ~'
  );

  ORDS.DEFINE_TEMPLATE(
    p_module_name => 'admin_simulacoes',
    p_pattern     => 'excluir/:id'
  );

  ORDS.DEFINE_HANDLER(
    p_module_name   => 'admin_simulacoes',
    p_pattern       => 'excluir/:id',
    p_method        => 'POST',
    p_source_type   => ORDS.source_type_plsql,
    p_mimes_allowed => '',
    p_source        => q'~
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
        v_id_simulacao NUMBER;
      BEGIN
        v_body := :body_text;
        v_id_simulacao := TO_NUMBER(:id);

        v_token := COALESCE(
          JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR)
        );
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          OWA_UTIL.status_line(401, 'Unauthorized', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
          RETURN;
        END IF;

        pkg_simulacao_parcelamento.prc_excluir_simulacao(v_id_simulacao);
        COMMIT;

        OWA_UTIL.status_line(200, 'OK', FALSE);
        OWA_UTIL.mime_header('application/json', FALSE);
        OWA_UTIL.http_header_close;
        HTP.p('{"deleted":1}');
      EXCEPTION
        WHEN OTHERS THEN
          ROLLBACK;
          OWA_UTIL.status_line(400, 'Bad Request', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"' || REPLACE(SQLERRM, '"', '\"') || '"}');
      END;
    ~'
  );

  ORDS.DEFINE_TEMPLATE(
    p_module_name => 'admin_simulacoes',
    p_pattern     => 'calcular'
  );

  ORDS.DEFINE_HANDLER(
    p_module_name   => 'admin_simulacoes',
    p_pattern       => 'calcular',
    p_method        => 'POST',
    p_source_type   => ORDS.source_type_plsql,
    p_mimes_allowed => '',
    p_source        => q'~
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
        v_id_imovel NUMBER;
        v_valor_imovel NUMBER;
        v_valor_entrada NUMBER;
        v_valor_veiculo NUMBER;
        v_valor_outros NUMBER;
        v_saldo NUMBER;
        v_saldo_corrigido NUMBER;
        v_qtd_parcelas NUMBER;
        v_tipo_calculo VARCHAR2(30);
        v_percentual_reajuste NUMBER;
        v_percentual_juros NUMBER;
        v_data_primeira DATE;
        v_observacao VARCHAR2(32767);
        v_parcelas CLOB;
        v_total_parcelas NUMBER := 0;
        v_valor_base NUMBER;
        v_diferenca NUMBER;
        v_valor_base_atual NUMBER;
        v_valor_parcela NUMBER;
        v_percentual_aplicado NUMBER;
        v_saldo_restante NUMBER;
        v_amortizado_base NUMBER := 0;
        v_fator NUMBER := 1;

        FUNCTION esc(p_text IN VARCHAR2) RETURN VARCHAR2 IS
        BEGIN
          RETURN REPLACE(REPLACE(REPLACE(REPLACE(NVL(p_text, ''), '\', '\\'), '"', '\"'), CHR(10), '\n'), CHR(13), '');
        END;

        FUNCTION num(p_num IN NUMBER) RETURN VARCHAR2 IS
        BEGIN
          RETURN TO_CHAR(NVL(p_num, 0), 'FM9999999999999990D9999', 'NLS_NUMERIC_CHARACTERS=.,');
        END;
      BEGIN
        v_body := :body_text;

        v_token := COALESCE(
          JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR)
        );
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          OWA_UTIL.status_line(401, 'Unauthorized', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
          RETURN;
        END IF;

        v_id_imovel := COALESCE(
          JSON_VALUE(v_body, '$.idImovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.id_imovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID_IMOVEL' RETURNING NUMBER NULL ON ERROR)
        );
        v_valor_imovel := COALESCE(
          JSON_VALUE(v_body, '$.valorImovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_imovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_IMOVEL' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_valor_entrada := COALESCE(
          JSON_VALUE(v_body, '$.valorEntrada' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_entrada' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_ENTRADA' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_valor_veiculo := COALESCE(
          JSON_VALUE(v_body, '$.valorVeiculo' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_veiculo' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_VEICULO' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_valor_outros := COALESCE(
          JSON_VALUE(v_body, '$.valorOutrosAbatimentos' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.valor_outros_abatimentos' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.VALOR_OUTROS_ABATIMENTOS' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_qtd_parcelas := COALESCE(
          JSON_VALUE(v_body, '$.qtdParcelas' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.qtd_parcelas' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.QTD_PARCELAS' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_tipo_calculo := UPPER(COALESCE(
          JSON_VALUE(v_body, '$.tipoCalculo' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.tipo_calculo' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TIPO_CALCULO' RETURNING VARCHAR2(30) NULL ON ERROR),
          'FIXA'
        ));
        v_percentual_reajuste := COALESCE(
          JSON_VALUE(v_body, '$.percentualReajusteAnual' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentual_reajuste_anual' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.PERCENTUAL_REAJUSTE_ANUAL' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_percentual_juros := COALESCE(
          JSON_VALUE(v_body, '$.percentualAcrescimoTotal' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentualJurosMensal' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentual_acrescimo_total' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.percentual_juros_mensal' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.PERCENTUAL_ACRESCIMO_TOTAL' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.PERCENTUAL_JUROS_MENSAL' RETURNING NUMBER NULL ON ERROR),
          0
        );
        v_data_primeira := TO_DATE(
          COALESCE(
            JSON_VALUE(v_body, '$.dataPrimeiraParcela' RETURNING VARCHAR2(10) NULL ON ERROR),
            JSON_VALUE(v_body, '$.data_primeira_parcela' RETURNING VARCHAR2(10) NULL ON ERROR),
            JSON_VALUE(v_body, '$.DATA_PRIMEIRA_PARCELA' RETURNING VARCHAR2(10) NULL ON ERROR)
          ),
          'YYYY-MM-DD'
        );
        v_observacao := COALESCE(
          JSON_VALUE(v_body, '$.observacao' RETURNING VARCHAR2(32767) NULL ON ERROR),
          JSON_VALUE(v_body, '$.OBSERVACAO' RETURNING VARCHAR2(32767) NULL ON ERROR)
        );

        v_saldo := ROUND(GREATEST(v_valor_imovel - v_valor_entrada - v_valor_veiculo - v_valor_outros, 0), 2);

        IF v_valor_imovel <= 0 THEN
          RAISE_APPLICATION_ERROR(-20060, 'Valor do imovel deve ser maior que zero.');
        END IF;
        IF v_qtd_parcelas <= 0 THEN
          RAISE_APPLICATION_ERROR(-20061, 'Quantidade de parcelas deve ser maior que zero.');
        END IF;
        IF v_data_primeira IS NULL THEN
          RAISE_APPLICATION_ERROR(-20062, 'Data da primeira parcela e obrigatoria.');
        END IF;
        IF v_saldo <= 0 THEN
          RAISE_APPLICATION_ERROR(-20063, 'Saldo parcelado deve ser maior que zero.');
        END IF;
        IF v_tipo_calculo = 'REAJUSTE_ANUAL' AND v_qtd_parcelas <= 12 THEN
          RAISE_APPLICATION_ERROR(-20064, 'Reajuste anual nao gera correcao para parcelamentos de ate 12 meses. Para prazos curtos, utilize Parcela Fixa ou Acrescimo Percentual.');
        END IF;

        v_saldo_corrigido := v_saldo;
        IF v_tipo_calculo = 'ACRESCIMO_TOTAL' THEN
          v_saldo_corrigido := ROUND(v_saldo * (1 + (NVL(v_percentual_juros, 0) / 100)), 2);
        END IF;

        v_valor_base := ROUND(v_saldo_corrigido / v_qtd_parcelas, 2);
        v_diferenca := ROUND(v_saldo_corrigido - ROUND(v_valor_base * v_qtd_parcelas, 2), 2);
        v_parcelas := '[';

        FOR i IN 1 .. v_qtd_parcelas LOOP
          v_fator := 1;
          v_percentual_aplicado := 0;
          v_valor_base_atual := v_valor_base;

          IF i = v_qtd_parcelas THEN
            v_valor_base_atual := ROUND(v_valor_base + v_diferenca, 2);
          END IF;

          IF v_tipo_calculo = 'REAJUSTE_ANUAL' THEN
            v_fator := POWER(1 + (NVL(v_percentual_reajuste, 0) / 100), FLOOR((i - 1) / 12));
            v_percentual_aplicado := ROUND((v_fator - 1) * 100, 2);
            v_valor_parcela := ROUND(v_valor_base_atual * v_fator, 2);
          ELSIF v_tipo_calculo = 'ACRESCIMO_TOTAL' THEN
            v_percentual_aplicado := NVL(v_percentual_juros, 0);
            v_valor_parcela := ROUND(v_valor_base_atual, 2);
          ELSE
            v_valor_parcela := ROUND(v_valor_base_atual, 2);
          END IF;

          v_total_parcelas := ROUND(v_total_parcelas + v_valor_parcela, 2);
          v_amortizado_base := ROUND(v_amortizado_base + v_valor_base, 2);
          v_saldo_restante := ROUND(GREATEST(v_saldo - v_amortizado_base, 0), 2);

          IF i = v_qtd_parcelas THEN
            v_saldo_restante := 0;
          END IF;

          IF i > 1 THEN
            v_parcelas := v_parcelas || ',';
          END IF;

          v_parcelas := v_parcelas ||
            '{' ||
            '"numeroParcela":' || i || ',' ||
            '"dataVencimento":"' || TO_CHAR(ADD_MONTHS(v_data_primeira, i - 1), 'YYYY-MM-DD') || '",' ||
            '"valorParcela":' || num(v_valor_parcela) || ',' ||
            '"valorBase":' || num(v_valor_base_atual) || ',' ||
            '"percentualAplicado":' || num(v_percentual_aplicado) || ',' ||
            '"tipoCalculo":"' || esc(v_tipo_calculo) || '",' ||
            '"saldoRestante":' || num(v_saldo_restante) ||
            '}';
        END LOOP;

        v_parcelas := v_parcelas || ']';

        OWA_UTIL.status_line(200, 'OK', FALSE);
        OWA_UTIL.mime_header('application/json', FALSE);
        OWA_UTIL.http_header_close;
        HTP.p(
          '{' ||
            '"simulacao":{' ||
              '"idSimulacao":null,' ||
              '"idImovel":' || COALESCE(TO_CHAR(v_id_imovel), 'null') || ',' ||
              '"valorImovel":' || num(v_valor_imovel) || ',' ||
              '"valorEntrada":' || num(v_valor_entrada) || ',' ||
              '"valorVeiculo":' || num(v_valor_veiculo) || ',' ||
              '"valorOutrosAbatimentos":' || num(v_valor_outros) || ',' ||
              '"saldoParcelado":' || num(v_saldo) || ',' ||
              '"qtdParcelas":' || v_qtd_parcelas || ',' ||
              '"tipoCalculo":"' || esc(v_tipo_calculo) || '",' ||
              '"percentualReajusteAnual":' || num(v_percentual_reajuste) || ',' ||
              '"percentualAcrescimoTotal":' || num(v_percentual_juros) || ',' ||
              '"percentualJurosMensal":' || num(v_percentual_juros) || ',' ||
              '"dataPrimeiraParcela":"' || TO_CHAR(v_data_primeira, 'YYYY-MM-DD') || '",' ||
              '"observacao":"' || esc(v_observacao) || '"' ||
            '},' ||
            '"resumo":{' ||
              '"saldoParcelado":' || num(v_saldo) || ',' ||
              '"saldoCorrigido":' || num(v_saldo_corrigido) || ',' ||
              '"totalParcelas":' || num(v_total_parcelas) || ',' ||
              '"totalAbatimentos":' || num(v_valor_entrada + v_valor_veiculo + v_valor_outros) ||
            '},' ||
            '"parcelas":' || v_parcelas || ',' ||
            '"aviso":"Saldo restante estimado com base no saldo original parcelado, sem considerar correcoes financeiras complexas."' ||
          '}'
        );
      EXCEPTION
        WHEN OTHERS THEN
          OWA_UTIL.status_line(400, 'Bad Request', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"' || REPLACE(SQLERRM, '"', '\"') || '"}');
      END;
    ~'
  );

  COMMIT;
END;
/

-- =============================================================
-- VERIFICACAO
-- =============================================================
SELECT m.name AS modulo,
       m.uri_prefix,
       t.uri_template,
       h.method
  FROM user_ords_modules m
  JOIN user_ords_templates t
    ON t.module_id = m.id
  JOIN user_ords_handlers h
    ON h.template_id = t.id
 WHERE m.name IN ('simulacoes', 'admin_simulacoes')
 ORDER BY m.name, t.uri_template, h.method;
