import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Automatically target live VPS API on Android Native (Capacitor) or relative /api on web
const getApiUrl = () => {
    if (Capacitor.isNativePlatform()) {
        return 'https://pos.elvisyam.com/api';
    }
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    return '/api';
};

const API_URL = getApiUrl();

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 second timeout
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't redirect on 401 for auth endpoints (login, verify-otp)
        const isAuthEndpoint = error.config?.url?.includes('/auth/signin') || 
                              error.config?.url?.includes('/auth/verify-otp') ||
                              error.config?.url?.includes('/auth/signup');

        if (error.response?.status === 401 && !isAuthEndpoint) {
            // Token expired or invalid - clear and redirect to login
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pos_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
