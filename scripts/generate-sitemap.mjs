import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

const SITE_URL = 'https://fabianecorretora.com.br';
const PROPERTY_ENDPOINT =
  'https://gfeee0b664f71e7-dbimoveis.adb.sa-saopaulo-1.oraclecloudapps.com/ords/imoveis/cardhomesite/';

const staticRoutes = ['/', '/sobre', '/contato'];

const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toAbsoluteUrl = (route) => `${SITE_URL}${route}`;

const createUrlEntry = (url, lastmod) => `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;

async function fetchPropertyRoutes() {
  try {
    const response = await fetch(PROPERTY_ENDPOINT);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

    const routes = items
      .map((item) => item?.id ?? item?.ID ?? item?.imovel_id ?? item?.id_imovel)
      .filter(Boolean)
      .map((id) => `/imovel/${id}`);

    return Array.from(new Set(routes));
  } catch (error) {
    console.warn('[sitemap] Falha ao buscar imóveis da API. Gerando sitemap apenas com rotas estáticas.');
    console.warn(error instanceof Error ? error.message : error);
    return [];
  }
}

async function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const propertyRoutes = await fetchPropertyRoutes();
  const urls = [...staticRoutes, ...propertyRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((route) => createUrlEntry(toAbsoluteUrl(route), today)).join('\n')}
</urlset>
`;

  await mkdir(publicDir, { recursive: true });
  await writeFile(sitemapPath, xml, 'utf8');

  console.log(`[sitemap] Gerado com ${urls.length} URLs em ${sitemapPath}`);
}

generateSitemap().catch((error) => {
  console.error('[sitemap] Erro ao gerar sitemap.xml');
  console.error(error);
  process.exitCode = 1;
});
