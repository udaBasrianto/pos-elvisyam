import { useState, useEffect } from 'react';
import { ShoppingBag, Package, Eye, Loader2, Filter, Phone, MapPin, Calendar, DollarSign, Edit, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Order {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    total_amount: number;
    status: string;
    notes: string;
    created_at: string;
    item_count: number;
    products: string;
}

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

const OnlineOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editFormData, setEditFormData] = useState({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        notes: ''
    });

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const response = await api.get(`/admin/online-orders?${params}`);
            setOrders(response.data);
        } catch (error) {
            console.error('Load orders error:', error);
            toast.error('Gagal memuat data order');
        } finally {
            setIsLoading(false);
        }
    };

    const loadOrderDetail = async (orderId: string) => {
        try {
            const response = await api.get(`/admin/online-orders/${orderId}`);
            setSelectedOrder(response.data);
            setIsDetailOpen(true);
        } catch (error) {
            console.error('Load order detail error:', error);
            toast.error('Gagal memuat detail order');
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            await api.put(`/admin/online-orders/${orderId}/status`, { status: newStatus });
            toast.success('Status order berhasil diupdate');
            loadOrders();
            if (selectedOrder?.order.id === orderId) {
                loadOrderDetail(orderId);
            }
        } catch (error) {
            console.error('Update status error:', error);
            toast.error('Gagal update status order');
        }
    };

    const handleEditClick = (order: Order) => {
        setEditFormData({
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.customer_address,
            notes: order.notes || ''
        });
        setSelectedOrder({ order }); // Temporary selection for the ID
        setIsEditOpen(true);
    };

    const handleUpdateOrder = async () => {
        if (!selectedOrder?.order.id) return;
        try {
            await api.put(`/admin/online-orders/${selectedOrder.order.id}`, editFormData);
            toast.success('Data order berhasil diupdate');
            setIsEditOpen(false);
            loadOrders();
        } catch (error) {
            console.error('Update order error:', error);
            toast.error('Gagal mengupdate data order');
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus order ini? Transaksi terkait di menu Transaksi juga akan ikut terhapus.')) return;

        setIsDeleting(true);
        try {
            await api.delete(`/admin/online-orders/${orderId}`);
            toast.success('Order berhasil dihapus');
            loadOrders();
        } catch (error) {
            console.error('Delete order error:', error);
            toast.error('Gagal menghapus order');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            pending: { variant: 'secondary', label: 'Pending' },
            confirmed: { variant: 'default', label: 'Dikonfirmasi' },
            processing: { variant: 'default', label: 'Diproses' },
            completed: { variant: 'default', label: 'Selesai' },
            cancelled: { variant: 'destructive', label: 'Dibatalkan' },
        };

        const config = variants[status] || variants.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const filteredOrders = orders.filter(order =>
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone.includes(searchQuery) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = [
        { label: 'Total Order', value: orders.length, icon: ShoppingBag, color: 'text-blue-600' },
        { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, icon: Package, color: 'text-orange-600' },
        { label: 'Selesai', value: orders.filter(o => o.status === 'completed').length, icon: Package, color: 'text-green-600' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Order Toko Online</h1>
                <p className="text-muted-foreground">Kelola semua pesanan dari toko online</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-slate-800 ${stat.color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold">{stat.value}</p>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari nama, telepon, atau ID order..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                            <SelectItem value="processing">Diproses</SelectItem>
                            <SelectItem value="completed">Selesai</SelectItem>
                            <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Orders List */}
            <Card>
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-muted-foreground">Tidak ada order ditemukan</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="p-4 hover:bg-accent/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{order.customer_name}</h3>
                                            {getStatusBadge(order.status)}
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Phone className="w-4 h-4" />
                                                {order.customer_phone}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(order.created_at)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Package className="w-4 h-4" />
                                                {order.item_count} item
                                            </div>
                                        </div>

                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {order.products}
                                        </p>
                                    </div>

                                    <div className="text-right space-y-2">
                                        <p className="text-xl font-bold text-primary">
                                            {formatCurrency(order.total_amount)}
                                        </p>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => loadOrderDetail(order.id)}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Detail
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditClick(order)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteOrder(order.id)}
                                                disabled={isDeleting}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Order Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Order</DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-4">
                            {/* Customer Info */}
                            <Card className="p-4">
                                <h3 className="font-semibold mb-3">Informasi Pelanggan</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Nama:</span>
                                        <span className="font-medium">{selectedOrder.order.customer_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Telepon:</span>
                                        <span className="font-medium">{selectedOrder.order.customer_phone}</span>
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <span className="text-muted-foreground">Alamat:</span>
                                        <span className="font-medium text-right max-w-xs">{selectedOrder.order.customer_address}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Order Items */}
                            <Card className="p-4">
                                <h3 className="font-semibold mb-3">Produk</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item: OrderItem) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <div>
                                                <p className="font-medium">{item.product_name}</p>
                                                <p className="text-muted-foreground">
                                                    {item.quantity} x {formatCurrency(item.price)}
                                                </p>
                                            </div>
                                            <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                    ))}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">{formatCurrency(selectedOrder.order.total_amount)}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Status & Notes */}
                            <Card className="p-4">
                                <h3 className="font-semibold mb-3">Status & Catatan</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-2 block">Status Order</label>
                                        <Select
                                            value={selectedOrder.order.status}
                                            onValueChange={(value) => updateOrderStatus(selectedOrder.order.id, value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                                                <SelectItem value="processing">Diproses</SelectItem>
                                                <SelectItem value="completed">Selesai</SelectItem>
                                                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedOrder.order.notes && (
                                        <div>
                                            <label className="text-sm text-muted-foreground mb-1 block">Catatan</label>
                                            <p className="text-sm">{selectedOrder.order.notes}</p>
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        Order ID: {selectedOrder.order.id}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Order Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Informasi Pelanggan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Pelanggan</label>
                            <Input
                                value={editFormData.customer_name}
                                onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nomor Telepon</label>
                            <Input
                                value={editFormData.customer_phone}
                                onChange={(e) => setEditFormData({ ...editFormData, customer_phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alamat Pengiriman</label>
                            <Input
                                value={editFormData.customer_address}
                                onChange={(e) => setEditFormData({ ...editFormData, customer_address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Catatan Internal</label>
                            <Input
                                value={editFormData.notes}
                                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
                        <Button onClick={handleUpdateOrder}>Simpan Perubahan</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OnlineOrders;
