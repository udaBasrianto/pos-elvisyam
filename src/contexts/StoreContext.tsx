import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface CartItem {
    productId: string;
    name: string;
    price: number;
    image: string | null;
    quantity: number;
    subtotal: number;
    stock: number;
}

interface StoreContextType {
    cart: CartItem[];
    cartCount: number;
    cartTotal: number;
    sessionId: string;
    addToCart: (productId: string, quantity?: number) => Promise<void>;
    updateCartItem: (productId: string, quantity: number) => Promise<void>;
    removeFromCart: (productId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    loadCart: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used within StoreProvider');
    return context;
};

export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [sessionId] = useState(() => {
        const existing = localStorage.getItem('store_session_id');
        if (existing) return existing;
        const newSid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('store_session_id', newSid);
        return newSid;
    });

    const normalizeCart = (raw: any): CartItem[] => {
        const items = Array.isArray(raw) ? raw : (raw?.cart || []);
        return items.map((item: any) => ({
            productId: item.productId || item.product_id || item.id,
            name: item.name || item.productName || item.product_name || 'Produk',
            price: Number(item.price) || 0,
            image: item.image || null,
            quantity: Number(item.quantity) || 1,
            subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
            stock: Number(item.stock ?? item.maxStock ?? 99),
        }));
    };

    const cartCount = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    const cartTotal = cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);

    const loadCart = async () => {
        try {
            const response = await api.get(`/store/cart/${sessionId}`);
            if (response.data) {
                setCart(normalizeCart(response.data));
            }
        } catch {
            // Fallback gracefully to local storage or keep empty
            const localSaved = localStorage.getItem(`cart_${sessionId}`);
            if (localSaved) {
                try {
                    setCart(normalizeCart(JSON.parse(localSaved)));
                } catch {
                    setCart([]);
                }
            }
        }
    };

    const addToCart = async (productId: string, quantity: number = 1) => {
        try {
            const response = await api.post(`/store/cart/${sessionId}/add`, { productId, quantity });
            if (response.data) {
                const newCart = normalizeCart(response.data);
                setCart(newCart);
                localStorage.setItem(`cart_${sessionId}`, JSON.stringify(newCart));
            }
        } catch (error: any) {
            console.error('Add to cart error:', error);
            throw error;
        }
    };

    const updateCartItem = async (productId: string, quantity: number) => {
        try {
            const response = await api.put(`/store/cart/${sessionId}/update`, { productId, quantity });
            if (response.data) {
                const newCart = normalizeCart(response.data);
                setCart(newCart);
                localStorage.setItem(`cart_${sessionId}`, JSON.stringify(newCart));
            }
        } catch (error) {
            console.error('Update cart error:', error);
            throw error;
        }
    };

    const removeFromCart = async (productId: string) => {
        try {
            const response = await api.delete(`/store/cart/${sessionId}/remove/${productId}`);
            if (response.data) {
                const newCart = normalizeCart(response.data);
                setCart(newCart);
                localStorage.setItem(`cart_${sessionId}`, JSON.stringify(newCart));
            }
        } catch (error) {
            console.error('Remove from cart error:', error);
            throw error;
        }
    };

    const clearCart = async () => {
        try {
            await api.delete(`/store/cart/${sessionId}`);
        } catch {
            // ignore network error on clear
        }
        setCart([]);
        localStorage.removeItem(`cart_${sessionId}`);
    };

    useEffect(() => {
        loadCart();
    }, [sessionId]);

    return (
        <StoreContext.Provider
            value={{
                cart,
                cartCount,
                cartTotal,
                sessionId,
                addToCart,
                updateCartItem,
                removeFromCart,
                clearCart,
                loadCart,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
};
