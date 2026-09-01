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
    DollarSign,
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    Calculator,
    TrendingUp,
    Wallet,
    ChevronLeft,
    ChevronRight,
    UserCheck
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Employee {
    id: string;
    name: string;
    salary: number;
    profit_share_percentage: number;
}

interface Payroll {
    id: string;
    employee_id: string;
    employee_name: string;
    period_month: number;
    period_year: number;
    base_salary: number;
    bonus: number;
    deduction: number;
    profit_share: number;
    total_payment: number;
    payment_date: string;
    payment_method: string;
    status: "pending" | "paid" | "cancelled";
    notes: string;
    created_at: string;
}

interface ProfitData {
    total_revenue: number;
    net_profit_from_costs: number;
    total_expenses: number;
    final_net_profit: number;
    period: string;
}

const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const Payrolls = () => {
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profitData, setProfitData] = useState<ProfitData | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [formData, setFormData] = useState({
        employee_id: "",
        period_month: currentMonth,
        period_year: currentYear,
        base_salary: 0,
        bonus: 0,
        deduction: 0,
        profit_share: 0,
        payment_date: "",
        payment_method: "transfer",
        status: "pending" as "pending" | "paid" | "cancelled",
        notes: "",
    });

    const statusOptions = ["all", "pending", "paid", "cancelled"];

    useEffect(() => {
        fetchPayrolls();
        fetchEmployees();
    }, []);

    const fetchPayrolls = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/payrolls");
            setPayrolls(response.data);
        } catch (error: any) {
            console.error("Error fetching payrolls:", error);
            toast.error(error.response?.data?.error || "Gagal mengambil data payroll");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get("/employees");
            setEmployees(response.data);
        } catch (error: any) {
            console.error("Error fetching employees:", error);
        }
    };

    const calculateProfit = async () => {
        setIsCalculating(true);
        try {
            const response = await api.get("/payrolls/calculate-profit", {
                params: {
                    month: formData.period_month,
                    year: formData.period_year,
                },
            });
            setProfitData(response.data);

            if (formData.employee_id) {
                const emp = employees.find((e) => e.id === formData.employee_id);
                if (emp && emp.profit_share_percentage > 0) {
                    const netProfit = response.data.final_net_profit;
                    const calculatedShare = Math.max(
                        0,
                        (netProfit * emp.profit_share_percentage) / 100
                    );
                    setFormData((prev) => ({
                        ...prev,
                        profit_share: Math.round(calculatedShare),
                    }));
                }
            }
        } catch (error: any) {
            console.error("Error calculating profit:", error);
            toast.error(error.response?.data?.error || "Gagal menghitung laba");
        } finally {
            setIsCalculating(false);
        }
    };

    const resetForm = () => {
        setFormData({
            employee_id: "",
            period_month: currentMonth,
            period_year: currentYear,
            base_salary: 0,
            bonus: 0,
            deduction: 0,
            profit_share: 0,
            payment_date: "",
            payment_method: "transfer",
            status: "pending",
            notes: "",
        });
        setEditingPayroll(null);
        setProfitData(null);
    };

    const handleEmployeeChange = (employeeId: string) => {
        const emp = employees.find((e) => e.id === employeeId);
        if (emp) {
            let calculatedShare = 0;
            if (profitData && emp.profit_share_percentage > 0) {
                const netProfit = profitData.final_net_profit;
                calculatedShare = Math.round(Math.max(0, (netProfit * emp.profit_share_percentage) / 100));
            }

            setFormData((prev) => ({
                ...prev,
                employee_id: employeeId,
                base_salary: emp.salary || 0,
                profit_share: calculatedShare,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employee_id) {
            toast.error("Pilih karyawan terlebih dahulu");
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingPayroll) {
                await api.put(`/payrolls/${editingPayroll.id}`, formData);
                toast.success("Payroll berhasil diperbarui");
            } else {
                await api.post("/payrolls", formData);
                toast.success("Payroll berhasil dibuat");
            }
            setIsDialogOpen(false);
            resetForm();
            fetchPayrolls();
        } catch (error: any) {
            console.error("Error saving payroll:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan payroll");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (payroll: Payroll) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus payroll ${payroll.employee_name}?`)) return;

        try {
            await api.delete(`/payrolls/${payroll.id}`);
            toast.success("Payroll berhasil dihapus");
            fetchPayrolls();
        } catch (error: any) {
            console.error("Error deleting payroll:", error);
            toast.error(error.response?.data?.error || "Gagal menghapus payroll");
        }
    };

    const openEditDialog = (payroll: Payroll) => {
        setEditingPayroll(payroll);
        setFormData({
            employee_id: payroll.employee_id,
            period_month: payroll.period_month,
            period_year: payroll.period_year,
            base_salary: payroll.base_salary,
            bonus: payroll.bonus,
            deduction: payroll.deduction,
            profit_share: payroll.profit_share,
            payment_date: payroll.payment_date ? payroll.payment_date.split("T")[0] : "",
            payment_method: payroll.payment_method,
            status: payroll.status,
            notes: payroll.notes || "",
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
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 text-[10px] px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Lunas
                    </Badge>
                );
            case "pending":
                return (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 text-[10px] px-2 py-0.5">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge variant="outline" className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 text-[10px] px-2 py-0.5">
                        <XCircle className="w-3 h-3 mr-1" />
                        Batal
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Filter logic
    const filteredPayrolls = payrolls.filter((payroll) => {
        const matchesSearch = payroll.employee_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Calculations
    const totalPages = Math.ceil(filteredPayrolls.length / itemsPerPage) || 1;
    const paginatedPayrolls = filteredPayrolls.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Summary calculations
    const totalPayments = filteredPayrolls.reduce((sum, item) => sum + Number(item.total_payment), 0);
    const paidPayments = filteredPayrolls.filter((p) => p.status === "paid").reduce((sum, item) => sum + Number(item.total_payment), 0);
    const pendingPayments = filteredPayrolls.filter((p) => p.status === "pending").reduce((sum, item) => sum + Number(item.total_payment), 0);
    const paidCount = filteredPayrolls.filter((p) => p.status === "paid").length;

    const totalPayment =
        formData.base_salary +
        formData.profit_share +
        formData.bonus -
        formData.deduction;

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
                        <Wallet className="w-5 h-5 text-primary" />
                        Penggajian Karyawan & Bagi Hasil
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Kelola slip gaji bulanan, kalkulasi bagi hasil laba, bonus, dan histori pembayaran.
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
                            Buat Payroll Gaji
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingPayroll ? "Edit Payroll Gaji" : "Buat Slip Gaji Baru"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="period_month">Bulan Periode</Label>
                                    <Select
                                        value={formData.period_month.toString()}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, period_month: Number(value) })
                                        }
                                        disabled={!!editingPayroll}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map((month, index) => (
                                                <SelectItem key={index + 1} value={(index + 1).toString()}>
                                                    {month}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="period_year">Tahun Periode</Label>
                                    <Input
                                        id="period_year"
                                        type="number"
                                        value={formData.period_year}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                period_year: Number(e.target.value),
                                            })
                                        }
                                        disabled={!!editingPayroll}
                                        required
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            {!editingPayroll && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={calculateProfit}
                                    disabled={isCalculating}
                                >
                                    {isCalculating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menghitung...
                                        </>
                                    ) : (
                                        <>
                                            <Calculator className="mr-2 h-4 w-4" />
                                            Kalkulasi Bagi Hasil Periode Ini
                                        </>
                                    )}
                                </Button>
                            )}

                            {profitData && (
                                <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 border text-xs">
                                    <h4 className="font-semibold text-foreground">Ringkasan Laba Bersih ({months[formData.period_month - 1]} {formData.period_year}):</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>Total Omset: <strong>{formatCurrency(profitData.total_revenue)}</strong></div>
                                        <div>Laba Bersih Final: <strong className="text-emerald-600">{formatCurrency(profitData.final_net_profit)}</strong></div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="employee">Pilih Karyawan *</Label>
                                <Select
                                    value={formData.employee_id}
                                    onValueChange={handleEmployeeChange}
                                    disabled={!!editingPayroll}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Pilih nama karyawan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id}>
                                                {employee.name} (Bagi Hasil: {employee.profit_share_percentage}%)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="base_salary">Gaji Pokok (Rp)</Label>
                                    <Input
                                        id="base_salary"
                                        type="number"
                                        value={formData.base_salary || ""}
                                        onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                                        required
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="profit_share">Bagi Hasil (Rp)</Label>
                                    <Input
                                        id="profit_share"
                                        type="number"
                                        value={formData.profit_share || ""}
                                        onChange={(e) => setFormData({ ...formData, profit_share: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="bonus">Bonus (Rp)</Label>
                                    <Input
                                        id="bonus"
                                        type="number"
                                        value={formData.bonus || ""}
                                        onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="deduction">Potongan (Rp)</Label>
                                    <Input
                                        id="deduction"
                                        type="number"
                                        value={formData.deduction || ""}
                                        onChange={(e) => setFormData({ ...formData, deduction: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-primary/10 rounded-xl flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">Total Penerimaan Gaji:</span>
                                <span className="text-lg font-bold text-primary">{formatCurrency(totalPayment)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="payment_date">Tanggal Bayar</Label>
                                    <Input
                                        id="payment_date"
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="status">Status Pembayaran</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value: "pending" | "paid" | "cancelled") =>
                                            setFormData({ ...formData, status: value })
                                        }
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="paid">Lunas / Dibayar</SelectItem>
                                            <SelectItem value="cancelled">Batal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes">Catatan Slip Gaji</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Catatan tunjangan atau pengabsenan..."
                                    rows={2}
                                    className="mt-1"
                                />
                            </div>

                            <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : editingPayroll ? (
                                    "Update Payroll"
                                ) : (
                                    "Simpan Payroll"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Dibayar" value={formatCurrency(paidPayments)} icon={CheckCircle2} iconColor="green" />
                <StatCard title="Pending Pembayaran" value={formatCurrency(pendingPayments)} icon={Clock} iconColor="yellow" />
                <StatCard title="Payroll Lunas" value={`${paidCount} Slip`} icon={CheckCircle2} iconColor="blue" />
                <StatCard title="Total Anggaran Gaji" value={formatCurrency(totalPayments)} icon={Wallet} iconColor="purple" />
            </div>

            {/* DataTable Section */}
            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        Daftar Slip Payroll ({filteredPayrolls.length})
                    </CardTitle>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Cari nama karyawan..."
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
                    {paginatedPayrolls.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Tidak ada data payroll ditemukan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                                    <tr>
                                        <th className="py-3 px-4">Periode</th>
                                        <th className="py-3 px-4">Nama Karyawan</th>
                                        <th className="py-3 px-4">Rincian Komponen Gaji</th>
                                        <th className="py-3 px-4 text-right">Total Penerimaan</th>
                                        <th className="py-3 px-4 text-center">Tgl Bayar & Metode</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginatedPayrolls.map((payroll) => (
                                        <tr key={payroll.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    {months[payroll.period_month - 1]} {payroll.period_year}
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 px-4">
                                                <div className="font-semibold text-foreground text-sm truncate max-w-[180px]" title={payroll.employee_name}>
                                                    {payroll.employee_name}
                                                </div>
                                                {payroll.notes && (
                                                    <span className="text-[10px] text-muted-foreground block truncate max-w-[180px]">
                                                        {payroll.notes}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 whitespace-nowrap text-[11px]">
                                                <div>Pokok: {formatCurrency(payroll.base_salary)}</div>
                                                {payroll.profit_share > 0 && <div className="text-emerald-600 font-medium">Bagi Hasil: +{formatCurrency(payroll.profit_share)}</div>}
                                                {payroll.bonus > 0 && <div className="text-blue-600 font-medium">Bonus: +{formatCurrency(payroll.bonus)}</div>}
                                                {payroll.deduction > 0 && <div className="text-rose-600 font-medium">Potongan: -{formatCurrency(payroll.deduction)}</div>}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-bold text-primary text-sm whitespace-nowrap">
                                                {formatCurrency(Number(payroll.total_payment))}
                                            </td>
                                            <td className="py-2.5 px-4 text-center whitespace-nowrap text-muted-foreground">
                                                <div className="font-mono text-[11px]">{formatDate(payroll.payment_date)}</div>
                                                <div className="text-[10px] capitalize">{payroll.payment_method}</div>
                                            </td>
                                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                {getStatusBadge(payroll.status)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                                        onClick={() => openEditDialog(payroll)}
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                                        onClick={() => handleDelete(payroll)}
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
                    {filteredPayrolls.length > 0 && (
                        <div className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div>
                                Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredPayrolls.length)}</strong> dari <strong>{filteredPayrolls.length}</strong> payroll
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

export default Payrolls;
