import { MapPin, Home, Bed, Bath, Car, Ruler } from 'lucide-react';
import { Link } from 'react-router';

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

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      casa: 'Casa',
      apartamento: 'Apartamento',
      terreno: 'Terreno'
    };
    return labels[type as keyof typeof labels];
  };

  return (
    <Link 
      to={`/imovel/${property.id}`}
      className="bg-white rounded-lg overflow-hidden border border-slate-200 hover:border-amber-600/50 transition-all cursor-pointer group hover:shadow-lg"
    >
      {/* Imagem do Imóvel */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={property.image} 
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Badge do Tipo */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm border border-slate-300 text-slate-900">
          {getTypeLabel(property.type)}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5">
        <h3 className="mb-2 text-slate-900 group-hover:text-amber-600 transition-colors">
          {property.title}
        </h3>
        
        {property.subtitle && property.subtitle !== '0' && (
          <div className="flex items-start gap-2 mb-4">
            <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-600 line-clamp-2">{property.subtitle}</p>
          </div>
        )}

        {/* Características do Imóvel */}
        {((property.quartos && property.quartos > 0) || 
          (property.banheiros && property.banheiros > 0) || 
          (property.garagem && property.garagem > 0) || 
          (property.area && property.area > 0)) && (
          <div className="mb-4">
            <h4 className="text-sm text-slate-700 mb-3 font-medium">Características</h4>
            <div className="grid grid-cols-2 gap-2">
              {property.quartos && property.quartos > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                  <Bed size={20} className="text-amber-600 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-slate-600">Quartos</span>
                    <span className="text-sm text-slate-900 font-medium">{property.quartos}</span>
                  </div>
                </div>
              )}
              
              {property.banheiros && property.banheiros > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                  <Bath size={20} className="text-amber-600 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-slate-600">Banheiros</span>
                    <span className="text-sm text-slate-900 font-medium">{property.banheiros}</span>
                  </div>
                </div>
              )}
              
              {property.garagem && property.garagem > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                  <Car size={20} className="text-amber-600 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-slate-600">Garagem</span>
                    <span className="text-sm text-slate-900 font-medium">
                      {property.garagem} {property.garagem === 1 ? 'vaga' : 'vagas'}
                    </span>
                  </div>
                </div>
              )}
              
              {property.area && property.area > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                  <Ruler size={20} className="text-amber-600 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-slate-600">Área</span>
                    <span className="text-sm text-slate-900 font-medium">{property.area}m²</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-500 mb-1">Valor</p>
            <p className="text-amber-600 font-semibold">{formatPrice(property.price)}</p>
          </div>
          
          <span className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Ver Detalhes
          </span>
        </div>
      </div>
    </Link>
  );
}