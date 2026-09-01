import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Edit,
    Trash2,
    Loader2,
    Receipt,
    Wallet,
    TrendingUp,
    DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface IncomeCost {
    id: string;
    income_id: string;
    item_name: string;
    description: string;
    amount: number;
    category: string;
    created_at: string;
}

interface Income {
    id: string;
    project_name: string;
    amount: number;
    total_cost?: number;
    net_profit?: number;
}

interface CostManagementDialogProps {
    income: Income | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const costCategories = [
    { value: "hosting", label: "Hosting" },
    { value: "domain", label: "Domain" },
    { value: "license", label: "Lisensi Software/Tools" },
    { value: "design", label: "Design/Asset" },
    { value: "development", label: "Development Tools" },
    { value: "marketing", label: "Marketing" },
    { value: "outsource", label: "Outsource/Freelancer" },
    { value: "other", label: "Lainnya" },
];

export function CostManagementDialog({
    income,
    isOpen,
    onClose,
    onUpdate,
}: CostManagementDialogProps) {
    const [costs, setCosts] = useState<IncomeCost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<IncomeCost | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        item_name: "",
        description: "",
        amount: 0,
        category: "other",
    });

    useEffect(() => {
        if (income && isOpen) {
            fetchCosts();
        }
    }, [income, isOpen]);

    const fetchCosts = async () => {
        if (!income) return;
        setIsLoading(true);
        try {
            const response = await api.get(`/incomes/${income.id}/costs`);
            setCosts(response.data);
        } catch (error: any) {
            console.error("Error fetching costs:", error);
            toast.error(error.response?.data?.error || "Gagal mengambil data biaya");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            item_name: "",
            description: "",
            amount: 0,
            category: "other",
        });
        setEditingCost(null);
    };

    const openEditForm = (cost: IncomeCost) => {
        setEditingCost(cost);
        setFormData({
            item_name: cost.item_name,
            description: cost.description || "",
            amount: Number(cost.amount),
            category: cost.category,
        });
        setIsFormOpen(true);
    };

    const handleSubmitCost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!income) return;

        setIsSubmitting(true);
        try {
            if (editingCost) {
                await api.put(`/incomes/${income.id}/costs/${editingCost.id}`, formData);
                toast.success("Biaya berhasil diupdate");
            } else {
                await api.post(`/incomes/${income.id}/costs`, formData);
                toast.success("Biaya berhasil ditambahkan");
            }

            setIsFormOpen(false);
            resetForm();
            fetchCosts();
            onUpdate(); // Refresh parent data
        } catch (error: any) {
            console.error("Error saving cost:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan biaya");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCost = async (cost: IncomeCost) => {
        if (!income) return;
        if (!confirm(`Hapus biaya "${cost.item_name}"?`)) return;

        try {
            await api.delete(`/incomes/${income.id}/costs/${cost.id}`);
            toast.success("Biaya berhasil dihapus");
            fetchCosts();
            onUpdate(); // Refresh parent data
        } catch (error: any) {
            console.error("Error deleting cost:", error);
            toast.error(error.response?.data?.error || "Gagal menghapus biaya");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const netProfit = (income?.amount || 0) - totalCosts;

    if (!income) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Rincian Modal & Biaya - {income.project_name}
                    </DialogTitle>
                </DialogHeader>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-muted-foreground">Pendapatan</span>
                        </div>
                        <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(income.amount)}
                        </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-muted-foreground">Total Biaya</span>
                        </div>
                        <p className="text-lg font-bold text-red-600">
                            {formatCurrency(totalCosts)}
                        </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className={`w-4 h-4 ${netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
                            <span className="text-xs text-muted-foreground">Laba Bersih</span>
                        </div>
                        <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {formatCurrency(netProfit)}
                        </p>
                    </div>
                </div>

                {/* Add Cost Button */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Daftar Biaya ({costs.length})</h3>
                    <Button
                        size="sm"
                        onClick={() => {
                            resetForm();
                            setIsFormOpen(true);
                        }}
                        className="bg-gradient-primary"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Biaya
                    </Button>
                </div>

                {/* Cost Form */}
                {isFormOpen && (
                    <form onSubmit={handleSubmitCost} className="space-y-4 p-4 bg-muted/50 rounded-lg mb-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="item_name">Nama Item</Label>
                                <Input
                                    id="item_name"
                                    value={formData.item_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, item_name: e.target.value })
                                    }
                                    placeholder="Hosting VPS"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="amount">Jumlah (Rp)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({ ...formData, amount: Number(e.target.value) })
                                    }
                                    placeholder="500000"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="category">Kategori</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, category: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {costCategories.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="description">Deskripsi (Opsional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Detail biaya..."
                                rows={2}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSubmitting} className="flex-1">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : editingCost ? (
                                    "Update Biaya"
                                ) : (
                                    "Tambah Biaya"
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsFormOpen(false);
                                    resetForm();
                                }}
                            >
                                Batal
                            </Button>
                        </div>
                    </form>
                )}

                {/* Costs List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : costs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada biaya ditambahkan.</p>
                        <p className="text-sm">Klik "Tambah Biaya" untuk mulai mencatat modal kerja.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {costs.map((cost) => (
                            <div
                                key={cost.id}
                                className="flex items-center justify-between p-3 bg-background rounded-lg border hover:shadow-sm transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium">{cost.item_name}</h4>
                                        <Badge variant="outline" className="text-xs">
                                            {costCategories.find((c) => c.value === cost.category)?.label || cost.category}
                                        </Badge>
                                    </div>
                                    {cost.description && (
                                        <p className="text-xs text-muted-foreground">{cost.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-bold text-red-600">
                                        {formatCurrency(Number(cost.amount))}
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditForm(cost)}
                                        >
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteCost(cost)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
