import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { User, Phone, MapPin, ShoppingBag, Package, ArrowLeft, Mail, LogOut, Lock, Loader2, Sparkles, Award, History, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BottomNav from '@/components/BottomNav';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { toast } from 'sonner';

interface Order {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
    items: any[];
}

interface PointLog {
    id: string;
    type: string;
    points: number;
    amount?: number;
    notes?: string;
    created_at: string;
}

const StoreProfile = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug}`;
    const { customer, isLoggedIn, isLoading, logout, updateProfile, changePassword } = useStoreAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [pointHistory, setPointHistory] = useState<PointLog[]>([]);
    const [loadingPointHistory, setLoadingPointHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'points' | 'profile'>('orders');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            navigate(`${basePath}/auth`, { state: { from: `${basePath}/profile` } });
        }
    }, [isLoading, isLoggedIn, navigate, slug, basePath]);

    // Populate form data
    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || ''
            });
        }
    }, [customer]);

    // Load orders & point history
    useEffect(() => {
        if (isLoggedIn) {
            loadOrders();
            loadPointHistory();
        }
    }, [isLoggedIn]);

    const loadOrders = async () => {
        setLoadingOrders(true);
        try {
            const token = localStorage.getItem('store_customer_token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/store/orders`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            }
        } catch (error) {
            console.error('Load orders error:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const loadPointHistory = async () => {
        setLoadingPointHistory(true);
        try {
            const token = localStorage.getItem('store_customer_token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/store/auth/point-history`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (response.ok) {
                const data = await response.json();
                setPointHistory(data || []);
            }
        } catch (error) {
            console.error('Load point history error:', error);
        } finally {
            setLoadingPointHistory(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Nama wajib diisi');
            return;
        }

        const { error } = await updateProfile(formData);
        if (error) {
            toast.error(error.message);
        } else {
            setIsEditing(false);
            toast.success('Profil berhasil disimpan');
        }
    };

    const handleCancel = () => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || ''
            });
        }
        setIsEditing(false);
    };

    const handleChangePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            toast.error('Semua field password harus diisi');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Password baru tidak sama');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        const { error } = await changePassword(passwordData.currentPassword, passwordData.newPassword);
        if (error) {
            toast.error(error.message);
        } else {
            setShowChangePassword(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password berhasil diubah');
        }
    };

    const handleLogout = () => {
        logout();
        navigate(basePath);
        toast.success('Berhasil keluar');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            pending: { label: 'Menunggu', variant: 'secondary' },
            processing: { label: 'Diproses', variant: 'default' },
            shipped: { label: 'Dikirim', variant: 'default' },
            completed: { label: 'Selesai', variant: 'outline' },
            cancelled: { label: 'Dibatalkan', variant: 'destructive' }
        };
        const config = statusConfig[status] || { label: status, variant: 'secondary' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(basePath)} className="text-white hover:bg-white/20 rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Profil & Member Dashboard</h1>
                            <p className="text-xs text-blue-100 hidden sm:block">Kelola akun, poin loyalitas, dan riwayat pesanan Anda</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 rounded-xl text-xs gap-1.5">
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Keluar</span>
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Member Digital Loyalty Card */}
                <div className={`p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden transition-all ${
                    customer?.memberTier === 'platinum' 
                        ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 border border-purple-500/40' 
                        : customer?.memberTier === 'gold' 
                        ? 'bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-800 border border-amber-400/40' 
                        : customer?.isMember 
                        ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 border border-slate-600/40' 
                        : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 border border-blue-400/30'
                }`}>
                    {/* Background Watermark */}
                    <Sparkles className="absolute -right-6 -bottom-6 w-48 h-48 opacity-10 text-white pointer-events-none" />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
                        <div>
                            <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold block mb-1">
                                DIGITAL MEMBER CARD
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{customer?.name || 'Member'}</h2>
                            <p className="text-xs sm:text-sm text-white/80 font-mono mt-0.5">{customer?.phone || customer?.email}</p>
                        </div>
                        <Badge className={`text-xs font-bold px-4 py-1.5 uppercase shadow-lg rounded-full ${
                            customer?.memberTier === 'platinum' ? 'bg-purple-500 text-white border-purple-300' :
                            customer?.memberTier === 'gold' ? 'bg-amber-400 text-slate-950 border-amber-200' :
                            customer?.isMember ? 'bg-slate-200 text-slate-900 border-white' :
                            'bg-white/20 text-white border-white/30 backdrop-blur-md'
                        }`}>
                            🏆 {customer?.isMember ? `Member ${customer?.memberTier || 'Silver'}` : 'Pelanggan Reguler'}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-white/20 relative z-10">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] text-white/70 block uppercase font-medium">Saldo Poin Active</span>
                                <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono flex items-center gap-1.5 mt-0.5">
                                    <Sparkles className="w-5 h-5 text-amber-300" />
                                    {customer?.points || 0} Poin
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] text-white/70 block uppercase font-medium">Total Akumulasi Belanja</span>
                                <span className="text-lg sm:text-xl font-bold text-white font-mono block mt-0.5">
                                    {formatCurrency(customer?.totalSpent || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Tabs Header */}
                <div className="flex flex-wrap sm:flex-nowrap gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    <Button
                        variant={activeTab === 'orders' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 text-xs sm:text-sm py-2.5 rounded-xl font-medium"
                        onClick={() => setActiveTab('orders')}
                    >
                        <ShoppingBag className="w-4 h-4 mr-1.5" />
                        Pesanan ({orders.length})
                    </Button>
                    <Button
                        variant={activeTab === 'points' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 text-xs sm:text-sm py-2.5 rounded-xl font-medium"
                        onClick={() => setActiveTab('points')}
                    >
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
                        Mutasi Poin
                    </Button>
                    <Button
                        variant={activeTab === 'profile' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 text-xs sm:text-sm py-2.5 rounded-xl font-medium"
                        onClick={() => setActiveTab('profile')}
                    >
                        <User className="w-4 h-4 mr-1.5" />
                        Profil Akun
                    </Button>
                </div>

                {/* TAB 1: ORDERS */}
                {activeTab === 'orders' && (
                    <Card className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-blue-600" />
                            Riwayat Pesanan Toko Online
                        </h3>
                        {loadingOrders ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
                                <p className="text-base font-medium">Belum ada pesanan toko online</p>
                                <p className="text-xs text-muted-foreground mt-1">Pesanan yang Anda buat di toko online akan muncul di sini.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    #{order.id.substring(0, 8)}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    • {formatDate(order.created_at)}
                                                </span>
                                            </div>
                                            {getStatusBadge(order.status)}
                                        </div>

                                        {/* Order Items list if available */}
                                        {Array.isArray(order.items) && order.items.length > 0 && (
                                            <div className="space-y-1.5 py-1">
                                                {order.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                            {item.quantity}x {item.product_name || item.name || 'Produk'}
                                                        </span>
                                                        <span className="font-mono text-muted-foreground">
                                                            {formatCurrency(item.subtotal || ((item.price || 0) * item.quantity))}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-xs text-muted-foreground font-medium">Total Pembayaran</span>
                                            <span className="font-extrabold text-base text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(order.total_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* TAB 2: POINT LEDGER */}
                {activeTab === 'points' && (
                    <Card className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                Catatan Perolehan & Penukaran Poin
                            </h3>
                            <Badge variant="outline" className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-300 px-3 py-1">
                                {customer?.points || 0} Poin Aktif
                            </Badge>
                        </div>

                        {loadingPointHistory ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : pointHistory.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                                <p className="text-base font-medium">Belum ada riwayat transaksi poin</p>
                                <p className="text-xs text-muted-foreground mt-1">Dapatkan poin setiap belanja di kasir atau toko online!</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {pointHistory.map((log) => (
                                    <div key={log.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs bg-card hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                        <div>
                                            <span className="font-semibold block text-slate-800 dark:text-slate-200 text-sm mb-0.5">{log.notes || log.type}</span>
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                {formatDate(log.created_at)}
                                            </span>
                                        </div>
                                        <div className={`font-mono font-extrabold text-base ${log.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {log.points > 0 ? `+${log.points}` : log.points} Poin
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* TAB 3: PROFILE & SECURITY */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <Card className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b">
                                <div>
                                    <h3 className="font-bold text-lg">Informasi Profil Member</h3>
                                    <p className="text-xs text-muted-foreground">Kelola nama, nomor WhatsApp, dan alamat pengiriman</p>
                                </div>
                                {!isEditing && (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl px-4">
                                        Edit Profil
                                    </Button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name" className="text-xs font-semibold">Nama Lengkap *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Masukkan nama lengkap"
                                            className="mt-1.5 rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="phone" className="text-xs font-semibold">Nomor Telepon / WhatsApp</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="08xxxxxxxxxx"
                                            className="mt-1.5 rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="address" className="text-xs font-semibold">Alamat Lengkap Pengiriman</Label>
                                        <Textarea
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Masukkan alamat lengkap pengiriman"
                                            rows={3}
                                            className="mt-1.5 rounded-xl"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button onClick={handleSave} className="flex-1 rounded-xl">
                                            Simpan Profil
                                        </Button>
                                        <Button onClick={handleCancel} variant="outline" className="flex-1 rounded-xl">
                                            Batal
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                                        <User className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Nama Lengkap</p>
                                            <p className="font-bold text-sm text-foreground">{customer?.name || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                                        <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                                            <p className="font-bold text-sm text-foreground">{customer?.email || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                                        <Phone className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Telepon / WhatsApp</p>
                                            <p className="font-bold text-sm text-foreground">{customer?.phone || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Alamat Pengiriman</p>
                                            <p className="font-bold text-sm text-foreground">{customer?.address || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Security & Password */}
                        <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-base">Keamanan Akun</h4>
                                <p className="text-xs text-muted-foreground">Ubah password akun member Anda secara berkala</p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto text-xs rounded-xl"
                                onClick={() => setShowChangePassword(true)}
                            >
                                <Lock className="w-4 h-4 mr-2 text-blue-600" />
                                Ubah Password
                            </Button>
                        </Card>

                        {/* Logout Button */}
                        <Button
                            variant="destructive"
                            className="w-full text-xs py-3 rounded-2xl font-bold"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Keluar dari Akun Member
                        </Button>
                    </div>
                )}
            </div>

            {/* Change Password Dialog */}
            <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Ubah Password Akun</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <Label htmlFor="current-password">Password Saat Ini</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="mt-1 rounded-xl"
                            />
                        </div>
                        <div>
                            <Label htmlFor="new-password">Password Baru</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="mt-1 rounded-xl"
                            />
                        </div>
                        <div>
                            <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="mt-1 rounded-xl"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowChangePassword(false)} className="flex-1 rounded-xl">
                                Batal
                            </Button>
                            <Button onClick={handleChangePassword} className="flex-1 rounded-xl">
                                Simpan Password
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BottomNav />
        </div>
    );
};

export default StoreProfile;
