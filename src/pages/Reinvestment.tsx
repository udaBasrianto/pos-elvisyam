import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Loader2,
    TrendingUp,
    Calendar,
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    History,
    Landmark,
    Package,
    Wrench,
    Megaphone,
    Building,
    MoreHorizontal,
    Trash2,
    RefreshCw,
    AlertCircle,
    Edit,
    Lock,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ReinvestmentBalance {
    total_in: number;
    total_out: number;
    current_balance: number;
}

interface ReinvestmentTransaction {
    id: string;
    type: "in" | "out";
    amount: number;
    balance_before: number;
    balance_after: number;
    distribution_id: string | null;
    distribution_period: string | null;
    category: string | null;
    description: string;
    notes: string | null;
    transaction_date: string;
    created_at: string;
}

const CATEGORIES = [
    { value: "stock_purchase", label: "Pembelian Stok", icon: Package },
    { value: "equipment", label: "Pembelian Peralatan", icon: Wrench },
    { value: "renovation", label: "Renovasi Toko", icon: Building },
    { value: "marketing", label: "Biaya Pemasaran", icon: Megaphone },
    { value: "operational", label: "Biaya Operasional", icon: RefreshCw },
    { value: "other", label: "Lainnya", icon: MoreHorizontal },
];

const Reinvestment = () => {
    const [balance, setBalance] = useState<ReinvestmentBalance>({
        total_in: 0,
        total_out: 0,
        current_balance: 0,
    });
    const [transactions, setTransactions] = useState<ReinvestmentTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<ReinvestmentTransaction | null>(null);

    const [formData, setFormData] = useState({
        amount: "",
        category: "",
        description: "",
        notes: "",
        transaction_date: new Date().toISOString().split("T")[0],
    });

    const [addFormData, setAddFormData] = useState({
        amount: "",
        description: "",
        notes: "",
        transaction_date: new Date().toISOString().split("T")[0],
    });

    const [editFormData, setEditFormData] = useState({
        amount: "",
        category: "",
        description: "",
        notes: "",
        transaction_date: new Date().toISOString().split("T")[0],
    });

    const fetchBalance = async () => {
        try {
            const response = await api.get("/reinvestment/balance");
            setBalance({
                total_in: Number(response.data.total_in) || 0,
                total_out: Number(response.data.total_out) || 0,
                current_balance: Number(response.data.current_balance) || 0,
            });
        } catch (err: any) {
            console.error("Error fetching balance:", err);
            setBalance({ total_in: 0, total_out: 0, current_balance: 0 });
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await api.get("/reinvestment/transactions");
            setTransactions(response.data || []);
        } catch (err: any) {
            console.error("Error fetching transactions:", err);
            setTransactions([]);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                await Promise.all([fetchBalance(), fetchTransactions()]);
            } catch (err: any) {
                console.error("Error loading data:", err);
                setError("Gagal memuat data. Silakan refresh halaman.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const getCategoryInfo = (categoryValue: string) => {
        return CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[5];
    };

    const resetForm = () => {
        setFormData({
            amount: "",
            category: "",
            description: "",
            notes: "",
            transaction_date: new Date().toISOString().split("T")[0],
        });
    };

    const resetAddForm = () => {
        setAddFormData({
            amount: "",
            description: "",
            notes: "",
            transaction_date: new Date().toISOString().split("T")[0],
        });
    };

    const resetEditForm = () => {
        setEditFormData({
            amount: "",
            category: "",
            description: "",
            notes: "",
            transaction_date: new Date().toISOString().split("T")[0],
        });
        setSelectedTransaction(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await api.post("/reinvestment/use", {
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description,
                notes: formData.notes,
                transaction_date: formData.transaction_date,
            });

            toast.success("Penggunaan dana berhasil dicatat");
            setIsDialogOpen(false);
            resetForm();
            fetchBalance();
            fetchTransactions();
        } catch (err: any) {
            console.error("Error using reinvestment:", err);
            toast.error(err.response?.data?.error || "Gagal mencatat penggunaan dana");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddManual = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await api.post("/reinvestment/add-manual", {
                amount: parseFloat(addFormData.amount),
                description: addFormData.description,
                notes: addFormData.notes,
                transaction_date: addFormData.transaction_date,
            });

            toast.success("Dana berhasil ditambahkan");
            setIsAddDialogOpen(false);
            resetAddForm();
            fetchBalance();
            fetchTransactions();
        } catch (err: any) {
            console.error("Error adding manual funds:", err);
            toast.error(err.response?.data?.error || "Gagal menambahkan dana");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (tx: ReinvestmentTransaction) => {
        setSelectedTransaction(tx);
        setEditFormData({
            amount: tx.amount.toString(),
            category: tx.category || "",
            description: tx.description,
            notes: tx.notes || "",
            transaction_date: tx.transaction_date,
        });
        setIsEditDialogOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTransaction) return;

        setIsSubmitting(true);

        try {
            await api.put(`/reinvestment/transactions/${selectedTransaction.id}`, {
                amount: parseFloat(editFormData.amount),
                category: editFormData.category || null,
                description: editFormData.description,
                notes: editFormData.notes,
                transaction_date: editFormData.transaction_date,
            });

            toast.success("Transaksi berhasil diupdate");
            setIsEditDialogOpen(false);
            resetEditForm();
            fetchBalance();
            fetchTransactions();
        } catch (err: any) {
            console.error("Error updating transaction:", err);
            toast.error(err.response?.data?.error || "Gagal mengupdate transaksi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (tx: ReinvestmentTransaction) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus transaksi "${tx.description}"?`)) {
            return;
        }

        try {
            await api.delete(`/reinvestment/transactions/${tx.id}`);
            toast.success("Transaksi berhasil dihapus");
            fetchBalance();
            fetchTransactions();
        } catch (err: any) {
            console.error("Error deleting transaction:", err);
            toast.error(err.response?.data?.error || "Gagal menghapus transaksi");
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await api.post("/reinvestment/sync");
            if (response.data.synced_count > 0) {
                toast.success(`Berhasil sinkronisasi ${response.data.synced_count} periode`);
                fetchBalance();
                fetchTransactions();
            } else {
                toast.info("Semua data sudah sinkron");
            }
        } catch (err: any) {
            console.error("Error syncing:", err);
            toast.error(err.response?.data?.error || "Gagal sinkronisasi data");
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                        {isSyncing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sync dari Bagi Hasil
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Dana Manual
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Tambah Dana Reinvestasi Manual</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddManual} className="space-y-4">
                                <div>
                                    <Label htmlFor="add_amount">Jumlah *</Label>
                                    <Input
                                        id="add_amount"
                                        type="number"
                                        placeholder="0"
                                        value={addFormData.amount}
                                        onChange={(e) => setAddFormData({ ...addFormData, amount: e.target.value })}
                                        required
                                        min={1}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="add_description">Deskripsi *</Label>
                                    <Input
                                        id="add_description"
                                        placeholder="Contoh: Dana awal dari kas"
                                        value={addFormData.description}
                                        onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="add_transaction_date">Tanggal</Label>
                                    <Input
                                        id="add_transaction_date"
                                        type="date"
                                        value={addFormData.transaction_date}
                                        onChange={(e) => setAddFormData({ ...addFormData, transaction_date: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="add_notes">Catatan</Label>
                                    <Textarea
                                        id="add_notes"
                                        placeholder="Catatan tambahan (opsional)"
                                        value={addFormData.notes}
                                        onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting || !addFormData.amount || !addFormData.description}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Tambah Dana"
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Gunakan Dana
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Penggunaan Dana Reinvestasi</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="p-3 bg-green-500/10 rounded-lg border border-green-300">
                                    <p className="text-sm text-muted-foreground">Saldo Tersedia</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(balance.current_balance)}
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="amount">Jumlah *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="0"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        min={1}
                                        max={balance.current_balance}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="category">Kategori *</Label>
                                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="description">Deskripsi *</Label>
                                    <Input
                                        id="description"
                                        placeholder="Contoh: Beli stok produk A 100 pcs"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="transaction_date">Tanggal</Label>
                                    <Input
                                        id="transaction_date"
                                        type="date"
                                        value={formData.transaction_date}
                                        onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="notes">Catatan</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Catatan tambahan (opsional)"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting || !formData.amount || !formData.category || !formData.description}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Catat Penggunaan Dana"
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) resetEditForm(); }}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Transaksi Reinvestasi</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="edit_amount">Jumlah *</Label>
                                    <Input
                                        id="edit_amount"
                                        type="number"
                                        placeholder="0"
                                        value={editFormData.amount}
                                        onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                        required
                                        min={1}
                                    />
                                </div>

                                {selectedTransaction?.type === "out" && (
                                    <div>
                                        <Label htmlFor="edit_category">Kategori</Label>
                                        <Select value={editFormData.category} onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih kategori" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat.value} value={cat.value}>
                                                        {cat.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="edit_description">Deskripsi *</Label>
                                    <Input
                                        id="edit_description"
                                        placeholder="Deskripsi transaksi"
                                        value={editFormData.description}
                                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit_transaction_date">Tanggal</Label>
                                    <Input
                                        id="edit_transaction_date"
                                        type="date"
                                        value={editFormData.transaction_date}
                                        onChange={(e) => setEditFormData({ ...editFormData, transaction_date: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit_notes">Catatan</Label>
                                    <Textarea
                                        id="edit_notes"
                                        placeholder="Catatan tambahan (opsional)"
                                        value={editFormData.notes}
                                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting || !editFormData.amount || !editFormData.description}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Update Transaksi"
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                <Card className="p-3.5 sm:p-4 bg-green-50 dark:bg-green-950/20 border-green-100/50">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                            <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Saldo Saat Ini</p>
                            <p className="text-base sm:text-xl font-bold text-green-600 dark:text-green-400 truncate">{formatCurrency(balance.current_balance)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3.5 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-100/50">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                            <ArrowUpCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Total Dana Masuk</p>
                            <p className="text-base sm:text-xl font-bold text-foreground truncate">{formatCurrency(balance.total_in)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3.5 sm:p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-100/50">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                            <ArrowDownCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Total Dana Terpakai</p>
                            <p className="text-base sm:text-xl font-bold text-foreground truncate">{formatCurrency(balance.total_out)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-3.5 sm:p-4 bg-purple-50 dark:bg-purple-950/20 border-purple-100/50">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                            <History className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] sm:text-sm text-muted-foreground truncate">Total Transaksi</p>
                            <p className="text-base sm:text-xl font-bold text-foreground truncate">{transactions.length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Transactions List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Riwayat Transaksi ({transactions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Landmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Belum ada riwayat transaksi reinvestasi.</p>
                            <p className="text-sm mt-2">
                                Klik <strong>"Sync dari Bagi Hasil"</strong> untuk mengambil dana dari bagi hasil yang sudah ada.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => {
                                const categoryInfo = tx.category ? getCategoryInfo(tx.category) : null;
                                const CategoryIcon = categoryInfo?.icon || Landmark;

                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "in" ? "bg-green-100" : "bg-orange-100"}`}>
                                                {tx.type === "in" ? (
                                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <CategoryIcon className="w-5 h-5 text-orange-600" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-semibold text-foreground">{tx.description}</h3>
                                                    <Badge variant={tx.type === "in" ? "default" : "secondary"} className={tx.type === "in" ? "bg-green-500/20 text-green-600" : "bg-orange-500/20 text-orange-600"}>
                                                        {tx.type === "in" ? "Masuk" : "Keluar"}
                                                    </Badge>
                                                    {tx.distribution_id && (
                                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                                            <Lock className="w-3 h-3 mr-1" />
                                                            Auto-Sync
                                                        </Badge>
                                                    )}
                                                    {categoryInfo && (
                                                        <Badge variant="outline" className="text-xs">{categoryInfo.label}</Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(tx.transaction_date)}
                                                    </span>
                                                    {tx.distribution_period && (
                                                        <span className="text-xs">Periode: {tx.distribution_period}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className={`font-bold text-lg ${tx.type === "in" ? "text-green-600" : "text-orange-600"}`}>
                                                    {tx.type === "in" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Saldo: {formatCurrency(Number(tx.balance_after))}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!tx.distribution_id && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => handleEdit(tx)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(tx)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {tx.distribution_id && (
                                                    <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                                                        <Lock className="w-3 h-3" />
                                                        Terlindungi
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Landmark className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-800">Tentang Dana Reinvestasi</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                Dana reinvestasi adalah bagian dari laba bersih yang dialokasikan untuk toko.
                                Dana ini tidak dicairkan, melainkan digunakan kembali untuk pengembangan usaha
                                seperti pembelian stok, peralatan, renovasi, atau kebutuhan operasional lainnya.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Reinvestment;
