import React from 'react';
import { Leaf, ShieldCheck, Users, Truck } from 'lucide-react';
import { getStoreThemeStyles } from '../utils/storeTheme';

export interface StoreHighlightsProps {
  themeColor?: string;
}

export const StoreHighlights: React.FC<StoreHighlightsProps> = ({ themeColor }) => {
  const theme = getStoreThemeStyles(themeColor);

  const highlights = [
    {
      icon: Leaf,
      title: '200+',
      subtitle: 'Produk Pilihan',
      bgColor: theme.primaryBg,
    },
    {
      icon: ShieldCheck,
      title: '100%',
      subtitle: 'Original & Terpercaya',
      bgColor: theme.primaryBg,
    },
    {
      icon: Users,
      title: '5000+',
      subtitle: 'Pelanggan Puas',
      bgColor: theme.primaryBg,
    },
    {
      icon: Truck,
      title: 'Cepat & Aman',
      subtitle: 'Pengiriman Terjamin',
      bgColor: theme.primaryBg,
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {highlights.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 hover:shadow-sm transition-all duration-200 group"
          >
            {/* Round Icon Badge */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ${item.bgColor} group-hover:scale-105 transition-transform duration-200`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Text details */}
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm sm:text-base text-foreground leading-tight">
                {item.title}
              </span>
              <span className="text-xs text-muted-foreground font-medium truncate">
                {item.subtitle}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default StoreHighlights;
