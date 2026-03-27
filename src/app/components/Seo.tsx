import { useEffect } from 'react';

interface SeoProps {
  nomecorretor?: string;
  title: string;
  description: string;
  url?: string;
  image?: string;
}

const ensureMetaTag = (attribute: 'name' | 'property', value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${value}"]`
  );

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  return element;
};

const ensureLinkTag = (rel: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }

  return element;
};

export function Seo({
  nomecorretor,
  title,
  description,
  url,
  image
}: SeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const metas = [
      { key: 'description', attribute: 'name' as const, content: description },
      { key: 'og:title', attribute: 'property' as const, content: title },
      { key: 'og:description', attribute: 'property' as const, content: description },
      { key: 'og:type', attribute: 'property' as const, content: 'website' },
      { key: 'twitter:card', attribute: 'name' as const, content: image ? 'summary_large_image' : 'summary' },
      { key: 'twitter:title', attribute: 'name' as const, content: title },
      { key: 'twitter:description', attribute: 'name' as const, content: description }
    ];

    if (nomecorretor) {
      metas.push({
        key: 'author',
        attribute: 'name' as const,
        content: nomecorretor
      });
    }

    if (url) {
      metas.push({ key: 'og:url', attribute: 'property' as const, content: url });
    }

    if (image) {
      metas.push({ key: 'og:image', attribute: 'property' as const, content: image });
      metas.push({ key: 'twitter:image', attribute: 'name' as const, content: image });
    }

    metas.forEach(({ key, attribute, content }) => {
      ensureMetaTag(attribute, key).setAttribute('content', content);
    });

    if (url) {
      ensureLinkTag('canonical').href = url;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [description, image, nomecorretor, title, url]);

  return null;
}
