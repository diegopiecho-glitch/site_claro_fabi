-- =============================================================
-- ORDS Write Endpoints — sem CORS preflight
-- Estratégia: Content-Type text/plain (simple request, sem OPTIONS)
--             DELETE substituído por POST /excluir/:id
--
-- Executar como usuário IMOVEIS no Database Actions SQL Worksheet
-- =============================================================


-- ================================================================
-- 1. REMOVER módulos anteriores (se existirem)
-- ================================================================
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_imovel'); EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_foto');   EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_config'); EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN ORDS.DELETE_MODULE(p_module_name => 'admin_auth');   EXCEPTION WHEN OTHERS THEN NULL; END;
/


-- ================================================================
-- 2. AUTENTICACAO ADMINISTRATIVA — login / logout / validate
-- ================================================================
BEGIN

  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_auth',
    p_base_path      => '/admin/auth',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED'
  );

  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_auth', p_pattern => 'login');
  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_auth',
    p_pattern        => 'login',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_usuario VARCHAR2(100);
        v_senha VARCHAR2(200);
        v_id_usuario NUMBER;
        v_token VARCHAR2(128);
      BEGIN
        v_body := :body_text;
        v_usuario := COALESCE(
          JSON_VALUE(v_body, '$.usuario' RETURNING VARCHAR2(100) NULL ON ERROR),
          JSON_VALUE(v_body, '$.USUARIO' RETURNING VARCHAR2(100) NULL ON ERROR)
        );
        v_senha := COALESCE(
          JSON_VALUE(v_body, '$.senha' RETURNING VARCHAR2(200) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SENHA' RETURNING VARCHAR2(200) NULL ON ERROR)
        );

        v_id_usuario := pkg_auth_sistema.autenticar(v_usuario, v_senha);

        IF v_id_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"LOGIN_INVALIDO"}');
        ELSE
          v_token := pkg_auth_sistema.criar_sessao(v_id_usuario);
          COMMIT;
          :status := 200;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"token":"' || v_token || '","usuario":"' || REPLACE(LOWER(TRIM(v_usuario)), '"', '\"') || '","expires_in_minutes":480}');
        END IF;
      END;
    ]'
  );

  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_auth', p_pattern => 'logout');
  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_auth',
    p_pattern        => 'logout',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
      BEGIN
        v_body := :body_text;
        v_token := COALESCE(
          JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR)
        );

        pkg_auth_sistema.encerrar_sessao(v_token);
        COMMIT;
        :status := 200;
        OWA_UTIL.mime_header('application/json', FALSE);
        OWA_UTIL.http_header_close;
        HTP.p('{"logout":1}');
      END;
    ]'
  );

  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_auth', p_pattern => 'validate');
  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_auth',
    p_pattern        => 'validate',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
        v_id_usuario NUMBER;
      BEGIN
        v_body := :body_text;
        v_token := COALESCE(
          JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR)
        );

        v_id_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_id_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"valid":0}');
        ELSE
          COMMIT;
          :status := 200;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"valid":1}');
        END IF;
      END;
    ]'
  );

  COMMIT;
END;
/


-- ================================================================
-- 3. IMOVEIS — POST / PUT / POST excluir
-- ================================================================
BEGIN

  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_imovel',
    p_base_path      => '/admin/imovel',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED'
  );

  -- ── POST /imovel/  → criar imóvel ───────────────────────
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_imovel', p_pattern => '.');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_imovel',
    p_pattern        => '.',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_id   NUMBER;
        v_body CLOB;
        v_titulo VARCHAR2(4000);
        v_subtitulo VARCHAR2(4000);
        v_descricao CLOB;
        v_tipo VARCHAR2(4000);
        v_cidade VARCHAR2(4000);
        v_bairro VARCHAR2(4000);
        v_endereco VARCHAR2(4000);
        v_preco NUMBER;
        v_quartos NUMBER;
        v_banheiros NUMBER;
        v_garagem NUMBER;
        v_area NUMBER;
        v_ativo NUMBER;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20001, 'Corpo da requisicao vazio para POST /imovel/.');
        END IF;

        v_titulo    := COALESCE(JSON_VALUE(v_body, '$.titulo'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.TITULO'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_subtitulo := COALESCE(JSON_VALUE(v_body, '$.subtitulo' RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.SUBTITULO' RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_descricao := COALESCE(JSON_VALUE(v_body, '$.descricao' RETURNING VARCHAR2(32767) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.DESCRICAO' RETURNING VARCHAR2(32767) NULL ON ERROR));
        v_tipo      := COALESCE(JSON_VALUE(v_body, '$.tipo'      RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.TIPO'      RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_cidade    := COALESCE(JSON_VALUE(v_body, '$.cidade'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.CIDADE'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_bairro    := COALESCE(JSON_VALUE(v_body, '$.bairro'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.BAIRRO'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_endereco  := COALESCE(JSON_VALUE(v_body, '$.endereco'  RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ENDERECO'  RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_preco     := COALESCE(JSON_VALUE(v_body, '$.preco'     RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.PRECO'     RETURNING NUMBER NULL ON ERROR));
        v_quartos   := COALESCE(JSON_VALUE(v_body, '$.quartos'   RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.QUARTOS'   RETURNING NUMBER NULL ON ERROR));
        v_banheiros := COALESCE(JSON_VALUE(v_body, '$.banheiros' RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.BANHEIROS' RETURNING NUMBER NULL ON ERROR));
        v_garagem   := COALESCE(JSON_VALUE(v_body, '$.garagem'   RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.GARAGEM'   RETURNING NUMBER NULL ON ERROR));
        v_area      := COALESCE(JSON_VALUE(v_body, '$.area'      RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.AREA'      RETURNING NUMBER NULL ON ERROR));
        v_ativo     := COALESCE(JSON_VALUE(v_body, '$.ativo'     RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ATIVO'     RETURNING NUMBER NULL ON ERROR),
                                1);
        v_token     := COALESCE(JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR));
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSIF TRIM(v_titulo) IS NULL THEN
          RAISE_APPLICATION_ERROR(-20005, 'Campo titulo ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSE
          INSERT INTO imoveis (
            titulo, subtitulo, descricao, tipo, cidade, bairro, endereco,
            preco, quartos, banheiros, garagem, area, ativo
          ) VALUES (
            TRIM(v_titulo),
            v_subtitulo,
            v_descricao,
            v_tipo,
            v_cidade,
            v_bairro,
            v_endereco,
            v_preco,
            v_quartos,
            v_banheiros,
            v_garagem,
            v_area,
            v_ativo
          ) RETURNING id_imovel INTO v_id;
          COMMIT;
          :status := 201;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"id_imovel":' || v_id || '}');
        END IF;
      END;
    ]'
  );

  -- ── PUT /imovel/:id  → atualizar ────────────────────────
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_imovel', p_pattern => ':id');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_imovel',
    p_pattern        => ':id',
    p_method         => 'PUT',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_titulo VARCHAR2(4000);
        v_subtitulo VARCHAR2(4000);
        v_descricao CLOB;
        v_tipo VARCHAR2(4000);
        v_cidade VARCHAR2(4000);
        v_bairro VARCHAR2(4000);
        v_endereco VARCHAR2(4000);
        v_preco NUMBER;
        v_quartos NUMBER;
        v_banheiros NUMBER;
        v_garagem NUMBER;
        v_area NUMBER;
        v_ativo NUMBER;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20002, 'Corpo da requisicao vazio para PUT /imovel/:id.');
        END IF;

        v_titulo    := COALESCE(JSON_VALUE(v_body, '$.titulo'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.TITULO'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_subtitulo := COALESCE(JSON_VALUE(v_body, '$.subtitulo' RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.SUBTITULO' RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_descricao := COALESCE(JSON_VALUE(v_body, '$.descricao' RETURNING VARCHAR2(32767) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.DESCRICAO' RETURNING VARCHAR2(32767) NULL ON ERROR));
        v_tipo      := COALESCE(JSON_VALUE(v_body, '$.tipo'      RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.TIPO'      RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_cidade    := COALESCE(JSON_VALUE(v_body, '$.cidade'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.CIDADE'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_bairro    := COALESCE(JSON_VALUE(v_body, '$.bairro'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.BAIRRO'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_endereco  := COALESCE(JSON_VALUE(v_body, '$.endereco'  RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ENDERECO'  RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_preco     := COALESCE(JSON_VALUE(v_body, '$.preco'     RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.PRECO'     RETURNING NUMBER NULL ON ERROR));
        v_quartos   := COALESCE(JSON_VALUE(v_body, '$.quartos'   RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.QUARTOS'   RETURNING NUMBER NULL ON ERROR));
        v_banheiros := COALESCE(JSON_VALUE(v_body, '$.banheiros' RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.BANHEIROS' RETURNING NUMBER NULL ON ERROR));
        v_garagem   := COALESCE(JSON_VALUE(v_body, '$.garagem'   RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.GARAGEM'   RETURNING NUMBER NULL ON ERROR));
        v_area      := COALESCE(JSON_VALUE(v_body, '$.area'      RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.AREA'      RETURNING NUMBER NULL ON ERROR));
        v_ativo     := COALESCE(JSON_VALUE(v_body, '$.ativo'     RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ATIVO'     RETURNING NUMBER NULL ON ERROR));
        v_token     := COALESCE(JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR));
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSE
          UPDATE imoveis SET
            titulo    = NVL(TRIM(v_titulo), titulo),
            subtitulo = v_subtitulo,
            descricao = v_descricao,
            tipo      = NVL(v_tipo, tipo),
            cidade    = v_cidade,
            bairro    = v_bairro,
            endereco  = v_endereco,
            preco     = v_preco,
            quartos   = v_quartos,
            banheiros = v_banheiros,
            garagem   = v_garagem,
            area      = v_area,
            ativo     = NVL(v_ativo, ativo)
          WHERE id_imovel = :id;
          COMMIT;
          :status := 200;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"updated":1}');
        END IF;
      END;
    ]'
  );

  -- ── POST /imovel/excluir/:id  → excluir (substitui DELETE) ──
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_imovel', p_pattern => 'excluir/:id');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_imovel',
    p_pattern        => 'excluir/:id',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;
        v_token := COALESCE(JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
                            JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR));
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSE
          DELETE FROM imoveis WHERE id_imovel = :id;
          COMMIT;
          :status := 200;
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
-- 3. FOTOS_IMOVEL — POST criar / POST atualizar / POST excluir
-- ================================================================
BEGIN

  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_foto',
    p_base_path      => '/admin/foto',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED'
  );

  -- ── POST /foto/  → criar foto ───────────────────────────
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_foto', p_pattern => '.');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_foto',
    p_pattern        => '.',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_id   NUMBER;
        v_body CLOB;
        v_id_imovel NUMBER;
        v_url VARCHAR2(4000);
        v_ordem NUMBER;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20003, 'Corpo da requisicao vazio para POST /foto/.');
        END IF;

        v_id_imovel := COALESCE(JSON_VALUE(v_body, '$.id_imovel' RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ID_IMOVEL' RETURNING NUMBER NULL ON ERROR));
        v_url       := COALESCE(JSON_VALUE(v_body, '$.url' RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.URL' RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_ordem     := COALESCE(JSON_VALUE(v_body, '$.ordem' RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ORDEM' RETURNING NUMBER NULL ON ERROR),
                                1);
        v_token     := COALESCE(JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR));
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSIF v_id_imovel IS NULL THEN
          RAISE_APPLICATION_ERROR(-20006, 'Campo id_imovel ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSIF TRIM(v_url) IS NULL THEN
          RAISE_APPLICATION_ERROR(-20007, 'Campo url ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        ELSE
          INSERT INTO fotos_imovel (id_imovel, url, ordem)
          VALUES (
            v_id_imovel,
            TRIM(v_url),
            v_ordem
          ) RETURNING id_foto INTO v_id;
          COMMIT;
          :status := 201;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"id_foto":'    || v_id                           ||
                ',"id_imovel":' || v_id_imovel ||
                ',"url":"'      || REPLACE(TRIM(v_url), '"', '\"') || '"' ||
                ',"ordem":'     || v_ordem || '}');
        END IF;
      END;
    ]'
  );

  -- ── POST /foto/atualizar/:id  → atualizar ordem / foto principal ──
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_foto', p_pattern => 'atualizar/:id');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_foto',
    p_pattern        => 'atualizar/:id',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_ordem NUMBER;
        v_foto_principal VARCHAR2(1);
        v_id_imovel NUMBER;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20008, 'Corpo da requisicao vazio para POST /foto/atualizar/:id.');
        END IF;

        v_ordem := COALESCE(JSON_VALUE(v_body, '$.ordem' RETURNING NUMBER NULL ON ERROR),
                            JSON_VALUE(v_body, '$.ORDEM' RETURNING NUMBER NULL ON ERROR));
        v_foto_principal := UPPER(COALESCE(
          JSON_VALUE(v_body, '$.foto_principal' RETURNING VARCHAR2(1) NULL ON ERROR),
          JSON_VALUE(v_body, '$.FOTO_PRINCIPAL' RETURNING VARCHAR2(1) NULL ON ERROR),
          JSON_VALUE(v_body, '$.principal' RETURNING VARCHAR2(1) NULL ON ERROR),
          JSON_VALUE(v_body, '$.PRINCIPAL' RETURNING VARCHAR2(1) NULL ON ERROR)
        ));
        v_token := COALESCE(JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
                            JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR));
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSE
          SELECT id_imovel
            INTO v_id_imovel
            FROM fotos_imovel
           WHERE id_foto = :id;

          IF v_foto_principal = 'S' THEN
            UPDATE fotos_imovel
               SET foto_principal = 'N'
             WHERE id_imovel = v_id_imovel;
          END IF;

          UPDATE fotos_imovel
             SET ordem = NVL(v_ordem, ordem),
                 foto_principal = NVL(v_foto_principal, foto_principal)
           WHERE id_foto = :id;

          COMMIT;
          :status := 200;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"updated":1}');
        END IF;
      END;
    ]'
  );

  -- ── POST /foto/excluir/:id  → excluir (substitui DELETE) ──
  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_foto', p_pattern => 'excluir/:id');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_foto',
    p_pattern        => 'excluir/:id',
    p_method         => 'POST',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_token VARCHAR2(128);
        v_auth_usuario NUMBER;
      BEGIN
        v_body := :body_text;
        v_token := COALESCE(JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
                            JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR));
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSE
          DELETE FROM fotos_imovel WHERE id_foto = :id;
          COMMIT;
          :status := 200;
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
-- 4. CUSTOMIZACAO_SITE — PUT
-- ================================================================
BEGIN

  ORDS.DEFINE_MODULE(
    p_module_name    => 'admin_config',
    p_base_path      => '/admin/config',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED'
  );

  ORDS.DEFINE_TEMPLATE(p_module_name => 'admin_config', p_pattern => ':id');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'admin_config',
    p_pattern        => ':id',
    p_method         => 'PUT',
    p_source_type    => ORDS.source_type_plsql,
    p_mimes_allowed  => '',
    p_source => q'[
      DECLARE
        v_body CLOB;
        v_titulo_home_site             VARCHAR2(500);
        v_subtitulo_home_site          VARCHAR2(1000);
        v_url_imagem_home_site         VARCHAR2(2000);
        v_titulo_sobre_site            VARCHAR2(500);
        v_subtitulo_sobre_site         VARCHAR2(1000);
        v_titulo_descricao_sobre_site  VARCHAR2(500);
        v_descricao_sobre_site         CLOB;
        v_url_foto_sobre_site          VARCHAR2(2000);
        v_url_logotipo                 VARCHAR2(2000);
        v_descricao_rodape             VARCHAR2(1000);
        v_link_instagram               VARCHAR2(500);
        v_link_faceboock               VARCHAR2(500);
        v_whatsapp                     VARCHAR2(30);
        v_nome_corretor                VARCHAR2(200);
        v_endereco_contato_site        VARCHAR2(500);
        v_frase_contato_site           VARCHAR2(1000);
        v_telefone_contato1            VARCHAR2(30);
        v_telefone_contato2            VARCHAR2(30);
        v_url_mapa_contato_site        CLOB;
        v_url_site                     VARCHAR2(500);
        v_endereco_site                VARCHAR2(500);
        v_token                        VARCHAR2(128);
        v_auth_usuario                 NUMBER;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20004, 'Corpo da requisicao vazio para PUT /config/:id.');
        END IF;

        v_titulo_home_site := COALESCE(
          JSON_VALUE(v_body, '$.titulo_home_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TITULO_HOME_SITE' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_subtitulo_home_site := COALESCE(
          JSON_VALUE(v_body, '$.subtitulo_home_site' RETURNING VARCHAR2(1000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SUBTITULO_HOME_SITE' RETURNING VARCHAR2(1000) NULL ON ERROR)
        );
        v_url_imagem_home_site := COALESCE(
          JSON_VALUE(v_body, '$.url_imagem_home_site' RETURNING VARCHAR2(2000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.URL_IMAGEM_HOME_SITE' RETURNING VARCHAR2(2000) NULL ON ERROR)
        );
        v_titulo_sobre_site := COALESCE(
          JSON_VALUE(v_body, '$.titulo_sobre_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TITULO_SOBRE_SITE' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_subtitulo_sobre_site := COALESCE(
          JSON_VALUE(v_body, '$.subtitulo_sobre_site' RETURNING VARCHAR2(1000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SUBTITULO_SOBRE_SITE' RETURNING VARCHAR2(1000) NULL ON ERROR)
        );
        v_titulo_descricao_sobre_site := COALESCE(
          JSON_VALUE(v_body, '$.titulo_descricao_sobre_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TITULO_DESCRICAO_SOBRE_SITE' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_descricao_sobre_site := COALESCE(
          JSON_VALUE(v_body, '$.descricao_sobre_site' RETURNING VARCHAR2(32767) NULL ON ERROR),
          JSON_VALUE(v_body, '$.DESCRICAO_SOBRE_SITE' RETURNING VARCHAR2(32767) NULL ON ERROR)
        );
        v_url_foto_sobre_site := COALESCE(
          JSON_VALUE(v_body, '$.url_foto_sobre_site' RETURNING VARCHAR2(2000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.URL_FOTO_SOBRE_SITE' RETURNING VARCHAR2(2000) NULL ON ERROR)
        );
        v_url_logotipo := COALESCE(
          JSON_VALUE(v_body, '$.url_logotipo' RETURNING VARCHAR2(2000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.URL_LOGOTIPO' RETURNING VARCHAR2(2000) NULL ON ERROR)
        );
        v_descricao_rodape := COALESCE(
          JSON_VALUE(v_body, '$.descricao_rodape' RETURNING VARCHAR2(1000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.DESCRICAO_RODAPE' RETURNING VARCHAR2(1000) NULL ON ERROR)
        );
        v_link_instagram := COALESCE(
          JSON_VALUE(v_body, '$.link_instagram' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.LINK_INSTAGRAM' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_link_faceboock := COALESCE(
          JSON_VALUE(v_body, '$.link_faceboock' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.LINK_FACEBOOCK' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_whatsapp := COALESCE(
          JSON_VALUE(v_body, '$.whatsapp' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.WHATSAPP' RETURNING VARCHAR2(30) NULL ON ERROR)
        );
        v_nome_corretor := COALESCE(
          JSON_VALUE(v_body, '$.nome_corretor' RETURNING VARCHAR2(200) NULL ON ERROR),
          JSON_VALUE(v_body, '$.NOME_CORRETOR' RETURNING VARCHAR2(200) NULL ON ERROR)
        );
        v_endereco_contato_site := COALESCE(
          JSON_VALUE(v_body, '$.endereco_contato_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.ENDERECO_CONTATO_SITE' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_frase_contato_site := COALESCE(
          JSON_VALUE(v_body, '$.frase_contato_site' RETURNING VARCHAR2(1000) NULL ON ERROR),
          JSON_VALUE(v_body, '$.FRASE_CONTATO_SITE' RETURNING VARCHAR2(1000) NULL ON ERROR)
        );
        v_telefone_contato1 := COALESCE(
          JSON_VALUE(v_body, '$.telefone_contato1' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TELEFONE_CONTATO1' RETURNING VARCHAR2(30) NULL ON ERROR)
        );
        v_telefone_contato2 := COALESCE(
          JSON_VALUE(v_body, '$.telefone_contato2' RETURNING VARCHAR2(30) NULL ON ERROR),
          JSON_VALUE(v_body, '$.TELEFONE_CONTATO2' RETURNING VARCHAR2(30) NULL ON ERROR)
        );
        v_url_mapa_contato_site := COALESCE(
          JSON_VALUE(v_body, '$.url_mapa_contato_site' RETURNING VARCHAR2(32767) NULL ON ERROR),
          JSON_VALUE(v_body, '$.URL_MAPA_CONTATO_SITE' RETURNING VARCHAR2(32767) NULL ON ERROR)
        );
        v_url_site := COALESCE(
          JSON_VALUE(v_body, '$.url_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.URL_SITE' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.rota_sistema_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.ROTA_SISTEMA_SITE' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_endereco_site := COALESCE(
          JSON_VALUE(v_body, '$.endereco_site' RETURNING VARCHAR2(500) NULL ON ERROR),
          JSON_VALUE(v_body, '$.ENDERECO_SITE' RETURNING VARCHAR2(500) NULL ON ERROR)
        );
        v_token := COALESCE(
          JSON_VALUE(v_body, '$.session_token' RETURNING VARCHAR2(128) NULL ON ERROR),
          JSON_VALUE(v_body, '$.SESSION_TOKEN' RETURNING VARCHAR2(128) NULL ON ERROR)
        );
        v_auth_usuario := pkg_auth_sistema.validar_sessao(v_token);

        IF v_auth_usuario IS NULL THEN
          :status := 401;
          OWA_UTIL.mime_header('application/json', FALSE);
          OWA_UTIL.http_header_close;
          HTP.p('{"error":"SESSAO_INVALIDA"}');
        ELSE
          UPDATE customizacao_site SET
            titulo_home_site            = v_titulo_home_site,
            subtitulo_home_site         = v_subtitulo_home_site,
            url_imagem_home_site        = v_url_imagem_home_site,
            titulo_sobre_site           = v_titulo_sobre_site,
            subtitulo_sobre_site        = v_subtitulo_sobre_site,
            titulo_descricao_sobre_site = v_titulo_descricao_sobre_site,
            descricao_sobre_site        = v_descricao_sobre_site,
            url_foto_sobre_site         = v_url_foto_sobre_site,
            url_logotipo                = v_url_logotipo,
            descricao_rodape            = v_descricao_rodape,
            link_instagram              = v_link_instagram,
            link_faceboock              = v_link_faceboock,
            whatsapp                    = v_whatsapp,
            nome_corretor               = v_nome_corretor,
            endereco_contato_site       = v_endereco_contato_site,
            frase_contato_site          = v_frase_contato_site,
            telefone_contato1           = v_telefone_contato1,
            telefone_contato2           = v_telefone_contato2,
            url_mapa_contato_site       = v_url_mapa_contato_site,
            url_site                    = v_url_site,
            endereco_site               = v_endereco_site
          WHERE id = :id;
          COMMIT;
          :status := 200;
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
-- Verificar módulos criados
-- ================================================================
SELECT m.name AS modulo, m.uri_prefix, h.method, t.uri_template
FROM   user_ords_modules   m
JOIN   user_ords_templates t ON t.module_id   = m.id
JOIN   user_ords_handlers  h ON h.template_id = t.id
WHERE  m.name IN ('admin_imovel', 'admin_foto', 'admin_config')
ORDER  BY m.name, t.uri_template, h.method;
