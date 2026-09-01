import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Wallet,
    TrendingDown,
    Calendar,
    Filter,
    Loader2,
    Receipt,
    DollarSign,
    CalendarDays,
    CalendarRange,
    CalendarClock,
} from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Expense {
    id: string;
    category: string;
    description: string;
    amount: number;
    expense_date: string;
    payment_method: string;
    notes: string;
    created_at: string;
}

interface ExpenseCategory {
    id: string;
    name: string;
    color: string;
}

const defaultCategories = [
    "Operasional",
    "Gaji & Upah",
    "Sewa & Utilitas",
    "Pemasaran",
    "Transportasi",
    "Perlengkapan Kantor",
    "Pemeliharaan",
    "Pajak & Retribusi",
    "Asuransi",
    "Lain-lain"
];

const Expenses = () => {
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("semua");
    const [selectedPeriod, setSelectedPeriod] = useState("month");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("daily");

    const [formData, setFormData] = useState({
        category: "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: "cash",
        notes: "",
    });

    useEffect(() => {
        loadExpenses();
        loadCategories();
    }, [selectedPeriod]);

    const loadExpenses = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/expenses?period=${selectedPeriod}`);
            setExpenses(res.data);
        } catch (error) {
            console.error('Error loading expenses:', error);
            toast({ title: "Gagal memuat pengeluaran", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const res = await api.get('/expense-categories');
            setCategories(res.data);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const allCategories = [...new Set([
        ...defaultCategories,
        ...categories.map(c => c.name),
        ...expenses.map(e => e.category).filter(Boolean)
    ])];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "semua" || expense.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group expenses by date for daily view
    const expensesByDate = filteredExpenses.reduce((acc, expense) => {
        const date = expense.expense_date.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(expense);
        return acc;
    }, {} as Record<string, Expense[]>);

    // Calculate totals
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const todayExpenses = expenses
        .filter(e => e.expense_date.split('T')[0] === new Date().toISOString().split('T')[0])
        .reduce((sum, e) => sum + Number(e.amount), 0);

    const thisMonthExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const resetForm = () => {
        setFormData({
            category: "",
            description: "",
            amount: "",
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: "cash",
            notes: "",
        });
        setEditingExpense(null);
    };

    const openEditDialog = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            category: expense.category,
            description: expense.description || "",
            amount: expense.amount.toString(),
            expense_date: expense.expense_date.split('T')[0],
            payment_method: expense.payment_method || "cash",
            notes: expense.notes || "",
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category || !formData.amount || !formData.expense_date) {
            toast({ title: "Kategori, jumlah, dan tanggal harus diisi", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const expenseData = {
                category: formData.category,
                description: formData.description,
                amount: parseFloat(formData.amount),
                expense_date: formData.expense_date,
                payment_method: formData.payment_method,
                notes: formData.notes,
            };

            if (editingExpense) {
                await api.put(`/expenses/${editingExpense.id}`, expenseData);
                toast({ title: "Pengeluaran berhasil diperbarui" });
            } else {
                await api.post('/expenses', expenseData);
                toast({ title: "Pengeluaran berhasil ditambahkan" });
            }

            setIsDialogOpen(false);
            resetForm();
            loadExpenses();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Gagal menyimpan pengeluaran", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus pengeluaran ini?")) return;

        try {
            await api.delete(`/expenses/${id}`);
            toast({ title: "Pengeluaran berhasil dihapus" });
            loadExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({ title: "Gagal menghapus pengeluaran", variant: "destructive" });
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            "Operasional": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            "Gaji & Upah": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            "Sewa & Utilitas": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            "Pemasaran": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
            "Transportasi": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            "Perlengkapan Kantor": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            "Pemeliharaan": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
            "Pajak & Retribusi": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            "Asuransi": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
        };
        return colors[category] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md">
                            <Plus className="w-4 h-4 mr-2" />Tambah Pengeluaran
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran Baru"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="category">Kategori *</Label>
                                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allCategories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="description">Deskripsi</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Contoh: Bayar listrik bulan Januari"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="amount">Jumlah (Rp) *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expense_date">Tanggal *</Label>
                                    <Input
                                        id="expense_date"
                                        type="date"
                                        value={formData.expense_date}
                                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="payment_method">Metode Pembayaran</Label>
                                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Tunai</SelectItem>
                                        <SelectItem value="transfer">Transfer Bank</SelectItem>
                                        <SelectItem value="credit">Kartu Kredit</SelectItem>
                                        <SelectItem value="debit">Kartu Debit</SelectItem>
                                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="notes">Catatan</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Catatan tambahan..."
                                    rows={2}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-red-500 hover:bg-red-600" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
                                ) : (
                                    editingExpense ? "Update Pengeluaran" : "Tambah Pengeluaran"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pengeluaran Hari Ini</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(todayExpenses)}</p>
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <CalendarDays className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pengeluaran Periode Ini</p>
                                <p className="text-2xl font-bold text-orange-600">{formatCurrency(thisMonthExpenses)}</p>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <CalendarRange className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                                <p className="text-2xl font-bold text-purple-600">{filteredExpenses.length}</p>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <Receipt className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20 border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Rata-rata / Transaksi</p>
                                <p className="text-2xl font-bold text-cyan-600">
                                    {formatCurrency(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                                <TrendingDown className="w-6 h-6 text-cyan-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-gradient-card border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Cari pengeluaran..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="w-[180px]">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Hari Ini</SelectItem>
                                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                                <SelectItem value="month">Bulan Ini</SelectItem>
                                <SelectItem value="year">Tahun Ini</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semua">Semua Kategori</SelectItem>
                                {allCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl overflow-hidden">
                <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-red-500" />
                            Daftar Pengeluaran
                        </CardTitle>
                        <Badge variant="outline" className="font-normal">
                            {filteredExpenses.length} Transaksi
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredExpenses.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-lg font-medium">Tidak ada pengeluaran</p>
                            <p className="text-sm">Klik tombol "Tambah Pengeluaran" untuk menambah data</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="font-bold">Tanggal</TableHead>
                                        <TableHead className="font-bold">Kategori</TableHead>
                                        <TableHead className="font-bold">Deskripsi</TableHead>
                                        <TableHead className="font-bold">Pembayaran</TableHead>
                                        <TableHead className="text-right font-bold">Jumlah</TableHead>
                                        <TableHead className="text-right font-bold">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.map((expense) => (
                                        <TableRow key={expense.id} className="group hover:bg-muted/20">
                                            <TableCell className="font-medium">
                                                {formatDate(expense.expense_date)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getCategoryColor(expense.category)} border-0`}>
                                                    {expense.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {expense.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {expense.payment_method === 'cash' ? 'Tunai' :
                                                        expense.payment_method === 'transfer' ? 'Transfer' :
                                                            expense.payment_method === 'credit' ? 'Kredit' :
                                                                expense.payment_method === 'debit' ? 'Debit' :
                                                                    expense.payment_method === 'ewallet' ? 'E-Wallet' :
                                                                        expense.payment_method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => openEditDialog(expense)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(expense.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
                                    <TableRow>
                                        <TableCell colSpan={4} className="font-bold">
                                            Total Pengeluaran
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-red-600 text-lg">
                                            {formatCurrency(totalExpenses)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Expenses;
