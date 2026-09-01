import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface StoreCustomer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    points?: number;
    isMember?: boolean;
    memberTier?: 'silver' | 'gold' | 'platinum';
    balance?: number;
    totalSpent?: number;
}

interface StoreAuthContextType {
    customer: StoreCustomer | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (email: string, password: string) => Promise<{ error: Error | null }>;
    register: (data: RegisterData) => Promise<{ error: Error | null }>;
    logout: () => void;
    updateProfile: (data: Partial<StoreCustomer>) => Promise<{ error: Error | null }>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

export const useStoreAuth = () => {
    const context = useContext(StoreAuthContext);
    if (!context) throw new Error('useStoreAuth must be used within StoreAuthProvider');
    return context;
};

export const StoreAuthProvider = ({ children }: { children: ReactNode }) => {
    const [customer, setCustomer] = useState<StoreCustomer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isLoggedIn = !!customer;

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('store_customer_token');
        if (token) {
            try {
                const response = await api.get('/store/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data?.customer) {
                    setCustomer(response.data.customer);
                } else {
                    localStorage.removeItem('store_customer_token');
                    setCustomer(null);
                }
            } catch {
                localStorage.removeItem('store_customer_token');
                setCustomer(null);
            }
        }
        setIsLoading(false);
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/store/auth/login', { email, password });
            const data = response.data;
            localStorage.setItem('store_customer_token', data.token);
            setCustomer(data.customer);
            return { error: null };
        } catch (error: any) {
            return { error: new Error(error.response?.data?.error || error.message || 'Login gagal') };
        }
    };

    const register = async (registerData: RegisterData) => {
        try {
            const response = await api.post('/store/auth/register', registerData);
            const data = response.data;
            localStorage.setItem('store_customer_token', data.token);
            setCustomer(data.customer);
            return { error: null };
        } catch (error: any) {
            return { error: new Error(error.response?.data?.error || error.message || 'Registrasi gagal') };
        }
    };

    const logout = () => {
        localStorage.removeItem('store_customer_token');
        setCustomer(null);
    };

    const updateProfile = async (profileData: Partial<StoreCustomer>) => {
        try {
            const token = localStorage.getItem('store_customer_token');
            const response = await api.put('/store/auth/profile', profileData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCustomer(response.data.customer);
            return { error: null };
        } catch (error: any) {
            return { error: new Error(error.response?.data?.error || error.message || 'Gagal update profil') };
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        try {
            const token = localStorage.getItem('store_customer_token');
            await api.post('/store/auth/change-password', { currentPassword, newPassword }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return { error: null };
        } catch (error: any) {
            return { error: new Error(error.response?.data?.error || error.message || 'Gagal ubah password') };
        }
    };

    return (
        <StoreAuthContext.Provider
            value={{
                customer,
                isLoading,
                isLoggedIn,
                login,
                register,
                logout,
                updateProfile,
                changePassword
            }}
        >
            {children}
        </StoreAuthContext.Provider>
    );
};
