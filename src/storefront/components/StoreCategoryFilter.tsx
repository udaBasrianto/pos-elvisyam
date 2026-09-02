import React from 'react';
import { getStoreThemeStyles } from '../utils/storeTheme';

interface Category {
  id: string;
  name: string;
  color?: string;
  product_count?: number;
}

export interface StoreCategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  themeColor?: string;
  onSelectCategory: (categoryName: string) => void;
}

export const StoreCategoryFilter: React.FC<StoreCategoryFilterProps> = ({
  categories,
  selectedCategory,
  themeColor,
  onSelectCategory,
}) => {
  const theme = getStoreThemeStyles(themeColor);

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
      {/* All Category Pill */}
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
          selectedCategory === 'all'
            ? `${theme.activePill} shadow-xs font-bold`
            : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
        }`}
      >
        Semua Produk
      </button>

      {/* Dynamic Categories */}
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.name;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.name)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              isSelected
                ? `${theme.activePill} shadow-xs font-bold`
                : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
            }`}
          >
            {cat.name}
            {cat.product_count !== undefined && (
              <span className={`ml-1.5 text-[10px] ${isSelected ? 'opacity-80' : 'text-muted-foreground'}`}>
                ({cat.product_count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StoreCategoryFilter;
