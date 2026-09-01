import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Loader2, Package, ArrowRight, Store as StoreIcon, 
  Phone, Mail, MapPin, MessageCircle, ExternalLink, Leaf, ShieldCheck, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { toast } from 'sonner';
import { updatePageMeta } from '@/utils/seo';
import { getStoreThemeStyles } from '@/utils/storeTheme';

// Clean Storefront Components
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreHero } from '@/components/store/StoreHero';
import { StoreHighlights } from '@/components/store/StoreHighlights';
import { StoreCategoryFilter } from '@/components/store/StoreCategoryFilter';
import { StoreProductCard } from '@/components/store/StoreProductCard';
import { StoreTestimonials } from '@/components/store/StoreTestimonials';
import BottomNav from '@/components/BottomNav';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  category: string;
  category_name: string;
  sub_category?: string;
  subCategory?: string;
  description: string;
  brand?: string;
  product_type?: 'physical' | 'digital';
}

interface Category {
  id: string;
  name: string;
  color?: string;
  product_count?: number;
}

const Store = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedSubCategory, setSelectedSubCategory] = useState(searchParams.get('sub_category') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isShopLoading, setIsShopLoading] = useState(true);
  
  const { addToCart, cartCount } = useStore();
  const { isLoggedIn, customer } = useStoreAuth();

  const theme = getStoreThemeStyles(shopInfo?.theme_color);

  useEffect(() => {
    if (slug) {
      loadShopInfo();
    }
  }, [slug]);

  useEffect(() => {
    if (shopInfo?.tenant_id) {
      loadCategories();
      loadProducts();
    }
  }, [shopInfo, selectedCategory, selectedSubCategory, searchQuery]);

  const loadShopInfo = async () => {
    setIsShopLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/store/info/${slug}`);
      if (!response.ok) {
        throw new Error('Shop not found');
      }
      const data = await response.json();
      setShopInfo(data);
      if (data?.business_name) {
        updatePageMeta({
          title: `${data.business_name} - Belanja Online Resmi`,
          description: data.description || `${data.business_name} - ${data.tagline || 'Pemesanan dan belanja online praktis, cepat, dan terpercaya'}.`,
          author: data.business_name,
          ogImage: data.logo_url || data.business_logo || "/images/herbal_hero.jpg",
          faviconUrl: data.logo_url || data.business_logo || "/logo.svg",
        });
      }
    } catch (error) {
      console.error('Load shop info error:', error);
      setShopInfo(null);
    } finally {
      setIsShopLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/store/categories?tenant_id=${shopInfo.tenant_id}`);
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('tenant_id', shopInfo.tenant_id);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedSubCategory !== 'all') params.append('sub_category', selectedSubCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/store/products?${params}`
      );
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique sub categories from current product list
  const availableSubCategories = useMemo(() => {
    const list = products.map(p => p.sub_category || p.subCategory).filter(Boolean) as string[];
    return [...new Set(list)];
  }, [products]);

  const handleAddToCart = async (productId: string, productName: string) => {
    try {
      await addToCart(productId, 1);
      toast.success(`${productName} ditambahkan ke keranjang`, {
        icon: '🛒',
      });
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan ke keranjang');
    }
  };

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubCategory('all');
    if (categoryName === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryName);
    }
    searchParams.delete('sub_category');
    setSearchParams(searchParams, { replace: true });
  };

  const handleSelectSubCategory = (subCat: string) => {
    setSelectedSubCategory(subCat);
    if (subCat === 'all') {
      searchParams.delete('sub_category');
    } else {
      searchParams.set('sub_category', subCat);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('product-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isShopLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Memuat Toko Online...</p>
      </div>
    );
  }

  if (!shopInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <StoreIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold mb-2">Toko Tidak Ditemukan</h1>
        <p className="text-xs text-muted-foreground max-w-sm mb-6">
          Maaf, alamat toko online ini belum terdaftar atau telah dinonaktifkan di sistem.
        </p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="rounded-full text-xs font-semibold"
        >
          Kembali ke Beranda
        </Button>
      </div>
    );
  }

  if (!shopInfo.online_store_enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-full flex items-center justify-center mb-5">
          <StoreIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold mb-2 text-foreground">Toko Sedang Tutup</h1>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
          Mohon maaf, etalase online kami saat ini sedang tidak melayani pesanan baru. Silakan hubungi kami langsung atau coba lagi nanti.
        </p>
        <Button 
          variant="outline" 
          className="rounded-full text-xs font-semibold"
          onClick={() => navigate('/')}
        >
          Kembali ke Beranda
        </Button>
      </div>
    );
  }

  const logoImg = shopInfo?.logo_url || shopInfo?.business_logo;
  const storePhone = shopInfo?.business_phone || shopInfo?.whatsapp_number;
  const waUrl = shopInfo?.whatsapp_number 
    ? `https://wa.me/${shopInfo.whatsapp_number.replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(shopInfo.business_name || 'Admin')},%20saya%20ingin%20bertanya%20produk`
    : storePhone ? `https://wa.me/${storePhone.replace(/\D/g, '')}` : null;

  return (
    <div 
      className="min-h-screen bg-background text-foreground flex flex-col pb-24"
      style={{ '--primary': theme.primaryHsl } as React.CSSProperties}
    >
      
      {/* 1. Header / Navbar */}
      <StoreHeader
        shopInfo={shopInfo}
        basePath={basePath}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        isLoggedIn={isLoggedIn}
        customerName={customer?.name}
      />

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 w-full space-y-8 sm:space-y-10 pt-4 sm:pt-6">
        
        {/* 2. Hero Banner with Dynamic Product Slider */}
        <StoreHero 
          shopInfo={shopInfo} 
          products={products}
          basePath={basePath}
          onCtaClick={scrollToCatalog}
        />

        {/* 3. 4 Value Proposition Highlights */}
        <StoreHighlights themeColor={shopInfo?.theme_color} />

        {/* 4. Product Catalog Section */}
        <section id="product-catalog" className="space-y-4 sm:space-y-6 pt-2">
          
          {/* Section Header */}
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {selectedCategory === 'all' ? 'Katalog Produk' : selectedCategory}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Pilihan terbaik untuk kesehatan dan kebutuhan belanja Anda
              </p>
            </div>

            <Link
              to={`${basePath}/categories`}
              className={`text-xs font-bold ${theme.primaryText} hover:underline flex items-center gap-1 shrink-0`}
            >
              <span>Lihat Kategori</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Category Filter Pills */}
          <StoreCategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            themeColor={shopInfo?.theme_color}
            onSelectCategory={handleSelectCategory}
          />

          {/* Sub-Category Filter Chips */}
          {availableSubCategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 uppercase tracking-wider pl-1">
                Sub-Kategori:
              </span>
              <button
                type="button"
                onClick={() => handleSelectSubCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedSubCategory === 'all'
                    ? `${theme.primaryBg} shadow-xs font-bold`
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50'
                }`}
              >
                Semua Sub
              </button>
              {availableSubCategories.map((subCat) => (
                <button
                  key={subCat}
                  type="button"
                  onClick={() => handleSelectSubCategory(subCat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    selectedSubCategory === subCat
                      ? `${theme.primaryBg} shadow-xs font-bold`
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50'
                  }`}
                >
                  {subCat}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Memuat produk pilihan...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-muted/30 border border-dashed border-border/80">
              <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-bold text-sm text-foreground">Tidak Ada Produk</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {searchQuery 
                  ? `Tidak ada produk yang cocok dengan kata kunci "${searchQuery}".` 
                  : 'Belum ada produk pada kategori atau sub-kategori ini.'}
              </p>
              {(searchQuery || selectedCategory !== 'all' || selectedSubCategory !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    handleSelectCategory('all');
                  }}
                  className="mt-4 rounded-full text-xs font-semibold"
                >
                  Tampilkan Semua Produk
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {products.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  basePath={basePath}
                  themeColor={shopInfo?.theme_color}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </section>

        {/* 5. Dynamic Testimonial Section */}
        <StoreTestimonials 
          themeColor={shopInfo?.theme_color} 
          reviewsJson={shopInfo?.store_reviews}
          storeName={shopInfo?.business_name}
        />

        {/* 6. Dynamic Multi-Column Footer */}
        <footer className="mt-12 pt-10 pb-6 border-t border-border/60 text-xs text-muted-foreground space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
            {/* Column 1: Store Brand, Tagline, Description & Social */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                {logoImg ? (
                  <img src={logoImg} alt={shopInfo.business_name} className="w-9 h-9 rounded-full object-contain border p-0.5" />
                ) : (
                  <div className={`w-9 h-9 rounded-full ${theme.badgeBg} flex items-center justify-center font-bold`}>
                    <Leaf className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-foreground text-sm tracking-tight">{shopInfo.business_name || 'Toko Online'}</h4>
                  <p className="text-[11px] text-muted-foreground">{shopInfo.tagline || 'Pilihan Sehat & Berkualitas'}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/90 leading-relaxed max-w-sm">
                {shopInfo.description || shopInfo.footer_text || 'Menyediakan beragam produk berkualitas dengan pelayanan cepat, kemasan aman, dan jaminan keaslian untuk Anda dan keluarga.'}
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-2 pt-1">
                {shopInfo.instagram_url && (
                  <a 
                    href={shopInfo.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-colors"
                    title="Instagram"
                  >
                    <span className="font-bold text-[11px] px-1">IG</span>
                  </a>
                )}
                {shopInfo.facebook_url && (
                  <a 
                    href={shopInfo.facebook_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-colors"
                    title="Facebook"
                  >
                    <span className="font-bold text-[11px] px-1">FB</span>
                  </a>
                )}
                {waUrl && (
                  <a 
                    href={waUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp CS</span>
                  </a>
                )}
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="md:col-span-3 space-y-2.5">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Navigasi Toko</h5>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#product-catalog" onClick={scrollToCatalog} className="hover:text-foreground transition-colors">Katalog Produk</a></li>
                <li><Link to={`${basePath}/categories`} className="hover:text-foreground transition-colors">Daftar Kategori</Link></li>
                <li><Link to={`${basePath}/cart`} className="hover:text-foreground transition-colors">Keranjang Belanja ({cartCount})</Link></li>
                <li><Link to={`${basePath}/account`} className="hover:text-foreground transition-colors">Riwayat Pesanan</Link></li>
              </ul>
            </div>

            {/* Column 3: Contact & Address */}
            <div className="md:col-span-4 space-y-2.5">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Hubungi Kami</h5>
              <div className="space-y-2 text-xs">
                {shopInfo.business_address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{shopInfo.business_address}</span>
                  </div>
                )}
                {storePhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{storePhone}</span>
                  </div>
                )}
                {shopInfo.business_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{shopInfo.business_email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Footer Text */}
          <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="text-[11px]">
              &copy; {new Date().getFullYear()} <strong className="text-foreground">{shopInfo.business_name || 'Toko Online'}</strong>. Hak cipta dilindungi undang-undang.
            </p>
            {shopInfo.footer_text && (
              <p className="text-[11px] text-muted-foreground max-w-md">
                {shopInfo.footer_text}
              </p>
            )}
          </div>
        </footer>
      </main>

      {/* 7. Fixed 5-Tab Bottom Navigation */}
      <BottomNav themeColor={shopInfo?.theme_color} />
    </div>
  );
};

export default Store;
