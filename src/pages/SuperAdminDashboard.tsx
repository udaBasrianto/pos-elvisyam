import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatCard } from "@/components/ui/kpi-card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    Loader2,
    Users,
    Server,
    ShieldAlert,
    Copy,
    CopyCheck,
    Trash2,
    Key,
    Mail,
    Send,
    Save,
    MapPin,
    AlertTriangle,
    CheckCircle,
    Activity,
    DollarSign,
    Store,
    ShoppingCart,
    Download,
    Calendar,
    Search,
    TrendingUp,
    MessageSquare,
    BarChart3,
    Sparkles,
    Brain,
    Crown,
    Globe,
    Lightbulb,
    ArrowLeft,
    X,
    Check,
    RefreshCw,
    ExternalLink,
    Chrome,
    Eye,
    EyeOff,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import TenantSummaries from "@/pages/TenantSummaries";
import SuperAdminAnalytics from "@/components/SuperAdminAnalytics";
import LandingCmsEditor from "@/components/LandingCmsEditor";
import AdminFeatureRequests from "@/components/AdminFeatureRequests";

interface GlobalAnalytics {
    month: string;
    revenue: number;
    transactions: number;
}

interface SystemAnnouncement {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    is_active: number;
    created_at: string;
}

interface AuditLog {
    id: string;
    user_name: string;
    user_email: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
}

interface GlobalStats {
    tenants: number;
    tokens: {
        total: number;
        used: number;
        unused: number;
    };
    smtpConfigured: boolean;
    lastGlobalBackup: string | null;
    totalTransactions: number;
}

interface Tenant {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
    role: string;
    subscription_tier?: string;
    subscription_expires_at?: string;
    max_products?: number;
    max_transactions?: number;
    service_queue_enabled?: boolean;
    workshop_enabled?: boolean;
    barbershop_enabled?: boolean;
    fnb_enabled?: boolean;
    laundry_enabled?: boolean;
    // Stats to be fetched separately per tenant or from a combined endpoint
    stats?: {
        totalSales: number;
        totalAssets: number;
        margin: number;
        activeProducts: number;
    };
}

interface TenantStats {
    totalSales: number;
    totalTransactions: number;
    totalAssets: number;
    totalProducts: number;
    margin: number;
    topProduct: {
        name: string;
        quantity: number;
    } | null;
}

interface TenantSummary {
    tenant_id: string;
    tenant_name: string;
    tenant_email: string;
    registered_at: string;
    today_revenue: number;
    today_transactions: number;
    month_revenue: number;
    month_transactions: number;
    alltime_revenue: number;
    alltime_transactions: number;
}

interface RegistrationToken {
    id: string;
    token: string;
    status: 'unused' | 'used';
    used_by_name?: string;
    created_at: string;
    used_at?: string;
}

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [tokens, setTokens] = useState<RegistrationToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingTokens, setIsLoadingTokens] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [openTicketsCount, setOpenTicketsCount] = useState(0);

    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get("tab") || "tenants";
    const activeTab = rawTab === "sparkles" ? "ai" : rawTab;

    const handleTabChange = (val: string) => {
        setSearchParams({ tab: val });
    };

    // Tenant Summaries State
    const [tenantSummaries, setTenantSummaries] = useState<TenantSummary[]>([]);
    const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
    const [searchSummary, setSearchSummary] = useState("");

    // SMTP Settings State
    const [smtpSettings, setSmtpSettings] = useState({
        smtp_host: "",
        smtp_port: 465,
        smtp_user: "",
        smtp_pass: "",
        smtp_secure: true
    });
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);
    const [testEmail, setTestEmail] = useState("");

    // AI Settings State
    interface OpenRouterModelItem {
        id: string;
        name: string;
        pricing?: {
            prompt?: string;
            completion?: string;
        };
        context_length?: number;
    }

    const [aiSettings, setAiSettings] = useState({
        active_provider: "gemini",
        gemini_key: "",
        openai_key: "",
        groq_key: "",
        sumopod_key: "",
        sumopod_model: "deepseek-chat",
        openrouter_key: "",
        openrouter_model: "google/gemini-2.0-flash-exp:free"
    });
    const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelItem[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelSearch, setModelSearch] = useState("");
    const openRouterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isSavingAi, setIsSavingAi] = useState(false);

    // Google Auth Settings State
    const [googleSettings, setGoogleSettings] = useState({
        client_id: "",
        client_secret: "",
        is_enabled: false,
        enable_storefront: true,
        enable_pos: true
    });
    const [isSavingGoogle, setIsSavingGoogle] = useState(false);
    const [showGoogleSecret, setShowGoogleSecret] = useState(false);
    const [copiedOrigin, setCopiedOrigin] = useState(false);
    const [copiedRedirect, setCopiedRedirect] = useState(false);

    // Tenant details & filters state
    const [dateFilter, setDateFilter] = useState("all_time");
    const [searchTenant, setSearchTenant] = useState("");
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [saasStats, setSaasStats] = useState<any>(null);
    const [subFormData, setSubFormData] = useState({
        subscription_tier: 'free',
        subscription_expires_at: '',
        max_products: 100,
        max_transactions: 1000,
        service_queue_enabled: false,
        workshop_enabled: false,
        barbershop_enabled: false,
        fnb_enabled: false,
        laundry_enabled: false
    });
    const [isSavingSub, setIsSavingSub] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);


    // Pillars State
    const [analyticsData, setAnalyticsData] = useState<GlobalAnalytics[]>([]);
    const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ message: '', type: 'info', is_active: true });
    const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Global Stats
            const statsRes = await api.get('/admin/global-stats');
            setStats(statsRes.data);

            // Fetch Tenants (Admin users)
            const usersRes = await api.get('/admin/tenants/list');
            setTenants(usersRes.data);
            
            // Note: In a real advanced app, we'd loop through and fetch individual stats or use an aggregated endpoint
            // For now, these will be placeholders.
            
            // Load Tokens
            fetchTokens();

            // Load Tenant Summaries
            fetchSummaries();

            // Load Discussions/Tickets
            try {
                const ticketsRes = await api.get('/discussions');
                const open = ticketsRes.data.filter((t: any) => t.status === 'open');
                setOpenTicketsCount(open.length);
            } catch (e) { console.error('Error fetching tickets', e); }

            // Load SMTP Settings
            const smtpRes = await api.get('/admin/smtp-settings');
            if (smtpRes.data && smtpRes.data.smtp_host) {
                setSmtpSettings({
                    smtp_host: smtpRes.data.smtp_host || '',
                    smtp_port: smtpRes.data.smtp_port || 465,
                    smtp_user: smtpRes.data.smtp_user || '',
                    smtp_pass: '', // Intentionally left empty for security, only update if typed
                    smtp_secure: smtpRes.data.smtp_secure === 1
                });
            }

            // Load AI Settings
            try {
                const aiRes = await api.get('/admin/ai-settings');
                if (aiRes.data) {
                    const loadedSettings = {
                        active_provider: aiRes.data.active_provider || 'gemini',
                        gemini_key: aiRes.data.gemini_key || '',
                        openai_key: aiRes.data.openai_key || '',
                        groq_key: aiRes.data.groq_key || '',
                        sumopod_key: aiRes.data.sumopod_key || '',
                        sumopod_model: aiRes.data.sumopod_model || 'deepseek-chat',
                        openrouter_key: aiRes.data.openrouter_key || '',
                        openrouter_model: aiRes.data.openrouter_model || 'google/gemini-2.0-flash-exp:free'
                    };
                    setAiSettings(loadedSettings);
                    if (loadedSettings.active_provider === 'openrouter' || loadedSettings.openrouter_key) {
                        fetchOpenRouterModels(loadedSettings.openrouter_key);
                    }
                }
            } catch (e) {
                console.error('Error loading AI settings:', e);
            }

            // Load Google Auth Settings
            try {
                const googleRes = await api.get('/admin/google-auth-settings');
                if (googleRes.data) {
                    setGoogleSettings({
                        client_id: googleRes.data.client_id || '',
                        client_secret: googleRes.data.client_secret || '',
                        is_enabled: googleRes.data.is_enabled === true,
                        enable_storefront: googleRes.data.enable_storefront !== false,
                        enable_pos: googleRes.data.enable_pos !== false
                    });
                }
            } catch (e) {
                console.error('Error loading Google settings:', e);
            }

            // Load Pillars
            const [analyticsRes, announceRes, logsRes] = await Promise.all([
                api.get('/admin/global-analytics'),
                api.get('/admin/announcements'),
                api.get('/admin/audit-logs')
            ]);
            
            if (analyticsRes.data && analyticsRes.data.success) {
                setSaasStats(analyticsRes.data.data);
                setAnalyticsData(analyticsRes.data.data.revenueHistory || []);
            } else {
                setAnalyticsData(analyticsRes.data || []);
            }
            
            setAnnouncements(announceRes.data);
            setAuditLogs(logsRes.data);

        } catch (error: any) {
            console.error("Error loading dashboard data:", error);
            toast.error("Gagal memuat data dashboard super admin");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTokens = async () => {
        setIsLoadingTokens(true);
        try {
            const response = await api.get("/auth/registration-tokens");
            setTokens(response.data);
        } catch (error: any) {
            console.error("Error fetching tokens:", error);
        } finally {
            setIsLoadingTokens(false);
        }
    };

    const fetchSummaries = async () => {
        setIsLoadingSummaries(true);
        try {
            const res = await api.get('/admin/tenants/summaries');
            setTenantSummaries(res.data);
        } catch (error) {
            console.error("Error fetching summaries:", error);
            toast.error("Gagal memuat ringkasan tenant");
        } finally {
            setIsLoadingSummaries(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Auto refresh tickets every 1 hour
        const fetchTicketsLoop = async () => {
            try {
                const ticketsRes = await api.get('/discussions');
                const open = ticketsRes.data.filter((t: any) => t.status === 'open');
                setOpenTicketsCount(open.length);
            } catch (_err) {
                // Ignore silent background refresh error
            }
        };
        const ticketInterval = setInterval(fetchTicketsLoop, 3600000); // 1 hour

        return () => {
             clearInterval(ticketInterval);
             if (openRouterTimeoutRef.current) clearTimeout(openRouterTimeoutRef.current);
        };
    }, []);


    const handleGenerateToken = async () => {
        setIsSubmitting(true);
        try {
            await api.post("/auth/registration-tokens");
            toast.success("Token registrasi berhasil dibuat");
            fetchTokens();
            fetchData(); // Refresh global stat counters
        } catch (error: any) {
            console.error("Error generating token:", error);
            toast.error("Gagal membuat token");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteToken = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus token ini?")) return;
        try {
            await api.delete(`/auth/registration-tokens/${id}`);
            toast.success("Token berhasil dihapus");
            fetchTokens();
            fetchData();
        } catch (error: any) {
            console.error("Error deleting token:", error);
            toast.error("Gagal menghapus token");
        }
    };

    const handleCopyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        setCopiedToken(token);
        toast.success("Token disalin ke clipboard");
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handleSaveSmtp = async () => {
        setIsSavingSmtp(true);
        try {
            await api.put('/admin/smtp-settings', smtpSettings);
            toast.success("Konfigurasi SMTP berhasil disimpan");
            fetchData();
        } catch (error: any) {
            console.error("Error saving SMTP settings:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan konfigurasi SMTP");
        } finally {
            setIsSavingSmtp(false);
        }
    };

    const fetchOpenRouterModels = async (keyOverride?: string) => {
        const apiKey = keyOverride !== undefined ? keyOverride : aiSettings.openrouter_key;
        setIsLoadingModels(true);
        try {
            let modelsData: OpenRouterModelItem[] = [];
            try {
                const res = await api.get('/admin/openrouter/models', {
                    params: apiKey ? { key: apiKey } : {}
                });
                if (res.data && Array.isArray(res.data.data)) {
                    modelsData = res.data.data;
                }
            } catch (bErr) {
                const directRes = await fetch('https://openrouter.ai/api/v1/models', {
                    headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
                });
                const json = await directRes.json();
                if (json && Array.isArray(json.data)) {
                    modelsData = json.data;
                }
            }

            if (modelsData.length > 0) {
                modelsData.sort((a, b) => {
                    const aFree = a.id.includes(':free') || a.pricing?.prompt === '0';
                    const bFree = b.id.includes(':free') || b.pricing?.prompt === '0';
                    if (aFree && !bFree) return -1;
                    if (!aFree && bFree) return 1;
                    return a.name.localeCompare(b.name);
                });
                setOpenRouterModels(modelsData);
                toast.success(`Berhasil memuat ${modelsData.length} model OpenRouter!`);
            } else {
                toast.error("Gagal mendapatkan daftar model OpenRouter. Periksa API key.");
            }
        } catch (error: any) {
            console.error("Error fetching OpenRouter models:", error);
            toast.error("Gagal mengambil model OpenRouter: " + (error.message || 'Network error'));
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleOpenRouterKeyChange = (val: string) => {
        setAiSettings(prev => ({ ...prev, openrouter_key: val }));
        if (val.trim().length >= 15) {
            if (openRouterTimeoutRef.current) clearTimeout(openRouterTimeoutRef.current);
            openRouterTimeoutRef.current = setTimeout(() => {
                fetchOpenRouterModels(val.trim());
            }, 600);
        }
    };

    const filteredOpenRouterModels = useMemo(() => {
        if (!modelSearch) return openRouterModels;
        const q = modelSearch.toLowerCase();
        return openRouterModels.filter(m => 
            m.name.toLowerCase().includes(q) || 
            m.id.toLowerCase().includes(q)
        );
    }, [openRouterModels, modelSearch]);

    const handleSaveAi = async () => {
        setIsSavingAi(true);
        try {
            await api.put('/admin/ai-settings', aiSettings);
            toast.success("Konfigurasi AI berhasil disimpan");
        } catch (error: any) {
            console.error("Error saving AI settings:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan konfigurasi AI");
        } finally {
            setIsSavingAi(false);
        }
    };

    const handleSaveGoogle = async () => {
        if (googleSettings.is_enabled && !googleSettings.client_id.trim()) {
            toast.error("Google Client ID wajib diisi jika status diaktifkan");
            return;
        }

        setIsSavingGoogle(true);
        try {
            await api.put('/admin/google-auth-settings', googleSettings);
            toast.success("Konfigurasi Google Auth berhasil disimpan!");
            fetchData();
        } catch (error: any) {
            console.error("Error saving Google settings:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan konfigurasi Google Auth");
        } finally {
            setIsSavingGoogle(false);
        }
    };

    const handleCopyOrigin = () => {
        const origin = window.location.origin;
        navigator.clipboard.writeText(origin);
        setCopiedOrigin(true);
        toast.success("URL Origin disalin ke clipboard!");
        setTimeout(() => setCopiedOrigin(false), 2000);
    };

    const handleCopyRedirect = () => {
        const origin = window.location.origin;
        navigator.clipboard.writeText(origin);
        setCopiedRedirect(true);
        toast.success("Redirect URI disalin ke clipboard!");
        setTimeout(() => setCopiedRedirect(false), 2000);
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error("Masukkan alamat email tujuan test");
            return;
        }

        setIsTestingSmtp(true);
        try {
            const res = await api.post('/admin/smtp-settings/test', { email: testEmail });
            toast.success(res.data.message || "Email test berhasil dikirim!");
        } catch (error: any) {
            console.error("Test email error:", error);
            toast.error(error.response?.data?.error || "Gagal mengirim email test");
        } finally {
            setIsTestingSmtp(false);
        }
    };

    const openTenantDetails = async (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setIsDialogOpen(true);
        setIsStatsLoading(true);
        try {
            const res = await api.get(`/admin/tenants/${tenant.id}/stats?date_filter=${dateFilter}`);
            setTenantStats(res.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
            toast.error("Gagal mengambil statistik toko");
        } finally {
            setIsStatsLoading(false);
        }
    };

    // Re-fetch stats if dialog is open and date filter changes
    useEffect(() => {
        if (isDialogOpen && selectedTenant) {
            openTenantDetails(selectedTenant);
        }
    }, [dateFilter]);

    // Sync subscription form data when selectedTenant changes
    useEffect(() => {
        if (selectedTenant) {
            setSubFormData({
                subscription_tier: selectedTenant.subscription_tier || 'free',
                subscription_expires_at: selectedTenant.subscription_expires_at ? selectedTenant.subscription_expires_at.split('T')[0] : '',
                max_products: selectedTenant.max_products !== undefined ? selectedTenant.max_products : 100,
                max_transactions: selectedTenant.max_transactions !== undefined ? selectedTenant.max_transactions : 1000,
                service_queue_enabled: selectedTenant.service_queue_enabled === true,
                workshop_enabled: selectedTenant.workshop_enabled === true,
                barbershop_enabled: selectedTenant.barbershop_enabled === true,
                fnb_enabled: selectedTenant.fnb_enabled === true,
                laundry_enabled: selectedTenant.laundry_enabled === true
            });
        }
    }, [selectedTenant]);

    const handleSaveSubscription = async () => {
        if (!selectedTenant) return;
        setIsSavingSub(true);
        try {
            await api.put(`/admin/tenants/${selectedTenant.id}/subscription`, subFormData);
            toast.success("Pengaturan langganan dan modul berhasil disimpan!");
            // Refresh tenants list from server
            const usersRes = await api.get('/admin/tenants/list');
            setTenants(usersRes.data);
            const freshTenant = usersRes.data.find((t: any) => t.id === selectedTenant.id);
            if (freshTenant) {
                setSelectedTenant(freshTenant);
            } else {
                setSelectedTenant(prev => prev ? ({ ...prev, ...subFormData }) : null);
            }
        } catch (error: any) {
            console.error("Error saving subscription:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan pengaturan langganan");
        } finally {
            setIsSavingSub(false);
        }
    };

    const handleImpersonate = async () => {
        if (!selectedTenant) return;
        setIsImpersonating(true);
        try {
            const res = await api.post(`/admin/tenants/${selectedTenant.id}/impersonate`);
            const impersonationToken = res.data.token;
            
            // Store original SuperAdmin token
            const currentToken = localStorage.getItem('pos_token') || localStorage.getItem('token');
            if (currentToken) {
                localStorage.setItem('original_admin_token', currentToken);
            }
            
            // Set active token to impersonation token
            localStorage.setItem('pos_token', impersonationToken);
            localStorage.setItem('token', impersonationToken);
            localStorage.removeItem('pos_user');
            
            toast.success(`Berhasil masuk sebagai sesi ${selectedTenant.full_name}! Mengalihkan...`);
            
            // Redirect to dashboard as tenant
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 600);
        } catch (error: any) {
            console.error("Error impersonating tenant:", error);
            toast.error(error.response?.data?.error || "Gagal melakukan impersonasi");
        } finally {
            setIsImpersonating(false);
        }
    };

    const handleDownloadBackup = async (tenantId: string) => {
        setIsBackupLoading(true);
        try {
            const response = await api.get(`/admin/tenants/${tenantId}/backup`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup-tenant-${tenantId}-${new Date().toISOString().split('T')[0]}.sql`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Backup berhasil diunduh");
        } catch (error) {
            console.error("Backup error:", error);
            toast.error("Gagal mendownload backup");
        } finally {
            setIsBackupLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        const cleanDateStr = typeof dateString === 'string' && dateString.endsWith('Z')
            ? dateString.replace('Z', '')
            : dateString;
        return new Date(cleanDateStr).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">


            {/* Global Stats KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 md:gap-4">
                <StatCard
                    title="Total Tenant/Toko"
                    value={stats?.tenants?.toString() || "0"}
                    icon={Store}
                    iconColor="blue"
                />
                <StatCard
                    title="Total Transaksi System"
                    value={stats?.totalTransactions?.toString() || "0"}
                    icon={Activity}
                    iconColor="emerald"
                />
                <StatCard
                    title="Token Tersedia"
                    value={stats?.tokens.unused?.toString() || "0"}
                    icon={Key}
                    iconColor="orange"
                    subtitle={`Dari total ${stats?.tokens.total || 0} token`}
                />
                <StatCard
                    title="Status SMTP"
                    value={stats?.smtpConfigured ? "Siap" : "Belum Setting"}
                    icon={Mail}
                    iconColor={stats?.smtpConfigured ? "green" : "red"}
                />
                <StatCard
                    title="Tiket Masuk"
                    value={openTicketsCount.toString()}
                    icon={MessageSquare}
                    iconColor="red"
                    subtitle="Menunggu Tanggapan"
                />
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* TENANTS TAB */}
                <TabsContent value="tenants" className="space-y-5 m-0">
                    {selectedTenant ? (
                        /* 🌟 FULL-PAGE INLINE TENANT DETAILS & MANAGEMENT (NO POPUP) */
                        <div className="space-y-5 animate-in fade-in-50 duration-200">
                            {/* Header Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border shadow-xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedTenant(null)}
                                            className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary/10"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            Kembali ke Semua Toko
                                        </Button>
                                        <Badge className="bg-primary text-primary-foreground text-xs">
                                            {selectedTenant.subscription_tier ? `Paket: ${selectedTenant.subscription_tier.toUpperCase()}` : 'Aktif'}
                                        </Badge>
                                        <Badge variant="outline" className="text-[11px] font-mono">
                                            ID: {selectedTenant.id.substring(0, 8)}
                                        </Badge>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2 mt-1">
                                        <Store className="w-6 h-6 text-primary" />
                                        {selectedTenant.full_name}
                                    </h2>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" /> {selectedTenant.email} &bull; Bergabung sejak {new Date(selectedTenant.created_at).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="h-9 px-3 text-xs border rounded-xl bg-background font-medium"
                                    >
                                        <option value="all_time">Sepanjang Waktu</option>
                                        <option value="today">Hari Ini</option>
                                        <option value="this_month">Bulan Ini</option>
                                    </select>

                                    <Button
                                        onClick={handleImpersonate}
                                        disabled={isImpersonating}
                                        className="h-9 text-xs font-semibold gap-1.5 bg-gradient-primary shadow-xs"
                                    >
                                        {isImpersonating ? (
                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengalihkan...</>
                                        ) : (
                                            <><Users className="w-3.5 h-3.5" /> Masuk Sesi Toko (Impersonasi)</>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setSelectedTenant(null)}
                                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                        title="Tutup"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {isStatsLoading ? (
                                <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card rounded-2xl border shadow-xs">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground font-medium">Memuat analitik dan data toko...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                    {/* Kolom Kiri: Analitik Finansial & Produk (7 Cols) */}
                                    <div className="lg:col-span-7 space-y-5">
                                        {tenantStats ? (
                                            <>
                                                {/* KPI Cards */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Total Omset Penjualan</p>
                                                        <p className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-200">
                                                            {formatCurrency(tenantStats.totalSales)}
                                                        </p>
                                                        <p className="text-[11px] text-blue-600/80 mt-1 font-medium">{tenantStats.totalTransactions} transaksi terselesaikan</p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Profit Kotor (Margin)</p>
                                                        <p className="text-lg sm:text-xl font-bold text-emerald-800 dark:text-emerald-200">
                                                            {formatCurrency(tenantStats.margin)}
                                                        </p>
                                                        <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">Omset dikurangi HPP</p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                                                        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Estimasi Total Aset</p>
                                                        <p className="text-lg sm:text-xl font-bold text-purple-800 dark:text-purple-200">
                                                            {formatCurrency(tenantStats.totalAssets)}
                                                        </p>
                                                        <p className="text-[11px] text-purple-600/80 mt-1 font-medium">Nilai valuasi stok barang</p>
                                                    </div>
                                                </div>

                                                {/* Top Product */}
                                                {tenantStats.topProduct && (
                                                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                                                                <TrendingUp className="w-4 h-4 text-amber-600" />
                                                                Produk Terlaris Periode Ini
                                                            </div>
                                                            <p className="text-base font-extrabold text-amber-900 dark:text-amber-100">
                                                                {tenantStats.topProduct.name}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-amber-500 text-white font-bold text-xs shrink-0 px-3 py-1">
                                                            Terjual {tenantStats.topProduct.quantity} Unit
                                                        </Badge>
                                                    </div>
                                                )}
                                            </>
                                        ) : null}

                                        {/* Backup & Data Mitigasi */}
                                        <Card className="rounded-2xl border bg-card shadow-xs">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                                    <Download className="w-4 h-4 text-blue-600" />
                                                    Ekspor & Backup Database Mandiri
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Unduh file dump SQL mentah khusus data produk, transaksi, pelanggan, dan pengaturan toko ini.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownloadBackup(selectedTenant.id)}
                                                    disabled={isBackupLoading}
                                                    className="w-full sm:w-auto text-xs font-semibold gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                                                >
                                                    {isBackupLoading ? (
                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengekstrak SQL Backup...</>
                                                    ) : (
                                                        <><Download className="w-3.5 h-3.5" /> Download SQL Backup Toko Ini</>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Kolom Kanan: Paket Langganan, Fitur & Kuota (5 Cols) */}
                                    <div className="lg:col-span-5 space-y-5">
                                        <Card className="rounded-2xl border bg-card shadow-xs">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                                    <Crown className="w-4 h-4 text-amber-500" />
                                                    Paket Langganan & Fitur Toko
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Atur batasan kuota, masa aktif, dan aktifkan modul khusus untuk tenant ini.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub_tier" className="text-xs font-semibold">Tingkatan Paket (Tier)</Label>
                                                    <select
                                                        id="sub_tier"
                                                        value={subFormData.subscription_tier}
                                                        onChange={e => setSubFormData({...subFormData, subscription_tier: e.target.value})}
                                                        className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs font-semibold"
                                                    >
                                                        <option value="free">Free Tier (Standard)</option>
                                                        <option value="pro">Pro Tier (Bisnis)</option>
                                                        <option value="enterprise">Enterprise Tier (Unlimited)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub_expires" className="text-xs font-semibold">Tanggal Kedaluwarsa Langganan</Label>
                                                    <Input
                                                        id="sub_expires"
                                                        type="date"
                                                        className="h-9 text-xs rounded-xl"
                                                        value={subFormData.subscription_expires_at}
                                                        onChange={e => setSubFormData({...subFormData, subscription_expires_at: e.target.value})}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="max_products" className="text-xs font-semibold">Batas Produk</Label>
                                                        <Input
                                                            id="max_products"
                                                            type="number"
                                                            className="h-9 text-xs rounded-xl"
                                                            value={subFormData.max_products}
                                                            onChange={e => setSubFormData({...subFormData, max_products: parseInt(e.target.value) || 0})}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="max_txs" className="text-xs font-semibold">Batas Transaksi / Bln</Label>
                                                        <Input
                                                            id="max_txs"
                                                            type="number"
                                                            className="h-9 text-xs rounded-xl"
                                                            value={subFormData.max_transactions}
                                                            onChange={e => setSubFormData({...subFormData, max_transactions: parseInt(e.target.value) || 0})}
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={handleSaveSubscription}
                                                    disabled={isSavingSub}
                                                    className="w-full h-9 text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                                                >
                                                    {isSavingSub ? (
                                                        <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyimpan...</>
                                                    ) : (
                                                        <><Save className="w-3.5 h-3.5 mr-1" /> Simpan Pengaturan Langganan</>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 🌟 DAFTAR TENANT/TOKO GRID (TAMPIL KETIKA TIDAK ADA TOKO TERPILIH) */
                        <Card className="border-0 shadow-md bg-card">
                            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    Daftar Toko Terdaftar
                                </CardTitle>
                                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input 
                                            placeholder="Cari toko..." 
                                            className="pl-9"
                                            value={searchTenant}
                                            onChange={(e) => setSearchTenant(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="px-3 py-2 border border-input bg-background rounded-md text-sm w-full sm:w-auto"
                                    >
                                        <option value="all_time">Semua Waktu</option>
                                        <option value="today">Hari Ini</option>
                                        <option value="this_month">Bulan Ini</option>
                                    </select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {tenants.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>Belum ada tenant/toko terdaftar</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {tenants.filter(t => t.full_name.toLowerCase().includes(searchTenant.toLowerCase()) || t.email.toLowerCase().includes(searchTenant.toLowerCase())).map(tenant => (
                                                <div 
                                                    key={tenant.id} 
                                                    className="p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50 group"
                                                    onClick={() => openTenantDetails(tenant)}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h3 className="font-bold text-lg">{tenant.full_name}</h3>
                                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                <Mail className="w-3 h-3" /> {tenant.email}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge className="bg-primary/15 text-primary border-0">Aktif</Badge>
                                                            {tenant.subscription_tier && (
                                                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 capitalize text-[10px] border-0">
                                                                    {tenant.subscription_tier}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground text-xs block">Terdaftar</span>
                                                            <span className="font-medium">{new Date(tenant.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs block">Level</span>
                                                            <span className="font-medium capitalize">{tenant.role}</span>
                                                        </div>
                                                    </div>
                                                    <div className="pt-3 border-t flex justify-between items-center mt-2 group-hover:text-primary transition-colors">
                                                        <span className="text-sm font-medium">Lihat Detail, Analitik & Langganan &rarr;</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* RINGKASAN TENANT TAB */}
                <TabsContent value="summaries">
                    <TenantSummaries />
                </TabsContent>

                {/* TOKENS TAB */}
                <TabsContent value="tokens">
                    <Card className="border-0 shadow-md bg-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5 text-primary" />
                                Token Registrasi
                            </CardTitle>
                            <Button onClick={handleGenerateToken} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Key className="w-4 h-4 mr-2" />
                                )}
                                Buat Token Baru
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-6">
                                Token registrasi digunakan untuk mendaftarkan toko (tenant) baru ke dalam sistem. Berikan token ini kepada pemilik toko.
                            </p>
                            
                            {isLoadingTokens ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : tokens.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Key className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>Belum ada token. Buat token baru untuk mendaftarkan admin toko.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {tokens.map((token) => (
                                        <div key={token.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                                            <div className="flex gap-4 items-center">
                                                <div className={`p-3 rounded-full ${token.status === 'unused' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                                                    <Key className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-lg">{token.token}</span>
                                                        <Badge variant={token.status === 'unused' ? 'default' : 'secondary'}>
                                                            {token.status === 'unused' ? 'Tersedia' : 'Terpakai'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Dibuat: {formatDate(token.created_at)}
                                                        {token.status === 'used' && token.used_by_name && ` • Oleh: ${token.used_by_name}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {token.status === 'unused' && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => handleCopyToken(token.token)}>
                                                            {copiedToken === token.token ? <CopyCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteToken(token.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SMTP TAB */}
                <TabsContent value="smtp">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-primary" />
                                    Pengaturan SMTP Email
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Konfigurasi SMTP digunakan oleh sistem untuk mengirimkan OTP dan pemberitahuan ke seluruh pengguna.
                                </p>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="smtp_host">SMTP Host</Label>
                                            <Input
                                                id="smtp_host"
                                                placeholder="smtp.gmail.com"
                                                value={smtpSettings.smtp_host}
                                                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="smtp_port">SMTP Port</Label>
                                            <Input
                                                id="smtp_port"
                                                type="number"
                                                placeholder="465"
                                                value={smtpSettings.smtp_port}
                                                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtp_user">Email Address</Label>
                                        <Input
                                            id="smtp_user"
                                            type="email"
                                            placeholder="pos.system@gmail.com"
                                            value={smtpSettings.smtp_user}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtp_pass">Email Password / App Password</Label>
                                        <Input
                                            id="smtp_pass"
                                            type="password"
                                            placeholder="Minimal 16 karakter App Password (jika kosong, tidak diubah)"
                                            value={smtpSettings.smtp_pass}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">Untuk Gmail, gunakan App Password, bukan password email biasa.</p>
                                    </div>

                                    <Button onClick={handleSaveSmtp} disabled={isSavingSmtp} className="w-full mt-4">
                                        {isSavingSmtp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4 mr-2" /> Simpan Pengaturan</>}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Send className="w-5 h-5 text-primary" />
                                    Test Konfigurasi SMTP
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-balance mb-4">
                                    Setelah pengaturan disimpan, sangat disarankan untuk mengirim email test untuk memastikan sistem dapat mengirimkan email dengan baik.
                                </p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Email Penerima Test</Label>
                                        <Input
                                            type="email"
                                            placeholder="email.anda@gmail.com"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                        />
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        onClick={handleTestEmail} 
                                        disabled={isTestingSmtp || !testEmail}
                                        className="w-full border-primary text-primary hover:bg-primary/10"
                                    >
                                        {isTestingSmtp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                        Kirim Email Test
                                    </Button>
                                </div>

                                {stats?.smtpConfigured === false && (
                                    <div className="mt-8 flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <strong>SMTP Belum dikonfigurasi.</strong> Login dengan OTP tidak akan bisa mengirim email saat ini.
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* AI TAB */}
                <TabsContent value="ai">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-600" />
                                    Pengaturan Model Bisnis AI
                                </CardTitle>
                                <CardDescription>
                                    Pilih provider AI utama untuk menganalisis performa bisnis retail tenant dan berikan API Key yang valid.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="active_provider">Penyedia Layanan AI Utama (Active Provider)</Label>
                                    <select
                                        id="active_provider"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={aiSettings.active_provider}
                                        onChange={(e) => setAiSettings({ ...aiSettings, active_provider: e.target.value })}
                                    >
                                        <option value="gemini">Google Gemini (Default)</option>
                                        <option value="openrouter">OpenRouter AI (Multi-Model Gateway: Claude, GPT-4o, DeepSeek, dll)</option>
                                        <option value="openai">OpenAI (ChatGPT)</option>
                                        <option value="groq">Groq AI (Llama 3)</option>
                                        <option value="sumopod">SumoPod AI Gateway</option>
                                    </select>
                                </div>

                                <div className="border-t pt-4 space-y-4">
                                    {aiSettings.active_provider === "openrouter" && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="openrouter_key" className="font-semibold text-xs">OpenRouter API Key</Label>
                                                    <a
                                                        href="https://openrouter.ai/keys"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Dapatkan Kunci di OpenRouter.ai
                                                    </a>
                                                </div>
                                                <Input
                                                    id="openrouter_key"
                                                    type="password"
                                                    placeholder="sk-or-v1-..."
                                                    value={aiSettings.openrouter_key}
                                                    onChange={(e) => handleOpenRouterKeyChange(e.target.value)}
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Saat API key dimasukkan, sistem akan <strong>otomatis menarik seluruh model yang tersedia</strong> ke dalam menu dropdown di bawah.
                                                </p>
                                            </div>

                                            {/* Dynamic Model Selector Dropdown */}
                                            <div className="space-y-2.5 p-4 rounded-xl border border-primary/20 bg-primary/5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="openrouter_model_select" className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                        Pilih Model AI ({openRouterModels.length > 0 ? `${openRouterModels.length} Model Siap Dipilih` : "Menunggu Data Model..."})
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => fetchOpenRouterModels()}
                                                        disabled={isLoadingModels}
                                                        className="h-7 text-xs gap-1 hover:bg-primary/10"
                                                    >
                                                        <RefreshCw className={`w-3 h-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                                        {isLoadingModels ? 'Memuat Model...' : 'Muat Ulang Model'}
                                                    </Button>
                                                </div>

                                                {/* Filter search box for large model lists */}
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Filter pencarian model (misal: deepseek, claude, free, gpt-4o, llama)..."
                                                        value={modelSearch}
                                                        onChange={(e) => setModelSearch(e.target.value)}
                                                        className="pl-8 h-8 text-xs bg-background"
                                                    />
                                                </div>

                                                {/* Dropdown Select */}
                                                <select
                                                    id="openrouter_model_select"
                                                    value={aiSettings.openrouter_model}
                                                    onChange={(e) => setAiSettings({ ...aiSettings, openrouter_model: e.target.value })}
                                                    className="w-full h-10 px-3 text-xs rounded-lg border border-input bg-background font-medium focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                                >
                                                    {openRouterModels.length === 0 ? (
                                                        <option value={aiSettings.openrouter_model || "google/gemini-2.0-flash-exp:free"}>
                                                            {aiSettings.openrouter_model || "Default: google/gemini-2.0-flash-exp:free"} (Tekan 'Muat Ulang Model')
                                                        </option>
                                                    ) : (
                                                        filteredOpenRouterModels.map((m) => {
                                                            const isFree = m.id.includes(':free') || m.pricing?.prompt === '0';
                                                            return (
                                                                <option key={m.id} value={m.id}>
                                                                    {isFree ? '🎁 [GRATIS] ' : ''}{m.name} — ({m.id}) {m.context_length ? `[${Math.round(m.context_length / 1024)}k ctx]` : ''}
                                                                </option>
                                                            );
                                                        })
                                                    )}
                                                </select>

                                                {/* Selected Model Preview Badge */}
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    <span className="text-[11px] text-muted-foreground">Model Terpilih:</span>
                                                    <Badge variant="secondary" className="font-mono text-xs text-primary font-bold bg-primary/10 border-primary/20">
                                                        {aiSettings.openrouter_model || "google/gemini-2.0-flash-exp:free"}
                                                    </Badge>
                                                    {(aiSettings.openrouter_model?.includes(':free')) && (
                                                        <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold">
                                                            Free Tier
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Manual Custom Model Input */}
                                                <div className="pt-2 border-t border-border/50">
                                                    <Label htmlFor="manual_model_input" className="text-[10px] text-muted-foreground">
                                                        Atau ketik ID Model manual (opsional jika model baru belum terdaftar):
                                                    </Label>
                                                    <Input
                                                        id="manual_model_input"
                                                        type="text"
                                                        placeholder="Contoh: deepseek/deepseek-r1:free"
                                                        value={aiSettings.openrouter_model}
                                                        onChange={(e) => setAiSettings({ ...aiSettings, openrouter_model: e.target.value })}
                                                        className="h-8 text-xs font-mono mt-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {aiSettings.active_provider === "gemini" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="gemini_key">Google Gemini API Key</Label>
                                            <Input
                                                id="gemini_key"
                                                type="password"
                                                placeholder="AIzaSy..."
                                                value={aiSettings.gemini_key}
                                                onChange={(e) => setAiSettings({ ...aiSettings, gemini_key: e.target.value })}
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Dapatkan kunci API gratis di <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a>. Model default: <strong>gemini-2.5-flash</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {aiSettings.active_provider === "openai" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="openai_key">OpenAI API Key</Label>
                                            <Input
                                                id="openai_key"
                                                type="password"
                                                placeholder="sk-..."
                                                value={aiSettings.openai_key}
                                                onChange={(e) => setAiSettings({ ...aiSettings, openai_key: e.target.value })}
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Dapatkan kunci di <a href="https://platform.openai.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">OpenAI Platform</a>. Model default: <strong>gpt-4o-mini</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {aiSettings.active_provider === "groq" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="groq_key">Groq API Key</Label>
                                            <Input
                                                id="groq_key"
                                                type="password"
                                                placeholder="gsk_..."
                                                value={aiSettings.groq_key}
                                                onChange={(e) => setAiSettings({ ...aiSettings, groq_key: e.target.value })}
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Dapatkan kunci di <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">Groq Console</a>. Model default: <strong>llama-3.3-70b-versatile</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {aiSettings.active_provider === "sumopod" && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="sumopod_key">SumoPod API Key</Label>
                                                <Input
                                                    id="sumopod_key"
                                                    type="password"
                                                    placeholder="Masukkan kunci API SumoPod Anda"
                                                    value={aiSettings.sumopod_key}
                                                    onChange={(e) => setAiSettings({ ...aiSettings, sumopod_key: e.target.value })}
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Dapatkan kunci di dashboard <a href="https://ai.sumopod.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">SumoPod AI</a>.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="sumopod_model">Nama Model SumoPod (misal: deepseek-chat, gpt-4o-mini)</Label>
                                                <Input
                                                    id="sumopod_model"
                                                    type="text"
                                                    placeholder="deepseek-chat"
                                                    value={aiSettings.sumopod_model}
                                                    onChange={(e) => setAiSettings({ ...aiSettings, sumopod_model: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button onClick={handleSaveAi} disabled={isSavingAi} className="w-full">
                                    {isSavingAi ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Simpan Konfigurasi AI
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                                    <Brain className="w-5 h-5" />
                                    Tentang Konsultan AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-4">
                                <p>
                                    Fitur Analisis AI bertindak sebagai <strong>Konsultan Bisnis Digital</strong> bagi masing-masing pemilik toko (tenant).
                                </p>
                                <p>
                                    AI akan mengolah data transaksi harian, pergeseran stok, dan korelasi pembelian antar barang untuk merumuskan saran-saran praktis seperti:
                                </p>
                                <ul className="list-disc list-inside space-y-1.5 ml-1 text-xs">
                                    <li>Optimalisasi shift kerja staf pada jam tersibuk.</li>
                                    <li>Pembuatan paket promo/bundling otomatis berdasarkan barang yang sering dibeli bersamaan.</li>
                                    <li>Rencana aksi strategis 30 hari untuk menaikkan omset penjualan retail.</li>
                                </ul>
                                <p className="text-xs italic pt-2">
                                    Pilih provider yang Anda sukai. Groq sangat cepat, Gemini gratis di level awal, sedangkan SumoPod dan OpenAI menawarkan reliabilitas tinggi.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* GOOGLE AUTH TAB */}
                <TabsContent value="google-auth">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Kolom Kiri: Form Konfigurasi Google Client ID (7 Cols) */}
                        <div className="lg:col-span-7 space-y-5">
                            <Card className="border-0 shadow-md">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-red-500 to-amber-500 flex items-center justify-center shadow-sm">
                                                <Chrome className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-bold">Konfigurasi Login Google (OAuth 2.0)</CardTitle>
                                                <CardDescription className="text-xs">
                                                    Atur Google Client ID agar pelanggan toko online dan staf dapat masuk dengan akun Google 1-klik.
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge
                                            className={googleSettings.is_enabled && googleSettings.client_id ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}
                                        >
                                            {googleSettings.is_enabled && googleSettings.client_id ? "Aktif" : "Nonaktif"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {/* Status Card Notice */}
                                    {googleSettings.is_enabled && googleSettings.client_id ? (
                                        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Integrasi Google Sign-In Sedang Aktif</p>
                                                <p className="text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                                                    Tombol &quot;Masuk dengan Google&quot; ditampilkan pada halaman login sesuai target yang Anda aktifkan di bawah.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <p className="font-semibold text-amber-800 dark:text-amber-300">Login Google Belum Aktif</p>
                                                <p className="text-amber-700/90 dark:text-amber-400/90 mt-0.5">
                                                    Masukkan Google Client ID Anda di bawah ini dan aktifkan sakelar untuk mulai menggunakan fitur ini.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Form Fields */}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="google_client_id" className="text-xs font-semibold flex items-center gap-1.5">
                                                Google Client ID <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="google_client_id"
                                                placeholder="Contoh: 123456789-abcdefghijk.apps.googleusercontent.com"
                                                value={googleSettings.client_id}
                                                onChange={(e) => setGoogleSettings({ ...googleSettings, client_id: e.target.value.trim() })}
                                                className="font-mono text-xs h-10"
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Dapatkan dari <strong>Google Cloud Console &gt; Credentials &gt; OAuth 2.0 Client IDs</strong>.
                                            </p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="google_client_secret" className="text-xs font-semibold">
                                                    Google Client Secret <span className="text-muted-foreground font-normal">(Opsional)</span>
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                                                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {showGoogleSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    {showGoogleSecret ? "Sembunyikan" : "Tampilkan"}
                                                </button>
                                            </div>
                                            <Input
                                                id="google_client_secret"
                                                type={showGoogleSecret ? "text" : "password"}
                                                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                                                value={googleSettings.client_secret}
                                                onChange={(e) => setGoogleSettings({ ...googleSettings, client_secret: e.target.value.trim() })}
                                                className="font-mono text-xs h-10"
                                            />
                                        </div>

                                        <div className="pt-2 pb-1 border-t space-y-3">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Pengaturan Visibilitas & Sakelar
                                            </p>

                                            {/* Global Enable Toggle */}
                                            <div className="flex items-center justify-between p-3 rounded-xl border bg-card/60">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="google_is_enabled" className="text-xs font-bold cursor-pointer">
                                                        Aktifkan Login Google Global
                                                    </Label>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Nyalakan sakelar ini agar integrasi Google Sign-In dapat digunakan di sistem.
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="google_is_enabled"
                                                    checked={googleSettings.is_enabled}
                                                    onCheckedChange={(checked) => setGoogleSettings({ ...googleSettings, is_enabled: checked })}
                                                />
                                            </div>

                                            {/* Storefront Toggle */}
                                            <div className="flex items-center justify-between p-3 rounded-xl border bg-card/60">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="google_storefront" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                                        <Store className="w-3.5 h-3.5 text-blue-600" />
                                                        Tampilkan di Toko Online (Storefront)
                                                    </Label>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Pelanggan dapat langsung belanja atau mendaftar akun dengan 1-klik akun Google.
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="google_storefront"
                                                    checked={googleSettings.enable_storefront}
                                                    disabled={!googleSettings.is_enabled}
                                                    onCheckedChange={(checked) => setGoogleSettings({ ...googleSettings, enable_storefront: checked })}
                                                />
                                            </div>

                                            {/* POS App Toggle */}
                                            <div className="flex items-center justify-between p-3 rounded-xl border bg-card/60">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="google_pos" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                                                        Tampilkan di Login POS / Dashboard
                                                    </Label>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Admin toko atau kasir yang email Google-nya sudah terdaftar dapat login instan.
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="google_pos"
                                                    checked={googleSettings.enable_pos}
                                                    disabled={!googleSettings.is_enabled}
                                                    onCheckedChange={(checked) => setGoogleSettings({ ...googleSettings, enable_pos: checked })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSaveGoogle}
                                        disabled={isSavingGoogle}
                                        className="w-full gap-2 font-semibold shadow-xs"
                                    >
                                        {isSavingGoogle ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan Konfigurasi...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Simpan Pengaturan Google OAuth</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Kolom Kanan: Panduan Setup Google Cloud & Pratinjau (5 Cols) */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* Copy Helpers Card */}
                            <Card className="border-0 shadow-md">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-blue-600" />
                                            Data untuk Google Cloud Console
                                        </CardTitle>
                                        <a
                                            href="https://console.cloud.google.com/apis/credentials"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                                        >
                                            Buka Console <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <CardDescription className="text-xs">
                                        Salin parameter URL berikut saat mendaftarkan Web Application di Google Cloud:
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3.5">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-muted-foreground">Authorized JavaScript Origins:</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCopyOrigin}
                                                className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                                            >
                                                {copiedOrigin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                {copiedOrigin ? "Disalin!" : "Salin"}
                                            </Button>
                                        </div>
                                        <div className="p-2.5 bg-muted/60 rounded-xl font-mono text-[11px] break-all border select-all">
                                            {window.location.origin}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-muted-foreground">Authorized Redirect URIs:</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCopyRedirect}
                                                className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                                            >
                                                {copiedRedirect ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                {copiedRedirect ? "Disalin!" : "Salin"}
                                            </Button>
                                        </div>
                                        <div className="p-2.5 bg-muted/60 rounded-xl font-mono text-[11px] break-all border select-all">
                                            {window.location.origin}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Step-by-Step Guide Card */}
                            <Card className="border-0 shadow-md">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-amber-500" />
                                        Panduan Cepat 4 Langkah
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                                    <div className="flex gap-2.5 items-start">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                                        <p>Buka <strong>Google Cloud Console</strong> &gt; pilih / buat project baru &gt; masuk ke menu <strong>APIs & Services &gt; Credentials</strong>.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                                        <p>Klik <strong>+ Create Credentials</strong> &gt; pilih <strong>OAuth client ID</strong> &gt; Application type: <strong>Web application</strong>.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                                        <p>Tempelkan URL dari kotak di atas ke bagian <strong>Authorized JavaScript origins</strong> dan <strong>Authorized redirect URIs</strong>, lalu klik <strong>Create</strong>.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                                        <p>Salin <strong>Client ID</strong> yang didapat, tempelkan ke kolom form di samping kiri, nyalakan sakelar lalu klik <strong>Simpan</strong>. Selesai!</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Live Preview Simulator */}
                            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Pratinjau Tampilan Tombol di Toko
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="p-4 rounded-xl border bg-background text-center space-y-2.5">
                                        <p className="text-[11px] text-muted-foreground">Simulasi tombol login pelanggan:</p>
                                        <div className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-input bg-card shadow-xs text-xs font-semibold text-foreground hover:bg-accent transition-all cursor-pointer">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                                            </svg>
                                            Lanjutkan dengan Google
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>


                {/* ANALYTICS TAB */}
                <TabsContent value="analytics">
                    <SuperAdminAnalytics saasStats={saasStats} analyticsData={analyticsData} />
                </TabsContent>

                {/* ANNOUNCEMENTS TAB */}
                <TabsContent value="announcements">
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                Broadcast Pengumuman Sistem
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4 md:col-span-1 border rounded-xl p-4 bg-muted/20">
                                    <h3 className="font-semibold text-lg">Buat Pengumuman Baru</h3>
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <Label>Pesan Pengumuman</Label>
                                            <Input 
                                                className="mt-1"
                                                value={newAnnouncement.message}
                                                onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                                                placeholder="Contoh: Maintenance Server pukul 22:00..."
                                            />
                                        </div>
                                        <div>
                                            <Label>Tipe (Warna Spanduk)</Label>
                                            <select 
                                                className="w-full flex h-10 mt-1 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                                value={newAnnouncement.type}
                                                onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                                            >
                                                <option value="info">Info (Biru)</option>
                                                <option value="warning">Peringatan (Kuning)</option>
                                                <option value="error">Mendesak (Merah)</option>
                                            </select>
                                        </div>
                                        <Button 
                                            className="w-full mt-4" 
                                            onClick={async () => {
                                                if (!newAnnouncement.message) return toast.error("Pesan wajib diisi");
                                                setIsSubmittingAnnouncement(true);
                                                try {
                                                    await api.post('/admin/announcements', newAnnouncement);
                                                    toast.success("Pengumuman berhasil disiarkan");
                                                    setNewAnnouncement({ message: '', type: 'info', is_active: true });
                                                    const announceRes = await api.get('/admin/announcements');
                                                    setAnnouncements(announceRes.data);
                                                } catch(e) {
                                                    toast.error("Gagal membuat pengumuman");
                                                } finally {
                                                    setIsSubmittingAnnouncement(false);
                                                }
                                            }}
                                            disabled={isSubmittingAnnouncement || !newAnnouncement.message}
                                        >
                                            {isSubmittingAnnouncement ? "Menyiarkan..." : "Siarkan Sekarang"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <h3 className="font-semibold text-lg">Riwayat Pengumuman</h3>
                                    <div className="overflow-x-auto border rounded-xl shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted text-muted-foreground border-b">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Waktu Buat</th>
                                                    <th className="px-4 py-3 font-medium">Pesan Tayang</th>
                                                    <th className="px-4 py-3 text-center font-medium">Status</th>
                                                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {announcements.map((ann) => (
                                                    <tr key={ann.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">{
                                                            new Date(ann.created_at).toLocaleDateString("id-ID", {
                                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                                            })
                                                        }</td>
                                                        <td className="px-4 py-3 align-middle">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ann.type === 'error' ? 'bg-red-500' : ann.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                                                <span className="font-medium">{ann.message}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center align-middle">
                                                            {ann.is_active ? 
                                                                <Badge className="bg-green-100 text-green-700 border-green-200">Aktif & Tampil</Badge> : 
                                                                <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-right align-middle">
                                                            <Button 
                                                                variant={ann.is_active ? "secondary" : "outline"} 
                                                                size="sm"
                                                                onClick={async () => {
                                                                    await api.put(`/admin/announcements/${ann.id}/toggle`);
                                                                    toast.success(ann.is_active ? "Pengumuman diturunkan" : "Pengumuman diaktifkan kembali");
                                                                    const announceRes = await api.get('/admin/announcements');
                                                                    setAnnouncements(announceRes.data);
                                                                }}
                                                            >
                                                                {ann.is_active ? 'Matikan' : 'Tayangkan'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {announcements.length === 0 && (
                                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Belum ada tayangan pengumuman yang tercatat.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AUDIT LOGS TAB */}
                <TabsContent value="audit">
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                Jejak Sistem Analitik (500 Aktivitas Terakhir)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-xl shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Tanggal & Waktu</th>
                                            <th className="px-4 py-3 font-medium">Pelaku (User)</th>
                                            <th className="px-4 py-3 font-medium">Aksi Eksekusi</th>
                                            <th className="px-4 py-3 font-medium">Sasaran / Entitas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map((log) => (
                                            <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleDateString("id-ID", {
                                                        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold">{log.user_name || 'Sistem / Anonim'}</p>
                                                    <p className="text-xs text-muted-foreground">{log.user_email || '-'}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={`bg-card capitalize ${log.action_type.includes('delete') ? 'text-red-600 border-red-200 bg-red-50' : log.action_type.includes('update') ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}` }>
                                                        {log.action_type.replace(/_/g, ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-foreground capitalize">{log.entity_type}</span>
                                                    {log.entity_id && (
                                                        <span className="text-xs text-muted-foreground ml-2">ID: {log.entity_id.split('-')[0]}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {auditLogs.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Belum ada catatan aktivitas di platform.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LANDING PAGE CMS TAB */}
                <TabsContent value="landing">
                    <LandingCmsEditor />
                </TabsContent>

                {/* FEATURE REQUESTS TAB */}
                <TabsContent value="feature-requests">
                    <AdminFeatureRequests />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SuperAdminDashboard;
