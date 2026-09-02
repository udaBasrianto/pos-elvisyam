import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStore } from '../contexts/StoreContext';
import { ProductImage } from '@/components/ProductImage';
import { StoreBottomNav } from '../components/StoreBottomNav';
import { StoreSeoHead } from '../components/StoreSeoHead';
import { toast } from 'sonner';
import { getCustomDomainInfo } from '@/utils/domain';

export const StoreCart = () => {
    const { slug } = useParams<{ slug: string }>();
    const customDomainInfo = getCustomDomainInfo();
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = customDomainInfo.isCustomDomain
        ? ''
        : (location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug || ''}`);
    const { cart, cartTotal, updateCartItem, removeFromCart } = useStore();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleUpdateQuantity = async (productId: string, newQuantity: number, stock: number) => {
        if (newQuantity > stock) {
            toast.error('Stok tidak mencukupi');
            return;
        }
        try {
            await updateCartItem(productId, newQuantity);
        } catch (error: any) {
            toast.error(error.message || 'Gagal update keranjang');
        }
    };

    const handleRemove = async (productId: string) => {
        try {
            await removeFromCart(productId);
            toast.success('Produk dihapus dari keranjang');
        } catch (error: any) {
            toast.error(error.message || 'Gagal menghapus produk');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-20 mx-auto max-w-md md:max-w-3xl lg:max-w-5xl">
            <StoreSeoHead
                title="Keranjang Belanja"
                description="Lihat daftar barang belanjaan Anda dan lanjutkan ke checkout untuk menyelesaikan pesanan."
            />

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-40 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(basePath || '/')} className="cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold">Keranjang Belanja</h1>
            </div>

            {/* Cart Items */}
            <div className="p-4">
                {cart.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 mb-4">Keranjang Anda kosong</p>
                        <Button onClick={() => navigate(basePath || '/')} className="cursor-pointer">Mulai Belanja</Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 mb-4">
                            {cart.map((item) => (
                                <Card key={item.productId} className="p-4">
                                    <div className="flex gap-3">
                                        {/* Image */}
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                                            <ProductImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.name}</h3>
                                            <p className="text-primary font-bold mb-2">{formatCurrency(item.price)}</p>

                                             {/* Quantity Controls */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 cursor-pointer"
                                                    onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1, item.stock)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <span className="w-12 text-center font-semibold">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 cursor-pointer"
                                                    onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1, item.stock)}
                                                    disabled={item.quantity >= item.stock}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 ml-auto cursor-pointer"
                                                    onClick={() => handleRemove(item.productId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Subtotal */}
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Summary */}
                        <Card className="p-4 sticky bottom-20 bg-white dark:bg-slate-900">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-lg font-semibold">Total</span>
                                <span className="text-2xl font-bold text-primary">{formatCurrency(cartTotal)}</span>
                            </div>
                            <Button className="w-full cursor-pointer" size="lg" onClick={() => navigate(`${basePath}/checkout`)}>
                                Lanjut ke Pembayaran
                            </Button>
                        </Card>
                    </>
                )}
            </div>

            <StoreBottomNav />
        </div>
    );
};

export default StoreCart;
