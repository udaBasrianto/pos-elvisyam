import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';

interface NotificationContextType {
    pendingOrdersCount: number;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

    const fetchPendingOrders = useCallback(async () => {
        try {
            const response = await api.get('/admin/online-orders/pending-count');
            setPendingOrdersCount(response.data.count || 0);
        } catch (error) {
            console.error('Failed to fetch pending orders count:', error);
            setPendingOrdersCount(0);
        }
    }, []);

    const refreshNotifications = useCallback(async () => {
        await fetchPendingOrders();
    }, [fetchPendingOrders]);

    useEffect(() => {
        // Initial fetch
        fetchPendingOrders();

        // Poll every 30 seconds for new orders
        const interval = setInterval(fetchPendingOrders, 30000);

        return () => clearInterval(interval);
    }, [fetchPendingOrders]);

    return (
        <NotificationContext.Provider value={{ pendingOrdersCount, refreshNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};
