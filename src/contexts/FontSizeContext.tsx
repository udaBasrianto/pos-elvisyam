import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface FontSizeContextType {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    fontSizeValue: number;
}

const fontSizeMap: Record<FontSize, number> = {
    'small': 15,
    'medium': 17,
    'large': 19,
    'extra-large': 21,
};

const fontSizeLabels: Record<FontSize, string> = {
    'small': 'Kecil (15px)',
    'medium': 'Sedang (17px)',
    'large': 'Besar (19px)',
    'extra-large': 'Sangat Besar (21px)',
};

const FontSizeContext = createContext<FontSizeContextType | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
    const [fontSize, setFontSizeState] = useState<FontSize>(() => {
        const saved = localStorage.getItem('pos_font_size');
        return (saved as FontSize) || 'medium';
    });

    const setFontSize = (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem('pos_font_size', size);
    };

    const fontSizeValue = fontSizeMap[fontSize];

    // Apply font size to html element
    useEffect(() => {
        document.documentElement.style.fontSize = `${fontSizeValue}px`;
    }, [fontSizeValue]);

    return (
        <FontSizeContext.Provider value={{ fontSize, setFontSize, fontSizeValue }}>
            {children}
        </FontSizeContext.Provider>
    );
}

export function useFontSize() {
    const context = useContext(FontSizeContext);
    if (!context) {
        throw new Error('useFontSize must be used within a FontSizeProvider');
    }
    return context;
}

export { fontSizeMap, fontSizeLabels };
