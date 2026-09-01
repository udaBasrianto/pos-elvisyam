import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/kpi-card";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { 
    Loader2, 
    Search, 
    Activity, 
    BarChart3, 
    TrendingUp, 
    Store,
    DollarSign,
    ShoppingCart,
    Package,
    Receipt,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Clock,
    User,
    CreditCard,
    Coins
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface TenantSummary {
    tenant_id: string;
    tenant_name: string;
    tenant_email: string;
    registered_at: string;
    today_revenue: number;
    today_transactions: number;
    month_revenue: number;
    month_transactions: number;
    month_margin?: number;
    alltime_revenue: number;
    alltime_transactions: number;
}

interface ProductItem {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    stock: number;
    price: number;
    costPrice: number;
    minStock: number;
    category_name: string;
    category_color: string;
    productType: 'physical' | 'digital';
    ownershipType: 'owned' | 'consignment';
}

interface SalesItemDetail {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface DailySales {
    id: string;
    invoice_no: string;
    created_at: string;
    cashier_name: string;
    payment_method: string;
    total: number;
    items: SalesItemDetail[] | string;
    latitude?: number | null;
    longitude?: number | null;
}

const TenantSummaries = () => {
    const [tenantSummaries, setTenantSummaries] = useState<TenantSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Details Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);
    const [tenantProducts, setTenantProducts] = useState<ProductItem[]>([]);
    const [tenantDailySales, setTenantDailySales] = useState<DailySales[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState<string>("products");
    const [searchProduct, setSearchProduct] = useState("");
    const [expandedTransactions, setExpandedTransactions] = useState<Record<string, boolean>>({});

    const fetchSummaries = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await api.get('/admin/tenants/summaries');
            setTenantSummaries(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching summaries:", error);
            toast.error("Gagal memuat data ringkasan tenant");
            setTenantSummaries([]);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummaries();
    }, []);

    // Fetch products & sales details when a tenant is clicked
    const openTenantDetails = async (tenant: TenantSummary) => {
        setSelectedTenant(tenant);
        setIsLoadingDetails(true);
        setIsModalOpen(true);
        setActiveDetailTab("products");
        setSearchProduct("");
        setExpandedTransactions({});

        try {
            const [productsRes, salesRes] = await Promise.all([
                api.get(`/admin/tenants/${tenant.tenant_id}/products`),
                api.get(`/admin/tenants/${tenant.tenant_id}/daily-sales`)
            ]);
            setTenantProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
            setTenantDailySales(Array.isArray(salesRes.data) ? salesRes.data : []);
        } catch (error) {
            console.error("Error fetching tenant details:", error);
            toast.error("Gagal mengambil data produk atau penjualan tenant");
            setTenantProducts([]);
            setTenantDailySales([]);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Calculate aggregated states for KPI Cards
    const safeSummaries = Array.isArray(tenantSummaries) ? tenantSummaries : [];
    const totalTodayRevenue = safeSummaries.reduce((sum, item) => sum + Number(item?.today_revenue || 0), 0);
    const totalTodayTransactions = safeSummaries.reduce((sum, item) => sum + Number(item?.today_transactions || 0), 0);
    const totalMonthRevenue = safeSummaries.reduce((sum, item) => sum + Number(item?.month_revenue || 0), 0);
    const totalMonthMargin = safeSummaries.reduce((sum, item) => sum + Number(item?.month_margin || 0), 0);
    
    // Find top active tenant today
    const topTenantToday = [...safeSummaries]
        .sort((a, b) => (b?.today_revenue || 0) - (a?.today_revenue || 0))[0];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatTime = (dateString: string) => {
        try {
            if (!dateString) return "-";
            const cleanDateStr = typeof dateString === 'string' && dateString.endsWith('Z')
                ? dateString.replace('Z', '')
                : dateString;
            return new Date(cleanDateStr).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit"
            }) + " WIB";
        } catch (e) {
            return "-";
        }
    };

    const parseTransactionItems = (itemsInput: any): SalesItemDetail[] => {
        if (!itemsInput) return [];
        if (typeof itemsInput === 'string') {
            try {
                return JSON.parse(itemsInput);
            } catch (e) {
                console.error("Failed to parse items JSON:", e);
                return [];
            }
        }
        return itemsInput;
    };

    const toggleTransactionExpand = (id: string) => {
        setExpandedTransactions(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filteredSummaries = tenantSummaries.filter(s => 
        s.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.tenant_email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredProducts = tenantProducts.filter(p => 
        (p.name || "").toLowerCase().includes(searchProduct.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(searchProduct.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">


            {/* Premium Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-4">
                <StatCard
                    title="Total Omset Hari Ini"
                    value={formatCurrency(totalTodayRevenue)}
                    icon={DollarSign}
                    iconColor="emerald"
                    subtitle="Gabungan seluruh tenant"
                />
                <StatCard
                    title="Volume Transaksi Hari Ini"
                    value={`${totalTodayTransactions} Transaksi`}
                    icon={ShoppingCart}
                    iconColor="blue"
                    subtitle="Penjualan hari ini"
                />
                <StatCard
                    title="Total Omset Bulan Ini"
                    value={formatCurrency(totalMonthRevenue)}
                    icon={TrendingUp}
                    iconColor="purple"
                    subtitle="Akumulasi bulan berjalan"
                />
                <StatCard
                    title="Total Laba Bulan Ini"
                    value={formatCurrency(totalMonthMargin)}
                    icon={Coins}
                    iconColor="emerald"
                    subtitle="Akumulasi margin bulan berjalan"
                />
                <StatCard
                    title="Tenant Teraktif Hari Ini"
                    value={topTenantToday && topTenantToday.today_revenue > 0 ? topTenantToday.tenant_name : "Tidak ada"}
                    icon={Store}
                    iconColor="yellow"
                    subtitle={topTenantToday && topTenantToday.today_revenue > 0 ? `Omset: ${formatCurrency(topTenantToday.today_revenue)}` : "Belum ada transaksi hari ini"}
                />
            </div>

            <Card className="border-0 shadow-md bg-card">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            Detail Omset Harian & Bulanan per Toko
                        </CardTitle>
                        <CardDescription>Klik salah satu toko untuk melihat rincian produk, stok, dan penjualan hari ini</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                placeholder="Cari toko atau email..." 
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => fetchSummaries(false)} 
                            className="h-10 px-3 flex-shrink-0"
                            title="Refresh Data"
                        >
                            <Activity className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredSummaries.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Tidak ada tenant/toko yang cocok dengan kriteria pencarian</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border rounded-xl shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground border-b text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Tenant/Toko</th>
                                        <th className="px-6 py-4 font-semibold text-right">Hari Ini</th>
                                        <th className="px-6 py-4 font-semibold text-right">Bulan Ini</th>
                                        <th className="px-6 py-4 font-semibold text-right">Sepanjang Waktu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSummaries.map((summary) => (
                                        <tr 
                                            key={summary.tenant_id} 
                                            className="border-b last:border-0 hover:bg-muted/50 transition-all cursor-pointer group"
                                            onClick={() => openTenantDetails(summary)}
                                        >
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner group-hover:scale-105 transition-transform duration-200">
                                                        {summary.tenant_name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{summary.tenant_name}</p>
                                                        <p className="text-xs text-muted-foreground">{summary.tenant_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right align-middle font-medium">
                                                <span className={summary.today_revenue > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold text-base" : "text-muted-foreground"}>
                                                    {formatCurrency(summary.today_revenue)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block font-normal">
                                                    {summary.today_transactions} Transaksi
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right align-middle font-medium">
                                                <span className={summary.month_revenue > 0 ? "text-primary font-bold text-base" : "text-muted-foreground"}>
                                                    {formatCurrency(summary.month_revenue)}
                                                </span>
                                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                                                    Laba: {formatCurrency(summary.month_margin || 0)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block font-normal">
                                                    {summary.month_transactions} Transaksi
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right align-middle font-medium">
                                                <span className="text-foreground text-base font-semibold">
                                                    {formatCurrency(summary.alltime_revenue)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block font-normal">
                                                    {summary.alltime_transactions} Transaksi
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Modal Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card">
                    {/* Header Modal */}
                    <div className="p-6 bg-gradient-to-r from-primary/10 via-background to-transparent border-b">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-lg shadow-inner">
                                    {selectedTenant?.tenant_name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        {selectedTenant?.tenant_name}
                                        <Badge variant="outline" className="text-xs font-normal">Tenant Toko</Badge>
                                    </DialogTitle>
                                    <DialogDescription className="text-sm mt-0.5">
                                        Detail inventori produk dan log penjualan harian dari <span className="font-medium text-foreground">{selectedTenant?.tenant_email}</span>
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    {/* Content Tabs */}
                    <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 pt-3 bg-muted/40 border-b flex items-center justify-between">
                            <TabsList className="bg-transparent gap-2 h-11 p-0">
                                <TabsTrigger 
                                    value="products" 
                                    className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-11 font-semibold flex items-center gap-2 shadow-none border-b-2 border-transparent transition-all"
                                >
                                    <Package className="w-4 h-4" />
                                    Daftar Produk ({tenantProducts.length})
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="sales" 
                                    className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-11 font-semibold flex items-center gap-2 shadow-none border-b-2 border-transparent transition-all"
                                >
                                    <Receipt className="w-4 h-4" />
                                    Penjualan Hari Ini ({tenantDailySales.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* Search bar inside Products Tab */}
                            {activeDetailTab === "products" && (
                                <div className="relative w-64 mb-2">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari produk atau SKU..."
                                        className="pl-8 h-8 text-xs bg-background"
                                        value={searchProduct}
                                        onChange={(e) => setSearchProduct(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Dialog Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                            {isLoadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground animate-pulse">Mengambil data dari server tenant...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Products Tab Content */}
                                    <TabsContent value="products" className="mt-0 outline-none">
                                        {filteredProducts.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                                <p className="font-medium text-sm">Produk tidak ditemukan</p>
                                                <p className="text-xs">Tenant belum memiliki produk atau pencarian Anda tidak cocok</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto border rounded-xl bg-background shadow-inner">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-muted/80 border-b font-semibold uppercase tracking-wider text-muted-foreground">
                                                        <tr>
                                                            <th className="px-4 py-3">Nama Produk</th>
                                                            <th className="px-4 py-3">SKU / Barcode</th>
                                                            <th className="px-4 py-3">Kategori</th>
                                                            <th className="px-4 py-3 text-center">Stok</th>
                                                            <th className="px-4 py-3 text-right">HPP / Modal</th>
                                                            <th className="px-4 py-3 text-right">Harga Jual</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredProducts.map((product) => {
                                                            // Determine stock alerts
                                                            const isOutOfStock = product.stock <= 0;
                                                            const isCriticalStock = product.stock > 0 && product.stock <= (product.minStock || 0);
                                                            
                                                            let stockBadgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
                                                            let stockLabel = "Aman";
                                                            if (isOutOfStock) {
                                                                stockBadgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 font-bold";
                                                                stockLabel = "Habis";
                                                            } else if (isCriticalStock) {
                                                                stockBadgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400";
                                                                stockLabel = `Kritis (Min: ${product.minStock || 0})`;
                                                            }

                                                            return (
                                                                <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                                    <td className="px-4 py-3 font-semibold text-foreground text-sm max-w-[200px] truncate">
                                                                        {product.name}
                                                                        {product.ownershipType === 'consignment' && (
                                                                            <Badge variant="outline" className="ml-1.5 text-[9px] px-1 h-3.5 bg-cyan-100 dark:bg-cyan-950/20 text-cyan-600">Konsinyasi</Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                                                                        <div>SKU: {product.sku || "-"}</div>
                                                                        {product.barcode && <div className="mt-0.5">BC: {product.barcode}</div>}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {product.category_name ? (
                                                                            <Badge 
                                                                                style={{ borderColor: product.category_color }} 
                                                                                className="text-[10px] font-normal" 
                                                                                variant="outline"
                                                                            >
                                                                                {product.category_name}
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <span className="font-bold text-sm text-foreground">{product.stock}</span>
                                                                            <Badge className={`${stockBadgeColor} text-[9px] py-0 px-1.5`} variant="secondary">
                                                                                {stockLabel}
                                                                            </Badge>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                                                                        {formatCurrency(product.costPrice || 0)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold text-foreground">
                                                                        {formatCurrency(product.price || 0)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* Sales Tab Content */}
                                    <TabsContent value="sales" className="mt-0 outline-none">
                                        {tenantDailySales.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                                <p className="font-medium text-sm">Belum ada penjualan hari ini</p>
                                                <p className="text-xs">Transaksi penjualan selesai hari ini akan muncul di sini</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {tenantDailySales.map((sales) => {
                                                    const items = parseTransactionItems(sales.items);
                                                    const isExpanded = !!expandedTransactions[sales.id];
                                                    
                                                    return (
                                                        <Card key={sales.id} className="border-0 shadow-sm bg-muted/20 overflow-hidden">
                                                            {/* Transact Header */}
                                                            <div 
                                                                className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors cursor-pointer"
                                                                onClick={() => toggleTransactionExpand(sales.id)}
                                                            >
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                                                    <div>
                                                                        <span className="font-bold text-sm font-mono text-primary">{sales.invoice_no}</span>
                                                                        <span className="text-[10px] text-muted-foreground block mt-0.5 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                                                            {formatTime(sales.created_at)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Badge variant="outline" className="text-[10px] bg-background flex items-center gap-1 font-normal">
                                                                            <User className="w-2.5 h-2.5" />
                                                                            {sales.cashier_name || "Kasir"}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-[10px] bg-background flex items-center gap-1 font-normal text-emerald-600 dark:text-emerald-400">
                                                                            <CreditCard className="w-2.5 h-2.5" />
                                                                            {sales.payment_method?.toUpperCase()}
                                                                        </Badge>
                                                                        {sales.latitude && sales.longitude && (
                                                                            <a 
                                                                                href={`https://www.google.com/maps?q=${sales.latitude},${sales.longitude}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="inline-flex items-center"
                                                                            >
                                                                                <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-semibold">
                                                                                    📍 Lokasi GPS
                                                                                </Badge>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-extrabold text-base text-foreground">
                                                                        {formatCurrency(Number(sales.total) || 0)}
                                                                    </span>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Transact Items Breakdown */}
                                                            {isExpanded && (
                                                                <div className="px-4 pb-4 pt-1 border-t bg-background">
                                                                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                        <ShoppingCart className="w-3 h-3 text-primary" />
                                                                        Daftar Belanjaan ({items.length} Item)
                                                                    </div>
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-xs text-left border-collapse">
                                                                            <thead>
                                                                                <tr className="border-b text-muted-foreground font-medium">
                                                                                    <th className="py-2 pr-4">Nama Item</th>
                                                                                    <th className="py-2 px-4 text-center">Jumlah</th>
                                                                                    <th className="py-2 px-4 text-right">Harga</th>
                                                                                    <th className="py-2 pl-4 text-right">Subtotal</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {items.map((item) => (
                                                                                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                                                                                        <td className="py-2 pr-4 font-semibold text-foreground">
                                                                                            {item.product_name}
                                                                                        </td>
                                                                                        <td className="py-2 px-4 text-center text-muted-foreground font-medium">
                                                                                            {item.quantity}
                                                                                        </td>
                                                                                        <td className="py-2 px-4 text-right text-muted-foreground">
                                                                                            {formatCurrency(item.price)}
                                                                                        </td>
                                                                                        <td className="py-2 pl-4 text-right font-bold text-foreground">
                                                                                            {formatCurrency(item.subtotal)}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </TabsContent>
                                </>
                            )}
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TenantSummaries;

