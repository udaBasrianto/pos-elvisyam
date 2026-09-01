import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    RefreshCw,
    Package,
    Loader2,
    Search,
    Plus,
    Filter,
    Calendar,
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    ChevronRight,
    History
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StockMovement {
    id: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    type: 'in' | 'out' | 'adjustment' | 'sale' | 'return';
    quantity: number;
    stock_before: number;
    stock_after: number;
    reference_type: string;
    reference_id: string;
    notes: string;
    created_at: string;
}

interface Product {
    id: string;
    name: string;
    stock: number;
    sku: string;
}

const StockMovements = () => {
    const { user, isManager } = useAuth();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const [formData, setFormData] = useState({
        product_id: "",
        type: "in" as "in" | "out" | "adjustment",
        quantity: 0,
        notes: "",
    });

    useEffect(() => {
        if (user) {
            loadMovements();
            loadProducts();
        }
    }, [user]);

    const loadMovements = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/stock-movements');
            setMovements(res.data);
        } catch (error) {
            console.error('Error loading movements:', error);
            toast.error('Gagal memuat riwayat stok');
        } finally {
            setIsLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    const resetForm = () => {
        setFormData({ product_id: "", type: "in", quantity: 0, notes: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.product_id) {
            toast.error('Pilih produk terlebih dahulu');
            return;
        }
        if (formData.quantity <= 0) {
            toast.error('Jumlah harus lebih dari 0');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/stock-movements', formData);
            toast.success('Stok berhasil diperbarui');
            setIsDialogOpen(false);
            resetForm();
            loadMovements();
            loadProducts();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.message;
            toast.error('Gagal memperbarui stok: ' + errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'in':
            case 'return':
                return <ArrowDownCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
            case 'out':
            case 'sale':
                return <ArrowUpCircle className="w-4 h-4 text-rose-500 shrink-0" />;
            case 'adjustment':
                return <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />;
            default:
                return <Package className="w-4 h-4 shrink-0" />;
        }
    };

    const getTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            'in': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
            'out': 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800',
            'adjustment': 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            'sale': 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            'return': 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        };
        const labels: Record<string, string> = {
            'in': 'Masuk',
            'out': 'Keluar',
            'adjustment': 'Penyesuaian',
            'sale': 'Penjualan',
            'return': 'Retur',
        };
        return (
            <Badge variant="outline" className={`${styles[type] || 'bg-gray-100 text-gray-700'} font-medium text-[11px] px-2 py-0.5`}>
                {labels[type] || type}
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredMovements = movements.filter(m => {
        const matchesSearch = m.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.product_sku?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || m.type === filterType;
        return matchesSearch && matchesType;
    });

    // Pagination Calculations
    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage) || 1;
    const paginatedMovements = filteredMovements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Summary stats
    const stats = {
        totalIn: movements.filter(m => m.type === 'in' || m.type === 'return').reduce((sum, m) => sum + m.quantity, 0),
        totalOut: movements.filter(m => m.type === 'out' || m.type === 'sale').reduce((sum, m) => sum + m.quantity, 0),
        adjustments: movements.filter(m => m.type === 'adjustment').length,
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Riwayat Pergerakan Stok
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pantau riwayat masuk, keluar, penjualan, dan penyesuaian stok produk.
              </p>
            </div>
            {isManager && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-primary hover:opacity-90 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah / Penyesuaian Stok
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Perbarui Stok Manual</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="product">Produk</Label>
                                <Select
                                    value={formData.product_id}
                                    onValueChange={(v) => setFormData({ ...formData, product_id: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Pilih produk..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} (Stok: {p.stock})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="type">Jenis Pergerakan</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v: 'in' | 'out' | 'adjustment') => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in">Stok Masuk (+ Tambah)</SelectItem>
                                        <SelectItem value="out">Stok Keluar (- Kurang)</SelectItem>
                                        <SelectItem value="adjustment">Penyesuaian (Set Jumlah Baru)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="quantity">
                                    {formData.type === 'adjustment' ? 'Jumlah Stok Baru' : 'Jumlah Perubahan'}
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    value={formData.quantity || ''}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="notes">Catatan / Alasan (Opsional)</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Contoh: Stok opname bulanan, barang rusak, dsb."
                                    rows={2}
                                    className="mt-1"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Simpan Perubahan Stok'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                      <div>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Stok Masuk</p>
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">+{stats.totalIn.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                          <TrendingUp className="w-6 h-6 text-emerald-500" />
                      </div>
                  </CardContent>
              </Card>

              <Card className="bg-rose-500/5 border-rose-500/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                      <div>
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Stok Keluar</p>
                          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">-{stats.totalOut.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-500/10">
                          <TrendingDown className="w-6 h-6 text-rose-500" />
                      </div>
                  </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                      <div>
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Penyesuaian</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.adjustments.toLocaleString('id-ID')} Kali</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-500/10">
                          <RefreshCw className="w-6 h-6 text-blue-500" />
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* DataTable Section */}
          <Card className="border shadow-sm overflow-hidden">
              <CardHeader className="p-4 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Daftar Riwayat Stok ({filteredMovements.length})
                  </CardTitle>

                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                              placeholder="Cari produk atau SKU..."
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="pl-9 h-9 text-xs"
                          />
                      </div>
                      <Select 
                        value={filterType} 
                        onValueChange={(v) => {
                          setFilterType(v);
                          setCurrentPage(1);
                        }}
                      >
                          <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                              <SelectValue placeholder="Tipe" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Semua Tipe</SelectItem>
                              <SelectItem value="in">Masuk</SelectItem>
                              <SelectItem value="out">Keluar</SelectItem>
                              <SelectItem value="sale">Penjualan</SelectItem>
                              <SelectItem value="return">Retur</SelectItem>
                              <SelectItem value="adjustment">Penyesuaian</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </CardHeader>

              <CardContent className="p-0">
                  {paginatedMovements.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-medium">Tidak ada riwayat pergerakan stok ditemukan</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                                  <tr>
                                      <th className="py-3 px-4">Waktu & Tanggal</th>
                                      <th className="py-3 px-4">Produk</th>
                                      <th className="py-3 px-4 text-center">Tipe</th>
                                      <th className="py-3 px-4 text-right">Jumlah</th>
                                      <th className="py-3 px-4 text-center">Perubahan Stok</th>
                                      <th className="py-3 px-4">Catatan / Ref</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {paginatedMovements.map((m) => {
                                      const isPlus = m.type === 'in' || m.type === 'return';
                                      const isMinus = m.type === 'out' || m.type === 'sale';
                                      return (
                                          <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                                              <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground font-mono">
                                                  <span className="flex items-center gap-1.5">
                                                      <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                                      {formatDate(m.created_at)}
                                                  </span>
                                              </td>
                                              <td className="py-2.5 px-4">
                                                  <div className="font-semibold text-foreground text-sm truncate max-w-[220px]" title={m.product_name}>
                                                      {m.product_name}
                                                  </div>
                                                  {m.product_sku && (
                                                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                                          SKU: {m.product_sku}
                                                      </span>
                                                  )}
                                              </td>
                                              <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                  <div className="inline-flex items-center gap-1">
                                                      {getTypeIcon(m.type)}
                                                      {getTypeBadge(m.type)}
                                                  </div>
                                              </td>
                                              <td className="py-2.5 px-4 text-right font-bold whitespace-nowrap text-sm">
                                                  <span className={isPlus ? 'text-emerald-600 dark:text-emerald-400' : isMinus ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}>
                                                      {isPlus ? '+' : isMinus ? '-' : '±'}
                                                      {m.quantity.toLocaleString('id-ID')}
                                                  </span>
                                              </td>
                                              <td className="py-2.5 px-4 text-center whitespace-nowrap font-mono text-muted-foreground">
                                                  <span className="bg-muted px-2 py-1 rounded border text-[11px]">
                                                      {m.stock_before} ➔ <strong className="text-foreground">{m.stock_after}</strong>
                                                  </span>
                                              </td>
                                              <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[200px]" title={m.notes || m.reference_id || '-'}>
                                                  {m.notes || m.reference_id || '-'}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {/* Pagination Footer */}
                  {filteredMovements.length > 0 && (
                      <div className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                          <div>
                              Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredMovements.length)}</strong> dari <strong>{filteredMovements.length}</strong> data pergerakan
                          </div>
                          <div className="flex items-center gap-2">
                              <Select
                                value={String(itemsPerPage)}
                                onValueChange={(v) => {
                                  setItemsPerPage(Number(v));
                                  setCurrentPage(1);
                                }}
                              >
                                <SelectTrigger className="h-8 w-20 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10 / hal</SelectItem>
                                  <SelectItem value="15">15 / hal</SelectItem>
                                  <SelectItem value="25">25 / hal</SelectItem>
                                  <SelectItem value="50">50 / hal</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="flex items-center gap-1">
                                  <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                      disabled={currentPage === 1}
                                  >
                                      <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="px-2 font-medium">
                                      {currentPage} / {totalPages}
                                  </span>
                                  <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                      disabled={currentPage === totalPages}
                                  >
                                      <ChevronRight className="w-4 h-4" />
                                  </Button>
                              </div>
                          </div>
                      </div>
                  )}
              </CardContent>
          </Card>
        </div>
    );
};

export default StockMovements;
