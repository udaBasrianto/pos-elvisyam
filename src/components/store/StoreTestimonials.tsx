import React from 'react';
import { Star } from 'lucide-react';
import { getStoreThemeStyles } from '@/utils/storeTheme';

interface StoreTestimonialsProps {
  themeColor?: string;
  reviewsJson?: string;
  storeName?: string;
}

export const StoreTestimonials: React.FC<StoreTestimonialsProps> = ({ themeColor, reviewsJson, storeName }) => {
  const theme = getStoreThemeStyles(themeColor);

  const defaultReviews = [
    {
      name: 'Siti Rahmawati',
      city: 'Bandung',
      text: 'Kualitas produknya luar biasa! Pelayanan cepat, kemasan aman, dan admin ramah sekali.',
      stars: 5,
    },
    {
      name: 'Budi Santoso',
      city: 'Surabaya',
      text: 'Langganan belanja produk di sini. Selalu original, kualitas terjamin dan pengiriman cepat.',
      stars: 5,
    },
    {
      name: 'Dewi Lestari',
      city: 'Jakarta Selatan',
      text: 'Pesan pagi, sore langsung dikirim. Respon pemesanan via WhatsApp sangat ramah dan solutif.',
      stars: 5,
    },
  ];

  let displayReviews = defaultReviews;
  if (reviewsJson) {
    try {
      const parsed = JSON.parse(reviewsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        displayReviews = parsed.map((p: any) => ({
          name: p.name || 'Pelanggan Setia',
          city: p.city || '',
          text: p.comment || p.text || '',
          stars: p.rating || p.stars || 5,
        }));
      }
    } catch (e) {}
  }

  return (
    <section className={`${theme.softBg} border ${theme.softBorder} rounded-3xl p-6 sm:p-8 md:p-10 space-y-6`}>
      
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
          Testimoni Pelanggan {storeName ? `${storeName}` : ''}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          Apa kata mereka yang telah berbelanja dan merasakan kualitas layanan kami
        </p>
      </div>

      {/* Dynamic Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayReviews.map((rev, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-card border border-border/60 shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between text-left"
          >
            <div className="space-y-2">
              {/* Star Rating */}
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(rev.stars || 5)].map((_, sIdx) => (
                  <Star key={sIdx} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>

              {/* Quote Text */}
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic">
                "{rev.text}"
              </p>
            </div>

            {/* Author */}
            <div className="pt-2 border-t border-border/40">
              <p className="font-bold text-xs text-foreground">{rev.name}</p>
              {rev.city && <p className="text-[11px] text-muted-foreground">{rev.city}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
