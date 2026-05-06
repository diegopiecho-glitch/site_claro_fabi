import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Instagram,
  Facebook,
  MessageCircle,
  Award,
  Users,
  Heart,
  TrendingUp,
  Home
} from 'lucide-react';
import { SocialButton } from '../components/SocialButton';
import { Seo } from '../components/Seo';
import { API } from '../lib/api';

interface SiteConfig {
  titulo_home_site?: string | number;
  subtitulo_home_site?: string | number;
  descricao_rodape?: string | number;
  link_instagram?: string | number;
  link_faceboock?: string | number;
  whatsapp?: string | number;
  nome_corretor?: string | number;
  url_logotipo?: string;
  URL_LOGOTIPO?: string;

  titulo_sobre_site?: string | number;
  subtitulo_sobre_site?: string | number;
  titulo_descricao_sobre_site?: string | number;
  descricao_sobre_site?: string | number;
  url_foto_sobre_site?: string;
  URL_FOTO_SOBRE_SITE?: string;
}

const CONFIG_CACHE_KEY = 'site_config_home';
const CONFIG_CACHE_TTL = 1000 * 60 * 1; // 1 minuto

export function AboutPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);

  const fallbackImage =
    'https://69b97c0b315a7263c988316a.imgix.net/capa.jpg?fit=fill&auto=format';

  const [aboutImage, setAboutImage] = useState<string>(fallbackImage);
  const [aboutImageLoaded, setAboutImageLoaded] = useState(false);

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

      const imageUrl =
        String(cfg?.url_foto_sobre_site ?? cfg?.URL_FOTO_SOBRE_SITE ?? '') ||
        fallbackImage;

      const img = new Image();
      img.src = imageUrl;

      img.onload = () => {
        setAboutImage(imageUrl);
        setAboutImageLoaded(true);
        setTimeout(() => setContentVisible(true), 150);
      };

      img.onerror = () => {
        setAboutImage(fallbackImage);
        setAboutImageLoaded(true);
        setTimeout(() => setContentVisible(true), 150);
      };
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

        const response = await fetch(API.CONFIG_LISTA);

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
        setAboutImage(fallbackImage);
        setAboutImageLoaded(true);
        setTimeout(() => setContentVisible(true), 150);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const nomecorretor = String(config?.nome_corretor ?? 'Corretor de Imóveis');

  const tituloSobre = String(config?.titulo_sobre_site ?? 'Sobre Mim');

  const subtituloSobre = String(
    config?.subtitulo_sobre_site ??
      'Sua parceira de confiança na realização do sonho da casa própria'
  );

  const tituloDescricaoSobre = String(
    config?.titulo_descricao_sobre_site ?? 'Fabiane Niewierowska'
  );

  const descricaoSobre = String(
    config?.descricao_sobre_site ??
      'Fabiane Niewierowska é mais do que uma Corretora de Imóveis — é uma profissional que entende que cada imóvel carrega histórias, sonhos e novos começos.'
  );

  const rodape = String(
    config?.descricao_rodape ??
      '© 2026 Fabiane Niewierowska - Corretora de Imóveis. Todos os direitos reservados.'
  );

  const instagram = String(config?.link_instagram ?? '#');
  const facebook = String(config?.link_faceboock ?? '#');

  const whatsappNumero = String(config?.whatsapp ?? '').replace(/\D/g, '');
  const whatsapp = whatsappNumero ? `https://wa.me/${whatsappNumero}` : '#';

  const logoUrl = String(config?.url_logotipo ?? config?.URL_LOGOTIPO ?? '');
  const baseUrl = window.location.origin;
  const seoUrl = `${baseUrl}/sobre`;
  const seoTitle = `${tituloSobre} | ${nomecorretor}`;
  const seoDescription = [subtituloSobre, descricaoSobre]
    .filter(Boolean)
    .join(' - ')
    .slice(0, 320);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Seo
        nomecorretor={nomecorretor}
        title={seoTitle}
        description={seoDescription}
        url={seoUrl}
        image={aboutImage}
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
  <Link
    to="/"
    className="inline-flex justify-center items-center rounded-full border border-slate-200 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
  >
    Home
  </Link>

  <Link
    to="/contato"
    className="inline-flex justify-center items-center rounded-full bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-700"
  >
    Contato
  </Link>
</div>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden min-h-[560px] md:min-h-[720px] flex items-center px-6">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-[1400ms] ease-out ${
            aboutImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
          }`}
          style={{
            backgroundImage: `url('${aboutImage}')`
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/25 to-white/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-amber-900/10" />

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
              className={`text-center mb-14 transition-all duration-1000 ease-out ${
                contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="inline-block mb-4 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/70 shadow-sm">
                <span className="text-xs md:text-sm font-medium tracking-[0.20em] uppercase text-amber-700">
                  Conheça minha trajetória
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-slate-900 tracking-tight drop-shadow-sm">
                {tituloSobre}
              </h1>

              <p className="text-slate-100 max-w-3xl mx-auto text-base md:text-lg leading-relaxed drop-shadow-md">
                {subtituloSobre}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div
            className={`order-2 lg:order-1 transition-all duration-1000 ease-out ${
              contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
            }`}
          >
            <div className="relative rounded-2xl overflow-hidden border-4 border-amber-600/30 shadow-2xl shadow-amber-600/10 bg-slate-100 min-h-[320px]">
              {!aboutImageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-slate-200" />
              )}

              <img
                src={aboutImage}
                alt={tituloDescricaoSobre}
                className={`w-full h-full object-cover transition-opacity duration-1000 ${
                  aboutImageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          </div>

          <div
            className={`order-1 lg:order-2 flex flex-col justify-center transition-all duration-1000 ease-out ${
              contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
            }`}
          >
            <h2 className="text-3xl md:text-4xl mb-6 text-slate-900 font-bold tracking-tight">
              {tituloDescricaoSobre}
            </h2>

            <div className="text-slate-700 text-lg leading-relaxed whitespace-pre-line">
              {descricaoSobre}
            </div>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-3xl mb-12 text-center text-slate-900 font-bold tracking-tight">
            Por que escolher meus serviços?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center hover:border-amber-600/50 transition-all hover:shadow-lg">
              <div className="bg-amber-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl mb-3 text-slate-900 font-semibold">Experiência</h3>
              <p className="text-slate-600">
                16 anos de atuação no mercado imobiliário com conhecimento profundo da região
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center hover:border-amber-600/50 transition-all hover:shadow-lg">
              <div className="bg-amber-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl mb-3 text-slate-900 font-semibold">Atendimento Personalizado</h3>
              <p className="text-slate-600">
                Cada cliente é único e merece atenção especial em todas as etapas
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center hover:border-amber-600/50 transition-all hover:shadow-lg">
              <div className="bg-amber-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl mb-3 text-slate-900 font-semibold">Dedicação Total</h3>
              <p className="text-slate-600">
                Compromisso em ajudar você a realizar o sonho da casa própria
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center hover:border-amber-600/50 transition-all hover:shadow-lg">
              <div className="bg-amber-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl mb-3 text-slate-900 font-semibold">Melhores Oportunidades</h3>
              <p className="text-slate-600">
                Acesso às melhores ofertas e oportunidades do mercado
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-12 text-center shadow-xl">
          <h2 className="text-3xl md:text-4xl mb-4 text-white font-bold tracking-tight">
            Vamos conversar?
          </h2>

          <p className="text-amber-100 text-lg mb-8 max-w-2xl mx-auto">
            Estou pronta para ajudá-lo a encontrar o imóvel perfeito ou a vender o seu da melhor
            forma possível. Entre em contato e vamos iniciar essa jornada juntos!
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-amber-700 hover:bg-amber-50 px-8 py-4 rounded-lg transition-colors flex items-center gap-2 font-semibold shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Conversar no WhatsApp</span>
            </a>

            <Link
              to="/"
              className="bg-amber-700/40 hover:bg-amber-700/60 text-white px-8 py-4 rounded-lg transition-colors flex items-center gap-2 font-semibold border border-amber-300/30"
            >
              <Home size={24} />
              <span>Ver Imóveis Disponíveis</span>
            </Link>
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
