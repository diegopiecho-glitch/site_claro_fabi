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


-- ================================================================
-- 2. IMOVEIS — POST / PUT / POST excluir
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
        v_imagem VARCHAR2(4000);
        v_ativo NUMBER;
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
        v_imagem    := COALESCE(JSON_VALUE(v_body, '$.imagem'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.IMAGEM'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_ativo     := COALESCE(JSON_VALUE(v_body, '$.ativo'     RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ATIVO'     RETURNING NUMBER NULL ON ERROR),
                                1);

        IF TRIM(v_titulo) IS NULL THEN
          RAISE_APPLICATION_ERROR(-20005, 'Campo titulo ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        END IF;

        INSERT INTO imoveis (
          titulo, subtitulo, descricao, tipo, cidade, bairro, endereco,
          preco, quartos, banheiros, garagem, area, imagem, ativo
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
          v_imagem,
          v_ativo
        ) RETURNING id_imovel INTO v_id;
        COMMIT;
        :status := 201;
        OWA_UTIL.mime_header('application/json', FALSE);
        HTP.p('{"id_imovel":' || v_id || '}');
        OWA_UTIL.http_header_close;
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
        v_imagem VARCHAR2(4000);
        v_ativo NUMBER;
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
        v_imagem    := COALESCE(JSON_VALUE(v_body, '$.imagem'    RETURNING VARCHAR2(4000) NULL ON ERROR),
                                JSON_VALUE(v_body, '$.IMAGEM'    RETURNING VARCHAR2(4000) NULL ON ERROR));
        v_ativo     := COALESCE(JSON_VALUE(v_body, '$.ativo'     RETURNING NUMBER NULL ON ERROR),
                                JSON_VALUE(v_body, '$.ATIVO'     RETURNING NUMBER NULL ON ERROR));

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
          imagem    = v_imagem,
          ativo     = NVL(v_ativo, ativo)
        WHERE id_imovel = :id;
        COMMIT;
        :status := 200;
        OWA_UTIL.mime_header('application/json', FALSE);
        HTP.p('{"updated":1}');
        OWA_UTIL.http_header_close;
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
      BEGIN
        DELETE FROM imoveis WHERE id_imovel = :id;
        COMMIT;
        :status := 200;
        OWA_UTIL.mime_header('application/json', FALSE);
        HTP.p('{"deleted":1}');
        OWA_UTIL.http_header_close;
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

        IF v_id_imovel IS NULL THEN
          RAISE_APPLICATION_ERROR(-20006, 'Campo id_imovel ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        END IF;

        IF TRIM(v_url) IS NULL THEN
          RAISE_APPLICATION_ERROR(-20007, 'Campo url ausente no body: ' || DBMS_LOB.SUBSTR(v_body, 500, 1));
        END IF;

        INSERT INTO fotos_imovel (id_imovel, url, ordem)
        VALUES (
          v_id_imovel,
          TRIM(v_url),
          v_ordem
        ) RETURNING id_foto INTO v_id;
        COMMIT;
        :status := 201;
        OWA_UTIL.mime_header('application/json', FALSE);
        HTP.p('{"id_foto":'    || v_id                           ||
              ',"id_imovel":' || v_id_imovel ||
              ',"url":"'      || REPLACE(TRIM(v_url), '"', '\"') || '"' ||
              ',"ordem":'     || v_ordem || '}');
        OWA_UTIL.http_header_close;
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
        HTP.p('{"updated":1}');
        OWA_UTIL.http_header_close;
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
      BEGIN
        DELETE FROM fotos_imovel WHERE id_foto = :id;
        COMMIT;
        :status := 200;
        OWA_UTIL.mime_header('application/json', FALSE);
        HTP.p('{"deleted":1}');
        OWA_UTIL.http_header_close;
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
        v_json JSON_OBJECT_T;
        v_body CLOB;
      BEGIN
        v_body := :body_text;

        IF v_body IS NULL THEN
          RAISE_APPLICATION_ERROR(-20004, 'Corpo da requisicao vazio para PUT /config/:id.');
        END IF;

        v_json := JSON_OBJECT_T.parse(v_body);
        UPDATE customizacao_site SET
          rota_sistema_site           = v_json.get_string('rota_sistema_site'),
          titulo_home_site            = v_json.get_string('titulo_home_site'),
          subtitulo_home_site         = v_json.get_string('subtitulo_home_site'),
          url_imagem_home_site        = v_json.get_string('url_imagem_home_site'),
          titulo_sobre_site           = v_json.get_string('titulo_sobre_site'),
          subtitulo_sobre_site        = v_json.get_string('subtitulo_sobre_site'),
          titulo_descricao_sobre_site = v_json.get_string('titulo_descricao_sobre_site'),
          descricao_sobre_site        = v_json.get_string('descricao_sobre_site'),
          url_foto_sobre_site         = v_json.get_string('url_foto_sobre_site'),
          url_logotipo                = v_json.get_string('url_logotipo'),
          descricao_rodape            = v_json.get_string('descricao_rodape'),
          link_instagram              = v_json.get_string('link_instagram'),
          link_faceboock              = v_json.get_string('link_faceboock'),
          whatsapp                    = v_json.get_string('whatsapp'),
          nome_corretor               = v_json.get_string('nome_corretor'),
          endereco_contato_site       = v_json.get_string('endereco_contato_site'),
          frase_contato_site          = v_json.get_string('frase_contato_site'),
          telefone_contato1           = v_json.get_string('telefone_contato1'),
          telefone_contato2           = v_json.get_string('telefone_contato2'),
          url_mapa_contato_site       = v_json.get_string('url_mapa_contato_site'),
          url_site                    = v_json.get_string('url_site'),
          endereco_site               = v_json.get_string('endereco_site')
        WHERE id = :id;
        COMMIT;
        :status := 200;
        OWA_UTIL.mime_header('application/json', FALSE);
        HTP.p('{"updated":1}');
        OWA_UTIL.http_header_close;
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
