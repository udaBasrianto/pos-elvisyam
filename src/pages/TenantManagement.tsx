import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Users,
    Mail,
    Calendar,
    Loader2,
    Crown,
    UserCog,
    RefreshCw,
    Download,
    MoreVertical,
    LayoutGrid,
    List,
    Sparkles,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Store,
    ArrowUpDown,
    Filter,
    X,
    ListOrdered,
    Wrench,
    Scissors,
    UtensilsCrossed,
    Shirt,
    Save
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Tenant {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at?: string;
    updated_at?: string;
    subscription_tier?: string;
    subscription_expires_at?: string;
    max_products?: number;
    max_transactions?: number;
    service_queue_enabled?: boolean;
    workshop_enabled?: boolean;
    barbershop_enabled?: boolean;
    fnb_enabled?: boolean;
    laundry_enabled?: boolean;
}

const TenantManagement = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Modal state for Add/Edit Tenant
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state for Subscription
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [selectedSubTenant, setSelectedSubTenant] = useState<Tenant | null>(null);
    const [subFormData, setSubFormData] = useState({
        subscription_tier: "pro",
        subscription_expires_at: "",
        max_products: 1000,
        max_transactions: 5000,
        service_queue_enabled: false,
        workshop_enabled: false,
        barbershop_enabled: false,
        fnb_enabled: false,
        laundry_enabled: false,
    });
    const [isSubmittingSub, setIsSubmittingSub] = useState(false);

    // Form state for Tenant
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
    });

    const fetchTenants = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/admin/tenants/list");
            setTenants(response.data || []);
        } catch (error: any) {
            console.error("Error fetching tenants:", error);
            toast.error(error.response?.data?.error || "Gagal mengambil data tenant");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    // Filter & Sort Tenants
    const filteredTenants = useMemo(() => {
        return tenants
            .filter((tenant) => {
                const matchesQuery =
                    tenant.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tenant.id?.toLowerCase().includes(searchQuery.toLowerCase());

                const matchesTier =
                    tierFilter === "all"
                        ? true
                        : (tenant.subscription_tier || "free").toLowerCase() === tierFilter.toLowerCase();

                return matchesQuery && matchesTier;
            })
            .sort((a, b) => {
                if (sortBy === "newest") {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                } else if (sortBy === "oldest") {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                } else {
                    return (a.full_name || "").localeCompare(b.full_name || "");
                }
            });
    }, [tenants, searchQuery, tierFilter, sortBy]);

    // Statistics Calculation
    const stats = useMemo(() => {
        const total = tenants.length;
        const activeThisMonth = tenants.filter((t) => {
            const date = new Date(t.created_at);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        const premiumCount = tenants.filter(
            (t) => t.subscription_tier && t.subscription_tier.toLowerCase() !== "free"
        ).length;

        return { total, activeThisMonth, premiumCount };
    }, [tenants]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getInitials = (name: string) => {
        if (!name) return "T";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    const resetForm = () => {
        setFormData({
            email: "",
            password: "",
            full_name: "",
        });
        setEditingTenant(null);
    };

    const openEditDialog = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setFormData({
            email: tenant.email || "",
            password: "",
            full_name: tenant.full_name || "",
        });
        setIsDialogOpen(true);
    };

    const openSubscriptionModal = (tenant: Tenant) => {
        setSelectedSubTenant(tenant);
        // default 1 month from now if not set
        const defaultExp = new Date();
        defaultExp.setMonth(defaultExp.getMonth() + 1);

        setSubFormData({
            subscription_tier: tenant.subscription_tier || "pro",
            subscription_expires_at: tenant.subscription_expires_at
                ? tenant.subscription_expires_at.split("T")[0]
                : defaultExp.toISOString().split("T")[0],
            max_products: tenant.max_products || 1000,
            max_transactions: tenant.max_transactions || 5000,
            service_queue_enabled: !!tenant.service_queue_enabled,
            workshop_enabled: !!tenant.workshop_enabled,
            barbershop_enabled: !!tenant.barbershop_enabled,
            fnb_enabled: !!tenant.fnb_enabled,
            laundry_enabled: !!tenant.laundry_enabled,
        });
        setSubModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingTenant) {
                const payload: any = {
                    email: formData.email,
                    full_name: formData.full_name,
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await api.put(`/admin/tenants/${editingTenant.id}`, payload);
                toast.success("Tenant berhasil diperbarui!");
            } else {
                await api.post("/admin/tenants", {
                    email: formData.email,
                    full_name: formData.full_name,
                    password: formData.password,
                });
                toast.success("Tenant baru berhasil ditambahkan!");
            }

            setIsDialogOpen(false);
            resetForm();
            fetchTenants();
        } catch (error: any) {
            console.error("Error saving tenant:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan data tenant");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubscriptionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubTenant) return;
        setIsSubmittingSub(true);

        try {
            await api.put(`/admin/tenants/${selectedSubTenant.id}/subscription`, subFormData);
            toast.success(`Paket langganan ${selectedSubTenant.full_name} berhasil diupdate!`);
            setSubModalOpen(false);
            fetchTenants();
        } catch (error: any) {
            console.error("Error updating subscription:", error);
            toast.error(error.response?.data?.error || "Gagal mengupdate langganan tenant");
        } finally {
            setIsSubmittingSub(false);
        }
    };

    const handleDelete = async (tenant: Tenant) => {
        if (
            !confirm(
                `Apakah Anda yakin ingin menghapus tenant "${tenant.full_name}"? \n\nPastikan tenant ini belum memiliki transaksi atau produk aktif.`
            )
        ) {
            return;
        }

        try {
            await api.delete(`/admin/tenants/${tenant.id}`);
            toast.success("Tenant berhasil dihapus!");
            fetchTenants();
        } catch (error: any) {
            console.error("Error deleting tenant:", error);
            toast.error(error.response?.data?.error || "Gagal menghapus tenant");
        }
    };

    const handleDownloadBackup = async (tenant: Tenant) => {
        try {
            toast.info(`Mengunduh cadangan data untuk ${tenant.full_name}...`);
            const response = await api.get(`/admin/tenants/${tenant.id}/backup`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `backup-${tenant.full_name.replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Cadangan data berhasil diunduh!");
        } catch (error: any) {
            console.error("Error downloading backup:", error);
            toast.error(error.response?.data?.error || "Gagal mengunduh cadangan data tenant.");
        }
    };

    const exportToCSV = () => {
        if (tenants.length === 0) {
            toast.error("Tidak ada data tenant untuk diexport.");
            return;
        }

        const headers = ["ID", "Nama Toko/Lengkap", "Email", "Role", "Paket Langganan", "Tanggal Bergabung"];
        const rows = filteredTenants.map((t) => [
            t.id,
            `"${t.full_name}"`,
            t.email,
            t.role || "admin",
            t.subscription_tier || "free",
            t.created_at ? new Date(t.created_at).toISOString().split("T")[0] : "",
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `daftar_tenant_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Data tenant berhasil diexport ke CSV!");
    };

    const renderTierBadge = (tier?: string) => {
        const normalized = (tier || "free").toLowerCase();
        if (normalized === "enterprise") {
            return (
                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 font-medium">
                    <Crown className="w-3 h-3 mr-1" /> Enterprise
                </Badge>
            );
        } else if (normalized === "pro") {
            return (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 font-medium">
                    <Sparkles className="w-3 h-3 mr-1" /> Pro
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-muted-foreground border-slate-300 font-medium">
                Free / Standard
            </Badge>
        );
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-card p-6 rounded-2xl border border-border/50 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <UserCog className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Kelola Tenant</h1>
                            <Badge variant="secondary" className="font-mono text-xs">
                                SuperAdmin
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manajemen akun toko, akses langganan, dan pemantauan tenant terdaftar.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTenants}
                        disabled={isLoading}
                        className="h-9 gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9 gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </Button>

                    <Button
                        onClick={() => {
                            resetForm();
                            setIsDialogOpen(true);
                        }}
                        className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Tenant
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-card border-border/60 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Tenant
                            </p>
                            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Toko terdaftar
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                            <Store className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-card border-border/60 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Bergabung Bulan Ini
                            </p>
                            <div className="text-2xl font-bold text-foreground">{stats.activeThisMonth}</div>
                            <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Registrasi baru
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <Users className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-card border-border/60 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Langganan Premium
                            </p>
                            <div className="text-2xl font-bold text-foreground">{stats.premiumCount}</div>
                            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Pro / Enterprise
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                            <Crown className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Toolbar */}
            <Card className="bg-gradient-card border-border/60 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Cari tenant (nama toko, email, ID)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 focus:bg-background transition-colors"
                        />
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Tier Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground hidden lg:block" />
                            <select
                                value={tierFilter}
                                onChange={(e) => setTierFilter(e.target.value)}
                                className="h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="all">Semua Paket</option>
                                <option value="free">Free / Standard</option>
                                <option value="pro">Pro Tier</option>
                                <option value="enterprise">Enterprise Tier</option>
                            </select>
                        </div>

                        {/* Sorting */}
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                                <option value="name">Nama (A-Z)</option>
                            </select>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center border border-border rounded-lg p-0.5 bg-background">
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => setViewMode("table")}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 🌟 IN-LINE EDIT / ADD TENANT FORM (NO POPUP) */}
            {isDialogOpen && (
                <Card className="border-2 border-primary/40 bg-card shadow-lg animate-in fade-in-50 duration-200">
                    <CardHeader className="pb-4 flex flex-row items-start justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <UserCog className="w-5 h-5 text-primary" />
                                {editingTenant ? `Edit Profil Tenant: ${editingTenant.full_name}` : "Tambah Tenant Baru"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {editingTenant
                                    ? "Ubah data informasi akun tenant atau atur ulang password."
                                    : "Buat akun tenant baru untuk memberikan akses toko baru."}
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setIsDialogOpen(false);
                                resetForm();
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="full_name" className="text-xs font-semibold">Nama Lengkap / Toko</Label>
                                    <Input
                                        id="full_name"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Contoh: Toko Berkah Jaya"
                                        required
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-semibold">Alamat Email Login</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="tenant@email.com"
                                        required
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-semibold">
                                        {editingTenant ? "Password Baru (Opsional)" : "Password Akses"}
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingTenant}
                                        minLength={6}
                                        placeholder={editingTenant ? "Biarkan kosong jika tidak diubah" : "Minimal 6 karakter"}
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        resetForm();
                                    }}
                                    disabled={isSubmitting}
                                    className="text-xs h-8"
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs h-8 gap-1.5">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : editingTenant ? (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            Simpan Perubahan
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" />
                                            Tambah Tenant
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* 🌟 IN-LINE SUBSCRIPTION & FEATURE MANAGEMENT PANEL (NO POPUP) */}
            {subModalOpen && selectedSubTenant && (
                <Card className="border-2 border-amber-500/40 bg-card shadow-lg animate-in fade-in-50 duration-200">
                    <CardHeader className="pb-4 flex flex-row items-start justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <Crown className="w-5 h-5 text-amber-500" />
                                Kelola Paket Langganan & Fitur: {selectedSubTenant.full_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Atur tingkatan akses (*subscription tier*), masa aktif, kuota sistem, dan fitur modul per toko.
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSubModalOpen(false)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubscriptionSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="subscription_tier" className="text-xs font-semibold">Paket Langganan</Label>
                                    <select
                                        id="subscription_tier"
                                        value={subFormData.subscription_tier}
                                        onChange={(e) => setSubFormData({ ...subFormData, subscription_tier: e.target.value })}
                                        className="w-full h-9 px-3 text-xs rounded-xl border border-input bg-background font-semibold"
                                    >
                                        <option value="free">Free / Standard</option>
                                        <option value="pro">Pro Tier</option>
                                        <option value="enterprise">Enterprise Tier</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="subscription_expires_at" className="text-xs font-semibold">Kedaluwarsa Langganan</Label>
                                    <Input
                                        id="subscription_expires_at"
                                        type="date"
                                        value={subFormData.subscription_expires_at}
                                        onChange={(e) => setSubFormData({ ...subFormData, subscription_expires_at: e.target.value })}
                                        required
                                        className="h-9 text-xs rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="max_products" className="text-xs font-semibold">Batas Kuota Produk</Label>
                                    <Input
                                        id="max_products"
                                        type="number"
                                        value={subFormData.max_products}
                                        onChange={(e) => setSubFormData({ ...subFormData, max_products: Number(e.target.value) })}
                                        required
                                        className="h-9 text-xs rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="max_transactions" className="text-xs font-semibold">Batas Transaksi / Bulan</Label>
                                    <Input
                                        id="max_transactions"
                                        type="number"
                                        value={subFormData.max_transactions}
                                        onChange={(e) => setSubFormData({ ...subFormData, max_transactions: Number(e.target.value) })}
                                        required
                                        className="h-9 text-xs rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Feature Toggle: Jasa & Antrian */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                                <div className="space-y-0.5 pr-3">
                                    <Label htmlFor="service_queue_enabled" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                        <ListOrdered className="w-4 h-4 text-primary" />
                                        Modul Jasa & Antrian Layanan
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Aktifkan sistem tiket antrian nomor harian, papan Kanban kerja, display TV, dan live tracking HP.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="service_queue_enabled"
                                    checked={subFormData.service_queue_enabled}
                                    onChange={(e) => setSubFormData({ ...subFormData, service_queue_enabled: e.target.checked })}
                                    className="w-5 h-5 accent-primary rounded cursor-pointer shrink-0"
                                />
                            </div>

                            {/* Feature Toggle: Modul Bengkel */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
                                <div className="space-y-0.5 pr-3">
                                    <Label htmlFor="workshop_enabled" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                        <Wrench className="w-4 h-4 text-blue-600" />
                                        Modul Bengkel & Otomotif (SPK / Stall)
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Aktifkan Surat Perintah Kerja (SPK), manajemen Pit/Stall, database kendaraan, riwayat servis, dan service reminder.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="workshop_enabled"
                                    checked={subFormData.workshop_enabled}
                                    onChange={(e) => setSubFormData({ ...subFormData, workshop_enabled: e.target.checked })}
                                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                                />
                            </div>

                            {/* Feature Toggle: Modul Barbershop */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20">
                                <div className="space-y-0.5 pr-3">
                                    <Label htmlFor="barbershop_enabled" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                        <Scissors className="w-4 h-4 text-purple-600" />
                                        Modul Barbershop & Salon Premier
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Aktifkan kalender slot booking kapster, status kursi barber, rekam riwayat gaya rambut pelanggan, dan komisi montir/barber.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="barbershop_enabled"
                                    checked={subFormData.barbershop_enabled}
                                    onChange={(e) => setSubFormData({ ...subFormData, barbershop_enabled: e.target.checked })}
                                    className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                                />
                            </div>

                            {/* Feature Toggle: Modul Cafe & Restoran F&B */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-pink-500/20 bg-pink-50/50 dark:bg-pink-950/20">
                                <div className="space-y-0.5 pr-3">
                                    <Label htmlFor="fnb_enabled" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                        <UtensilsCrossed className="w-4 h-4 text-pink-600" />
                                        Modul Cafe, Coffee Shop & Restoran (F&B)
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Buka denah meja visual, KDS layar dapur/barista, buku resep & pemotongan stok bahan baku (BOM), modifiers topping, dan self-order QR meja.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="fnb_enabled"
                                    checked={subFormData.fnb_enabled}
                                    onChange={(e) => setSubFormData({ ...subFormData, fnb_enabled: e.target.checked })}
                                    className="w-5 h-5 accent-pink-600 rounded cursor-pointer shrink-0"
                                />
                            </div>

                            {/* Feature Toggle: Modul Laundry & Dry Clean */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/20">
                                <div className="space-y-0.5 pr-3">
                                    <Label htmlFor="laundry_enabled" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                        <Shirt className="w-4 h-4 text-sky-600" />
                                        Modul Laundry & Dry Clean
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Buka kasir kiloan/satuan, papan Kanban workflow cucian, pilihan aroma parfum, penempatan nomor rak, dan WhatsApp notifikasi otomatis.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="laundry_enabled"
                                    checked={subFormData.laundry_enabled}
                                    onChange={(e) => setSubFormData({ ...subFormData, laundry_enabled: e.target.checked })}
                                    className="w-5 h-5 accent-sky-600 rounded cursor-pointer shrink-0"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSubModalOpen(false)}
                                    disabled={isSubmittingSub}
                                    className="text-xs h-8"
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5" disabled={isSubmittingSub}>
                                    {isSubmittingSub ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            Simpan Pengaturan Langganan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Tenant Data Display */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-gradient-card rounded-2xl border border-border/50">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat daftar tenant...</p>
                </div>
            ) : filteredTenants.length === 0 ? (
                <Card className="bg-gradient-card border-border/60">
                    <CardContent className="text-center py-16 text-muted-foreground space-y-3">
                        <div className="w-16 h-16 rounded-full bg-muted/40 mx-auto flex items-center justify-center">
                            <Users className="w-8 h-8 opacity-40" />
                        </div>
                        <h3 className="font-semibold text-foreground text-base">Tidak ada tenant ditemukan</h3>
                        <p className="text-sm max-w-sm mx-auto">
                            {searchQuery
                                ? `Tidak ditemukan hasil pencarian untuk "${searchQuery}". Coba kata kunci lain.`
                                : "Belum ada tenant terdaftar dalam sistem."}
                        </p>
                    </CardContent>
                </Card>
            ) : viewMode === "grid" ? (
                /* Grid Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTenants.map((tenant) => (
                        <Card
                            key={tenant.id}
                            className="bg-gradient-card border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-bold text-base flex items-center justify-center shadow-sm border border-primary/10">
                                            {getInitials(tenant.full_name)}
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                                                {tenant.full_name}
                                            </CardTitle>
                                            <div className="mt-1 flex items-center gap-1.5">
                                                {renderTierBadge(tenant.subscription_tier)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Dropdown Menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuLabel>Aksi Tenant</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                                                <Edit className="w-4 h-4 mr-2" /> Edit Profil
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openSubscriptionModal(tenant)}>
                                                <Crown className="w-4 h-4 mr-2 text-amber-500" /> Kelola Langganan
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDownloadBackup(tenant)}>
                                                <Download className="w-4 h-4 mr-2 text-blue-500" /> Unduh Backup
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(tenant)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Hapus Tenant
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 text-sm pb-4">
                                <div className="p-3 rounded-lg bg-background/50 space-y-2 border border-border/40 text-xs">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                        <span className="truncate text-foreground font-medium">{tenant.email}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/30">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                                            <span>Bergabung:</span>
                                        </div>
                                        <span className="font-medium text-foreground">{formatDate(tenant.created_at)}</span>
                                    </div>
                                </div>
                            </CardContent>

                            <div className="p-4 pt-0 flex items-center justify-end gap-2 border-t border-border/40 mt-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(tenant)}
                                    className="h-8 text-xs gap-1"
                                >
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => openSubscriptionModal(tenant)}
                                    className="h-8 text-xs gap-1 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300"
                                >
                                    <Crown className="w-3.5 h-3.5" /> Langganan
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                /* Table View */
                <Card className="bg-gradient-card border-border/60 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-[250px]">Nama Tenant / Toko</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Paket Langganan</TableHead>
                                <TableHead>Tanggal Bergabung</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTenants.map((tenant) => (
                                <TableRow key={tenant.id} className="hover:bg-muted/30">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                                {getInitials(tenant.full_name)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">{tenant.full_name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">ID: {tenant.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{tenant.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderTierBadge(tenant.subscription_tier)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(tenant.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEditDialog(tenant)}
                                                title="Edit Tenant"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                                onClick={() => openSubscriptionModal(tenant)}
                                                title="Kelola Langganan"
                                            >
                                                <Crown className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                onClick={() => handleDownloadBackup(tenant)}
                                                title="Unduh Backup"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(tenant)}
                                                title="Hapus Tenant"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
};

export default TenantManagement;
