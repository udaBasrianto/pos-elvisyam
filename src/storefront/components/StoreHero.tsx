import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoreThemeStyles } from '../utils/storeTheme';
import { getProductSlug } from '@/utils/productSlug';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  category?: string;
  category_name?: string;
  description?: string;
  brand?: string;
}

export interface StoreHeroProps {
  shopInfo?: {
    business_name?: string;
    description?: string;
    banner_url?: string;
    tagline?: string;
    theme_color?: string;
  } | null;
  products?: Product[];
  basePath?: string;
  onCtaClick?: () => void;
}

export const StoreHero: React.FC<StoreHeroProps> = ({
  shopInfo,
  products = [],
  basePath = '',
  onCtaClick,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const theme = getStoreThemeStyles(shopInfo?.theme_color);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Build dynamic slides from real products (prefer products with images, or fallback to first 5 products)
  const productSlides = (products.length > 0 
    ? (products.filter(p => p.image).length > 0 ? products.filter(p => p.image) : products) 
    : []
  ).slice(0, 5);

  const defaultSlides = [
    {
      id: '',
      badge: '100% Produk Original & Terpercaya',
      title: shopInfo?.business_name ? `Selamat Datang di ${shopInfo.business_name}` : 'Pilihan Produk Terbaik Untuk Anda',
      description: shopInfo?.description || 'Belanja kebutuhan produk berkualitas dengan harga terbaik, pengiriman cepat, dan transaksi aman.',
      price: null,
      image: shopInfo?.banner_url || '/images/herbal_hero.jpg',
      ctaText: 'Belanja Sekarang',
      isCustomProduct: false,
    },
    {
      id: '',
      badge: 'Koleksi Lengkap & Terbaru',
      title: 'Temukan Beragam Pilihan Menarik',
      description: 'Dapatkan berbagai penawaran promo dan diskon spesial setiap hari untuk pelanggan setia.',
      price: null,
      image: '/images/herbal_hero.jpg',
      ctaText: 'Jelajahi Produk',
      isCustomProduct: false,
    },
  ];

  const slides = productSlides.length > 0 
    ? productSlides.map(p => ({
        id: p.id,
        badge: p.category_name || p.brand || 'Produk Unggulan',
        title: p.name,
        description: p.description || 'Pilihan terbaik dengan mutu terjamin untuk memenuhi kebutuhan Anda setiap hari.',
        price: p.price,
        image: p.image || '/images/herbal_hero.jpg',
        ctaText: 'Lihat Produk Ini',
        isCustomProduct: true,
      }))
    : defaultSlides;

  // Auto slide timer every 6 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const current = slides[activeSlide] || slides[0];

  return (
    <section className="relative overflow-hidden">
      <div className={`bg-gradient-to-br ${theme.gradientCard} border ${theme.softBorder} rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden transition-all duration-500`}>
        
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Text Content */}
          <div className="md:col-span-6 space-y-4 text-left">
            
            {/* Pill Chip */}
            <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${theme.badgeBg} border ${theme.softBorder} text-xs font-bold shadow-2xs`}>
              <Leaf className="w-3.5 h-3.5 opacity-80" />
              <span>{current.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight line-clamp-2">
              {current.title}
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 max-w-md">
              {current.description}
            </p>

            {/* Price Tag if Product Slide */}
            {current.price !== null && (
              <div className="flex items-baseline gap-2 pt-1">
                <span className={`text-xl sm:text-2xl font-extrabold ${theme.primaryText}`}>
                  {formatCurrency(current.price)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">/ item</span>
              </div>
            )}

            {/* CTA Button Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {current.isCustomProduct && current.id ? (
                <Link to={`${basePath}/product/${getProductSlug(current.title, current.id)}`}>
                  <Button
                    size="lg"
                    className={`h-11 px-6 rounded-full ${theme.primaryBg} font-bold text-xs sm:text-sm shadow-md gap-2 transition-all active:scale-95 group cursor-pointer`}
                  >
                    <span>{current.ctaText}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={onCtaClick}
                  className={`h-11 px-6 rounded-full ${theme.primaryBg} font-bold text-xs sm:text-sm shadow-md gap-2 transition-all active:scale-95 group cursor-pointer`}
                >
                  <span>{current.ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}

              {current.isCustomProduct && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onCtaClick}
                  className={`h-11 px-5 rounded-full text-xs font-semibold ${theme.softBorder} hover:bg-muted text-foreground`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                  Lihat Katalog
                </Button>
              )}
            </div>
          </div>

          {/* Right Image Showcase */}
          <div className="md:col-span-6 flex justify-center items-center">
            <div className={`relative w-full max-w-lg aspect-video sm:aspect-[16/10] rounded-2xl overflow-hidden shadow-lg border ${theme.softBorder} bg-card/80 group`}>
              <img
                src={current.image}
                alt={current.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 relative z-10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  activeSlide === idx 
                    ? `w-7 ${theme.activeDot}` 
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default StoreHero;
