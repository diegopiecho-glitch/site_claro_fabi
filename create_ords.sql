-- =============================================================
-- ORDS REST Services
-- Owner/Schema: IMOVEIS
-- Base URL: /ords/imoveis/
--
-- Endpoints gerados:
--   GET /ords/imoveis/customizacao_site/
--   GET /ords/imoveis/cardhomesite/
--   GET /ords/imoveis/imoveis/detalhe/:id
--   GET /ords/imoveis/fotodetalheimovel/
--   GET /ords/imoveis/caracteristicas/
--   GET /ords/imoveis/imoveis/caracteristicas/:id
-- =============================================================


-- =============================================================
-- HABILITAR SCHEMA IMOVEIS NO ORDS
-- =============================================================
BEGIN
    ORDS.ENABLE_SCHEMA(
        p_enabled             => TRUE,
        p_schema              => 'IMOVEIS',
        p_url_mapping_type    => 'BASE_PATH',
        p_url_mapping_pattern => 'imoveis',
        p_auto_rest_auth      => FALSE
    );
    COMMIT;
END;
/


-- =============================================================
-- MODULO: caracteristicas
-- Endpoint: GET /ords/imoveis/caracteristicas/
-- Tabela:   IMOVEIS.CARACTERISTICA
-- Uso:      site publico e sistema administrativo
-- =============================================================
BEGIN
    ORDS.DEFINE_MODULE(
        p_module_name    => 'caracteristicas',
        p_base_path      => '/caracteristicas/',
        p_items_per_page => 200,
        p_status         => 'PUBLISHED',
        p_comments       => 'Cadastro de caracteristicas dos imoveis'
    );

    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'caracteristicas',
        p_pattern     => '.'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'caracteristicas',
        p_pattern        => '.',
        p_method         => 'GET',
        p_source_type    => ORDS.source_type_collection_feed,
        p_items_per_page => 200,
        p_comments       => 'Retorna todas as caracteristicas cadastradas',
        p_source         =>
            'SELECT id_caracteristica,
                    descricao,
                    ativo,
                    sessao
             FROM imoveis.caracteristica
             ORDER BY descricao, id_caracteristica'
    );

    COMMIT;
END;
/


-- =============================================================
-- MODULO: imoveis
-- Endpoint: GET /ords/imoveis/imoveis/caracteristicas/:id
-- Uso:      caracteristicas vinculadas a um imovel
-- Obs.:     reaproveita o modulo "imoveis" ja existente
-- =============================================================
BEGIN
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'imoveis',
        p_pattern     => 'caracteristicas/:id'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'imoveis',
        p_pattern        => 'caracteristicas/:id',
        p_method         => 'GET',
        p_source_type    => ORDS.source_type_collection_feed,
        p_items_per_page => 200,
        p_comments       => 'Retorna as caracteristicas vinculadas ao imovel informado',
        p_source         =>
            'SELECT ci.id_caracteristica_imovel,
                    ci.id_imovel,
                    ci.id_caracteristica,
                    c.descricao,
                    c.ativo,
                    c.sessao,
                    ci.qtd,
                    ci.observacao
             FROM imoveis.caracteristica_imovel ci
             JOIN imoveis.caracteristica c
               ON c.id_caracteristica = ci.id_caracteristica
             WHERE ci.id_imovel = :id
             ORDER BY c.descricao, ci.id_caracteristica_imovel'
    );

    COMMIT;
END;
/


-- =============================================================
-- MODULO: customizacao_site
-- Endpoint: GET /ords/imoveis/customizacao_site/
-- Tabela:   IMOVEIS.CUSTOMIZACAO_SITE
-- =============================================================
BEGIN
    ORDS.DEFINE_MODULE(
        p_module_name    => 'customizacao_site',
        p_base_path      => '/customizacao_site/',
        p_items_per_page => 25,
        p_status         => 'PUBLISHED',
        p_comments       => 'Configuracoes gerais do site imobiliario'
    );

    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'customizacao_site',
        p_pattern     => '.'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'customizacao_site',
        p_pattern        => '.',
        p_method         => 'GET',
        p_source_type    => ORDS.source_type_collection_feed,
        p_items_per_page => 25,
        p_comments       => 'Retorna configuracoes do site (home, sobre, contato, redes sociais)',
        p_source         =>
            'SELECT titulo_home_site,
                    subtitulo_home_site,
                    url_imagem_home_site,
                    titulo_sobre_site,
                    subtitulo_sobre_site,
                    titulo_descricao_sobre_site,
                    descricao_sobre_site,
                    url_foto_sobre_site,
                    url_logotipo,
                    descricao_rodape,
                    link_instagram,
                    link_faceboock,
                    whatsapp,
                    nome_corretor,
                    endereco_contato_site,
                    frase_contato_site,
                    telefone_contato1,
                    telefone_contato2,
                    url_mapa_contato_site,
                    url_site,
                    endereco_site
             FROM imoveis.customizacao_site'
    );

    COMMIT;
END;
/


-- =============================================================
-- MODULO: cardhomesite
-- Endpoint: GET /ords/imoveis/cardhomesite/
-- Origem:   VIEW IMOVEIS.CARDHOMESITE (imoveis ativos)
-- =============================================================
BEGIN
    ORDS.DEFINE_MODULE(
        p_module_name    => 'cardhomesite',
        p_base_path      => '/cardhomesite/',
        p_items_per_page => 200,
        p_status         => 'PUBLISHED',
        p_comments       => 'Cards de imoveis exibidos na home page'
    );

    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'cardhomesite',
        p_pattern     => '.'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'cardhomesite',
        p_pattern        => '.',
        p_method         => 'GET',
        p_source_type    => ORDS.source_type_collection_feed,
        p_items_per_page => 200,
        p_comments       => 'Retorna imoveis ativos com campos para os cards da home',
        p_source         =>
            'SELECT id_imovel,
                    titulo,
                    subtitulo,
                    bairro,
                    endereco,
                    preco,
                    tipo,
                    cidade,
                    quartos,
                    banheiros,
                    garagem,
                    area,
                    foto
             FROM imoveis.cardhomesite'
    );

    COMMIT;
END;
/


-- =============================================================
-- MODULO: imoveis
-- Endpoint: GET /ords/imoveis/imoveis/detalhe/:id
-- Tabela:   IMOVEIS.IMOVEIS
-- =============================================================
BEGIN
    ORDS.DEFINE_MODULE(
        p_module_name    => 'imoveis',
        p_base_path      => '/imoveis/',
        p_items_per_page => 1,
        p_status         => 'PUBLISHED',
        p_comments       => 'Operacoes de detalhe de imovel'
    );

    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'imoveis',
        p_pattern     => 'detalhe/:id'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'imoveis',
        p_pattern        => 'detalhe/:id',
        p_method         => 'GET',
        p_source_type    => ORDS.source_type_collection_feed,
        p_items_per_page => 1,
        p_comments       => 'Retorna todos os campos de um imovel pelo id_imovel',
        p_source         =>
            'SELECT id_imovel,
                    titulo,
                    subtitulo,
                    descricao,
                    preco,
                    tipo,
                    cidade,
                    bairro,
                    endereco,
                    quartos,
                    banheiros,
                    garagem,
                    area
             FROM imoveis.imoveis
             WHERE id_imovel = :id'
    );

    COMMIT;
END;
/


-- =============================================================
-- MODULO: fotodetalheimovel
-- Endpoint: GET /ords/imoveis/fotodetalheimovel/
-- Tabela:   IMOVEIS.FOTOS_IMOVEL
-- Obs.: retorna todas as fotos; filtragem por id_imovel
--       e ordenacao por ordem sao feitas no frontend
-- =============================================================
BEGIN
    ORDS.DEFINE_MODULE(
        p_module_name    => 'fotodetalheimovel',
        p_base_path      => '/fotodetalheimovel/',
        p_items_per_page => 500,
        p_status         => 'PUBLISHED',
        p_comments       => 'Fotos dos imoveis para galeria de detalhe'
    );

    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'fotodetalheimovel',
        p_pattern     => '.'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'fotodetalheimovel',
        p_pattern        => '.',
        p_method         => 'GET',
        p_source_type    => ORDS.source_type_collection_feed,
        p_items_per_page => 500,
        p_comments       => 'Retorna todas as fotos ordenadas por imovel e sequencia',
        p_source         =>
            'SELECT id_foto,
                    id_imovel,
                    url,
                    ordem,
                    foto_principal
             FROM imoveis.fotos_imovel
             ORDER BY id_imovel, ordem, id_foto'
    );

    COMMIT;
END;
/
