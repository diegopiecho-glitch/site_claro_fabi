-- =============================================================
-- DDL - Oracle Autonomous Database (ORDS)
-- Owner:   IMOVEIS
-- Tabelas: CUSTOMIZACAO_SITE, IMOVEIS, FOTOS_IMOVEL
-- View:    CARDHOMESITE
-- =============================================================

-- =============================================================
-- TABELA: CUSTOMIZACAO_SITE
-- Endpoint: /ords/imoveis/customizacao_site/
-- Configuracoes gerais do site (home, sobre, contato, redes)
-- =============================================================
CREATE TABLE imoveis.customizacao_site (
    id                           NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Redirecionamento de sistema
    rota_sistema_site            VARCHAR2(500),

    -- Pagina Home
    titulo_home_site             VARCHAR2(500),
    subtitulo_home_site          VARCHAR2(1000),
    url_imagem_home_site         VARCHAR2(2000),

    -- Pagina Sobre
    titulo_sobre_site            VARCHAR2(500),
    subtitulo_sobre_site         VARCHAR2(1000),
    titulo_descricao_sobre_site  VARCHAR2(500),
    descricao_sobre_site         CLOB,
    url_foto_sobre_site          VARCHAR2(2000),

    -- Identidade visual
    url_logotipo                 VARCHAR2(2000),

    -- Rodape
    descricao_rodape             VARCHAR2(1000),

    -- Redes sociais
    link_instagram               VARCHAR2(500),
    link_faceboock               VARCHAR2(500),    -- Atencao: typo original com dois C (mantido para compatibilidade)
    whatsapp                     VARCHAR2(30),

    -- Corretor
    nome_corretor                VARCHAR2(200),

    -- Pagina Contato
    endereco_contato_site        VARCHAR2(500),
    frase_contato_site           VARCHAR2(1000),
    telefone_contato1            VARCHAR2(30),
    telefone_contato2            VARCHAR2(30),
    url_mapa_contato_site        CLOB,            -- URL do iframe do Google Maps

    -- URL do site
    url_site                     VARCHAR2(500),
    endereco_site                VARCHAR2(500),

    -- Controle
    dt_criacao                   TIMESTAMP        DEFAULT SYSTIMESTAMP,
    dt_atualizacao               TIMESTAMP        DEFAULT SYSTIMESTAMP
);

COMMENT ON TABLE  imoveis.customizacao_site                        IS 'Configuracoes gerais do site imobiliario';
COMMENT ON COLUMN imoveis.customizacao_site.link_faceboock         IS 'Campo com typo original (dois C). Nao corrigir para nao quebrar o frontend.';
COMMENT ON COLUMN imoveis.customizacao_site.url_mapa_contato_site  IS 'URL completa do iframe do Google Maps para a pagina de contato';


-- =============================================================
-- TABELA: IMOVEIS
-- Endpoints: /ords/imoveis/cardhomesite/
--            /ords/imoveis/imoveis/detalhe/{id}
-- =============================================================
CREATE TABLE imoveis.imoveis (
    id_imovel       NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Descricao
    titulo          VARCHAR2(500)   NOT NULL,
    subtitulo       VARCHAR2(1000),
    descricao       CLOB,

    -- Classificacao
    tipo            VARCHAR2(50),               -- 'casa', 'apartamento', 'terreno'
    ativo           NUMBER(1)       DEFAULT 1,  -- 1 = ativo, 0 = inativo

    -- Localizacao
    cidade          VARCHAR2(200),
    bairro          VARCHAR2(200),
    endereco        VARCHAR2(500),

    -- Valores
    preco           NUMBER(15, 2),

    -- Caracteristicas
    quartos         NUMBER(3),
    banheiros       NUMBER(3),
    garagem         NUMBER(3),
    area            NUMBER(10, 2),             -- Area em m2

    -- Imagem de capa (exibida nos cards da home)
    imagem          VARCHAR2(2000),

    -- Controle
    dt_criacao      TIMESTAMP       DEFAULT SYSTIMESTAMP,
    dt_atualizacao  TIMESTAMP       DEFAULT SYSTIMESTAMP
);

COMMENT ON TABLE  imoveis.imoveis          IS 'Cadastro de imoveis. Campo imagem e a capa usada nos cards da home.';
COMMENT ON COLUMN imoveis.imoveis.tipo     IS 'Valores esperados pelo frontend: casa | apartamento | terreno';
COMMENT ON COLUMN imoveis.imoveis.ativo    IS '1 = visivel no site, 0 = oculto';
COMMENT ON COLUMN imoveis.imoveis.imagem   IS 'URL da imagem de capa exibida nos cards da home page';
COMMENT ON COLUMN imoveis.imoveis.area     IS 'Area total em metros quadrados';


-- =============================================================
-- TABELA: FOTOS_IMOVEL
-- Endpoint: /ords/imoveis/fotodetalheimovel/
-- Galeria de fotos do detalhe do imovel
-- =============================================================
CREATE TABLE imoveis.fotos_imovel (
    id_foto         NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_imovel       NUMBER          NOT NULL,
    url             VARCHAR2(2000)  NOT NULL,
    ordem           NUMBER(5)       DEFAULT 0,
    dt_criacao      TIMESTAMP       DEFAULT SYSTIMESTAMP,

    CONSTRAINT fk_fotos_imovel
        FOREIGN KEY (id_imovel)
        REFERENCES imoveis.imoveis (id_imovel)
        ON DELETE CASCADE
);

COMMENT ON TABLE  imoveis.fotos_imovel           IS 'Fotos da galeria do detalhe do imovel. Filtradas no frontend por id_imovel.';
COMMENT ON COLUMN imoveis.fotos_imovel.url       IS 'URL publica da imagem';
COMMENT ON COLUMN imoveis.fotos_imovel.ordem     IS 'Ordem de exibicao no carrossel. Menor numero aparece primeiro.';


-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX idx_imoveis_tipo        ON imoveis.imoveis (tipo);
CREATE INDEX idx_imoveis_cidade      ON imoveis.imoveis (cidade);
CREATE INDEX idx_imoveis_ativo       ON imoveis.imoveis (ativo);
CREATE INDEX idx_fotos_id_imovel     ON imoveis.fotos_imovel (id_imovel);
CREATE INDEX idx_fotos_ordem         ON imoveis.fotos_imovel (id_imovel, ordem);


-- =============================================================
-- VIEW: CARDHOMESITE
-- Utilizada pelo modulo ORDS /cardhomesite/
-- Retorna apenas imoveis ativos com os campos necessarios
-- para os cards da home page
-- =============================================================
CREATE OR REPLACE VIEW imoveis.cardhomesite AS
SELECT
    i.id_imovel,
    i.titulo,
    i.subtitulo,
    i.bairro,
    i.endereco,
    i.preco,
    i.tipo,
    i.cidade,
    i.quartos,
    i.banheiros,
    i.garagem,
    i.area,
    i.imagem AS foto
FROM
    imoveis.imoveis i
WHERE
    i.ativo = 1
ORDER BY
    i.dt_criacao DESC;

COMMENT ON TABLE imoveis.cardhomesite IS 'View usada pelo endpoint ORDS /cardhomesite/. Retorna imoveis ativos para os cards da home.';
