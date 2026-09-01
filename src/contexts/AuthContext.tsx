import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

export type UserRole = 'admin' | 'manager' | 'kasir' | 'super_admin';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  tenant_id?: string;
  shop_slug?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, registrationToken: string) => Promise<{ data: any; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ requireOtp?: boolean; error: Error | null }>;
  signOut: () => Promise<void>;
  requestOtp: (email: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string, otp: string) => Promise<{ error: Error | null }>;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSuperAdmin: boolean;
  updateUser: (updatedFields: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        localStorage.setItem('pos_user', JSON.stringify(res.data.user));
      } catch (err: any) {
        // Jika offline atau backend mati, gunakan data lokal
        if (!navigator.onLine || err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
           const savedUser = localStorage.getItem('pos_user');
           if (savedUser) {
             try { setUser(JSON.parse(savedUser)); } catch(e) {}
             setIsLoading(false);
             return;
           }
        }
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  const refreshUser = async () => {
    await checkUser();
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('pos_user', JSON.stringify(updated));
      return updated;
    });
  };

  const signUp = async (email: string, password: string, fullName: string, registrationToken: string) => {
    try {
      const res = await api.post('/auth/signup', { email, password, full_name: fullName, registrationToken });
      const { user, token } = res.data;
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));
      setUser(user);
      return { data: { user }, error: null };
    } catch (error: any) {
      return { data: null, error: new Error(error.response?.data?.error || 'Signup failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/signin', { email, password });
      
      let data = res.data;
      // Handle case where server returns JSON string but with wrong content-type
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }

      if (data?.requireOtp) {
        return { requireOtp: true, error: null };
      }

      // Safety check: if response doesn't have token/user and didn't require OTP
      if (!data?.token || !data?.user) {
        console.error('Invalid login response:', data);
        return { error: new Error('Respon server tidak valid (missing OTP/Token)') };
      }

      const { user, token } = data;
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));
      setUser(user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.error || 'Login failed') };
    }
  };

  const requestOtp = async (email: string) => {
    try {
      await api.post('/auth/request-otp', { email });
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.error || 'Gagal mengirim OTP') };
    }
  };

  const signInWithOtp = async (email: string, otp: string) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      const { user, token } = res.data;
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));
      setUser(user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.error || 'OTP tidak valid') };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setUser(null);
  };

  // Role-based access helpers
  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      signUp, 
      signIn, 
      signOut, 
      requestOtp, 
      signInWithOtp, 
      hasRole, 
      isAdmin, 
      isManager, 
      isSuperAdmin,
      updateUser,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
