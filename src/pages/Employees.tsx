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
    UsersRound,
    Mail,
    Phone,
    Briefcase,
    Calendar,
    DollarSign,
    Percent,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Employee {
    id: string;
    name: string;
    position: string;
    email: string;
    phone: string;
    join_date: string;
    salary: number;
    profit_share_percentage: number;
    status: "active" | "inactive";
    notes: string;
    created_at: string;
}

const Employees = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        position: "",
        email: "",
        phone: "",
        join_date: new Date().toISOString().split("T")[0],
        salary: 0,
        profit_share_percentage: 0,
        status: "active" as "active" | "inactive",
        notes: "",
    });

    const statusOptions = ["all", "active", "inactive"];

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/employees");
            setEmployees(response.data);
        } catch (error: any) {
            console.error("Error fetching employees:", error);
            toast.error(error.response?.data?.error || "Gagal mengambil data karyawan");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const filteredEmployees = employees.filter((employee) => {
        const matchesSearch =
            employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.position?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const activeEmployees = employees.filter((e) => e.status === "active").length;
    const totalSalary = employees
        .filter((e) => e.status === "active")
        .reduce((sum, e) => sum + Number(e.salary), 0);
    const avgProfitShare = employees.length > 0
        ? employees.reduce((sum, e) => sum + Number(e.profit_share_percentage), 0) / employees.length
        : 0;

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
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const resetForm = () => {
        setFormData({
            name: "",
            position: "",
            email: "",
            phone: "",
            join_date: new Date().toISOString().split("T")[0],
            salary: 0,
            profit_share_percentage: 0,
            status: "active",
            notes: "",
        });
        setEditingEmployee(null);
    };

    const openEditDialog = (employee: Employee) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name,
            position: employee.position || "",
            email: employee.email || "",
            phone: employee.phone || "",
            join_date: employee.join_date?.split("T")[0] || "",
            salary: Number(employee.salary),
            profit_share_percentage: Number(employee.profit_share_percentage),
            status: employee.status,
            notes: employee.notes || "",
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingEmployee) {
                await api.put(`/employees/${editingEmployee.id}`, formData);
                toast.success("Karyawan berhasil diupdate");
            } else {
                await api.post("/employees", formData);
                toast.success("Karyawan berhasil ditambahkan");
            }

            setIsDialogOpen(false);
            resetForm();
            fetchEmployees();
        } catch (error: any) {
            console.error("Error saving employee:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan karyawan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (employee: Employee) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus karyawan "${employee.name}"?`)) {
            return;
        }

        try {
            await api.delete(`/employees/${employee.id}`);
            toast.success("Karyawan berhasil dihapus");
            fetchEmployees();
        } catch (error: any) {
            console.error("Error deleting employee:", error);
            toast.error(error.response?.data?.error || "Gagal menghapus karyawan");
        }
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Karyawan</h2>
                    <p className="text-muted-foreground">
                        Kelola data karyawan & persentase bagi hasil
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
                        <Button className="bg-gradient-primary hover:opacity-90">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Karyawan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingEmployee ? "Edit Karyawan" : "Tambah Karyawan Baru"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nama Lengkap *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="position">Posisi</Label>
                                    <Input
                                        id="position"
                                        value={formData.position}
                                        onChange={(e) =>
                                            setFormData({ ...formData, position: e.target.value })
                                        }
                                        placeholder="Developer"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="join_date">Tanggal Bergabung</Label>
                                    <Input
                                        id="join_date"
                                        type="date"
                                        value={formData.join_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, join_date: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="phone">No. Telepon</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                        placeholder="08123456789"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="salary">Gaji Pokok (Rp) *</Label>
                                    <Input
                                        id="salary"
                                        type="number"
                                        value={formData.salary}
                                        onChange={(e) =>
                                            setFormData({ ...formData, salary: Number(e.target.value) })
                                        }
                                        placeholder="5000000"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="profit_share">% Bagi Hasil *</Label>
                                    <Input
                                        id="profit_share"
                                        type="number"
                                        step="0.01"
                                        value={formData.profit_share_percentage}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                profit_share_percentage: Number(e.target.value),
                                            })
                                        }
                                        placeholder="10"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: "active" | "inactive") =>
                                        setFormData({ ...formData, status: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Aktif</SelectItem>
                                        <SelectItem value="inactive">Tidak Aktif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="notes">Catatan</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notes: e.target.value })
                                    }
                                    placeholder="Catatan tambahan..."
                                    rows={2}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : editingEmployee ? (
                                    "Update Karyawan"
                                ) : (
                                    "Tambah Karyawan"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                <StatCard
                    title="Total Karyawan"
                    value={employees.length.toString()}
                    icon={UsersRound}
                    iconColor="blue"
                />
                <StatCard
                    title="Karyawan Aktif"
                    value={activeEmployees.toString()}
                    icon={UsersRound}
                    iconColor="green"
                />
                <StatCard
                    title="Total Gaji Pokok"
                    value={formatCurrency(totalSalary)}
                    icon={DollarSign}
                    iconColor="purple"
                />
                <StatCard
                    title="Rata-rata Bagi Hasil"
                    value={`${avgProfitShare.toFixed(1)}%`}
                    icon={Percent}
                    iconColor="orange"
                />
            </div>

            {/* Filters */}
            <Card className="bg-gradient-card border-0 shadow-md">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Cari karyawan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((status) => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter(status)}
                                    className="capitalize"
                                >
                                    {status === "all"
                                        ? "Semua"
                                        : status === "active"
                                            ? "Aktif"
                                            : "Tidak Aktif"}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Employees List */}
            <Card className="bg-gradient-card border-0 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersRound className="w-5 h-5" />
                        Daftar Karyawan ({filteredEmployees.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredEmployees.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <UsersRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Tidak ada karyawan ditemukan.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredEmployees.map((employee) => (
                                <div
                                    key={employee.id}
                                    className="flex items-center justify-between p-4 bg-background rounded-lg border hover:shadow-md transition-all duration-300 hover:scale-[1.01] hover:border-primary/30"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-lg">
                                            {employee.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-semibold text-foreground">
                                                    {employee.name}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        employee.status === "active"
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {employee.status === "active" ? "Aktif" : "Tidak Aktif"}
                                                </Badge>
                                                {employee.position && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Briefcase className="w-3 h-3 mr-1" />
                                                        {employee.position}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                                {employee.email && (
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        <span>{employee.email}</span>
                                                    </div>
                                                )}
                                                {employee.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        <span>{employee.phone}</span>
                                                    </div>
                                                )}
                                                {employee.join_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>Bergabung: {formatDate(employee.join_date)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-primary text-lg">
                                                {formatCurrency(Number(employee.salary))}
                                            </p>
                                            <p className="text-xs text-green-600 font-semibold">
                                                Bagi Hasil: {employee.profit_share_percentage}%
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(employee)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(employee)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Employees;
