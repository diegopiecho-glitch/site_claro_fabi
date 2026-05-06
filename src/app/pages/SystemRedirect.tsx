import { useEffect, useState } from 'react';
import { API } from '../lib/api';

const CONFIG_CACHE_KEY = 'site_config_home';
const CONFIG_URL = API.CONFIG_LISTA;

interface SiteConfig {
  url_site?: string | number;
  URL_SITE?: string | number;
}

export function SystemRedirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSystemUrlFromConfig = (config: SiteConfig | null | undefined) => {
      const targetUrl = String(
        config?.url_site ??
        config?.URL_SITE ??
        ''
      ).trim();

      return targetUrl || null;
    };

    const redirectToSystem = (targetUrl: string | null) => {
      if (!targetUrl) {
        setError('A URL do sistema nao esta configurada no site.');
        return;
      }

      window.location.replace(targetUrl);
    };

    const getCachedConfig = () => {
      try {
        const cached = window.localStorage.getItem(CONFIG_CACHE_KEY);
        if (!cached) return null;

        const parsed = JSON.parse(cached);
        return parsed?.data ?? null;
      } catch {
        return null;
      }
    };

    const fetchConfigAndRedirect = async () => {
      try {
        const response = await fetch(CONFIG_URL, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Erro ao carregar configuracao do site');
        }

        const data = await response.json();
        const items = data.items || data;
        const config = items?.[0] || {};

        redirectToSystem(getSystemUrlFromConfig(config));
      } catch {
        setError('Nao foi possivel carregar a URL do sistema no momento.');
      }
    };

    const cachedConfig = getCachedConfig();
    if (cachedConfig) {
      redirectToSystem(getSystemUrlFromConfig(cachedConfig));
      return;
    }

    fetchConfigAndRedirect();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-900">
      <p>{error ?? 'Redirecionando para o sistema de gerenciamento...'}</p>
    </div>
  );
}
