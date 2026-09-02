import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, Package, ShoppingCart, User, LayoutGrid } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { getStoreThemeStyles } from '../utils/storeTheme';
import { getCustomDomainInfo } from '@/utils/domain';

export interface StoreBottomNavProps {
  themeColor?: string;
}

export const StoreBottomNav: React.FC<StoreBottomNavProps> = ({ themeColor }) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { cartCount } = useStore();
  const customDomain = getCustomDomainInfo();
  
  const basePath = customDomain.isCustomDomain
    ? ''
    : (location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug || ''}`);

  const theme = getStoreThemeStyles(themeColor);

  const navItems = [
    { path: basePath || '/', icon: Home, label: 'Beranda' },
    { path: `${basePath}/categories`, icon: Package, label: 'Produk' },
    { path: `${basePath}/cart`, icon: ShoppingCart, label: 'Keranjang', badge: cartCount },
    { path: `${basePath}/profile`, icon: User, label: 'Akun' },
    { path: '/auth', icon: LayoutGrid, label: 'Admin', isExternal: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/70 z-50 safe-area-inset-bottom shadow-lg">
      <div className="mx-auto max-w-md md:max-w-3xl lg:max-w-5xl grid grid-cols-5 h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
                isActive
                  ? `${theme.primaryText} font-bold`
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-extrabold bg-rose-500 text-white rounded-full ring-2 ring-background">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default StoreBottomNav;
