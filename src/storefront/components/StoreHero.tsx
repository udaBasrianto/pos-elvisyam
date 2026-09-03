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
      {/* 📱 1. MOBILE VIEW (Khusus HP: Ringkas, Horizontal, Height ~140px, Pas di Layar) */}
      <div className="block md:hidden">
        <div className={`bg-gradient-to-br ${theme.gradientCard} border ${theme.softBorder} rounded-2xl p-3.5 shadow-xs relative overflow-hidden transition-all duration-500`}>
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-row items-center justify-between gap-3 relative z-10">
            {/* Left Content */}
            <div className="flex-1 min-w-0 space-y-1.5 text-left">
              <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${theme.badgeBg} border ${theme.softBorder} text-[10px] font-bold shadow-2xs`}>
                <Leaf className="w-3 h-3 opacity-80 shrink-0" />
                <span className="truncate max-w-[120px]">{current.badge}</span>
              </div>

              <h1 className="text-sm font-bold text-foreground tracking-tight leading-snug line-clamp-2">
                {current.title}
              </h1>

              {current.price !== null && (
                <div className="flex items-baseline gap-1 pt-0.5">
                  <span className={`text-base font-black ${theme.primaryText}`}>
                    {formatCurrency(current.price)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">/ item</span>
                </div>
              )}

              <div className="pt-0.5">
                {current.isCustomProduct && current.id ? (
                  <Link to={`${basePath}/product/${getProductSlug(current.title, current.id)}`}>
                    <Button
                      size="sm"
                      className={`h-7 px-3.5 rounded-full ${theme.primaryBg} font-bold text-[10.5px] shadow-xs gap-1 transition-all active:scale-95 cursor-pointer`}
                    >
                      <span>{current.ctaText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    onClick={onCtaClick}
                    className={`h-7 px-3.5 rounded-full ${theme.primaryBg} font-bold text-[10.5px] shadow-xs gap-1 transition-all active:scale-95 cursor-pointer`}
                  >
                    <span>{current.ctaText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right Thumbnail */}
            <div className="shrink-0">
              <div className={`w-24 h-24 rounded-xl overflow-hidden shadow-xs border ${theme.softBorder} bg-card/90 flex items-center justify-center p-1.5`}>
                <img
                  src={current.image}
                  alt={current.title}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Mobile Dots */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-2.5 relative z-10">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === idx 
                      ? `w-5 ${theme.activeDot}` 
                      : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 💻 2. DESKTOP & TABLET VIEW (Tampilan Mewah, 12-Kolom, Proporsional & Responsif) */}
      <div className="hidden md:block">
        <div className={`bg-gradient-to-br ${theme.gradientCard} border ${theme.softBorder} rounded-3xl p-8 lg:p-12 shadow-xs relative overflow-hidden transition-all duration-500`}>
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            {/* Left Col: 7 cols */}
            <div className="col-span-7 space-y-4 text-left">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${theme.badgeBg} border ${theme.softBorder} text-xs font-bold shadow-2xs`}>
                <Leaf className="w-3.5 h-3.5 opacity-80" />
                <span>{current.badge}</span>
              </div>

              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black text-foreground tracking-tight leading-tight line-clamp-2">
                {current.title}
              </h1>

              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed line-clamp-3 max-w-xl">
                {current.description}
              </p>

              {current.price !== null && (
                <div className="flex items-baseline gap-2 pt-1">
                  <span className={`text-2xl lg:text-3xl font-black ${theme.primaryText}`}>
                    {formatCurrency(current.price)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/ item</span>
                </div>
              )}

              <div className="pt-3 flex items-center gap-3">
                {current.isCustomProduct && current.id ? (
                  <Link to={`${basePath}/product/${getProductSlug(current.title, current.id)}`}>
                    <Button
                      size="lg"
                      className={`h-11 lg:h-12 px-7 rounded-full ${theme.primaryBg} font-bold text-sm shadow-md gap-2 transition-all active:scale-95 group cursor-pointer`}
                    >
                      <span>{current.ctaText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    onClick={onCtaClick}
                    className={`h-11 lg:h-12 px-7 rounded-full ${theme.primaryBg} font-bold text-sm shadow-md gap-2 transition-all active:scale-95 group cursor-pointer`}
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
                    className={`h-11 lg:h-12 px-6 rounded-full text-sm font-semibold ${theme.softBorder} hover:bg-muted text-foreground`}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Lihat Katalog
                  </Button>
                )}
              </div>
            </div>

            {/* Right Col: 5 cols */}
            <div className="col-span-5 flex justify-center items-center">
              <div className={`relative w-full aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden shadow-xl border ${theme.softBorder} bg-card/90 group`}>
                <img
                  src={current.image}
                  alt={current.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Desktop Dots */}
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
      </div>
    </section>
  );


};

export default StoreHero;
