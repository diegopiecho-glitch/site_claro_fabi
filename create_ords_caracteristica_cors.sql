-- =============================================================
-- ORDS Write Endpoints - CARACTERISTICA / CARACTERISTICA_IMOVEL
-- Estrategia: Content-Type text/plain (simple request, sem OPTIONS)
--             IDs enviados no body para evitar binding de rota
--
-- Executar como usuario IMOVEIS no Database Actions SQL Worksheet
-- =============================================================


-- ================================================================
-- 1. REMOVER modulos anteriores (se existirem)
-- ================================================================
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_caracteristica'); EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_caracteristica_imovel'); EXCEPTION WHEN OTHERS THEN NULL; END;
/


-- ================================================================
-- 2. CARACTERISTICA - POST / PUT / POST excluir
-- ================================================================
BEGIN

  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_caracteristica',
    p_base_path      => '/admin/caracteristica',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED'
  );

  -- POST /admin/caracteristica/
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_caracteristica', p_pattern => '.');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_caracteristica',
    p_pattern        => '.',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_id NUMBER;
        v_body CLOB;
        v_descricao VARCHAR2(100);
        v_ativo VARCHAR2(1);
        v_sessao VARCHAR2(100);
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20009, 'Corpo da requisicao vazio para POST /caracteristica/.');
        END IF;

        v_descricao := COALESCE(
          JSON_VALUE(v_body, '$.descricao' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.DESCRICAO' RETURNING VARCHAR2(100) NULL ON ERROR)
        );
        v_ativo := UPPER(COALESCE(
          JSON_VALUE(v_body, '$.ativo' RETURNING VARCHAR2(1) NULL ON ERROR),
          JSON_VALUE(v_body, '$.ATIVO' RETURNING VARCHAR2(1) NULL ON ERROR),
          'S'
        ));
        v_sessao := COALESCE(
          JSON_VALUE(v_body, '$.sessao' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSAO' RETURNING VARCHAR2(100) NULL ON ERROR)
        );
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
        ELSIF TRIM(v_descricao) IS NULL THEN
          RAISE_APPLICATION_ERROR(-20010, 'Campo descricao ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSIF TRIM(v_sessao) IS NULL THEN
          RAISE_APPLICATION_ERROR(-20016, 'Campo sessao ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSE
          INSERT INTO caracteristica (descricao, ativo, sessao)
          VALUES (
            TRIM(v_descricao),
            CASE WHEN v_ativo = 'N' THEN 'N' ELSE 'S' END,
            TRIM(v_sessao)
          )
          RETURNING id_caracteristica INTO v_id;

          COMMIT;
          OWA_UTIL.status_line(201, 'Created', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"id_caracteristica":' || v_id ||
                ',"descricao":"' || REPLACE(TRIM(v_descricao), '"', '\"') || '"' ||
                ',"ativo":"' || CASE WHEN v_ativo = 'N' THEN 'N' ELSE 'S' END || '"' ||
                ',"sessao":"' || REPLACE(TRIM(v_sessao), '"', '\"') || '"}');
        END IF;
      END;
    ]'
  );

  -- PUT /admin/caracteristica/atualizar
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_caracteristica', p_pattern => 'atualizar');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_caracteristica',
    p_pattern        => 'atualizar',
    p_method         => 'PUT',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_id_caracteristica NUMBER;
        v_descricao VARCHAR2(100);
        v_ativo VARCHAR2(1);
        v_sessao VARCHAR2(100);
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20011, 'Corpo da requisicao vazio para PUT /caracteristica/atualizar.');
        END IF;

        v_id_caracteristica := COALESCE(
          JSON_VALUE(v_body, '$.id' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.id_caracteristica' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID_CARACTERISTICA' RETURNING NUMBER NULL ON ERROR)
        );
        v_descricao := COALESCE(
          JSON_VALUE(v_body, '$.descricao' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.DESCRICAO' RETURNING VARCHAR2(100) NULL ON ERROR)
        );
        v_ativo := UPPER(COALESCE(
          JSON_VALUE(v_body, '$.ativo' RETURNING VARCHAR2(1) NULL ON ERROR),
          JSON_VALUE(v_body, '$.ATIVO' RETURNING VARCHAR2(1) NULL ON ERROR)
        ));
        v_sessao := COALESCE(
          JSON_VALUE(v_body, '$.sessao' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSAO' RETURNING VARCHAR2(100) NULL ON ERROR)
        );
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
        ELSIF v_id_caracteristica IS NULL THEN
          RAISE_APPLICATION_ERROR(-20013, 'Campo id_caracteristica ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSE
          UPDATE caracteristica SET
            descricao = NVL(TRIM(v_descricao), descricao),
            ativo = NVL(CASE WHEN v_ativo IN ('S', 'N') THEN v_ativo END, ativo),
            sessao = NVL(TRIM(v_sessao), sessao)
          WHERE id_caracteristica = v_id_caracteristica;

          COMMIT;
          OWA_UTIL.status_line(200, 'OK', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"updated":1}');
        END IF;
      END;
    ]'
  );

  -- POST /admin/caracteristica/excluir
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_caracteristica', p_pattern => 'excluir');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_caracteristica',
    p_pattern        => 'excluir',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_id_caracteristica NUMBER;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;
        v_id_caracteristica := COALESCE(
          JSON_VALUE(v_body, '$.id' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.id_caracteristica' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID_CARACTERISTICA' RETURNING NUMBER NULL ON ERROR)
        );
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
        ELSIF v_id_caracteristica IS NULL THEN
          RAISE_APPLICATION_ERROR(-20014, 'Campo id_caracteristica ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSE
          DELETE FROM caracteristica WHERE id_caracteristica = v_id_caracteristica;
          COMMIT;
          OWA_UTIL.status_line(200, 'OK', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"deleted":1}');
        END IF;
      END;
    ]'
  );

  COMMIT;
END;
/


-- ================================================================
-- 3. CARACTERISTICA_IMOVEL - POST sincronizar por imovel
-- ================================================================
BEGIN

  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_caracteristica_imovel',
    p_base_path      => '/admin/caracteristica-imovel',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED'
  );

  -- POST /admin/caracteristica-imovel/sincronizar
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_caracteristica_imovel', p_pattern => 'sincronizar');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_caracteristica_imovel',
    p_pattern        => 'sincronizar',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_id_imovel NUMBER;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
        v_idx NUMBER := 0;
        v_id_caracteristica NUMBER;
        v_qtd NUMBER;
        v_observacao VARCHAR2(100);
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20012, 'Corpo da requisicao vazio para POST /caracteristica-imovel/sincronizar.');
        END IF;

        v_id_imovel := COALESCE(
          JSON_VALUE(v_body, '$.id' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.id_imovel' RETURNING NUMBER NULL ON ERROR),
          JSON_VALUE(v_body, '$.ID_IMOVEL' RETURNING NUMBER NULL ON ERROR)
        );
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
        ELSIF v_id_imovel IS NULL THEN
          RAISE_APPLICATION_ERROR(-20015, 'Campo id_imovel ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSE
          DELETE FROM caracteristica_imovel
           WHERE id_imovel = v_id_imovel;

          LOOP
            v_id_caracteristica := JSON_VALUE(
              v_body,
              '$.itens[' || v_idx || '].id_caracteristica'
              RETURNING NUMBER NULL ON ERROR
            );

            EXIT WHEN v_id_caracteristica IS NULL;

            v_qtd := COALESCE(
              JSON_VALUE(
                v_body,
                '$.itens[' || v_idx || '].qtd'
                RETURNING NUMBER NULL ON ERROR
              ),
              0
            );

            v_observacao := JSON_VALUE(
              v_body,
              '$.itens[' || v_idx || '].observacao'
              RETURNING VARCHAR2(100) NULL ON ERROR
            );

            INSERT INTO caracteristica_imovel (
              id_imovel,
              id_caracteristica,
              qtd,
              observacao
            ) VALUES (
              v_id_imovel,
              v_id_caracteristica,
              v_qtd,
              v_observacao
            );

            v_idx := v_idx + 1;
          END LOOP;

          COMMIT;
          OWA_UTIL.status_line(200, 'OK', FALSE);
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"updated":1}');
        END IF;
      END;
    ]'
  );

  COMMIT;
END;
/


-- ================================================================
-- Verificar modulos criados
-- ================================================================
SELECT m.name AS modulo, m.uri_prefix, h.method, t.uri_template
FROM   user_ords_modules   m
JOIN   user_ords_templates t ON t.module_id   = m.id
JOIN   user_ords_handlers  h ON h.template_id = t.id
WHERE  m.name IN (
  'admin_caracteristica',
  'admin_caracteristica_imovel'
)
ORDER  BY m.name, t.uri_template, h.method;
