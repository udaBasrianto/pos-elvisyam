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
import { StatCard } from "@/components/ui/kpi-card";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Briefcase,
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock,
    XCircle,
    Building2,
    Code,
    Smartphone,
    Globe,
    Palette,
    Server,
    FileText,
    Receipt,
    Wallet,
    TrendingUp,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { CostManagementDialog } from "@/components/CostManagementDialog";

interface Income {
    id: string;
    client_name: string;
    project_name: string;
    category: string;
    description: string;
    amount: number;
    total_cost?: number;
    net_profit?: number;
    status: "pending" | "paid" | "cancelled";
    payment_method: string;
    income_date: string;
    due_date: string | null;
    paid_date: string | null;
    notes: string;
    created_at: string;
}

const incomeCategories = [
    { value: "website", label: "Jasa Website", icon: Globe },
    { value: "mobile-app", label: "Jasa Mobile App", icon: Smartphone },
    { value: "desktop-app", label: "Jasa Desktop App", icon: Code },
    { value: "ui-ux", label: "Jasa UI/UX Design", icon: Palette },
    { value: "server", label: "Jasa Server/Hosting", icon: Server },
    { value: "maintenance", label: "Jasa Maintenance", icon: FileText },
    { value: "consulting", label: "Jasa Konsultasi", icon: Briefcase },
    { value: "other", label: "Lainnya", icon: FileText },
];

const Incomes = () => {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Cost management state
    const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
    const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        client_name: "",
        project_name: "",
        category: "website",
        description: "",
        amount: 0,
        status: "pending" as "pending" | "paid" | "cancelled",
        payment_method: "transfer",
        income_date: new Date().toISOString().split("T")[0],
        due_date: "",
        notes: "",
    });

    const statusOptions = ["all", "pending", "paid", "cancelled"];

    useEffect(() => {
        fetchIncomes();
    }, []);

    const fetchIncomes = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/incomes");
            setIncomes(response.data);
        } catch (error: any) {
            console.error("Error fetching incomes:", error);
            toast.error(error.response?.data?.error || "Gagal mengambil data pendapatan");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            client_name: "",
            project_name: "",
            category: "website",
            description: "",
            amount: 0,
            status: "pending",
            payment_method: "transfer",
            income_date: new Date().toISOString().split("T")[0],
            due_date: "",
            notes: "",
        });
        setEditingIncome(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingIncome) {
                await api.put(`/incomes/${editingIncome.id}`, formData);
                toast.success("Pendapatan berhasil diperbarui");
            } else {
                await api.post("/incomes", formData);
                toast.success("Pendapatan berhasil ditambahkan");
            }
            setIsDialogOpen(false);
            resetForm();
            fetchIncomes();
        } catch (error: any) {
            console.error("Error saving income:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan data");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (income: Income) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus proyek "${income.project_name}"?`)) return;

        try {
            await api.delete(`/incomes/${income.id}`);
            toast.success("Pendapatan berhasil dihapus");
            fetchIncomes();
        } catch (error: any) {
            console.error("Error deleting income:", error);
            toast.error(error.response?.data?.error || "Gagal menghapus data");
        }
    };

    const openEditDialog = (income: Income) => {
        setEditingIncome(income);
        setFormData({
            client_name: income.client_name,
            project_name: income.project_name,
            category: income.category,
            description: income.description || "",
            amount: income.amount,
            status: income.status,
            payment_method: income.payment_method,
            income_date: income.income_date ? income.income_date.split("T")[0] : "",
            due_date: income.due_date ? income.due_date.split("T")[0] : "",
            notes: income.notes || "",
        });
        setIsDialogOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "paid":
                return (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 text-[11px] px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Lunas
                    </Badge>
                );
            case "pending":
                return (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 text-[11px] px-2 py-0.5">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge variant="outline" className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 text-[11px] px-2 py-0.5">
                        <XCircle className="w-3 h-3 mr-1" />
                        Batal
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getCategoryLabel = (categoryValue: string) => {
        const cat = incomeCategories.find((c) => c.value === categoryValue);
        return cat ? cat.label : categoryValue;
    };

    // Filter logic
    const filteredIncomes = incomes.filter((income) => {
        const matchesSearch =
            income.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            income.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (income.description && income.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "all" || income.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || income.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    // Pagination Calculations
    const totalPages = Math.ceil(filteredIncomes.length / itemsPerPage) || 1;
    const paginatedIncomes = filteredIncomes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Summary calculations
    const totalAmount = filteredIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const paidAmount = filteredIncomes.filter((i) => i.status === "paid").reduce((sum, item) => sum + Number(item.amount), 0);
    const pendingAmount = filteredIncomes.filter((i) => i.status === "pending").reduce((sum, item) => sum + Number(item.amount), 0);
    const paidCount = filteredIncomes.filter((i) => i.status === "paid").length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Pemasukan & Invoicing Proyek
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Kelola pendapatan luar transaksi kasir, invoice jasa, biaya proyek, dan status pembayaran.
                    </p>
                </div>
                <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-primary hover:opacity-90 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Pendapatan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingIncome ? "Edit Pendapatan / Proyek" : "Tambah Pendapatan Baru"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="client_name">Nama Klien / Instansi</Label>
                                    <Input
                                        id="client_name"
                                        value={formData.client_name}
                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                        placeholder="PT Digital Nusantara"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="project_name">Nama Proyek / Layanan</Label>
                                    <Input
                                        id="project_name"
                                        value={formData.project_name}
                                        onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                        placeholder="Pembuatan App POS"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="category">Kategori Proyek</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {incomeCategories.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="amount">Nilai Pendapatan (Rp)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        value={formData.amount || ""}
                                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                        placeholder="5000000"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="status">Status Pembayaran</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value: "pending" | "paid" | "cancelled") =>
                                            setFormData({ ...formData, status: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="paid">Lunas</SelectItem>
                                            <SelectItem value="cancelled">Batal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="payment_method">Metode Bayar</Label>
                                    <Select
                                        value={formData.payment_method}
                                        onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="transfer">Transfer Bank</SelectItem>
                                            <SelectItem value="cash">Tunai / Cash</SelectItem>
                                            <SelectItem value="ewallet">E-Wallet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="income_date">Tanggal Pendapatan</Label>
                                    <Input
                                        id="income_date"
                                        type="date"
                                        value={formData.income_date}
                                        onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Jatuh Tempo (Opsional)</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Deskripsi Proyek</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Rincian scope proyek..."
                                    rows={2}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : editingIncome ? (
                                    "Update Pendapatan"
                                ) : (
                                    "Tambah Pendapatan"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Pendapatan" value={formatCurrency(totalAmount)} icon={DollarSign} iconColor="blue" />
                <StatCard title="Sudah Lunas" value={formatCurrency(paidAmount)} icon={CheckCircle2} iconColor="green" />
                <StatCard title="Pending / Piutang" value={formatCurrency(pendingAmount)} icon={Clock} iconColor="yellow" />
                <StatCard title="Proyek Lunas" value={`${paidCount} Proyek`} icon={Briefcase} iconColor="purple" />
            </div>

            {/* DataTable Section */}
            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Daftar Pemasukan Proyek ({filteredIncomes.length})
                    </CardTitle>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Cari klien / nama proyek..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                            {statusOptions.map((status) => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter(status);
                                        setCurrentPage(1);
                                    }}
                                    className="h-9 text-xs capitalize"
                                >
                                    {status === "all" ? "Semua Status" : status === "paid" ? "Lunas" : status === "pending" ? "Pending" : "Batal"}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {paginatedIncomes.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Tidak ada data pendapatan ditemukan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                                    <tr>
                                        <th className="py-3 px-4">Tanggal</th>
                                        <th className="py-3 px-4">Nama Proyek & Klien</th>
                                        <th className="py-3 px-4">Kategori & Metode</th>
                                        <th className="py-3 px-4 text-right">Nilai Proyek</th>
                                        <th className="py-3 px-4 text-right">Biaya & Laba</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginatedIncomes.map((income) => (
                                        <tr key={income.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                                    {formatDate(income.income_date)}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-4">
                                                <div className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={income.project_name}>
                                                    {income.project_name}
                                                </div>
                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                    <Building2 className="w-3 h-3 shrink-0 text-primary" />
                                                    <span className="truncate">{income.client_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                <Badge variant="outline" className="text-[10px] mb-0.5">
                                                    {getCategoryLabel(income.category)}
                                                </Badge>
                                                <div className="text-[10px] text-muted-foreground capitalize">
                                                    {income.payment_method}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-bold text-primary text-sm whitespace-nowrap">
                                                {formatCurrency(Number(income.amount))}
                                            </td>
                                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                                {income.total_cost && income.total_cost > 0 ? (
                                                    <div>
                                                        <span className="text-[10px] text-rose-600 block">
                                                            Biaya: {formatCurrency(Number(income.total_cost))}
                                                        </span>
                                                        <span className={`font-semibold text-xs ${(income.net_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                                                            Laba: {formatCurrency(Number(income.net_profit || 0))}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-[11px]">-</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                {getStatusBadge(income.status)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                                        onClick={() => {
                                                            setSelectedIncome(income);
                                                            setIsCostDialogOpen(true);
                                                        }}
                                                        title="Rincian Biaya Proyek"
                                                    >
                                                        <Receipt className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                                        onClick={() => openEditDialog(income)}
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                        onClick={() => handleDelete(income)}
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
                    {filteredIncomes.length > 0 && (
                        <div className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div>
                                Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredIncomes.length)}</strong> dari <strong>{filteredIncomes.length}</strong> data pendapatan
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

            {/* Cost Management Dialog */}
            <CostManagementDialog
                income={selectedIncome}
                isOpen={isCostDialogOpen}
                onClose={() => {
                    setIsCostDialogOpen(false);
                    setSelectedIncome(null);
                }}
                onUpdate={fetchIncomes}
            />
        </div>
    );
};

export default Incomes;
