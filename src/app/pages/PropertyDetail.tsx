import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { 
  ArrowLeft, 
  MapPin, 
  Home, 
  Bed, 
  Bath, 
  Car, 
  Ruler, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Loader2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SocialButton } from '../components/SocialButton';

interface PropertyDetails {
  id_imovel: number;
  titulo: string;
  descricao: string;
  preco: number;
  tipo: string;
  cidade: string;
  bairro: string;
  quartos?: number;
  banheiros?: number;
  garagem?: number;
  area?: number;
  endereco?: string;
  [key: string]: any;
}

interface Photo {
  id: number;
  id_imovel: number;
  url: string;
  ordem?: number;
  [key: string]: any;
}

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Buscar detalhes do imóvel
        const detailsResponse = await fetch(
          `https://gfeee0b664f71e7-dbimoveis.adb.sa-saopaulo-1.oraclecloudapps.com/ords/imoveis/imoveis/detalhe/${id}`
        );

        if (!detailsResponse.ok) {
          throw new Error('Erro ao carregar detalhes do imóvel');
        }

        const detailsData = await detailsResponse.json();
        const details = detailsData.items?.[0] || detailsData[0] || detailsData;
        
        setProperty(details);

        // Buscar fotos do imóvel
        const photosResponse = await fetch(
          `https://gfeee0b664f71e7-dbimoveis.adb.sa-saopaulo-1.oraclecloudapps.com/ords/imoveis/imoveis/fotos/${id}`
        );

        if (photosResponse.ok) {
          const photosData = await photosResponse.json();
          const photosList = photosData.items || photosData || [];
          setPhotos(photosList);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        console.error('Erro ao buscar detalhes do imóvel:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const whatsappMessage = property 
    ? `Olá! Tenho interesse no imóvel: ${property.titulo} - ${formatPrice(property.preco)}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-amber-600 mb-4" size={48} />
        <p className="text-slate-600">Carregando detalhes do imóvel...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6">
        <AlertCircle className="text-red-600 mb-4" size={48} />
        <h2 className="text-2xl mb-2 text-slate-900">Erro ao carregar imóvel</h2>
        <p className="text-slate-600 mb-6">{error || 'Imóvel não encontrado'}</p>
        <Link 
          to="/" 
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Voltar para Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header com botão voltar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm md:text-base font-medium">Voltar</span>
          </Link>
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/sobre"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-700 hover:border-amber-200 hover:text-amber-700 transition-all"
            >
              Sobre
            </Link>
            <Link
              to="/contato"
              className="inline-flex items-center rounded-full bg-amber-600 text-white px-4 py-2 text-sm hover:bg-amber-700 transition-all"
            >
              Contato
            </Link>
          </div>
        </div>
      </div>

      {/* Galeria de Fotos */}
      <div className="relative bg-slate-50">
        <div className="max-w-7xl mx-auto">
          {photos.length > 0 ? (
            <div className="relative h-[440px] md:h-[500px] overflow-hidden">
              <img 
                src={photos[currentPhotoIndex].url || photos[currentPhotoIndex].foto}
                alt={`Foto ${currentPhotoIndex + 1} do imóvel`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/35 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/20 pointer-events-none" />
              <div className="absolute left-4 bottom-4 bg-slate-950/40 text-slate-100 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {currentPhotoIndex + 1}/{photos.length}
              </div>

              {/* Navegação de fotos */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white/95 backdrop-blur-sm p-3 rounded-full transition-colors border border-slate-300"
                  >
                    <ChevronLeft size={24} className="text-slate-900" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white/95 backdrop-blur-sm p-3 rounded-full transition-colors border border-slate-300"
                  >
                    <ChevronRight size={24} className="text-slate-900" />
                  </button>
                  
                  {/* Indicadores */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {photos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentPhotoIndex 
                            ? 'bg-amber-500 w-8' 
                            : 'bg-slate-400 hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-[500px] bg-slate-200 flex items-center justify-center">
              <Home className="text-slate-400" size={64} />
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-12 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informações do Imóvel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Título e Preço */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl md:text-4xl lg:text-5xl mb-2 text-slate-900 tracking-tight drop-shadow-md">{property.titulo}</h1>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={18} />
                    <span>{property.bairro ? `${property.bairro}, ` : ''}{property.cidade}</span>
                  </div>
                </div>
                <div className="bg-amber-600 px-4 py-2 rounded-lg">
                  <span className="text-sm text-amber-100">Investimento</span>
                  <p className="text-2xl font-bold text-white">{formatPrice(property.preco)}</p>
                </div>
              </div>

              {property.endereco && (
                <p className="text-slate-600">{property.endereco}</p>
              )}
            </div>

            {/* Características */}
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <h2 className="text-xl mb-4 text-slate-900">Características</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.quartos && (
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Bed className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Quartos</p>
                      <p className="font-semibold text-slate-900">{property.quartos}</p>
                    </div>
                  </div>
                )}
                
                {property.banheiros && (
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Bath className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Banheiros</p>
                      <p className="font-semibold text-slate-900">{property.banheiros}</p>
                    </div>
                  </div>
                )}
                
                {property.garagem && (
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Car className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Garagem</p>
                      <p className="font-semibold text-slate-900">{property.garagem} {property.garagem === 1 ? 'vaga' : 'vagas'}</p>
                    </div>
                  </div>
                )}
                
                {property.area && (
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Ruler className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Área</p>
                      <p className="font-semibold text-slate-900">{property.area}m²</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição */}
            {property.descricao && (
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <h2 className="text-xl mb-4 text-slate-900">Descrição</h2>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {property.descricao}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Contato */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 sticky top-24">
              <h3 className="text-xl mb-4 text-slate-900">Interessado?</h3>
              <p className="text-slate-600 mb-6">
                Entre em contato para agendar uma visita ou tirar dúvidas sobre este imóvel.
              </p>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/5551980519696?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  <span>Conversar no WhatsApp</span>
                </a>

                {/*<div className="pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400 mb-3">Siga nas redes sociais:</p>
                  <div className="space-y-2">
                    <a
                      href="https://www.instagram.com/corretorafabianeniewierowska"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Instagram size={18} />
                      <span>Instagram</span>
                    </a>
                    <a
                      href="https://www.facebook.com/marketplace/profile/100001497175513"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Facebook size={18} />
                      <span>Facebook</span>
                    </a>
                  </div>
                </div>*/}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      {/*<footer className="bg-zinc-900 border-t border-zinc-800 py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="mb-6">Entre em Contato</h3>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Tem alguma dúvida ou quer agendar uma visita? Entre em contato através das nossas redes sociais
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <SocialButton
              icon={<Instagram size={24} />}
              label="Instagram"
              href="https://www.instagram.com/corretorafabianeniewierowska"
              color="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            />
            <SocialButton
              icon={<Facebook size={24} />}
              label="Facebook"
              href="https://www.facebook.com/marketplace/profile/100001497175513"
              color="bg-blue-600 hover:bg-blue-700"
            />
            <SocialButton
              icon={<MessageCircle size={24} />}
              label="WhatsApp"
              href="https://wa.me/5551980519696"
              color="bg-green-600 hover:bg-green-700"
            />
          </div>

          <div className="mt-12 pt-8 border-t border-slate-700 text-slate-400 text-sm">
            <p>© 2026 Corretora de Imóveis. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>*/}
    </div>
  );
}
