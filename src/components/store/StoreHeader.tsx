import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Search, ShoppingCart, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStoreThemeStyles } from '@/utils/storeTheme';

interface StoreHeaderProps {
  shopInfo: {
    business_name?: string;
    tagline?: string;
    description?: string;
    logo_url?: string;
    business_logo?: string;
    theme_color?: string;
  } | null;
  basePath: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartCount: number;
  isLoggedIn: boolean;
  customerName?: string | null;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  shopInfo,
  basePath,
  searchQuery,
  onSearchChange,
  cartCount,
  isLoggedIn,
  customerName,
}) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const brandName = shopInfo?.business_name || 'Toko Herbal';
  const tagline = shopInfo?.tagline || 'Sehat Alami, Hidup Harmoni';
  const logo = shopInfo?.logo_url || shopInfo?.business_logo;
  const theme = getStoreThemeStyles(shopInfo?.theme_color);

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & Logo */}
        <Link 
          to={basePath} 
          className="flex items-center gap-3 group text-left cursor-pointer transition-transform active:scale-95"
        >
          {logo ? (
            <div className={`w-10 h-10 rounded-full overflow-hidden border ${theme.softBorder} ${theme.softBg} p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300`}>
              <img src={logo} alt={brandName} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full ${theme.badgeBg} border ${theme.softBorder} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300`}>
              <Leaf className="w-5 h-5" />
            </div>
          )}
          
          <div className="flex flex-col">
            <span className={`font-extrabold text-base sm:text-lg tracking-tight text-foreground transition-colors`}>
              {brandName}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium -mt-0.5">
              {tagline}
            </span>
          </div>
        </Link>

        {/* Center Search Input (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-10 rounded-full bg-muted/60 border-border/60 text-xs text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Actions: Search Mobile Toggle, User Account, & Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Cari Produk"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* User Account Button (Pill) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(isLoggedIn ? `${basePath}/profile` : `${basePath}/auth`)}
            className={`h-9 px-3 sm:px-4 rounded-full ${theme.softBg} ${theme.softBorder} text-foreground text-xs font-semibold gap-1.5 shadow-2xs transition-all active:scale-95`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isLoggedIn ? (customerName?.split(' ')[0] || 'Akun Saya') : 'Akun'}
            </span>
          </Button>

          {/* Shopping Cart Button */}
          <Button
            size="icon"
            onClick={() => navigate(`${basePath}/cart`)}
            className={`relative h-9 w-9 rounded-full ${theme.primaryBg} shadow-sm active:scale-90 transition-all cursor-pointer`}
            aria-label="Keranjang Belanja"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs ring-2 ring-background animate-in zoom-in-50 duration-200">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar Dropdown */}
      {isSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-border/40 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              autoFocus
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-full bg-muted/60 border-border/60 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
