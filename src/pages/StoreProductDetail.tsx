import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingCart, Loader2, Plus, Minus, Share2, 
  Heart, ShieldCheck, Truck, Sparkles, MessageCircle, 
  Check, Leaf, ChevronRight, Package, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/contexts/StoreContext';
import { ProductImage } from '@/components/ProductImage';
import { toast } from 'sonner';
import { getStoreThemeStyles } from '@/utils/storeTheme';
import { StoreProductCard } from '@/components/store/StoreProductCard';
import BottomNav from '@/components/BottomNav';
import { updatePageMeta } from '@/utils/seo';

interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  image: string | null;
  stock: number;
  unit?: string;
  sku?: string;
  category?: string;
  category_name?: string;
  sub_category?: string;
  subCategory?: string;
  brand?: string;
  description?: string;
  product_type?: 'physical' | 'digital';
}

const StoreProductDetail = () => {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug}`;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { addToCart, cartCount } = useStore();
  const theme = getStoreThemeStyles(shopInfo?.theme_color);

  useEffect(() => {
    if (slug) {
      loadShopInfo();
    }
  }, [slug]);

  useEffect(() => {
    if (id) {
      loadProduct();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [id]);

  const loadShopInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/store/info/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setShopInfo(data);
      }
    } catch (error) {
      console.error('Load shop info error:', error);
    }
  };

  const loadProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/store/products/${id}`
      );
      const data = await response.json();
      if (data.error || !data.id) {
        toast.error(data.error || 'Produk tidak ditemukan');
        navigate(basePath);
      } else {
        setProduct(data);
        setQuantity(1);

        // Update SEO metadata
        updatePageMeta({
          title: `${data.name} - ${shopInfo?.business_name || 'Toko Online'}`,
          description: data.description || `Beli ${data.name} online dengan harga terbaik dan jaminan kualitas asli.`,
          ogImage: data.image || "/images/herbal_hero.jpg",
        });

        // Fetch related products
        if (data.user_id || shopInfo?.tenant_id) {
          loadRelatedProducts(data.user_id || shopInfo?.tenant_id, data.id, data.category_name);
        }
      }
    } catch (error) {
      console.error('Load product error:', error);
      toast.error('Gagal memuat detail produk');
      navigate(basePath);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedProducts = async (tenantId: string, currentProductId: string, categoryName?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('tenant_id', tenantId);
      if (categoryName) params.append('category', categoryName);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/store/products?${params}`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setRelatedProducts(data.filter((p: Product) => p.id !== currentProductId).slice(0, 4));
      }
    } catch (error) {
      console.error('Load related products error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToCart = async (andCheckout = false) => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error('Stok produk ini sedang habis');
      return;
    }
    try {
      await addToCart(product.id, quantity);
      toast.success(`${quantity}x ${product.name} dimasukkan ke keranjang`, {
        icon: '🛒',
      });
      if (andCheckout) {
        navigate(`${basePath}/checkout`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan ke keranjang');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success('Link produk berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppOrder = () => {
    if (!product) return;
    const phone = (shopInfo?.business_phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
    
    const message = `Halo ${shopInfo?.business_name || 'Admin Toko'}, saya ingin memesan:\n\n*${product.name}*\nJumlah: ${quantity} ${product.unit || 'pcs'}\nTotal: ${formatCurrency(product.price * quantity)}\n\nMohon informasi ketersediaan & ongkos kirimnya. Terima kasih!`;
    
    window.open(`https://wa.me/${cleanPhone || '6281234567890'}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Memuat detail produk...</p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const maxAvailable = Math.max(1, product.stock);

  return (
    <div 
      className="min-h-screen bg-background text-foreground pb-28 sm:pb-20"
      style={{ '--primary': theme.primaryHsl } as React.CSSProperties}
    >
      
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(basePath)} 
              className="rounded-full h-9 w-9 text-foreground hover:bg-muted shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Link to={basePath} className="hover:text-foreground transition-colors font-medium">
                Beranda
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              {product.category_name && (
                <>
                  <Link 
                    to={`${basePath}?category=${encodeURIComponent(product.category_name)}`}
                    className="hover:text-foreground transition-colors font-medium"
                  >
                    {product.category_name}
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
              <span className="text-foreground font-semibold truncate max-w-[200px]">
                {product.name}
              </span>
            </div>
          </div>

          {/* Right Action Icons: Share, Wishlist, Cart */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Bagikan link produk"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                toast.success(isWishlisted ? 'Dihapus dari favorit' : 'Disimpan ke favorit');
              }}
              className={`rounded-full h-9 w-9 transition-colors ${
                isWishlisted ? 'text-rose-500 hover:text-rose-600' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Favorit"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
            </Button>

            <Button
              size="icon"
              onClick={() => navigate(`${basePath}/cart`)}
              className={`relative h-9 w-9 rounded-full ${theme.primaryBg} shadow-xs active:scale-90 transition-all cursor-pointer`}
              aria-label="Keranjang Belanja"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs ring-2 ring-background animate-in zoom-in-50">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Main Product Details Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 space-y-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Product Showcase Photography Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className={`relative aspect-square sm:aspect-[4/3] lg:aspect-square rounded-3xl bg-gradient-to-b ${theme.gradientCard} border ${theme.softBorder} p-6 sm:p-10 flex items-center justify-center overflow-hidden shadow-xs group`}>
              
              {/* Product Visual */}
              <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500 ease-out">
                {product.image ? (
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <div className={`w-28 h-28 rounded-full ${theme.badgeBg} flex items-center justify-center shadow-inner`}>
                    <Leaf className="w-14 h-14 opacity-80" />
                  </div>
                )}
              </div>

              {/* Status Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {isOutOfStock ? (
                  <Badge className="bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Stok Habis
                  </Badge>
                ) : isLowStock ? (
                  <Badge className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">
                    Sisa {product.stock} {product.unit || 'unit'}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm backdrop-blur-xs">
                    🟢 Stok Tersedia
                  </Badge>
                )}
              </div>

              {/* Original Quality Pill */}
              <div className="absolute bottom-4 right-4 hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-[11px] font-semibold text-foreground shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Produk Original</span>
              </div>
            </div>

            {/* Micro Benefit Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-card border border-border/60 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full ${theme.badgeBg} flex items-center justify-center shrink-0`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">Asli & Higienis</p>
                  <p className="text-[10px] text-muted-foreground truncate">Terstandarisasi</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/60 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full ${theme.badgeBg} flex items-center justify-center shrink-0`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">Kirim Cepat</p>
                  <p className="text-[10px] text-muted-foreground truncate">Packing Aman</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/60 col-span-2 sm:col-span-1 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full ${theme.badgeBg} flex items-center justify-center shrink-0`}>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">Garansi Retur</p>
                  <p className="text-[10px] text-muted-foreground truncate">Bila Rusak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Product Details & Purchase Actions */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Category / Brand / Sub-Category Pill */}
            <div className="flex flex-wrap items-center gap-2">
              {product.category_name && (
                <Badge 
                  variant="outline" 
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${theme.softBorder} ${theme.primaryText}`}
                >
                  {product.category_name}
                </Badge>
              )}
              {(product.sub_category || product.subCategory) && (
                <Badge 
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${theme.badgeBg} border-0`}
                >
                  {product.sub_category || product.subCategory}
                </Badge>
              )}
              {product.brand && (
                <span className="text-xs text-muted-foreground font-medium">
                  Merk: <strong className="text-foreground">{product.brand}</strong>
                </span>
              )}
              {product.sku && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  SKU: {product.sku}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-baseline justify-between gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Harga Produk</p>
                <p className={`text-2xl sm:text-3xl font-extrabold ${theme.primaryText} tracking-tight`}>
                  {formatCurrency(product.price)}
                </p>
              </div>

              {quantity > 1 && (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground font-medium">Subtotal ({quantity} {product.unit || 'item'})</p>
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {formatCurrency(product.price * quantity)}
                  </p>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Pilih Jumlah Pembelian</label>
                <span className="text-xs text-muted-foreground font-medium">
                  Tersedia: <strong>{product.stock} {product.unit || 'unit'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="inline-flex items-center border border-border/80 rounded-full p-1 bg-card shadow-2xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center text-sm font-extrabold text-foreground">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(maxAvailable, quantity + 1))}
                    disabled={quantity >= maxAvailable || isOutOfStock}
                    className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <span className="text-xs text-muted-foreground font-medium">
                  {product.unit || 'Pcs'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Add to Cart */}
                <Button
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(false)}
                  className={`h-12 rounded-full ${theme.primaryBg} font-bold text-sm shadow-md gap-2 transition-all active:scale-95 cursor-pointer`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Tambah ke Keranjang</span>
                </Button>

                {/* 2. Buy Now & Direct Checkout */}
                <Button
                  size="lg"
                  variant="outline"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(true)}
                  className={`h-12 rounded-full font-bold text-sm ${theme.softBorder} ${theme.primaryText} hover:bg-muted transition-all active:scale-95 cursor-pointer`}
                >
                  <span>Beli Langsung</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* 3. WhatsApp Fast Order Button */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleWhatsAppOrder}
                className="w-full h-11 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 gap-2 cursor-pointer transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pesan Cepat via WhatsApp</span>
              </Button>
            </div>

            {/* Product Description */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h2 className="text-base font-extrabold text-foreground">Deskripsi & Khasiat</h2>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line space-y-2">
                {product.description || (
                  <p className="italic text-muted-foreground/80">
                    Produk herbal berkualitas tinggi yang diolah dari bahan alami pilihan untuk mendukung vitalitas dan kesehatan keluarga Anda setiap hari. Aman, higienis, dan berkhasiat.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Related / Recommended Products Section */}
        {relatedProducts.length > 0 && (
          <section className="pt-6 sm:pt-10 border-t border-border/60 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                  Produk Rekomendasi Lainnya
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Pilihan produk terbaik yang mungkin Anda sukai
                </p>
              </div>

              <Link
                to={basePath}
                className={`text-xs font-bold ${theme.primaryText} hover:underline flex items-center gap-1`}
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {relatedProducts.map((relProd) => (
                <StoreProductCard
                  key={relProd.id}
                  product={relProd}
                  basePath={basePath}
                  themeColor={shopInfo?.theme_color}
                  onAddToCart={async (pId, pName) => {
                    await addToCart(pId, 1);
                    toast.success(`${pName} ditambahkan ke keranjang`);
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 4. Fixed Floating Action Bar on Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/70 p-3 shadow-xl">
        <div className="flex items-center gap-3">
          
          {/* Price & Quantity Summary */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-muted-foreground font-medium">Total Harga</span>
            <span className={`text-base font-extrabold ${theme.primaryText} truncate`}>
              {formatCurrency(product.price * quantity)}
            </span>
          </div>

          {/* Quick Add To Cart Button */}
          <div className="flex-1 flex gap-2">
            <Button
              size="sm"
              disabled={isOutOfStock}
              onClick={() => handleAddToCart(false)}
              className={`flex-1 h-11 rounded-full ${theme.primaryBg} font-bold text-xs shadow-md gap-1.5`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>+ Keranjang</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isOutOfStock}
              onClick={() => handleAddToCart(true)}
              className={`h-11 px-4 rounded-full font-bold text-xs ${theme.softBorder} ${theme.primaryText}`}
            >
              Beli
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Bottom Nav */}
      <div className="hidden sm:block">
        <BottomNav themeColor={shopInfo?.theme_color} />
      </div>
    </div>
  );
};

export default StoreProductDetail;
