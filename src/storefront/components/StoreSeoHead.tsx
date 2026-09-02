import React, { useEffect } from 'react';
import { updatePageMeta } from '@/utils/seo';

export interface StoreSeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  storeName?: string;
  faviconUrl?: string;
  productData?: {
    id?: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    stock?: number;
    sku?: string;
  };
}

export const StoreSeoHead: React.FC<StoreSeoProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  storeName,
  faviconUrl,
  productData,
}) => {
  useEffect(() => {
    const pageTitle = title 
      ? (storeName && !title.includes(storeName) ? `${title} | ${storeName}` : title)
      : (storeName || 'Toko Online');

    const pageDesc = description || 
      (productData 
        ? `Beli ${productData.name} dengan harga Rp ${productData.price?.toLocaleString('id-ID')} di ${storeName || 'toko online kami'}. Produk original dan berkualitas.`
        : `Belanja online mudah, aman, dan cepat di ${storeName || 'toko online kami'}.`);

    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const ogImage = image || productData?.image || '/pwa-512x512.png';

    // 1. Update standard Head meta & OpenGraph
    updatePageMeta({
      title: pageTitle,
      description: pageDesc,
      keywords: keywords || (productData ? `${productData.name}, ${productData.category || ''}, belanja online, ${storeName || ''}` : ''),
      author: storeName || 'Toko Online',
      ogImage: ogImage,
      ogUrl: currentUrl,
    });

    // 2. Update favicon if provided
    if (faviconUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    // 3. Inject or update JSON-LD Schema (Schema.org)
    let jsonLdScript = document.getElementById('store-jsonld-schema') as HTMLScriptElement;
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'store-jsonld-schema';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    if (productData) {
      // Product Rich Snippet for Google Search
      const schemaData = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productData.name,
        image: ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`,
        description: productData.description || pageDesc,
        sku: productData.sku || productData.id || undefined,
        category: productData.category || undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'IDR',
          price: productData.price || 0,
          availability: (productData.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: currentUrl,
          seller: {
            '@type': 'Organization',
            name: storeName || 'Toko Online',
          },
        },
      };
      jsonLdScript.textContent = JSON.stringify(schemaData);
    } else {
      // Store / Organization Schema
      const schemaData = {
        '@context': 'https://schema.org/',
        '@type': 'Store',
        name: storeName || 'Toko Online',
        description: pageDesc,
        url: currentUrl,
        image: ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`,
      };
      jsonLdScript.textContent = JSON.stringify(schemaData);
    }

    return () => {
      // Cleanup schema on unmount if needed
    };
  }, [title, description, keywords, image, url, type, storeName, productData]);

  return null;
};

export default StoreSeoHead;
