import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Available theme colors
export const themeColors = {
    blue: {
        name: 'Biru Profesional',
        primary: '217 91% 60%',
        primaryDark: '217 91% 45%',
        primaryLight: '217 100% 85%',
    },
    emerald: {
        name: 'Hijau Emerald',
        primary: '160 84% 39%',
        primaryDark: '160 84% 30%',
        primaryLight: '160 84% 75%',
    },
    violet: {
        name: 'Ungu Violet',
        primary: '262 83% 58%',
        primaryDark: '262 83% 45%',
        primaryLight: '262 83% 80%',
    },
    rose: {
        name: 'Merah Rose',
        primary: '350 89% 60%',
        primaryDark: '350 89% 45%',
        primaryLight: '350 89% 80%',
    },
    amber: {
        name: 'Kuning Amber',
        primary: '38 92% 50%',
        primaryDark: '38 92% 40%',
        primaryLight: '38 92% 75%',
    },
    cyan: {
        name: 'Biru Cyan',
        primary: '192 91% 36%',
        primaryDark: '192 91% 28%',
        primaryLight: '192 91% 70%',
    },
    slate: {
        name: 'Abu-abu Slate',
        primary: '215 20% 45%',
        primaryDark: '215 20% 35%',
        primaryLight: '215 20% 75%',
    },
    teal: {
        name: 'Hijau Teal',
        primary: '173 80% 40%',
        primaryDark: '173 80% 30%',
        primaryLight: '173 80% 70%',
    },
};

// Available fonts
export const fontOptions = {
    inter: {
        name: 'Inter',
        family: '"Inter", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    },
    poppins: {
        name: 'Poppins',
        family: '"Poppins", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    },
    roboto: {
        name: 'Roboto',
        family: '"Roboto", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    },
    nunito: {
        name: 'Nunito',
        family: '"Nunito", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',
    },
    opensans: {
        name: 'Open Sans',
        family: '"Open Sans", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap',
    },
    lato: {
        name: 'Lato',
        family: '"Lato", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
    },
    montserrat: {
        name: 'Montserrat',
        family: '"Montserrat", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
    },
    quicksand: {
        name: 'Quicksand',
        family: '"Quicksand", system-ui, -apple-system, sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap',
    },
};

export type ThemeColor = keyof typeof themeColors;
export type FontFamily = keyof typeof fontOptions;

interface ThemeContextType {
    themeColor: ThemeColor;
    setThemeColor: (color: ThemeColor) => void;
    fontFamily: FontFamily;
    setFontFamily: (font: FontFamily) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
        const saved = localStorage.getItem('pos-theme-color');
        return (saved as ThemeColor) || 'blue';
    });

    const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
        const saved = localStorage.getItem('pos-font-family');
        return (saved as FontFamily) || 'inter';
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('pos-dark-mode');
        return saved === 'true';
    });

    // Apply theme color
    useEffect(() => {
        const theme = themeColors[themeColor];
        const root = document.documentElement;

        // Set primary colors
        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--primary-dark', theme.primaryDark);
        root.style.setProperty('--primary-light', theme.primaryLight);
        root.style.setProperty('--ring', theme.primary);

        // Set sidebar colors to match theme
        root.style.setProperty('--sidebar-ring', theme.primary);
        root.style.setProperty('--sidebar-primary', theme.primary);
        root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');

        // Set sidebar accent for hover - use light version of primary
        root.style.setProperty('--sidebar-accent', theme.primaryLight);
        root.style.setProperty('--sidebar-accent-foreground', theme.primaryDark);

        localStorage.setItem('pos-theme-color', themeColor);
    }, [themeColor]);

    // Apply font family
    useEffect(() => {
        const font = fontOptions[fontFamily];

        // Load font from Google Fonts
        const existingLink = document.getElementById('google-fonts-link');
        if (existingLink) existingLink.remove();

        const link = document.createElement('link');
        link.id = 'google-fonts-link';
        link.rel = 'stylesheet';
        link.href = font.url;
        document.head.appendChild(link);

        // Apply font family to document
        document.documentElement.style.setProperty('font-family', font.family);
        document.body.style.fontFamily = font.family;
        localStorage.setItem('pos-font-family', fontFamily);
    }, [fontFamily]);

    // Apply dark mode
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('pos-dark-mode', String(isDarkMode));
    }, [isDarkMode]);

    const setThemeColor = (color: ThemeColor) => {
        setThemeColorState(color);
    };

    const setFontFamily = (font: FontFamily) => {
        setFontFamilyState(font);
    };

    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{
            themeColor,
            setThemeColor,
            fontFamily,
            setFontFamily,
            isDarkMode,
            toggleDarkMode,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
