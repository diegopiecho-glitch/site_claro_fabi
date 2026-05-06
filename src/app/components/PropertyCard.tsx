import { MapPin, Bed, Bath, Car, Ruler } from 'lucide-react';
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
  to?: string;
  actionLabel?: string;
}

export function PropertyCard({
  property,
  to,
  actionLabel = 'Ver Detalhes'
}: PropertyCardProps) {
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

  const subtitleText = property.subtitle && property.subtitle !== '0' ? property.subtitle : '';
  const cityText = property.city && property.city !== '0' ? property.city : '';
  const destination = to ?? `/imovel/${property.id}`;

  return (
    <Link
      to={destination}
      className="group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:border-amber-600/50 hover:shadow-lg"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={property.image}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute right-4 top-4 rounded-full border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-900 backdrop-blur-sm">
          {getTypeLabel(property.type)}
        </div>
        {cityText && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-sm text-slate-900 shadow-sm backdrop-blur-sm">
            <MapPin size={14} className="flex-shrink-0 text-amber-600" />
            <span>{cityText}</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="mb-2 text-slate-900 transition-colors group-hover:text-amber-600">
          {property.title}
        </h3>

        {subtitleText && (
          <div className="mb-4 flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-slate-400" />
            <p className="line-clamp-2 text-sm text-slate-600">{subtitleText}</p>
          </div>
        )}

        {((property.quartos && property.quartos > 0) ||
          (property.banheiros && property.banheiros > 0) ||
          (property.garagem && property.garagem > 0) ||
          (property.area && property.area > 0)) && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {property.quartos && property.quartos > 0 && (
                <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                  <Bed size={16} className="flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[11px] text-slate-600">Quartos</span>
                    <span className="block text-xs font-medium text-slate-900">{property.quartos}</span>
                  </div>
                </div>
              )}

              {property.banheiros && property.banheiros > 0 && (
                <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                  <Bath size={16} className="flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[11px] text-slate-600">Banheiros</span>
                    <span className="block text-xs font-medium text-slate-900">{property.banheiros}</span>
                  </div>
                </div>
              )}

              {property.garagem && property.garagem > 0 && (
                <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                  <Car size={16} className="flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[11px] text-slate-600">Garagem</span>
                    <span className="block text-xs font-medium text-slate-900">
                      {property.garagem} {property.garagem === 1 ? 'vaga' : 'vagas'}
                    </span>
                  </div>
                </div>
              )}

              {property.area && property.area > 0 && (
                <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-center">
                  <Ruler size={16} className="flex-shrink-0 text-amber-600" />
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[11px] text-slate-600">Área</span>
                    <span className="block text-xs font-medium text-slate-900">{property.area}m²</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-slate-500">Valor</p>
            <p className="text-xl font-bold leading-none text-amber-600">{formatPrice(property.price)}</p>
          </div>

          <span className="inline-flex justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm text-white transition-colors hover:bg-amber-700">
            {actionLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
