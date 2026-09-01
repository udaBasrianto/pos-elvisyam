import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ProductImage';
import { getStoreThemeStyles } from '@/utils/storeTheme';
import { getProductSlug } from '@/utils/productSlug';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  category?: string;
  category_name?: string;
  sub_category?: string;
  subCategory?: string;
  description?: string;
  brand?: string;
}

interface StoreProductCardProps {
  product: Product;
  basePath: string;
  themeColor?: string;
  onAddToCart: (productId: string, productName: string) => void;
}

export const StoreProductCard: React.FC<StoreProductCardProps> = ({
  product,
  basePath,
  themeColor,
  onAddToCart,
}) => {
  const theme = getStoreThemeStyles(themeColor);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock <= 0;
  const subCat = product.sub_category || product.subCategory;

  return (
    <div className="group rounded-3xl bg-card border border-border/70 hover:shadow-md transition-all duration-300 flex flex-col p-3 text-left">
      
      {/* Top Pastel Container for Image */}
      <Link 
        to={`${basePath}/product/${getProductSlug(product.name, product.id)}`}
        className={`block relative aspect-square rounded-2xl bg-gradient-to-b ${theme.gradientCard} p-4 overflow-hidden flex items-center justify-center`}
      >
        {/* Product Image / Illustration */}
        <div className="w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500 ease-out">
          {product.image ? (
            <ProductImage
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain drop-shadow-sm"
            />
          ) : (
            <div className={`w-14 h-14 rounded-full ${theme.badgeBg} flex items-center justify-center`}>
              <Leaf className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Stock Status Badge */}
        <div className="absolute top-2.5 left-2.5">
          {isOutOfStock ? (
            <Badge className="bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Habis
            </Badge>
          ) : isLowStock ? (
            <Badge className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              Sisa {product.stock}
            </Badge>
          ) : null}
        </div>
      </Link>

      {/* Product Details */}
      <div className="mt-3 flex-1 flex flex-col justify-between">
        <Link 
          to={`${basePath}/product/${getProductSlug(product.name, product.id)}`}
          className="block group-hover:opacity-90 transition-opacity"
        >  
          <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
            <span className="text-[11px] text-muted-foreground font-medium truncate">
              {product.brand || product.category_name || 'Produk Pilihan'}
            </span>
            {subCat && (
              <span className={`text-[10px] ${theme.badgeBg} px-1.5 py-0.2 rounded-full font-medium shrink-0 truncate max-w-[100px]`}>
                {subCat}
              </span>
            )}
          </div>

          <h3 className={`font-bold text-sm text-foreground line-clamp-2 group-hover:${theme.primaryText} transition-colors leading-tight`}>
            {product.name}
          </h3>
        </Link>

        {/* Price & Floating Cart Button */}
        <div className="flex items-center justify-between pt-2">
          <span className={`text-sm sm:text-base font-extrabold ${theme.primaryText}`}>
            {formatCurrency(product.price)}
          </span>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.preventDefault();
              onAddToCart(product.id, product.name);
            }}
            aria-label={`Tambah ${product.name} ke keranjang`}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs ${
              isOutOfStock
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                : `${theme.primaryBg} active:scale-90`
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
