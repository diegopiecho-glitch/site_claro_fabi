import { useSearchParams } from 'react-router';

export function ImageViewer() {
  const [searchParams] = useSearchParams();
  const imageUrl = searchParams.get('src');

  if (!imageUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <p>Nenhuma imagem foi informada para visualização.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <img
        src={imageUrl}
        alt="Imagem do imóvel"
        className="max-h-screen max-w-full object-contain"
      />
    </div>
  );
}
