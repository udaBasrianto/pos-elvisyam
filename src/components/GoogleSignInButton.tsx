import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (parent: HTMLElement, options: any) => void;
                    prompt: (notification?: any) => void;
                    cancel: () => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    target: 'storefront' | 'pos';
    onSuccess: (credential: string) => void;
    onError?: (err: Error) => void;
    disabled?: boolean;
    buttonText?: 'signin_with' | 'signup_with' | 'continue_with';
    showDivider?: boolean;
    dividerText?: string;
    className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
    target,
    onSuccess,
    onError,
    disabled = false,
    buttonText = 'continue_with',
    showDivider = false,
    dividerText = 'Atau dengan email',
    className = ''
}) => {
    const [googleConfig, setGoogleConfig] = useState<{
        is_enabled: boolean;
        client_id: string;
        enable_storefront: boolean;
        enable_pos: boolean;
    } | null>(null);

    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Google configuration from backend
    useEffect(() => {
        let isMounted = true;
        api.get('/auth/google-config')
            .then((res) => {
                if (isMounted && res.data) {
                    setGoogleConfig(res.data);
                }
            })
            .catch((e) => {
                console.error('Failed to fetch google config:', e);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // 2. Load Google Identity Services SDK if enabled
    const isTargetEnabled = googleConfig?.is_enabled &&
        Boolean(googleConfig?.client_id) &&
        (target === 'storefront' ? googleConfig.enable_storefront : googleConfig.enable_pos);

    useEffect(() => {
        if (!isTargetEnabled || !googleConfig?.client_id) return;

        if (window.google?.accounts?.id) {
            setIsScriptLoaded(true);
            return;
        }

        const existingScript = document.getElementById('google-gsi-script');
        if (existingScript) {
            existingScript.addEventListener('load', () => setIsScriptLoaded(true));
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setIsScriptLoaded(true);
        script.onerror = () => {
            console.error('Failed to load Google GIS script');
            onError?.(new Error('Gagal memuat pustaka Google Sign-In'));
        };
        document.body.appendChild(script);
    }, [isTargetEnabled, googleConfig?.client_id, onError]);

    // 3. Render official Google button when ready
    useEffect(() => {
        if (!isTargetEnabled || !isScriptLoaded || !googleConfig?.client_id || !buttonRef.current) return;

        try {
            window.google?.accounts.id.initialize({
                client_id: googleConfig.client_id,
                callback: (response: { credential: string }) => {
                    if (response?.credential) {
                        setIsAuthenticating(true);
                        onSuccess(response.credential);
                    }
                },
                cancel_on_tap_outside: true,
            });

            buttonRef.current.innerHTML = '';
            window.google?.accounts.id.renderButton(buttonRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: buttonText,
                shape: 'rectangular',
                width: '100%',
                logo_alignment: 'left',
            });
        } catch (e: any) {
            console.error('Error rendering Google button:', e);
        }
    }, [isTargetEnabled, isScriptLoaded, googleConfig?.client_id, buttonText, onSuccess]);

    if (!isTargetEnabled) {
        return null;
    }

    return (
        <div className={`w-full relative ${className}`}>
            {isAuthenticating && (
                <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-xs font-medium">Memverifikasi akun Google...</span>
                </div>
            )}

            {/* Container for Google standard rendered iframe button */}
            <div
                ref={buttonRef}
                className={`w-full min-h-[40px] flex items-center justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            />

            {showDivider && (
                <div className="relative flex items-center justify-center my-3">
                    <span className="w-full border-t border-border" />
                    <span className="bg-card px-2.5 text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 font-medium">
                        {dividerText}
                    </span>
                    <span className="w-full border-t border-border" />
                </div>
            )}
        </div>
    );
};

export default GoogleSignInButton;
