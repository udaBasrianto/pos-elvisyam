import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/kpi-card";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  DollarSign,
  ShoppingCart,
  User,
  CreditCard,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Save,
  Printer,
  Plus,
  Minus,
  History,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  XCircle,
  RotateCcw
} from "lucide-react";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Transaction, TransactionItem } from "@/contexts/AppContext";
import { toast } from "sonner";
import ReceiptDialog from "@/components/ReceiptDialog";

const Transactions = () => {
  const navigate = useNavigate();
  const { state, loadData, updateTransaction, deleteTransaction } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [paymentFilter, setPaymentFilter] = useState("semua");
  const [dateFilter, setDateFilter] = useState("semua");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const handleOpenAuditLogs = async () => {
    setShowAuditLogs(true);
    setIsLoadingAudit(true);
    try {
      const res = await api.get('/admin/audit-logs');
      setAuditLogs(res.data || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      toast.error('Gagal memuat riwayat audit log');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const statusOptions = ["semua", "completed", "pending", "cancelled", "refunded"];
  const paymentOptions = ["semua", "cash", "transfer", "ewallet", "credit"];
  const dateOptions = ["semua", "hari-ini", "minggu-ini", "bulan-ini", "kustom"];

  const filteredTransactions = state.transactions.filter(transaction => {
    const matchesSearch = 
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.invoiceNumber && transaction.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "semua" || transaction.status === statusFilter;
    const matchesPayment = paymentFilter === "semua" || transaction.paymentMethod === paymentFilter;
    
    let matchesDate = true;
    if (dateFilter !== "semua") {
      const transactionDate = new Date(transaction.createdAt);
      const today = new Date();
      
      switch (dateFilter) {
        case "hari-ini":
          matchesDate = transactionDate.toDateString() === today.toDateString();
          break;
        case "minggu-ini": {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        }
        case "bulan-ini":
          matchesDate = transactionDate.getMonth() === today.getMonth() && 
                       transactionDate.getFullYear() === today.getFullYear();
          break;
        case "kustom": {
          const startOk = customStartDate
            ? (() => { const s = new Date(customStartDate); s.setHours(0,0,0,0); return transactionDate >= s; })()
            : true;
          const endOk = customEndDate
            ? (() => { const e = new Date(customEndDate); e.setHours(23,59,59,999); return transactionDate <= e; })()
            : true;
          matchesDate = startOk && endOk;
          break;
        }
      }
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalTransactions = filteredTransactions.length;
  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0);
  const completedTransactions = filteredTransactions.filter(t => t.status === 'completed').length;
  const pendingTransactions = filteredTransactions.filter(t => t.status === 'pending').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 text-[10px] px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Selesai</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 text-[10px] px-2 py-0.5"><Clock className="w-3 h-3 mr-1 inline" /> Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 text-[10px] px-2 py-0.5"><XCircle className="w-3 h-3 mr-1 inline" /> Dibatalkan</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 text-[10px] px-2 py-0.5"><RotateCcw className="w-3 h-3 mr-1 inline" /> Refund</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-2 py-0.5">{status}</Badge>;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'transfer': return 'Transfer';
      case 'ewallet': return 'E-Wallet';
      case 'credit': return 'Kredit';
      default: return method;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast.success("Data transaksi diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(JSON.parse(JSON.stringify(transaction)));
  };

  const handleEditFieldChange = (field: string, value: any) => {
    if (!editingTransaction) return;
    setEditingTransaction({
      ...editingTransaction,
      [field]: value
    });
  };

  const handleItemQuantityChange = (index: number, newQty: number) => {
    if (!editingTransaction) return;
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }

    const updatedItems = [...editingTransaction.items];
    const item = updatedItems[index];
    item.quantity = newQty;
    item.subtotal = item.price * newQty;

    updateEditingTotals(updatedItems);
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    if (!editingTransaction) return;
    const updatedItems = [...editingTransaction.items];
    const item = updatedItems[index];
    item.price = newPrice;
    item.subtotal = newPrice * item.quantity;

    updateEditingTotals(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    if (!editingTransaction) return;
    const updatedItems = editingTransaction.items.filter((_, idx) => idx !== index);
    updateEditingTotals(updatedItems);
  };

  const handleAddProductToEdit = (product: any) => {
    if (!editingTransaction) return;
    const existingIndex = editingTransaction.items.findIndex(i => i.productId === product.id);

    let updatedItems: TransactionItem[];
    if (existingIndex >= 0) {
      updatedItems = [...editingTransaction.items];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].subtotal = updatedItems[existingIndex].price * updatedItems[existingIndex].quantity;
    } else {
      const newItem: TransactionItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      };
      updatedItems = [...editingTransaction.items, newItem];
    }

    updateEditingTotals(updatedItems);
    setProductSearch("");
    setShowProductList(false);
  };

  const updateEditingTotals = (items: TransactionItem[], discountVal?: number) => {
    if (!editingTransaction) return;
    const newSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const currentDiscount = discountVal !== undefined ? discountVal : editingTransaction.discount;
    const currentTax = editingTransaction.tax;
    const newTotal = Math.max(0, newSubtotal + currentTax - currentDiscount);

    setEditingTransaction({
      ...editingTransaction,
      items,
      subtotal: newSubtotal,
      total: newTotal,
      discount: currentDiscount
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    if (editingTransaction.items.length === 0) {
      toast.error("Transaksi harus memiliki minimal 1 item");
      return;
    }

    setIsSaving(true);
    try {
      await updateTransaction(editingTransaction);
      toast.success("Transaksi berhasil diperbarui");
      setEditingTransaction(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengedit transaksi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransactionId) return;

    setIsDeleting(true);
    try {
      await deleteTransaction(deletingTransactionId);
      toast.success("Transaksi berhasil dihapus");
      setDeletingTransactionId(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus transaksi");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Riwayat Transaksi POS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar histori transaksi penjualan kasir, cetak ulang nota, edit detail, dan audit log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenAuditLogs}>
            <History className="w-4 h-4 mr-2" />
            Audit Logs
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Omset Penjualan" value={formatCurrency(totalRevenue)} icon={DollarSign} iconColor="green" />
        <StatCard title="Transaksi Selesai" value={completedTransactions.toString()} icon={CheckCircle2} iconColor="blue" />
        <StatCard title="Transaksi Pending" value={pendingTransactions.toString()} icon={Clock} iconColor="yellow" />
        <StatCard title="Total Nota Transaksi" value={totalTransactions.toString()} icon={ShoppingCart} iconColor="purple" />
      </div>

      {/* DataTable Section */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b bg-card flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Daftar Histori Transaksi ({filteredTransactions.length})
            </CardTitle>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cari ID transaksi / nama pelanggan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
            <span className="text-muted-foreground font-semibold text-[11px]">Filter:</span>
            <Select 
              value={statusFilter} 
              onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                <SelectItem value="refunded">Refund</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={paymentFilter} 
              onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Bayar</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="ewallet">E-Wallet</SelectItem>
                <SelectItem value="credit">Kredit</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={dateFilter} 
              onValueChange={(v) => { setDateFilter(v); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Waktu</SelectItem>
                <SelectItem value="hari-ini">Hari Ini</SelectItem>
                <SelectItem value="minggu-ini">7 Hari Ini</SelectItem>
                <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4">ID Transaksi & Waktu</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4 text-center">Item Produk</th>
                    <th className="py-3 px-4 text-right">Total Nilai</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-foreground font-semibold text-xs">
                          {t.invoiceNumber || (t.id && t.id.length > 16 && t.id.includes('-') ? t.id.slice(0, 8).toUpperCase() : t.id)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(t.createdAt)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-foreground text-xs">{t.customerName}</div>
                        {t.latitude && t.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            GPS Map
                          </a>
                        )}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {getPaymentLabel(t.paymentMethod)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono">
                          {t.items.length} Barang
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-primary text-sm whitespace-nowrap">
                        {formatCurrency(t.total)}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEditTransaction(t)}
                            title="Edit Transaksi"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-600 hover:bg-gray-100"
                            onClick={() => setSelectedTransaction(t)}
                            title="Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setPrintingTransaction(t)}
                            title="Cetak Struk"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeletingTransactionId(t.id)}
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {filteredTransactions.length > 0 && (
            <div className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</strong> dari <strong>{filteredTransactions.length}</strong> transaksi
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

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Nota</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">ID Transaksi / Nota</span>
                <span className="font-mono font-bold text-foreground">{selectedTransaction.invoiceNumber || (selectedTransaction.id && selectedTransaction.id.length > 16 ? selectedTransaction.id.slice(0, 8).toUpperCase() : selectedTransaction.id)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Waktu & Tanggal</span>
                <span>{formatDate(selectedTransaction.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Pelanggan</span>
                <span className="font-semibold">{selectedTransaction.customerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Metode Bayar</span>
                <span className="capitalize">{getPaymentLabel(selectedTransaction.paymentMethod)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(selectedTransaction.status)}
              </div>
              
              <div className="pt-2">
                <p className="font-bold text-xs mb-2 text-foreground">Rincian Barang Belanja:</p>
                <div className="space-y-1 bg-muted/50 p-2.5 rounded-xl border">
                  {selectedTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-dashed last:border-0">
                      <span>{item.productName} <strong className="text-primary">x{item.quantity}</strong></span>
                      <span className="font-mono">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-2 space-y-1.5 border-t">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {selectedTransaction.tax > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pajak</span>
                    <span className="font-mono">{formatCurrency(selectedTransaction.tax)}</span>
                  </div>
                )}
                {selectedTransaction.discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Diskon Nota</span>
                    <span className="font-mono text-emerald-600">-{formatCurrency(selectedTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total Nota</span>
                  <span className="text-primary font-mono">{formatCurrency(selectedTransaction.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-5 pb-2 border-b">
            <DialogTitle>Edit Transaksi Penjualan</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {editingTransaction && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama Pelanggan</Label>
                    <Input
                      value={editingTransaction.customerName}
                      onChange={(e) => handleEditFieldChange('customerName', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal Transaksi</Label>
                    <Input
                      type="datetime-local"
                      value={editingTransaction.createdAt ? new Date(new Date(editingTransaction.createdAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleEditFieldChange('createdAt', e.target.value ? new Date(e.target.value).toISOString() : editingTransaction.createdAt)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status Transaksi</Label>
                    <Select
                      value={editingTransaction.status}
                      onValueChange={(value) => handleEditFieldChange('status', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Selesai</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        <SelectItem value="refunded">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Metode Pembayaran</Label>
                    <Select
                      value={editingTransaction.paymentMethod}
                      onValueChange={(value) => handleEditFieldChange('paymentMethod', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Diskon Nota (Rp)</Label>
                  <Input
                    type="number"
                    value={editingTransaction.discount}
                    onChange={(e) => {
                      const discount = Number(e.target.value) || 0;
                      updateEditingTotals(editingTransaction.items, discount);
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Items List */}
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs font-semibold">Item Barang Dalam Transaksi:</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-xl bg-muted/40">
                    {editingTransaction.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-card rounded-lg border text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold truncate block">{item.productName}</span>
                          <span className="text-[10px] text-muted-foreground">@{formatCurrency(item.price)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleItemQuantityChange(idx, item.quantity - 1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold px-1.5">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleItemQuantityChange(idx, item.quantity + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="font-bold font-mono text-xs w-20 text-right">
                          {formatCurrency(item.subtotal)}
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => handleRemoveItem(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-primary/10 rounded-xl flex items-center justify-between font-bold text-sm">
                  <span>Total Transaksi Baru:</span>
                  <span className="text-primary font-mono text-base">{formatCurrency(editingTransaction.total)}</span>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-card flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingTransaction(null)}>
              Batal
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingTransactionId} onOpenChange={() => setDeletingTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus transaksi akan mengembalikan stok barang ke inventaris.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Hapus Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Dialog */}
      {printingTransaction && (
        <ReceiptDialog
          open={!!printingTransaction}
          onClose={() => setPrintingTransaction(null)}
          transaction={{
            id: printingTransaction.id,
            customerName: printingTransaction.customerName,
            createdAt: printingTransaction.createdAt,
            items: printingTransaction.items.map(i => ({
              productName: i.productName,
              quantity: i.quantity,
              price: i.price,
              subtotal: i.subtotal
            })),
            subtotal: printingTransaction.subtotal,
            tax: printingTransaction.tax,
            discount: printingTransaction.discount,
            total: printingTransaction.total,
            paymentMethod: printingTransaction.paymentMethod,
            paymentAmount: printingTransaction.paymentAmount ?? printingTransaction.total,
            changeAmount: printingTransaction.changeAmount ?? 0
          }}
        />
      )}
    </div>
  );
};

export default Transactions;
