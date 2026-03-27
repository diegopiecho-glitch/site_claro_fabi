import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Instagram,
  Facebook,
  MessageCircle,
  Home,
  MapPin,
  Phone
} from 'lucide-react';
import { SocialButton } from '../components/SocialButton';
import { Seo } from '../components/Seo';

interface SiteConfig {
  titulo_home_site?: string | number;
  descricao_rodape?: string | number;
  link_instagram?: string | number;
  link_faceboock?: string | number;
  whatsapp?: string | number;
  nome_corretor?: string | number;
  url_logotipo?: string;
  URL_LOGOTIPO?: string;

  titulo_contato_site?: string | number;
  subtitulo_contato_site?: string | number;
  endereco_contato_site?: string | number;
  telefone_contato1?: string | number;
  telefone_contato2?: string | number;
  url_mapa_contato_site?: string | number;
  frase_contato_site?: string | number;

  endereco_site?: string | number;
  url_site?: string | number;
  URL_SITE?: string | number;
  url_imagem_home_site?: string;
  URL_IMAGEM_HOME_SITE?: string;
}

const CONFIG_CACHE_KEY = 'site_config_home';
const CONFIG_CACHE_TTL = 1000 * 60 * 1; // 1 minuto

export function ContactPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);

  const getCachedConfig = (): SiteConfig | null => {
    try {
      const cached = localStorage.getItem(CONFIG_CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CONFIG_CACHE_TTL;

      if (isExpired) {
        localStorage.removeItem(CONFIG_CACHE_KEY);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Erro ao ler cache da configuração:', error);
      localStorage.removeItem(CONFIG_CACHE_KEY);
      return null;
    }
  };

  const setCachedConfig = (data: SiteConfig) => {
    try {
      localStorage.setItem(
        CONFIG_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data
        })
      );
    } catch (error) {
      console.error('Erro ao salvar cache da configuração:', error);
    }
  };

  useEffect(() => {
    const applyConfig = (cfg: SiteConfig) => {
      setConfig(cfg);
      setTimeout(() => setContentVisible(true), 150);
    };

    const fetchConfig = async () => {
      try {
        setConfigLoading(true);

        const cachedConfig = getCachedConfig();
        if (cachedConfig) {
          applyConfig(cachedConfig);
          setConfigLoading(false);
          return;
        }

        const response = await fetch(
          'https://gfeee0b664f71e7-dbimoveis.adb.sa-saopaulo-1.oraclecloudapps.com/ords/imoveis/customizacao_site/'
        );

        if (!response.ok) {
          throw new Error('Erro ao carregar configuração do site');
        }

        const data = await response.json();
        const items = data.items || data;
        const cfg = items?.[0] || {};

        setCachedConfig(cfg);
        applyConfig(cfg);
      } catch (err) {
        console.error('Erro ao buscar config:', err);
        setConfig({});
        setTimeout(() => setContentVisible(true), 150);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const nomecorretor = String(config?.nome_corretor ?? 'Corretor de Imóveis');
  const logoUrl = String(config?.url_logotipo ?? config?.URL_LOGOTIPO ?? '');

  const tituloContato = String(config?.titulo_contato_site ?? 'Entre em Contato');
  const subtituloContato = String(
    config?.subtitulo_contato_site ??
      'Estou pronta para ajudar você a comprar, vender ou investir com segurança e tranquilidade.'
  );

  const fraseContato = String(
    config?.frase_contato_site ??
      'Será um prazer conversar com você e entender exatamente o que procura.'
  );

  const enderecoContato = String(config?.endereco_contato_site ?? 'Endereço não informado');
  const telefone1 = String(config?.telefone_contato1 ?? '');
  const telefone2 = String(config?.telefone_contato2 ?? '');
  const urlMapa = String(config?.url_mapa_contato_site ?? '');
  const baseUrl = String(
    config?.endereco_site ?? config?.url_site ?? config?.URL_SITE ?? ''
  ).trim();

  const rodape = String(
    config?.descricao_rodape ??
      '© 2026 Corretora de Imóveis. Todos os direitos reservados.'
  );

  const instagram = String(config?.link_instagram ?? '#');
  const facebook = String(config?.link_faceboock ?? '#');

  const whatsappNumero = String(config?.whatsapp ?? '').replace(/\D/g, '');
  const whatsapp = whatsappNumero ? `https://wa.me/${whatsappNumero}` : '#';

  const telefone1Link = telefone1 ? `tel:${telefone1.replace(/\D/g, '')}` : '#';
  const telefone2Link = telefone2 ? `tel:${telefone2.replace(/\D/g, '')}` : '#';
  const seoUrl =
    (baseUrl ? baseUrl.replace(/\/$/, '') : window.location.origin) + '/contato';
  const seoImage = String(
    config?.url_imagem_home_site ?? config?.URL_IMAGEM_HOME_SITE ?? logoUrl ?? ''
  ).trim();
  const seoTitle = enderecoContato
    ? `Contato | ${nomecorretor} em ${enderecoContato}`
    : `Contato | ${nomecorretor}`;
  const seoDescription = [nomecorretor, fraseContato, enderecoContato]
    .filter(Boolean)
    .join(' - ');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Seo
        nomecorretor={nomecorretor}
        title={seoTitle}
        description={seoDescription}
        url={seoUrl}
        image={seoImage || undefined}
      />

      <nav className="sticky top-0 z-50 border-b border-white/30 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-4 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              {configLoading ? (
                <div className="h-14 w-14 rounded-2xl bg-slate-200/80 animate-pulse shadow-sm" />
              ) : logoUrl ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 ring-1 ring-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.08)] overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logotipo"
                    className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_10px_24px_rgba(217,119,6,0.28)]">
                  <Home size={24} />
                </div>
              )}

              <div className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-[0.28em] text-amber-700 font-semibold">
                  Corretora de imóveis | Atendimento personalizado
                </span>
                <span className="font-semibold text-lg md:text-xl tracking-wide text-slate-900 transition-colors duration-300 group-hover:text-amber-700">
                  {nomecorretor}
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              Home
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden min-h-[480px] md:min-h-[520px] flex items-center px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/25 to-white/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/5 via-transparent to-amber-900/5" />

        <div className="relative max-w-7xl mx-auto w-full">
          {configLoading ? (
            <div className="text-center mb-12 animate-pulse">
              <div className="h-10 md:h-12 w-64 max-w-full bg-white/70 rounded-full mx-auto mb-6 shadow-sm" />
              <div className="h-12 md:h-16 w-80 max-w-full bg-white/70 rounded-xl mx-auto mb-4 shadow-sm" />
              <div className="h-5 w-[600px] max-w-full bg-white/60 rounded-lg mx-auto mb-2" />
              <div className="h-5 w-[480px] max-w-full bg-white/50 rounded-lg mx-auto" />
            </div>
          ) : (
            <div
              className={`text-center mb-10 transition-all duration-1000 ease-out ${
                contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="inline-block mb-4 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/70 shadow-sm">
                <span className="text-xs md:text-sm font-medium tracking-[0.20em] uppercase text-amber-700">
                  Fale comigo
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-slate-900 tracking-tight drop-shadow-sm">
                {tituloContato}
              </h1>

              <p className="text-slate-700 max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
                {subtituloContato}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div
            className={`bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 transition-all duration-1000 ease-out ${
              contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
            }`}
          >
            <span className="inline-block mb-3 text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
              Atendimento direto
            </span>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
              Vamos conversar?
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              {fraseContato}
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex-shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 className="text-sm uppercase tracking-[0.18em] text-slate-500 font-medium mb-1">
                    Endereço
                  </h3>
                  <p className="text-slate-900 text-lg">{enderecoContato}</p>
                </div>
              </div>

              {telefone1 && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex-shrink-0">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm uppercase tracking-[0.18em] text-slate-500 font-medium mb-1">
                      Telefone 1
                    </h3>
                    <a
                      href={telefone1Link}
                      className="text-slate-900 text-lg hover:text-amber-700 transition-colors"
                    >
                      {telefone1}
                    </a>
                  </div>
                </div>
              )}

              {telefone2 && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex-shrink-0">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm uppercase tracking-[0.18em] text-slate-500 font-medium mb-1">
                      Telefone 2
                    </h3>
                    <a
                      href={telefone2Link}
                      className="text-slate-900 text-lg hover:text-amber-700 transition-colors"
                    >
                      {telefone2}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 flex justify-start">
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-semibold shadow-lg transition-all hover:-translate-y-0.5"
              >
                <MessageCircle size={20} />
                <span>Chamar no WhatsApp</span>
              </a>
            </div>
          </div>

          <div
            className={`rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100 min-h-[420px] transition-all duration-1000 ease-out ${
              contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
            }`}
          >
            {urlMapa ? (
              <iframe
                src={urlMapa}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '420px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa de localização"
              />
            ) : (
              <div className="h-full min-h-[420px] flex items-center justify-center text-center px-8">
                <div>
                  <MapPin className="mx-auto mb-4 text-slate-400" size={56} />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">
                    Mapa não disponível
                  </h3>
                  <p className="text-slate-500">
                    Adicione a URL do mapa na configuração do site para exibir a
                    localização aqui.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-6 mt-20 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="mb-6 text-2xl font-semibold">Siga-me nas Redes Sociais</h3>

          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Acompanhe novidades, dicas e os melhores imóveis disponíveis
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <SocialButton
              icon={<Instagram size={24} />}
              label="Instagram"
              href={instagram}
              color="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            />
            <SocialButton
              icon={<Facebook size={24} />}
              label="Facebook"
              href={facebook}
              color="bg-blue-600 hover:bg-blue-700"
            />
            <SocialButton
              icon={<MessageCircle size={24} />}
              label="WhatsApp"
              href={whatsapp}
              color="bg-green-600 hover:bg-green-700"
            />
          </div>

          <div className="mt-12 pt-8 border-t border-slate-700 text-slate-400 text-sm">
            <p>{rodape}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
