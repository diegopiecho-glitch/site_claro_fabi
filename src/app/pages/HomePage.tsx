import { useState, useEffect } from 'react';
import {
  Search,
  Instagram,
  Facebook,
  MessageCircle,
  MapPin,
  Home,
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router';
import { PropertyCard } from '../components/PropertyCard';
import { SocialButton } from '../components/SocialButton';
import { Seo } from '../components/Seo';
import { API } from '../lib/api';

interface Property {
  id: number;
  title: string;
  subtitle: string;
  price: number;
  type: 'casa' | 'apartamento' | 'terreno';
  city: string;
  image: string;
  quartos?: number;
  banheiros?: number;
  garagem?: number;
  area?: number;
}

interface SiteConfig {
  url_imagem_home_site?: string;
  URL_IMAGEM_HOME_SITE?: string;
  url_logotipo?: string;
  URL_LOGOTIPO?: string;
  titulo_home_site?: string | number;
  subtitulo_home_site?: string | number;
  descricao_rodape?: string | number;
  link_instagram?: string | number;
  link_faceboock?: string | number;
  whatsapp?: string | number;
  nome_corretor?: string | number;
  endereco_contato_site?: string | number;
  frase_contato_site?: string | number;
  endereco_site?: string | number;
  url_site?: string | number;
  URL_SITE?: string | number;
}

const CONFIG_CACHE_KEY = 'site_config_home';
const CONFIG_CACHE_TTL = 1000 * 60 * 1; // 1 minuto

export function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('');

  const [homeImage, setHomeImage] = useState<string>('');
  const [homeImageLoaded, setHomeImageLoaded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const fallbackHomeImage =
    'https://69b97c0b315a7263c988316a.imgix.net/capa.jpg?fit=fill&auto=format';

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
        String(cfg?.url_imagem_home_site ?? cfg?.URL_IMAGEM_HOME_SITE ?? '') ||
        fallbackHomeImage;

      const img = new Image();
      img.src = imageUrl;

      img.onload = () => {
        setHomeImage(imageUrl);
        setHomeImageLoaded(true);
        setTimeout(() => setContentVisible(true), 150);
      };

      img.onerror = () => {
        setHomeImage(fallbackHomeImage);
        setHomeImageLoaded(true);
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
        setHomeImage(fallbackHomeImage);
        setHomeImageLoaded(true);
        setTimeout(() => setContentVisible(true), 150);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(API.IMOVEIS_LISTA);

        if (!response.ok) {
          throw new Error('Erro ao carregar imóveis');
        }

        const data = await response.json();
        const items = data.items || data;

        const formattedProperties: Property[] = items.map((item: any) => {
          return {
            id: Number(item.id || item.ID || item.imovel_id || item.id_imovel || 0),
            title: item.title || item.titulo || item.nome || 'Sem título',
            subtitle:
              item.bairro ||
              item.BAIRRO ||
              item.subtitle ||
              item.subtitulo ||
              item.endereco ||
              item.descricao ||
              '',
            price: parseFloat(
              (item.price || item.preco || item.valor || '0')
                .toString()
                .replace(/\./g, '')
                .replace(',', '.')
            ),
            type: (item.type || item.tipo || 'casa').toLowerCase() as
              | 'casa'
              | 'apartamento'
              | 'terreno',
            city: item.city || item.cidade || '',
            image:
              item.image ||
              item.imagem ||
              item.foto ||
              'https://images.unsplash.com/photo-1760887497519-3b1c5a525836?w=400',
            quartos:
              parseInt(
                item.quartos ||
                item.n_quartos ||
                item.num_quartos ||
                item.qtd_quartos ||
                item.dormitorios ||
                item.n_dormitorios ||
                '0',
                10
              ) || undefined,
            banheiros:
              parseInt(
                item.banheiros ||
                item.n_banheiros ||
                item.num_banheiros ||
                item.qtd_banheiros ||
                '0',
                10
              ) || undefined,
            garagem:
              parseInt(
                item.garagem ||
                item.n_garagem ||
                item.vagas ||
                item.n_vagas ||
                item.num_vagas ||
                item.qtd_vagas ||
                '0',
                10
              ) || undefined,
            area:
              parseFloat(
                item.area ||
                item.area_total ||
                item.m2 ||
                item.metragem ||
                item.area_m2 ||
                '0'
              ) || undefined
          };
        });

        setProperties(formattedProperties);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        console.error('Erro ao buscar imóveis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const nomecorretor = String(config?.nome_corretor ?? 'Corretor de Imóveis');

  const titulo = String(config?.titulo_home_site ?? 'Seu próximo imóvel está aqui');

  const subtitulo = String(
    config?.subtitulo_home_site ??
    'Sua corretora de confiança para encontrar as melhores oportunidades do mercado imobiliário'
  );

  const rodape = String(
    config?.descricao_rodape ??
    '© 2026 Corretora de Imóveis. Todos os direitos reservados.'
  );

  const instagram = String(config?.link_instagram ?? '#');
  const facebook = String(config?.link_faceboock ?? '#');

  const whatsappNumero = String(config?.whatsapp ?? '').replace(/\D/g, '');
  const whatsapp = whatsappNumero ? `https://wa.me/${whatsappNumero}` : '#';

  const logoUrl = String(config?.url_logotipo ?? config?.URL_LOGOTIPO ?? '');
  const enderecoContato = String(config?.endereco_contato_site ?? '').trim();
  const fraseContato = String(config?.frase_contato_site ?? '').trim();
  const baseUrl = String(
    config?.endereco_site ?? config?.url_site ?? config?.URL_SITE ?? ''
  ).trim();
  const seoUrl =
    (baseUrl ? baseUrl.replace(/\/$/, '') : window.location.origin) + '/';
  const seoImage = homeImage || fallbackHomeImage;
  const seoTitle = enderecoContato
    ? `Imóveis em ${enderecoContato}`
    : `${nomecorretor} | Imóveis à venda e aluguel`;
  const seoDescription = [nomecorretor, fraseContato || subtitulo]
    .filter(Boolean)
    .join(' - ');

  const cities = Array.from(new Set(properties.map((p) => p.city).filter(Boolean)));

  const filteredProperties = properties.filter((property) => {
    const typeMatch = !selectedType || property.type === selectedType;
    const cityMatch = !selectedCity || property.city === selectedCity;

    let priceMatch = true;
    if (priceRange) {
      const price = property.price;
      switch (priceRange) {
        case '0-500k':
          priceMatch = price <= 500000;
          break;
        case '500k-1m':
          priceMatch = price > 500000 && price <= 1000000;
          break;
        case '1m-2m':
          priceMatch = price > 1000000 && price <= 2000000;
          break;
        case '2m+':
          priceMatch = price > 2000000;
          break;
      }
    }

    return typeMatch && cityMatch && priceMatch;
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Seo
        nomecorretor={nomecorretor}
        title={seoTitle}
        description={seoDescription}
        url={seoUrl}
        image={seoImage}
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
  <Link
    to="/sobre"
    className="inline-flex justify-center rounded-full border border-slate-200 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
  >
    Sobre
  </Link>

  <Link
    to="/contato"
    className="inline-flex justify-center rounded-full bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-700"
  >
    Contato
  </Link>
</div>
        </div>
      </nav>

      <header className="relative overflow-hidden min-h-[720px] flex items-center px-6">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-[1400ms] ease-out ${homeImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
            }`}
          style={{
            backgroundImage: `url('${homeImage || fallbackHomeImage}')`
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/25 to-white/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-amber-900/10" />

        <div className="relative max-w-7xl mx-auto w-full">
          {configLoading ? (
            <div className="text-center mb-12 animate-pulse">
              <div className="h-12 md:h-16 w-80 max-w-full bg-white/70 rounded-xl mx-auto mb-4 shadow-sm" />
              <div className="h-5 w-[600px] max-w-full bg-white/60 rounded-lg mx-auto mb-2" />
              <div className="h-5 w-[480px] max-w-full bg-white/50 rounded-lg mx-auto" />
            </div>
          ) : (
            <div
              className={`text-center mb-14 transition-all duration-1000 ease-out ${contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
            >
              <div className="flex justify-center mb-6">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logotipo"
                    className="h-20 md:h-50 w-auto object-contain drop-shadow-sm"
                  />
                )}
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-slate-900 tracking-tight drop-shadow-sm">
                {titulo}
              </h1>

              <p className="text-slate-100 max-w-3xl mx-auto text-base md:text-lg leading-relaxed drop-shadow-md">
                {subtitulo}
              </p>
            </div>
          )}

          <div
            className={`bg-white/80 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-5xl mx-auto shadow-2xl border border-white/70 transition-all duration-1000 ease-out ${contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">
                  Tipo de Imóvel
                </label>
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-white/90 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 appearance-none cursor-pointer hover:border-amber-400 focus:border-amber-500 focus:outline-none transition-colors shadow-sm"
                  >
                    <option value="">Todos</option>
                    <option value="casa">Casa</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="terreno">Terreno</option>
                  </select>
                  <Home
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={18}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Cidade</label>
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-white/90 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 appearance-none cursor-pointer hover:border-amber-400 focus:border-amber-500 focus:outline-none transition-colors shadow-sm"
                  >
                    <option value="">Todas</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <MapPin
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={18}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">
                  Faixa de Preço
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full bg-white/90 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 appearance-none cursor-pointer hover:border-amber-400 focus:border-amber-500 focus:outline-none transition-colors shadow-sm"
                >
                  <option value="">Qualquer valor</option>
                  <option value="0-500k">Até R$ 500.000</option>
                  <option value="500k-1m">R$ 500.000 - R$ 1.000.000</option>
                  <option value="1m-2m">R$ 1.000.000 - R$ 2.000.000</option>
                  <option value="2m+">Acima de R$ 2.000.000</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-600 invisible md:visible">
                  ...
                </label>
                <button
                  type="button"
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5"
                >
                  <Search size={20} />
                  <span>Buscar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 bg-white">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-amber-600 mb-4" size={48} />
            <p className="text-slate-600">Carregando imóveis...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-center gap-4 shadow-sm">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-red-700 mb-1 font-semibold">
                Erro ao carregar imóveis
              </h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-10">
              <span className="inline-block mb-3 text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
                Imóveis em destaque
              </span>
              <h2 className="mb-2 text-slate-900 text-3xl md:text-4xl font-bold tracking-tight">
                Oportunidades de Negócio
              </h2>
              <p className="text-slate-600">
                {filteredProperties.length}{' '}
                {filteredProperties.length === 1
                  ? 'imóvel encontrado'
                  : 'imóveis encontrados'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {filteredProperties.length === 0 && properties.length > 0 && (
              <div className="text-center py-16">
                <Building2 className="mx-auto mb-4 text-slate-400" size={64} />
                <h3 className="mb-2 text-slate-600 text-xl font-semibold">
                  Nenhum imóvel encontrado
                </h3>
                <p className="text-slate-500">Tente ajustar os filtros de busca</p>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="mb-4 text-white text-2xl font-semibold">Entre em Contato</h3>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Tem alguma dúvida ou quer agendar uma visita? Entre em contato através
            das nossas redes sociais.
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

          <div className="mt-12 pt-8 border-t border-slate-800 text-slate-400 text-sm">
            <p>{rodape}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
