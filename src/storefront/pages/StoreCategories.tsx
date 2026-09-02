import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, Grid3x3, Leaf, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StoreBottomNav } from '../components/StoreBottomNav';
import { StoreSeoHead } from '../components/StoreSeoHead';
import { getStoreThemeStyles } from '../utils/storeTheme';
import { getCustomDomainInfo } from '@/utils/domain';

interface Category {
  id: string;
  name: string;
  color?: string;
  product_count: number;
}

export const StoreCategories = () => {
  const { slug } = useParams<{ slug: string }>();
  const customDomainInfo = getCustomDomainInfo();
  const activeIdentifier = slug || customDomainInfo.cleanDomain || customDomainInfo.domain || '';
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = customDomainInfo.isCustomDomain
    ? ''
    : (location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug || ''}`);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shopName, setShopName] = useState('Toko Online');
  const [themeColor, setThemeColor] = useState('emerald');

  const theme = getStoreThemeStyles(themeColor);

  useEffect(() => {
    if (activeIdentifier) {
      loadShopAndCategories();
    }
  }, [activeIdentifier]);

  const loadShopAndCategories = async () => {
    if (!activeIdentifier) return;
    setIsLoading(true);
    try {
      const shopRes = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/store/info/${activeIdentifier}`);
      if (!shopRes.ok) throw new Error('Shop not found');
      const shopData = await shopRes.json();
      setShopName(shopData.business_name || 'Toko Online');
      setThemeColor(shopData.theme_color || 'emerald');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/store/categories?tenant_id=${shopData.tenant_id}`
      );
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load categories error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate(`${basePath}?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div 
      className="min-h-screen bg-background text-foreground pb-24 mx-auto max-w-6xl"
      style={{ '--primary': theme.primaryHsl } as React.CSSProperties}
    >
      <StoreSeoHead
        title={`Kategori Produk - ${shopName}`}
        description={`Jelajahi seluruh kategori produk yang tersedia di ${shopName}.`}
        storeName={shopName}
      />
      
      {/* Clean Modern Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 py-3.5 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(basePath || '/')} 
          className="rounded-full h-9 w-9 text-foreground hover:bg-muted cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
            Kategori Produk
          </h1>
          <p className="text-[11px] text-muted-foreground font-medium">
            {shopName} &bull; Pilih kategori untuk melihat produk
          </p>
        </div>
      </header>

      {/* Categories Grid */}
      <main className="p-4 sm:p-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Memuat daftar kategori...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-muted/30 border border-dashed border-border/80">
            <Grid3x3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-bold text-sm text-foreground">Belum Ada Kategori</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Kategori produk akan otomatis muncul saat produk telah terdaftar di sistem.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(basePath || '/')}
              className="mt-4 rounded-full text-xs font-semibold cursor-pointer"
            >
              Kembali ke Beranda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.name)}
                className="group rounded-3xl bg-card border border-border/70 hover:shadow-md transition-all duration-300 p-4 cursor-pointer flex flex-col justify-between space-y-3"
              >
                {/* Icon Container */}
                <div className={`w-12 h-12 rounded-2xl ${theme.softBg} ${theme.softBorder} border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xs`}>
                  <Leaf className={`w-6 h-6 ${theme.primaryText}`} />
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold text-sm sm:text-base text-foreground group-hover:${theme.primaryText} transition-colors line-clamp-1`}>
                      {category.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {category.product_count} produk
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Products Action */}
        {categories.length > 0 && (
          <div className="pt-4 flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(basePath || '/')}
              className={`rounded-full text-xs font-bold px-6 h-11 ${theme.softBorder} ${theme.primaryText} hover:bg-muted cursor-pointer`}
            >
              <Package className="w-4 h-4 mr-2" />
              Lihat Semua Produk
            </Button>
          </div>
        )}
      </main>

      <StoreBottomNav themeColor={themeColor} />
    </div>
  );
};

export default StoreCategories;
