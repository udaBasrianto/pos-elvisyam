import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

const getImageUrl = (image: string): string => {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  // Use relative /uploads/ path (proxied by Nginx or Vite)
  return image;
};

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt = 'Product', className = '' }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 ${className}`}>
        <Package className="w-8 h-8 text-slate-400 dark:text-slate-600" />
      </div>
    );
  }

  return (
    <img
      src={getImageUrl(src)}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};
