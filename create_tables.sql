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


-- =============================================================
-- TABELA: USUARIOS_SISTEMA
-- Usuarios administrativos do sistema
-- =============================================================
CREATE TABLE imoveis.usuarios_sistema (
    id_usuario      NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario         VARCHAR2(100)   NOT NULL,
    nome            VARCHAR2(200),
    senha_salt      VARCHAR2(64)    NOT NULL,
    senha_hash      VARCHAR2(64)    NOT NULL,
    ativo           NUMBER(1)       DEFAULT 1 NOT NULL,
    dt_criacao      TIMESTAMP       DEFAULT SYSTIMESTAMP,
    dt_atualizacao  TIMESTAMP       DEFAULT SYSTIMESTAMP,

    CONSTRAINT uk_usuarios_sistema_usuario UNIQUE (usuario)
);

COMMENT ON TABLE imoveis.usuarios_sistema IS 'Usuarios que podem acessar o sistema administrativo.';
COMMENT ON COLUMN imoveis.usuarios_sistema.senha_salt IS 'Salt unico por usuario para composicao do hash da senha.';
COMMENT ON COLUMN imoveis.usuarios_sistema.senha_hash IS 'Hash SHA-256 da senha com salt.';
COMMENT ON COLUMN imoveis.usuarios_sistema.ativo IS '1 = usuario ativo, 0 = bloqueado.';


-- =============================================================
-- TABELA: SESSOES_SISTEMA
-- Tokens de sessao do painel administrativo
-- =============================================================
CREATE TABLE imoveis.sessoes_sistema (
    id_sessao         NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario        NUMBER          NOT NULL,
    token             VARCHAR2(128)   NOT NULL,
    ativo             NUMBER(1)       DEFAULT 1 NOT NULL,
    dt_criacao        TIMESTAMP       DEFAULT SYSTIMESTAMP,
    dt_ultimo_acesso  TIMESTAMP       DEFAULT SYSTIMESTAMP,
    dt_expiracao      TIMESTAMP       NOT NULL,

    CONSTRAINT fk_sessoes_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES imoveis.usuarios_sistema (id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uk_sessoes_sistema_token UNIQUE (token)
);

COMMENT ON TABLE imoveis.sessoes_sistema IS 'Sessoes autenticadas do sistema administrativo.';
COMMENT ON COLUMN imoveis.sessoes_sistema.token IS 'Token aleatorio de sessao usado pelo frontend nas operacoes administrativas.';
COMMENT ON COLUMN imoveis.sessoes_sistema.dt_expiracao IS 'Horario limite de validade da sessao.';

CREATE INDEX idx_usuarios_sistema_usuario ON imoveis.usuarios_sistema (usuario);
CREATE INDEX idx_sessoes_sistema_token ON imoveis.sessoes_sistema (token);
CREATE INDEX idx_sessoes_sistema_usuario ON imoveis.sessoes_sistema (id_usuario, ativo, dt_expiracao);


-- =============================================================
-- PACOTE: PKG_AUTH_SISTEMA
-- Regras de autenticacao, hash de senha e sessao
-- =============================================================
CREATE OR REPLACE PACKAGE pkg_auth_sistema AS
    c_duracao_sessao_min CONSTANT PLS_INTEGER := 480;

    FUNCTION gerar_salt RETURN VARCHAR2;
    FUNCTION hash_senha(p_salt VARCHAR2, p_senha VARCHAR2) RETURN VARCHAR2;
    PROCEDURE criar_usuario(
        p_usuario IN VARCHAR2,
        p_senha   IN VARCHAR2,
        p_nome    IN VARCHAR2 DEFAULT NULL
    );
    FUNCTION autenticar(
        p_usuario IN VARCHAR2,
        p_senha   IN VARCHAR2
    ) RETURN NUMBER;
    FUNCTION criar_sessao(
        p_id_usuario IN NUMBER,
        p_duracao_minutos IN PLS_INTEGER DEFAULT c_duracao_sessao_min
    ) RETURN VARCHAR2;
    FUNCTION validar_sessao(
        p_token IN VARCHAR2,
        p_renovar_minutos IN PLS_INTEGER DEFAULT c_duracao_sessao_min
    ) RETURN NUMBER;
    PROCEDURE encerrar_sessao(p_token IN VARCHAR2);
END pkg_auth_sistema;
/

CREATE OR REPLACE PACKAGE BODY pkg_auth_sistema AS
    FUNCTION gerar_salt RETURN VARCHAR2 IS
    BEGIN
        RETURN RAWTOHEX(SYS_GUID()) || RAWTOHEX(SYS_GUID());
    END gerar_salt;

    FUNCTION hash_senha(p_salt VARCHAR2, p_senha VARCHAR2) RETURN VARCHAR2 IS
        v_hash VARCHAR2(64);
    BEGIN
        SELECT STANDARD_HASH(NVL(p_salt, '') || NVL(p_senha, ''), 'SHA256')
          INTO v_hash
          FROM dual;

        RETURN v_hash;
    END hash_senha;

    PROCEDURE criar_usuario(
        p_usuario IN VARCHAR2,
        p_senha   IN VARCHAR2,
        p_nome    IN VARCHAR2 DEFAULT NULL
    ) IS
        v_salt VARCHAR2(64);
    BEGIN
        v_salt := gerar_salt();

        INSERT INTO usuarios_sistema (
            usuario,
            nome,
            senha_salt,
            senha_hash,
            ativo
        ) VALUES (
            LOWER(TRIM(p_usuario)),
            p_nome,
            v_salt,
            hash_senha(v_salt, p_senha),
            1
        );
    END criar_usuario;

    FUNCTION autenticar(
        p_usuario IN VARCHAR2,
        p_senha   IN VARCHAR2
    ) RETURN NUMBER IS
        v_id_usuario usuarios_sistema.id_usuario%TYPE;
    BEGIN
        SELECT u.id_usuario
          INTO v_id_usuario
          FROM usuarios_sistema u
         WHERE u.usuario = LOWER(TRIM(p_usuario))
           AND u.ativo = 1
           AND u.senha_hash = hash_senha(u.senha_salt, p_senha);

        RETURN v_id_usuario;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
    END autenticar;

    FUNCTION criar_sessao(
        p_id_usuario IN NUMBER,
        p_duracao_minutos IN PLS_INTEGER DEFAULT c_duracao_sessao_min
    ) RETURN VARCHAR2 IS
        v_token VARCHAR2(128);
    BEGIN
        v_token := LOWER(RAWTOHEX(SYS_GUID()) || RAWTOHEX(SYS_GUID()));

        INSERT INTO sessoes_sistema (
            id_usuario,
            token,
            ativo,
            dt_expiracao
        ) VALUES (
            p_id_usuario,
            v_token,
            1,
            SYSTIMESTAMP + NUMTODSINTERVAL(p_duracao_minutos, 'MINUTE')
        );

        RETURN v_token;
    END criar_sessao;

    FUNCTION validar_sessao(
        p_token IN VARCHAR2,
        p_renovar_minutos IN PLS_INTEGER DEFAULT c_duracao_sessao_min
    ) RETURN NUMBER IS
        v_id_usuario sessoes_sistema.id_usuario%TYPE;
    BEGIN
        IF TRIM(p_token) IS NULL THEN
            RETURN NULL;
        END IF;

        SELECT s.id_usuario
          INTO v_id_usuario
          FROM sessoes_sistema s
          JOIN usuarios_sistema u
            ON u.id_usuario = s.id_usuario
         WHERE s.token = TRIM(p_token)
           AND s.ativo = 1
           AND s.dt_expiracao > SYSTIMESTAMP
           AND u.ativo = 1;

        UPDATE sessoes_sistema
           SET dt_ultimo_acesso = SYSTIMESTAMP,
               dt_expiracao = SYSTIMESTAMP + NUMTODSINTERVAL(p_renovar_minutos, 'MINUTE')
         WHERE token = TRIM(p_token);

        RETURN v_id_usuario;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
    END validar_sessao;

    PROCEDURE encerrar_sessao(p_token IN VARCHAR2) IS
    BEGIN
        UPDATE sessoes_sistema
           SET ativo = 0,
               dt_expiracao = SYSTIMESTAMP
         WHERE token = TRIM(p_token);
    END encerrar_sessao;
END pkg_auth_sistema;
/


-- =============================================================
-- USUARIO INICIAL DO SISTEMA
-- Altere a senha logo apos publicar em producao
-- =============================================================
BEGIN
    BEGIN
        pkg_auth_sistema.criar_usuario(
            p_usuario => 'admin',
            p_senha   => '35952!', -- CRECI
            p_nome    => 'Administrador'
        );
    EXCEPTION
        WHEN DUP_VAL_ON_INDEX THEN
            NULL;
    END;
    COMMIT;
END;
/
BEGIN
    BEGIN
        pkg_auth_sistema.criar_usuario(
            p_usuario => 'fabi',
            p_senha   => '35952!@#', -- CRECI
            p_nome    => 'Fabiane Niewierowska'
        );
    EXCEPTION
        WHEN DUP_VAL_ON_INDEX THEN
            NULL;
    END;
    COMMIT;
END;
/
