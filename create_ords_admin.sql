-- =============================================================
-- ORDS Auto-REST — Endpoints de Escrita para o Sistema Admin
-- Owner/Schema: IMOVEIS
-- Executar APÓS create_tables.sql e create_ords.sql
--
-- Endpoints gerados:
--   GET/POST   /ords/imoveis/imovel/
--   GET/PUT/DELETE /ords/imoveis/imovel/{id_imovel}
--
--   GET/POST   /ords/imoveis/foto/
--   GET/DELETE /ords/imoveis/foto/{id_foto}
--
--   GET/PUT    /ords/imoveis/config/{id}
-- =============================================================


BEGIN
  -- Auto-REST na tabela IMOVEIS (alias: imovel)
  -- Fornece: GET / POST / PUT / DELETE
  ORDS.ENABLE_OBJECT(
    p_enabled        => TRUE,
    p_schema         => 'IMOVEIS',
    p_object         => 'IMOVEIS',
    p_object_type    => 'TABLE',
    p_object_alias   => 'imovel',
    p_auto_rest_auth => FALSE
  );

  -- Auto-REST na tabela FOTOS_IMOVEL (alias: foto)
  -- Fornece: GET / POST / DELETE
  ORDS.ENABLE_OBJECT(
    p_enabled        => TRUE,
    p_schema         => 'IMOVEIS',
    p_object         => 'FOTOS_IMOVEL',
    p_object_type    => 'TABLE',
    p_object_alias   => 'foto',
    p_auto_rest_auth => FALSE
  );

  -- Auto-REST na tabela CUSTOMIZACAO_SITE (alias: config)
  -- Fornece: GET / PUT (usado para salvar as configurações do site)
  ORDS.ENABLE_OBJECT(
    p_enabled        => TRUE,
    p_schema         => 'IMOVEIS',
    p_object         => 'CUSTOMIZACAO_SITE',
    p_object_type    => 'TABLE',
    p_object_alias   => 'config',
    p_auto_rest_auth => FALSE
  );

  COMMIT;
END;
/


-- =============================================================
-- Verificar endpoints criados
-- =============================================================
SELECT
    'https://gfeee0b664f71e7-dbimoveis.adb.sa-saopaulo-1.oraclecloudapps.com/ords/imoveis'
    || m.uri_prefix
    || REPLACE(t.uri_template, '.', '') AS url_completa,
    h.method,
    m.name   AS modulo,
    m.status
FROM user_ords_modules   m
JOIN user_ords_templates t ON t.module_id   = m.id
JOIN user_ords_handlers  h ON h.template_id = t.id
ORDER BY m.name, h.method;
