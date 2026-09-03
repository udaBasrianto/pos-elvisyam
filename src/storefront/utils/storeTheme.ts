// Storefront Theme Helper to synchronize backend theme settings with storefront styling

export interface StoreThemeStyles {
  themeKey: string;
  primaryHsl: string;
  primaryBg: string;
  primaryText: string;
  primaryBorder: string;
  softBg: string;
  softBorder: string;
  badgeBg: string;
  badgeText?: string;
  primaryHex?: string;
  gradientCard: string;
  activeDot: string;
  activePill: string;
}

export const STORE_THEME_PALETTES = [
  { id: 'emerald', label: 'Emerald Hijau (Herbal & Sehat)', bg: 'bg-emerald-800' },
  { id: 'blue', label: 'Biru Samudra (Modern & Tech)', bg: 'bg-blue-600' },
  { id: 'violet', label: 'Violet Elegan (Mewah & Estetik)', bg: 'bg-violet-700' },
  { id: 'rose', label: 'Rose Pink (Kecantikan & Fashion)', bg: 'bg-rose-600' },
  { id: 'amber', label: 'Amber Oranye (Kuliner & Hangat)', bg: 'bg-amber-600' },
  { id: 'teal', label: 'Teal Laut (Elegan & Segar)', bg: 'bg-teal-700' },
  { id: 'cyan', label: 'Cyan Langit (Segar & Dinamis)', bg: 'bg-cyan-700' },
  { id: 'slate', label: 'Slate Gelap (Netral & Profesional)', bg: 'bg-slate-800' },
];

export const getStoreThemeStyles = (themeName: string = 'emerald'): StoreThemeStyles => {
  const normalized = themeName?.toLowerCase().trim() || 'emerald';

  switch (normalized) {
    case 'blue':
      return {
        themeKey: 'blue',
        primaryHsl: '217 91% 60%',
        primaryBg: 'bg-blue-600 hover:bg-blue-700 text-white',
        primaryText: 'text-blue-600 dark:text-blue-400',
        primaryBorder: 'border-blue-500/30',
        softBg: 'bg-blue-50/80 dark:bg-blue-950/40',
        softBorder: 'border-blue-200/70 dark:border-blue-800/40',
        badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
        gradientCard: 'from-blue-50/90 via-sky-50/30 to-blue-100/40 dark:from-blue-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-blue-600 dark:bg-blue-400',
        activePill: 'bg-blue-600 text-white ring-2 ring-blue-600/20',
      };
    case 'violet':
      return {
        themeKey: 'violet',
        primaryHsl: '262 83% 58%',
        primaryBg: 'bg-violet-700 hover:bg-violet-800 text-white',
        primaryText: 'text-violet-700 dark:text-violet-400',
        primaryBorder: 'border-violet-500/30',
        softBg: 'bg-violet-50/80 dark:bg-violet-950/40',
        softBorder: 'border-violet-200/70 dark:border-violet-800/40',
        badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300',
        gradientCard: 'from-violet-50/90 via-purple-50/30 to-violet-100/40 dark:from-violet-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-violet-700 dark:bg-violet-400',
        activePill: 'bg-violet-700 text-white ring-2 ring-violet-700/20',
      };
    case 'rose':
      return {
        themeKey: 'rose',
        primaryHsl: '350 89% 60%',
        primaryBg: 'bg-rose-600 hover:bg-rose-700 text-white',
        primaryText: 'text-rose-600 dark:text-rose-400',
        primaryBorder: 'border-rose-500/30',
        softBg: 'bg-rose-50/80 dark:bg-rose-950/40',
        softBorder: 'border-rose-200/70 dark:border-rose-800/40',
        badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
        gradientCard: 'from-rose-50/90 via-pink-50/30 to-rose-100/40 dark:from-rose-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-rose-600 dark:bg-rose-400',
        activePill: 'bg-rose-600 text-white ring-2 ring-rose-600/20',
      };
    case 'amber':
      return {
        themeKey: 'amber',
        primaryHsl: '38 92% 50%',
        primaryBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        primaryText: 'text-amber-600 dark:text-amber-400',
        primaryBorder: 'border-amber-500/30',
        softBg: 'bg-amber-50/80 dark:bg-amber-950/40',
        softBorder: 'border-amber-200/70 dark:border-amber-800/40',
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
        gradientCard: 'from-amber-50/90 via-orange-50/30 to-amber-100/40 dark:from-amber-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-amber-600 dark:bg-amber-400',
        activePill: 'bg-amber-600 text-white ring-2 ring-amber-600/20',
      };
    case 'teal':
      return {
        themeKey: 'teal',
        primaryHsl: '173 80% 40%',
        primaryBg: 'bg-teal-700 hover:bg-teal-800 text-white',
        primaryText: 'text-teal-700 dark:text-teal-400',
        primaryBorder: 'border-teal-500/30',
        softBg: 'bg-teal-50/80 dark:bg-teal-950/40',
        softBorder: 'border-teal-200/70 dark:border-teal-800/40',
        badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
        gradientCard: 'from-teal-50/90 via-cyan-50/30 to-teal-100/40 dark:from-teal-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-teal-700 dark:bg-teal-400',
        activePill: 'bg-teal-700 text-white ring-2 ring-teal-700/20',
      };
    case 'cyan':
      return {
        themeKey: 'cyan',
        primaryHsl: '192 91% 36%',
        primaryBg: 'bg-cyan-700 hover:bg-cyan-800 text-white',
        primaryText: 'text-cyan-700 dark:text-cyan-400',
        primaryBorder: 'border-cyan-500/30',
        softBg: 'bg-cyan-50/80 dark:bg-cyan-950/40',
        softBorder: 'border-cyan-200/70 dark:border-cyan-800/40',
        badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
        gradientCard: 'from-cyan-50/90 via-sky-50/30 to-cyan-100/40 dark:from-cyan-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-cyan-700 dark:bg-cyan-400',
        activePill: 'bg-cyan-700 text-white ring-2 ring-cyan-700/20',
      };
    case 'slate':
      return {
        themeKey: 'slate',
        primaryHsl: '215 20% 45%',
        primaryBg: 'bg-slate-800 hover:bg-slate-900 text-white',
        primaryText: 'text-slate-800 dark:text-slate-300',
        primaryBorder: 'border-slate-500/30',
        softBg: 'bg-slate-100/80 dark:bg-slate-900/60',
        softBorder: 'border-slate-200/70 dark:border-slate-800/40',
        badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        gradientCard: 'from-slate-100/90 via-gray-50/30 to-slate-200/40 dark:from-slate-900/60 dark:via-background dark:to-slate-950',
        activeDot: 'bg-slate-700 dark:bg-slate-400',
        activePill: 'bg-slate-800 text-white ring-2 ring-slate-800/20',
      };
    case 'emerald':
    default:
      return {
        themeKey: 'emerald',
        primaryHsl: '160 84% 39%',
        primaryBg: 'bg-emerald-800 hover:bg-emerald-900 text-white',
        primaryText: 'text-emerald-800 dark:text-emerald-400',
        primaryBorder: 'border-emerald-500/30',
        softBg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
        softBorder: 'border-emerald-200/70 dark:border-emerald-800/40',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
        gradientCard: 'from-emerald-50/90 via-amber-50/30 to-emerald-100/40 dark:from-emerald-950/40 dark:via-background dark:to-slate-900/50',
        activeDot: 'bg-emerald-700 dark:bg-emerald-400',
        activePill: 'bg-emerald-800 text-white ring-2 ring-emerald-800/20',
      };
  }
};
