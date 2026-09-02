import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, User, Phone, MapPin, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '../contexts/StoreContext';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import { StoreSeoHead } from '../components/StoreSeoHead';
import { toast } from 'sonner';
import { getCustomDomainInfo } from '@/utils/domain';

export const StoreCheckout = () => {
    const { slug } = useParams<{ slug: string }>();
    const customDomainInfo = getCustomDomainInfo();
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = customDomainInfo.isCustomDomain
        ? ''
        : (location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug || ''}`);
    const { cart, cartTotal, sessionId, clearCart } = useStore();
    const { customer, isLoggedIn, isLoading: authLoading, updateProfile } = useStoreAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        address: '',
    });

    const [notes, setNotes] = useState('');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate(`${basePath}/auth`, { state: { from: `${basePath}/checkout` } });
        }
    }, [authLoading, isLoggedIn, navigate, slug, basePath]);

    // Populate profile data from customer
    useEffect(() => {
        if (customer) {
            setProfileData({
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || '',
            });
        }
    }, [customer]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleUpdateProfile = async () => {
        if (!profileData.phone || !profileData.address) {
            toast.error('Nomor telepon dan alamat harus diisi');
            return;
        }

        const { error } = await updateProfile(profileData);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Profil berhasil diperbarui');
            setIsEditingProfile(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if profile is complete
        if (!customer?.phone || !customer?.address) {
            toast.error('Lengkapi nomor telepon dan alamat terlebih dahulu');
            setIsEditingProfile(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('store_customer_token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || '/api'}/store/checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sessionId,
                        items: cart,
                        totalAmount: cartTotal,
                        notes,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setOrderId(data.orderId);
                setShowSuccess(true);
                await clearCart();
            } else {
                throw new Error(data.error || 'Gagal membuat pesanan');
            }
        } catch (error: any) {
            console.error('Checkout error:', error);
            toast.error(error.message || 'Gagal membuat pesanan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        navigate(basePath || '/');
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (cart.length === 0 && !showSuccess) {
        navigate(`${basePath}/cart`);
        return null;
    }

    const isProfileComplete = customer?.phone && customer?.address;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-8">
            <StoreSeoHead
                title="Checkout Pesanan"
                description="Selesaikan proses pemesanan produk Anda dengan mudah dan aman."
            />

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-40 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/cart`)} className="cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold">Checkout</h1>
            </div>

            <div className="p-4 space-y-4 mx-auto max-w-md md:max-w-3xl lg:max-w-5xl">
                {/* Customer Info Card */}
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold">Informasi Pengiriman</h2>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)} className="cursor-pointer">
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                        </Button>
                    </div>

                    {customer && (
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.phone || <span className="text-destructive">Belum diisi</span>}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <span>{customer.address || <span className="text-destructive">Belum diisi</span>}</span>
                            </div>
                        </div>
                    )}

                    {!isProfileComplete && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ Lengkapi nomor telepon dan alamat untuk melanjutkan
                            </p>
                        </div>
                    )}
                </Card>

                {/* Order Summary */}
                <Card className="p-4">
                    <h2 className="font-bold mb-3">Ringkasan Pesanan</h2>
                    <div className="space-y-2">
                        {cart.map((item) => (
                            <div key={item.productId} className="flex justify-between text-sm">
                                <span>{item.name} x{item.quantity}</span>
                                <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                            </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(cartTotal)}</span>
                        </div>
                    </div>
                </Card>

                {/* Notes */}
                <Card className="p-4">
                    <Label htmlFor="notes" className="font-bold">Catatan (Opsional)</Label>
                    <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan untuk penjual"
                        rows={2}
                        className="mt-2"
                    />
                </Card>

                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    className="w-full cursor-pointer"
                    size="lg"
                    disabled={isSubmitting || !isProfileComplete}
                >
                    {isSubmitting ? 'Memproses...' : `Bayar ${formatCurrency(cartTotal)}`}
                </Button>
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Informasi Pengiriman</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Nama Lengkap</Label>
                            <Input
                                id="edit-name"
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-phone">Nomor Telepon *</Label>
                            <Input
                                id="edit-phone"
                                type="tel"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-address">Alamat Lengkap *</Label>
                            <Textarea
                                id="edit-address"
                                value={profileData.address}
                                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                placeholder="Masukkan alamat lengkap"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="flex-1 cursor-pointer">
                                Batal
                            </Button>
                            <Button onClick={handleUpdateProfile} className="flex-1 cursor-pointer">
                                Simpan
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            Pesanan Berhasil!
                        </DialogTitle>
                    </DialogHeader>
                    <div className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Pesanan Anda telah berhasil dibuat dengan ID:
                        </p>
                        <p className="font-mono font-bold text-sm bg-gray-100 dark:bg-slate-800 p-2 rounded">
                            {orderId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Kami akan segera menghubungi Anda untuk konfirmasi pesanan.
                        </p>
                        <Button onClick={handleSuccessClose} className="w-full cursor-pointer">
                            Kembali ke Toko
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StoreCheckout;
