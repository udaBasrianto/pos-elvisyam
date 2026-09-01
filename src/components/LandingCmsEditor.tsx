import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Save,
    Plus,
    Trash2,
    Globe,
    Layout,
    BarChart2,
    Zap,
    Monitor,
    MousePointerClick,
    ExternalLink,
    RefreshCw,
    Upload,
    X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface LandingCmsData {
    brandName: string;
    logoUrl?: string;
    brandLogo?: string;
    hero: {
        badge: string;
        titlePrefix: string;
        titleHighlight: string;
        description: string;
        primaryCta: string;
        secondaryCta: string;
    };
    stats: Array<{ label: string; value: string }>;
    autoSyncStats?: boolean;
    featuresHeader: {
        title: string;
        description: string;
    };
    features: Array<{ icon: string; title: string; description: string }>;
    showcase: {
        title: string;
        bullets: string[];
        ctaText: string;
        imageUrl: string;
    };
    ctaSection: {
        title: string;
        description: string;
        primaryCta: string;
        primaryCtaUrl?: string;
        secondaryCta: string;
        secondaryCtaUrl?: string;
    };
    footer: {
        copyright: string;
        termsUrl: string;
        privacyUrl: string;
    };
    demoAccount?: {
        enabled: boolean;
        email: string;
        password: string;
        title: string;
        description: string;
    };
    seo?: {
        title?: string;
        description?: string;
        keywords?: string;
        author?: string;
        ogImage?: string;
        faviconUrl?: string;
    };
}

const defaultCmsFallback: LandingCmsData = {
    brandName: "POS-INV",
    hero: {
        badge: "Solusi POS Modern untuk Bisnis Anda",
        titlePrefix: "Kelola Inventaris & Penjualan ",
        titleHighlight: "Lebih Cerdas",
        description: "Sistem Kasir (POS) dan Inventaris terintegrasi yang dirancang untuk mempercepat transaksi, mengelola stok secara real-time, dan memberikan laporan bisnis yang akurat.",
        primaryCta: "Coba Gratis",
        secondaryCta: "Lihat Demo Toko"
    },
    stats: [
        { label: "Transaksi/Bulan", value: "10K+" },
        { label: "UMKM Terbantu", value: "500+" },
        { label: "Efisiensi Waktu", value: "45%" },
        { label: "Akurasi Stok", value: "99.9%" }
    ],
    featuresHeader: {
        title: "Semua yang Anda Butuhkan untuk Berkembang",
        description: "Fitur lengkap yang dirancang khusus untuk memudahkan operasional harian bisnis ritel dan jasa."
    },
    features: [],
    showcase: {
        title: "Dashboard Interaktif untuk Keputusan yang Lebih Baik",
        bullets: [],
        ctaText: "Lihat Dashboard",
        imageUrl: ""
    },
    ctaSection: {
        title: "Siap Meningkatkan Bisnis Anda?",
        description: "Bergabunglah dengan ratusan pengusaha lainnya yang telah beralih ke POS-INV untuk operasional yang lebih efisien.",
        primaryCta: "Daftar Sekarang",
        primaryCtaUrl: "/auth",
        secondaryCta: "Hubungi Sales",
        secondaryCtaUrl: "/auth"
    },
    footer: {
        copyright: "© 2026 POS-INV System. Dibuat dengan ❤️ untuk UMKM Indonesia.",
        termsUrl: "#",
        privacyUrl: "#"
    },
    demoAccount: {
        enabled: true,
        email: "demo@posh.web.id",
        password: "password",
        title: "Akun Demo Interaktif",
        description: "Coba seluruh fitur kasir, manajemen stok, dan laporan secara langsung tanpa pendaftaran."
    },
    seo: {
        title: "POS-INV - Aplikasi Kasir & POS Modern Terintegrasi",
        description: "Sistem Kasir (POS) dan Manajemen Inventaris Cloud Multi-Tenant, Cepat, Akurat, dan Terintegrasi untuk Bisnis & UMKM.",
        keywords: "aplikasi kasir, pos system, software kasir, manajemen stok, inventori, point of sale, toko online",
        author: "POS-INV",
        ogImage: "/pwa-512x512.png",
        faviconUrl: "/logo.svg"
    }
};

const LandingCmsEditor: React.FC = () => {
    const [cms, setCms] = useState<LandingCmsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchCmsData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/landing-cms");
            const raw = response.data || {};
            setCms({
                ...defaultCmsFallback,
                ...raw,
                hero: { ...defaultCmsFallback.hero, ...(raw.hero || {}) },
                stats: raw.stats || defaultCmsFallback.stats,
                featuresHeader: { ...defaultCmsFallback.featuresHeader, ...(raw.featuresHeader || {}) },
                features: raw.features || defaultCmsFallback.features,
                showcase: { ...defaultCmsFallback.showcase, ...(raw.showcase || {}) },
                ctaSection: { ...defaultCmsFallback.ctaSection, ...(raw.ctaSection || {}) },
                footer: { ...defaultCmsFallback.footer, ...(raw.footer || {}) },
                demoAccount: { ...defaultCmsFallback.demoAccount, ...(raw.demoAccount || {}) },
                seo: { ...defaultCmsFallback.seo, ...(raw.seo || {}) },
            });
        } catch (error: any) {
            console.error("Error fetching Landing CMS:", error);
            toast.error("Gagal mengambil data Landing CMS");
            setCms(defaultCmsFallback);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCmsData();
    }, []);

    const handleSave = async () => {
        if (!cms) return;
        setIsSaving(true);
        try {
            const response = await api.put("/admin/landing-cms", cms);
            toast.success(response.data.message || "Konten Landing Page berhasil disimpan!");
        } catch (error: any) {
            console.error("Error saving Landing CMS:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan konten Landing Page");
        } finally {
            setIsSaving(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setIsUploadingImage(true);
        try {
            const res = await api.post('/admin/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.imageUrl) {
                setCms(prev => prev ? {
                    ...prev,
                    showcase: { ...prev.showcase, imageUrl: res.data.imageUrl }
                } : prev);
                toast.success("Gambar preview berhasil di-upload!");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            try {
                const res2 = await api.post('/upload/product-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res2.data.imageUrl) {
                    setCms(prev => prev ? {
                        ...prev,
                        showcase: { ...prev.showcase, imageUrl: res2.data.imageUrl }
                    } : prev);
                    toast.success("Gambar preview berhasil di-upload!");
                    return;
                }
            } catch (_) {}
            toast.error("Gagal meng-upload gambar. Silakan coba lagi.");
        } finally {
            setIsUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const ogFileInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingOg, setIsUploadingOg] = useState(false);
    const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const handleLogoUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        setIsUploadingLogo(true);

        try {
            const res = await api.post('/products/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.imageUrl) {
                setCms(prev => prev ? {
                    ...prev,
                    logoUrl: res.data.imageUrl
                } : prev);
                toast.success("Logo Brand berhasil di-upload!");
            }
        } catch (error) {
            console.error("Logo upload error:", error);
            toast.error("Gagal meng-upload logo.");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSeoUpload = async (file: File, target: 'ogImage' | 'faviconUrl') => {
        const formData = new FormData();
        formData.append('image', file);
        if (target === 'ogImage') setIsUploadingOg(true);
        if (target === 'faviconUrl') setIsUploadingFavicon(true);

        try {
            const res = await api.post('/admin/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.imageUrl) {
                setCms(prev => prev ? {
                    ...prev,
                    seo: { ...(prev.seo || {}), [target]: res.data.imageUrl }
                } : prev);
                toast.success(`Gambar ${target === 'ogImage' ? 'Social Share' : 'Favicon'} berhasil di-upload!`);
            }
        } catch (error) {
            try {
                const res2 = await api.post('/upload/product-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res2.data.imageUrl) {
                    setCms(prev => prev ? {
                        ...prev,
                        seo: { ...(prev.seo || {}), [target]: res2.data.imageUrl }
                    } : prev);
                    toast.success(`Gambar ${target === 'ogImage' ? 'Social Share' : 'Favicon'} berhasil di-upload!`);
                    return;
                }
            } catch (_) {}
            console.error("SEO upload error:", error);
            toast.error("Gagal meng-upload gambar.");
        } finally {
            if (target === 'ogImage') setIsUploadingOg(false);
            if (target === 'faviconUrl') setIsUploadingFavicon(false);
        }
    };

    if (isLoading || !cms) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Memuat editor Landing Page...</p>
            </div>
        );
    }

    // Handlers for dynamic lists
    const handleStatChange = (index: number, field: "label" | "value", val: string) => {
        const updatedStats = [...cms.stats];
        updatedStats[index][field] = val;
        setCms({ ...cms, stats: updatedStats });
    };

    const addStat = () => {
        setCms({
            ...cms,
            stats: [...cms.stats, { label: "Statistik Baru", value: "100+" }],
        });
    };

    const removeStat = (index: number) => {
        const updatedStats = cms.stats.filter((_, i) => i !== index);
        setCms({ ...cms, stats: updatedStats });
    };

    const handleFeatureChange = (index: number, field: "icon" | "title" | "description", val: string) => {
        const updatedFeatures = [...cms.features];
        updatedFeatures[index][field] = val;
        setCms({ ...cms, features: updatedFeatures });
    };

    const addFeature = () => {
        setCms({
            ...cms,
            features: [
                ...cms.features,
                { icon: "Zap", title: "Fitur Baru", description: "Deskripsi fitur baru untuk pelanggan Anda." },
            ],
        });
    };

    const removeFeature = (index: number) => {
        const updatedFeatures = cms.features.filter((_, i) => i !== index);
        setCms({ ...cms, features: updatedFeatures });
    };

    const handleBulletChange = (index: number, val: string) => {
        const updatedBullets = [...cms.showcase.bullets];
        updatedBullets[index] = val;
        setCms({
            ...cms,
            showcase: { ...cms.showcase, bullets: updatedBullets },
        });
    };

    const addBullet = () => {
        setCms({
            ...cms,
            showcase: {
                ...cms.showcase,
                bullets: [...cms.showcase.bullets, "Keunggulan baru dashboard"],
            },
        });
    };

    const removeBullet = (index: number) => {
        const updatedBullets = cms.showcase.bullets.filter((_, i) => i !== index);
        setCms({
            ...cms,
            showcase: { ...cms.showcase, bullets: updatedBullets },
        });
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-bold tracking-tight">Editor Landing Page</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Sesuaikan seluruh teks, fitur, statistik, dan judul yang ditampilkan pada Landing Page publik.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/", "_blank")}
                        className="h-9 gap-1.5"
                    >
                        <ExternalLink className="w-4 h-4" /> Preview Live
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchCmsData}
                        disabled={isLoading}
                        className="h-9 gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Reset
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-1.5"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan Perubahan
                    </Button>
                </div>
            </div>

            {/* CMS Sections Tabs */}
            <Tabs defaultValue="seo" className="w-full">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 h-auto p-1 bg-muted/60 rounded-xl gap-1">
                    <TabsTrigger value="seo" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <Globe className="w-3.5 h-3.5" /> SEO & Meta
                    </TabsTrigger>
                    <TabsTrigger value="hero" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <Layout className="w-3.5 h-3.5" /> Hero
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <BarChart2 className="w-3.5 h-3.5" /> Statistik
                    </TabsTrigger>
                    <TabsTrigger value="features" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <Zap className="w-3.5 h-3.5" /> Fitur
                    </TabsTrigger>
                    <TabsTrigger value="showcase" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <Monitor className="w-3.5 h-3.5" /> Showcase
                    </TabsTrigger>
                    <TabsTrigger value="cta" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <MousePointerClick className="w-3.5 h-3.5" /> Banner CTA
                    </TabsTrigger>
                    <TabsTrigger value="demo" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <Globe className="w-3.5 h-3.5" /> Akun Demo
                    </TabsTrigger>
                    <TabsTrigger value="footer" className="gap-1.5 py-2 text-xs sm:text-sm">
                        <Globe className="w-3.5 h-3.5" /> Footer
                    </TabsTrigger>
                </TabsList>

                {/* 0. SEO & Meta Tab */}
                <TabsContent value="seo" className="mt-4 space-y-6">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" /> Pengaturan SEO & Meta Tags Global
                            </CardTitle>
                            <CardDescription>
                                Konfigurasi judul web aplikasi, deskripsi pencarian Google, thumbnail media sosial (WhatsApp/Facebook), dan favicon browser secara dinamis.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="seoTitle">Judul Halaman Web (Meta Title)</Label>
                                <Input
                                    id="seoTitle"
                                    placeholder="Contoh: POSH - Aplikasi Kasir & POS Modern Terintegrasi"
                                    value={cms.seo?.title || ""}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            seo: { ...(cms.seo || {}), title: e.target.value },
                                        })
                                    }
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Judul utama yang muncul di tab browser dan hasil pencarian mesin telusur Google.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="seoDescription">Deskripsi Web (Meta Description)</Label>
                                <Textarea
                                    id="seoDescription"
                                    rows={3}
                                    placeholder="Contoh: Sistem Kasir (POS) dan Manajemen Inventaris Cloud Multi-Tenant, Cepat, Akurat, dan Terintegrasi..."
                                    value={cms.seo?.description || ""}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            seo: { ...(cms.seo || {}), description: e.target.value },
                                        })
                                    }
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Deskripsi ringkas yang muncul di bawah judul pada pencarian Google dan saat link dibagikan ke WhatsApp/Facebook.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="seoKeywords">Kata Kunci (Keywords)</Label>
                                    <Input
                                        id="seoKeywords"
                                        placeholder="aplikasi kasir, pos system, manajemen stok, pos cloud"
                                        value={cms.seo?.keywords || ""}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                seo: { ...(cms.seo || {}), keywords: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="seoAuthor">Author / Pengembang Sistem</Label>
                                    <Input
                                        id="seoAuthor"
                                        placeholder="Nama Brand atau Perusahaan Anda"
                                        value={cms.seo?.author || ""}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                seo: { ...(cms.seo || {}), author: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Open Graph Image & Favicon Upload */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-border/40">
                                {/* Share Thumbnail */}
                                <div className="space-y-2">
                                    <Label>Thumbnail Social Share (Open Graph Image)</Label>
                                    <div className="flex items-center gap-3">
                                        {cms.seo?.ogImage ? (
                                            <div className="relative w-20 h-14 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                                                <img
                                                    src={cms.seo.ogImage}
                                                    alt="OG Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-14 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground shrink-0 bg-muted/40">
                                                No Image
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                placeholder="/pwa-512x512.png atau URL eksternal"
                                                value={cms.seo?.ogImage || ""}
                                                onChange={(e) =>
                                                    setCms({
                                                        ...cms,
                                                        seo: { ...(cms.seo || {}), ogImage: e.target.value },
                                                    })
                                                }
                                                className="text-xs h-8"
                                            />
                                            <input
                                                type="file"
                                                ref={ogFileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleSeoUpload(file, 'ogImage');
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5 w-full"
                                                disabled={isUploadingOg}
                                                onClick={() => ogFileInputRef.current?.click()}
                                            >
                                                {isUploadingOg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                Upload Gambar Share
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Favicon */}
                                <div className="space-y-2">
                                    <Label>Ikon Tab Browser (Favicon URL)</Label>
                                    <div className="flex items-center gap-3">
                                        {cms.seo?.faviconUrl ? (
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 bg-muted flex items-center justify-center p-1.5">
                                                <img
                                                    src={cms.seo.faviconUrl}
                                                    alt="Favicon Preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground shrink-0 bg-muted/40">
                                                Icon
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                placeholder="/logo.svg atau URL ikon"
                                                value={cms.seo?.faviconUrl || ""}
                                                onChange={(e) =>
                                                    setCms({
                                                        ...cms,
                                                        seo: { ...(cms.seo || {}), faviconUrl: e.target.value },
                                                    })
                                                }
                                                className="text-xs h-8"
                                            />
                                            <input
                                                type="file"
                                                ref={faviconInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleSeoUpload(file, 'faviconUrl');
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5 w-full"
                                                disabled={isUploadingFavicon}
                                                onClick={() => faviconInputRef.current?.click()}
                                            >
                                                {isUploadingFavicon ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                Upload Favicon
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Google & Social Preview */}
                            <div className="pt-4 border-t border-border/40 space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Pratinjau Hasil Pencarian Google
                                </Label>
                                <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1 max-w-xl shadow-xs">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                                            🌐
                                        </div>
                                        <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://pos-app.com'}</span>
                                    </div>
                                    <h4 className="text-base font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
                                        {cms.seo?.title || `${cms.brandName} - Aplikasi Kasir & POS Modern`}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {cms.seo?.description || cms.hero?.description || "Sistem Kasir (POS) dan Manajemen Inventaris Cloud Multi-Tenant..."}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 1. Hero Tab */}
                <TabsContent value="hero" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Pengaturan Hero Section & Brand</CardTitle>
                            <CardDescription>
                                Bagian paling atas yang pertama kali dilihat oleh pengunjung landing page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="brandName">Nama Brand / Aplikasi</Label>
                                    <Input
                                        id="brandName"
                                        value={cms.brandName}
                                        onChange={(e) => setCms({ ...cms, brandName: e.target.value })}
                                        placeholder="Contoh: Toko Ryo / POS-INV"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Nama brand yang tampil di Navbar Header dan Footer Beranda.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Logo Brand / Aplikasi (Header & Footer)</Label>
                                    <div className="flex items-center gap-3">
                                        {cms.logoUrl || cms.brandLogo ? (
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0 bg-muted/50 p-1 flex items-center justify-center shadow-xs">
                                                <img
                                                    src={cms.logoUrl || cms.brandLogo}
                                                    alt="Logo Preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0 bg-muted/30">
                                                Icon
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-1">
                                            <input
                                                type="file"
                                                ref={logoFileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleLogoUpload(file);
                                                }}
                                            />
                                            <div className="flex gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1.5 flex-1"
                                                    disabled={isUploadingLogo}
                                                    onClick={() => logoFileInputRef.current?.click()}
                                                >
                                                    {isUploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                    Unggah Logo Baru
                                                </Button>
                                                {(cms.logoUrl || cms.brandLogo) && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        onClick={() => setCms({ ...cms, logoUrl: '', brandLogo: '' })}
                                                        title="Hapus Logo Kustom"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Jika kosong, otomatis menggunakan ikon toko atau logo superadmin.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="heroBadge">Badge Pengantar (Pill)</Label>
                                <Input
                                    id="heroBadge"
                                    value={cms.hero.badge}
                                    onChange={(e) =>
                                        setCms({ ...cms, hero: { ...cms.hero, badge: e.target.value } })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="heroPrefix">Teks Awal Judul Utama</Label>
                                    <Input
                                        id="heroPrefix"
                                        value={cms.hero.titlePrefix}
                                        onChange={(e) =>
                                            setCms({ ...cms, hero: { ...cms.hero, titlePrefix: e.target.value } })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="heroHighlight">Teks Judul Sorotan (Warna Warna Utama)</Label>
                                    <Input
                                        id="heroHighlight"
                                        value={cms.hero.titleHighlight}
                                        onChange={(e) =>
                                            setCms({ ...cms, hero: { ...cms.hero, titleHighlight: e.target.value } })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="heroDesc">Deskripsi Hero</Label>
                                <Textarea
                                    id="heroDesc"
                                    rows={3}
                                    value={cms.hero.description}
                                    onChange={(e) =>
                                        setCms({ ...cms, hero: { ...cms.hero, description: e.target.value } })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="heroPrimaryCta">Teks Tombol Utama (Primary CTA)</Label>
                                    <Input
                                        id="heroPrimaryCta"
                                        value={cms.hero.primaryCta}
                                        onChange={(e) =>
                                            setCms({ ...cms, hero: { ...cms.hero, primaryCta: e.target.value } })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="heroSecondaryCta">Teks Tombol Sekunder (Secondary CTA)</Label>
                                    <Input
                                        id="heroSecondaryCta"
                                        value={cms.hero.secondaryCta}
                                        onChange={(e) =>
                                            setCms({ ...cms, hero: { ...cms.hero, secondaryCta: e.target.value } })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. Stats Tab */}
                <TabsContent value="stats" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Kartu Statistik & Pencapaian</CardTitle>
                                <CardDescription>
                                    Tampilkan angka statistik seperti jumlah transaksi, UMKM terbantu, dll.
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={addStat} className="gap-1.5 shrink-0">
                                <Plus className="w-4 h-4" /> Tambah Stat
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-primary/5 border-primary/20">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Label className="font-bold text-sm">Sinkronkan Otomatis Data Real Aplikasi</Label>
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                            Rekomendasi
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Hitung otomatis statistik jumlah UMKM, transaksi sukses, dan total katalog dari data real database sistem.
                                    </p>
                                </div>
                                <Switch
                                    checked={cms.autoSyncStats !== false}
                                    onCheckedChange={(checked) => setCms({ ...cms, autoSyncStats: checked })}
                                />
                            </div>
                            {cms.stats.map((stat, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 rounded-lg border bg-background/50"
                                >
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Nilai / Angka (Value)</Label>
                                            <Input
                                                value={stat.value}
                                                onChange={(e) => handleStatChange(idx, "value", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Label / Keterangan</Label>
                                            <Input
                                                value={stat.label}
                                                onChange={(e) => handleStatChange(idx, "label", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeStat(idx)}
                                        className="text-destructive hover:bg-destructive/10 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Features Tab */}
                <TabsContent value="features" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Daftar Fitur Utama</CardTitle>
                                <CardDescription>
                                    Edit kartu fitur unggulan yang ditawarkan sistem POS.
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={addFeature} className="gap-1.5">
                                <Plus className="w-4 h-4" /> Tambah Kartu Fitur
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-3 pb-4 border-b">
                                <div className="space-y-1.5">
                                    <Label htmlFor="featuresTitle">Judul Bagian Fitur</Label>
                                    <Input
                                        id="featuresTitle"
                                        value={cms.featuresHeader.title}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                featuresHeader: { ...cms.featuresHeader, title: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="featuresSub">Subjudul Deskripsi Fitur</Label>
                                    <Input
                                        id="featuresSub"
                                        value={cms.featuresHeader.description}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                featuresHeader: { ...cms.featuresHeader, description: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cms.features.map((feat, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border bg-background/50 space-y-3 relative group">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline">Fitur #{idx + 1}</Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeFeature(idx)}
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Nama Icon (Lucide Icon Name)</Label>
                                            <Input
                                                value={feat.icon}
                                                onChange={(e) => handleFeatureChange(idx, "icon", e.target.value)}
                                                placeholder="Zap, Package, BarChart3, Users, etc."
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Judul Fitur</Label>
                                            <Input
                                                value={feat.title}
                                                onChange={(e) => handleFeatureChange(idx, "title", e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Deskripsi Fitur</Label>
                                            <Textarea
                                                rows={2}
                                                value={feat.description}
                                                onChange={(e) => handleFeatureChange(idx, "description", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. Showcase Tab */}
                <TabsContent value="showcase" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Section Showcase Dashboard</CardTitle>
                            <CardDescription>
                                Bagian demonstrasi visual dashboard interaktif.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="showcaseTitle">Judul Showcase</Label>
                                <Input
                                    id="showcaseTitle"
                                    value={cms.showcase.title}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            showcase: { ...cms.showcase, title: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Poin Keunggulan (Checklist Bullets)</Label>
                                    <Button size="sm" variant="outline" onClick={addBullet} className="h-7 text-xs gap-1">
                                        <Plus className="w-3 h-3" /> Tambah Poin
                                    </Button>
                                </div>
                                {cms.showcase.bullets.map((bullet, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input
                                            value={bullet}
                                            onChange={(e) => handleBulletChange(idx, e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeBullet(idx)}
                                            className="text-destructive shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="showcaseCta">Teks Tombol Showcase</Label>
                                <Input
                                    id="showcaseCta"
                                    value={cms.showcase.ctaText}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            showcase: { ...cms.showcase, ctaText: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="showcaseImg">Gambar Preview Dashboard (Opsional)</Label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        id="showcaseImg"
                                        placeholder="https://example.com/preview.png atau upload gambar..."
                                        value={cms.showcase.imageUrl || ""}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                showcase: { ...cms.showcase, imageUrl: e.target.value },
                                            })
                                        }
                                        className="flex-1 font-mono text-xs"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isUploadingImage}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                                    >
                                        {isUploadingImage ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Upload Gambar
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {cms.showcase.imageUrl && (
                                    <div className="mt-3 relative w-full max-w-md rounded-xl overflow-hidden border bg-slate-900 p-2 shadow-inner">
                                        <img
                                            src={cms.showcase.imageUrl}
                                            alt="Dashboard Preview"
                                            className="w-full h-auto object-cover rounded-lg max-h-48"
                                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-4 right-4 h-7 w-7 rounded-full opacity-90 hover:opacity-100 shadow-md"
                                            onClick={() => setCms({ ...cms, showcase: { ...cms.showcase, imageUrl: "" } })}
                                            title="Hapus gambar"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 5. CTA Section Tab */}
                <TabsContent value="cta" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Banner Call to Action (CTA)</CardTitle>
                            <CardDescription>
                                Section banner besar di dekat footer untuk mengajak pengunjung mendaftar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="ctaTitle">Judul Banner CTA</Label>
                                <Input
                                    id="ctaTitle"
                                    value={cms.ctaSection.title}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            ctaSection: { ...cms.ctaSection, title: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="ctaDesc">Deskripsi Banner CTA</Label>
                                <Textarea
                                    id="ctaDesc"
                                    rows={2}
                                    value={cms.ctaSection.description}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            ctaSection: { ...cms.ctaSection, description: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ctaPrimary">Teks Tombol Utama</Label>
                                    <Input
                                        id="ctaPrimary"
                                        value={cms.ctaSection.primaryCta}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                ctaSection: { ...cms.ctaSection, primaryCta: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ctaPrimaryUrl">Link/URL Tombol Utama</Label>
                                    <Input
                                        id="ctaPrimaryUrl"
                                        placeholder="/auth atau https://..."
                                        value={cms.ctaSection.primaryCtaUrl || ""}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                ctaSection: { ...cms.ctaSection, primaryCtaUrl: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ctaSecondary">Teks Tombol Sekunder</Label>
                                    <Input
                                        id="ctaSecondary"
                                        value={cms.ctaSection.secondaryCta}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                ctaSection: { ...cms.ctaSection, secondaryCta: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ctaSecondaryUrl">Link/URL Tombol Sekunder</Label>
                                    <Input
                                        id="ctaSecondaryUrl"
                                        placeholder="https://wa.me/6281234567890 atau /auth"
                                        value={cms.ctaSection.secondaryCtaUrl || ""}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                ctaSection: { ...cms.ctaSection, secondaryCtaUrl: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 6. Demo Account Tab */}
                <TabsContent value="demo" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Pengaturan Akun Demo Interaktif</CardTitle>
                            <CardDescription>
                                Atur informasi kredensial akun demo yang ditampilkan di halaman Login (/auth) untuk dicoba oleh pengunjung.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-primary/5 border-primary/20">
                                <div className="space-y-0.5">
                                    <Label className="font-bold text-sm">Tampilkan Banner Akun Demo di Halaman Login</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Memungkinkan calon pengguna mencoba aplikasi langsung via tombol 1-Click Login Demo.
                                    </p>
                                </div>
                                <Switch
                                    checked={cms.demoAccount?.enabled !== false}
                                    onCheckedChange={(checked) =>
                                        setCms({
                                            ...cms,
                                            demoAccount: {
                                                enabled: checked,
                                                email: cms.demoAccount?.email || "demo@posh.web.id",
                                                password: cms.demoAccount?.password || "demouser123",
                                                title: cms.demoAccount?.title || "Akun Demo Interaktif",
                                                description: cms.demoAccount?.description || "Coba seluruh fitur kasir, manajemen stok, dan laporan secara langsung tanpa pendaftaran."
                                            }
                                        })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="demoEmail">Email Akun Demo</Label>
                                    <Input
                                        id="demoEmail"
                                        value={cms.demoAccount?.email || "demo@posh.web.id"}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                demoAccount: {
                                                    enabled: cms.demoAccount?.enabled !== false,
                                                    email: e.target.value,
                                                    password: cms.demoAccount?.password || "demouser123",
                                                    title: cms.demoAccount?.title || "Akun Demo Interaktif",
                                                    description: cms.demoAccount?.description || ""
                                                }
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="demoPassword">Password Akun Demo</Label>
                                    <Input
                                        id="demoPassword"
                                        value={cms.demoAccount?.password || "demouser123"}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                demoAccount: {
                                                    enabled: cms.demoAccount?.enabled !== false,
                                                    email: cms.demoAccount?.email || "demo@posh.web.id",
                                                    password: e.target.value,
                                                    title: cms.demoAccount?.title || "Akun Demo Interaktif",
                                                    description: cms.demoAccount?.description || ""
                                                }
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 6. Footer Tab */}
                <TabsContent value="footer" className="mt-4">
                    <Card className="bg-gradient-card border-border/60">
                        <CardHeader>
                            <CardTitle className="text-lg">Footer Page Settings</CardTitle>
                            <CardDescription>
                                Pengaturan teks hak cipta dan tautan hukum di bagian bawah landing page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="footerCopyright">Teks Copyright Footer</Label>
                                <Input
                                    id="footerCopyright"
                                    value={cms.footer.copyright}
                                    onChange={(e) =>
                                        setCms({
                                            ...cms,
                                            footer: { ...cms.footer, copyright: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="termsUrl">URL Syarat & Ketentuan</Label>
                                    <Input
                                        id="termsUrl"
                                        value={cms.footer.termsUrl}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                footer: { ...cms.footer, termsUrl: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="privacyUrl">URL Kebijakan Privasi</Label>
                                    <Input
                                        id="privacyUrl"
                                        value={cms.footer.privacyUrl}
                                        onChange={(e) =>
                                            setCms({
                                                ...cms,
                                                footer: { ...cms.footer, privacyUrl: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default LandingCmsEditor;
