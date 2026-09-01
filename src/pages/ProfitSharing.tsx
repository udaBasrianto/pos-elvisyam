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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/ui/kpi-card";
import {
    Plus,
    Loader2,
    TrendingUp,
    Calendar,
    CheckCircle2,
    XCircle,
    Calculator,
    Settings as SettingsIcon,
    Store,
    User,
    Users,
    Trash2,
    Download,
    FileText,
    FileSpreadsheet,
    Share2,
    Mail,
    MessageCircle,
    Printer,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface ProfitSettings {
    id: string;
    owner_percentage: number;
    manager_percentage: number;
    store_percentage: number;
    owner_name: string;
    manager_name: string;
}

interface ProfitCalculation {
    total_revenue: number;
    total_costs: number;
    total_expenses: number;
    net_profit: number;
    owner_percentage: number;
    manager_percentage: number;
    store_percentage: number;
    owner_share: number;
    manager_share: number;
    store_share: number;
    period: string;
}

interface ProfitDistribution {
    id: string;
    period_month: number;
    period_year: number;
    total_revenue: number;
    total_costs: number;
    total_expenses: number;
    net_profit: number;
    owner_percentage: number;
    manager_percentage: number;
    store_percentage: number;
    owner_share: number;
    manager_share: number;
    store_share: number;
    owner_paid: boolean;
    manager_paid: boolean;
    owner_paid_date: string;
    manager_paid_date: string;
    notes: string;
    created_at: string;
}

const ProfitSharing = () => {
    const [distributions, setDistributions] = useState<ProfitDistribution[]>([]);
    const [settings, setSettings] = useState<ProfitSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [calculation, setCalculation] = useState<ProfitCalculation | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [formData, setFormData] = useState({
        period_month: currentMonth,
        period_year: currentYear,
        notes: "",
    });

    const [settingsForm, setSettingsForm] = useState({
        owner_percentage: 40,
        manager_percentage: 30,
        store_percentage: 30,
        owner_name: "Owner",
        manager_name: "Pengelola",
    });

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    const fetchDistributions = async () => {
        try {
            const response = await api.get("/profit-sharing/distributions");
            setDistributions(response.data || []);
        } catch (error: any) {
            console.error("Error fetching distributions:", error);
            setDistributions([]);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get("/profit-sharing/settings");
            if (response.data) {
                setSettings(response.data);
                setSettingsForm({
                    owner_percentage: Number(response.data.owner_percentage) || 40,
                    manager_percentage: Number(response.data.manager_percentage) || 30,
                    store_percentage: Number(response.data.store_percentage) || 30,
                    owner_name: response.data.owner_name || "Owner",
                    manager_name: response.data.manager_name || "Pengelola",
                });
            }
        } catch (error: any) {
            console.error("Error fetching settings:", error);
            setSettings({
                id: "default",
                owner_percentage: 40,
                manager_percentage: 30,
                store_percentage: 30,
                owner_name: "Owner",
                manager_name: "Pengelola",
            });
        }
    };

    const calculateProfit = async () => {
        setIsCalculating(true);
        try {
            const response = await api.get("/profit-sharing/calculate", {
                params: {
                    period_month: formData.period_month,
                    period_year: formData.period_year,
                },
            });
            setCalculation(response.data);
            toast.success("Laba bersih berhasil dihitung!");
        } catch (error: any) {
            console.error("Error calculating profit:", error);
            toast.error(error.response?.data?.error || "Gagal menghitung laba bersih");
        } finally {
            setIsCalculating(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                await Promise.all([fetchDistributions(), fetchSettings()]);
            } catch (err) {
                console.error("Error loading data:", err);
                setError("Gagal memuat data");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const totalPaidOwner = distributions
        .filter((d) => d.owner_paid)
        .reduce((sum, d) => sum + Number(d.owner_share || 0), 0);
    const totalPaidManager = distributions
        .filter((d) => d.manager_paid)
        .reduce((sum, d) => sum + Number(d.manager_share || 0), 0);
    const totalStoreReinvest = distributions.reduce(
        (sum, d) => sum + Number(d.store_share || 0),
        0
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatCurrencyPlain = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    // Export to PDF
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("LAPORAN BAGI HASIL", pageWidth / 2, 20, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, pageWidth / 2, 28, { align: "center" });

            // Summary Section
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Ringkasan:", 14, 40);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Total ${settings?.owner_name || "Owner"}: Rp ${formatCurrencyPlain(totalPaidOwner)}`, 14, 48);
            doc.text(`Total ${settings?.manager_name || "Pengelola"}: Rp ${formatCurrencyPlain(totalPaidManager)}`, 14, 55);
            doc.text(`Total Reinvestasi Toko: Rp ${formatCurrencyPlain(totalStoreReinvest)}`, 14, 62);
            doc.text(`Total Distribusi: ${distributions.length}`, 14, 69);

            // Table
            const tableData = distributions.map((dist) => [
                `${months[dist.period_month - 1]} ${dist.period_year}`,
                `Rp ${formatCurrencyPlain(dist.total_revenue)}`,
                `Rp ${formatCurrencyPlain(dist.net_profit)}`,
                `Rp ${formatCurrencyPlain(dist.owner_share)} (${dist.owner_percentage}%)`,
                `Rp ${formatCurrencyPlain(dist.manager_share)} (${dist.manager_percentage}%)`,
                `Rp ${formatCurrencyPlain(dist.store_share)} (${dist.store_percentage}%)`,
                dist.owner_paid ? "✓" : "✗",
                dist.manager_paid ? "✓" : "✗",
            ]);

            autoTable(doc, {
                startY: 80,
                head: [[
                    "Periode",
                    "Pendapatan",
                    "Laba Bersih",
                    settings?.owner_name || "Owner",
                    settings?.manager_name || "Pengelola",
                    "Toko",
                    "Bayar Owner",
                    "Bayar Pengelola"
                ]],
                body: tableData,
                headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 15 },
                    7: { cellWidth: 20 },
                },
            });

            // Footer
            const finalY = (doc as any).lastAutoTable.finalY || 150;
            doc.setFontSize(8);
            doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, finalY + 15);

            doc.save(`Laporan_Bagi_Hasil_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success("PDF berhasil di-export!");
        } catch (error) {
            console.error("Export PDF error:", error);
            toast.error("Gagal export PDF");
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        try {
            const worksheetData = [
                ["LAPORAN BAGI HASIL"],
                [`Tanggal: ${new Date().toLocaleDateString("id-ID")}`],
                [],
                ["Ringkasan:"],
                [`Total ${settings?.owner_name || "Owner"}`, formatCurrencyPlain(totalPaidOwner)],
                [`Total ${settings?.manager_name || "Pengelola"}`, formatCurrencyPlain(totalPaidManager)],
                ["Total Reinvestasi Toko", formatCurrencyPlain(totalStoreReinvest)],
                ["Total Distribusi", distributions.length],
                [],
                [
                    "Periode",
                    "Pendapatan",
                    "Biaya Modal",
                    "Pengeluaran",
                    "Laba Bersih",
                    `${settings?.owner_name || "Owner"} (%)`,
                    `${settings?.owner_name || "Owner"} (Rp)`,
                    `${settings?.manager_name || "Pengelola"} (%)`,
                    `${settings?.manager_name || "Pengelola"} (Rp)`,
                    "Toko (%)",
                    "Toko (Rp)",
                    "Owner Dibayar",
                    "Pengelola Dibayar"
                ],
                ...distributions.map((dist) => [
                    `${months[dist.period_month - 1]} ${dist.period_year}`,
                    dist.total_revenue,
                    dist.total_costs,
                    dist.total_expenses,
                    dist.net_profit,
                    `${dist.owner_percentage}%`,
                    dist.owner_share,
                    `${dist.manager_percentage}%`,
                    dist.manager_share,
                    `${dist.store_percentage}%`,
                    dist.store_share,
                    dist.owner_paid ? "Ya" : "Tidak",
                    dist.manager_paid ? "Ya" : "Tidak"
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Bagi Hasil");

            // Style header
            worksheet["!cols"] = [
                { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
                { wch: 15 }, { wch: 12 }, { wch: 15 }
            ];

            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(data, `Laporan_Bagi_Hasil_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Excel berhasil di-export!");
        } catch (error) {
            console.error("Export Excel error:", error);
            toast.error("Gagal export Excel");
        }
    };

    // Generate report text for sharing
    const generateReportText = () => {
        // Calculate totals from all distributions
        const totalOmset = distributions.reduce((sum, d) => sum + Number(d.total_revenue || 0), 0);
        const totalModal = distributions.reduce((sum, d) => sum + Number(d.total_costs || 0), 0);
        const totalPengeluaran = distributions.reduce((sum, d) => sum + Number(d.total_expenses || 0), 0);
        const totalLabaBersih = distributions.reduce((sum, d) => sum + Number(d.net_profit || 0), 0);

        let text = ``;
        text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📊 *LAPORAN BAGI HASIL*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📅 ${new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

        text += `💰 *RINGKASAN KEUANGAN*\n`;
        text += `┌──────────────────────┐\n`;
        text += `│ Total Omset:\n`;
        text += `│ Rp ${formatCurrencyPlain(totalOmset)}\n`;
        text += `├──────────────────────┤\n`;
        text += `│ Total Modal:\n`;
        text += `│ Rp ${formatCurrencyPlain(totalModal)}\n`;
        text += `├──────────────────────┤\n`;
        text += `│ Total Pengeluaran:\n`;
        text += `│ Rp ${formatCurrencyPlain(totalPengeluaran)}\n`;
        text += `├──────────────────────┤\n`;
        text += `│ *Laba Bersih:*\n`;
        text += `│ *Rp ${formatCurrencyPlain(totalLabaBersih)}*\n`;
        text += `└──────────────────────┘\n\n`;

        text += `📊 *PEMBAGIAN LABA*\n`;
        text += `┌──────────────────────┐\n`;
        text += `│ ${settings?.owner_name || "Owner"}:\n`;
        text += `│ Rp ${formatCurrencyPlain(totalPaidOwner)}\n`;
        text += `├──────────────────────┤\n`;
        text += `│ ${settings?.manager_name || "Pengelola"}:\n`;
        text += `│ Rp ${formatCurrencyPlain(totalPaidManager)}\n`;
        text += `├──────────────────────┤\n`;
        text += `│ Reinvestasi Toko:\n`;
        text += `│ Rp ${formatCurrencyPlain(totalStoreReinvest)}\n`;
        text += `└──────────────────────┘\n\n`;

        text += `📈 Total: ${distributions.length} periode\n\n`;

        if (distributions.length > 0) {
            text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `📋 *DETAIL PER PERIODE*\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            distributions.slice(0, 5).forEach((dist, index) => {
                text += `🗓 *${months[dist.period_month - 1]} ${dist.period_year}*\n`;
                text += `┌──────────────────────┐\n`;
                text += `│ 📥 Pemasukan:\n`;
                text += `│    Rp ${formatCurrencyPlain(dist.total_revenue)}\n`;
                text += `│ 💵 Modal:\n`;
                text += `│    Rp ${formatCurrencyPlain(dist.total_costs)}\n`;
                text += `│ 📤 Pengeluaran:\n`;
                text += `│    Rp ${formatCurrencyPlain(dist.total_expenses)}\n`;
                text += `│ ✅ *Laba Bersih:*\n`;
                text += `│    *Rp ${formatCurrencyPlain(dist.net_profit)}*\n`;
                text += `├──────────────────────┤\n`;
                text += `│ 👤 ${settings?.owner_name || "Owner"} (${dist.owner_percentage}%):\n`;
                text += `│    Rp ${formatCurrencyPlain(dist.owner_share)}\n`;
                text += `│    ${dist.owner_paid ? "✅ Dibayar" : "⏳ Pending"}\n`;
                text += `│ 👥 ${settings?.manager_name || "Pengelola"} (${dist.manager_percentage}%):\n`;
                text += `│    Rp ${formatCurrencyPlain(dist.manager_share)}\n`;
                text += `│    ${dist.manager_paid ? "✅ Dibayar" : "⏳ Pending"}\n`;
                text += `│ 🏪 Toko (${dist.store_percentage}%):\n`;
                text += `│    Rp ${formatCurrencyPlain(dist.store_share)}\n`;
                text += `│    (Reinvestasi)\n`;
                text += `└──────────────────────┘\n`;

                if (index < Math.min(distributions.length - 1, 4)) {
                    text += `\n`;
                }
            });

            if (distributions.length > 5) {
                text += `\n... dan ${distributions.length - 5} periode lainnya\n`;
            }
        }

        text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📱 _Dikirim via POS Modern_\n`;
        text += `⏰ ${new Date().toLocaleTimeString("id-ID")}\n`;

        return text;
    };

    // Share via WhatsApp
    const shareViaWhatsApp = () => {
        const text = generateReportText();
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, "_blank");
        toast.success("Membuka WhatsApp...");
    };

    // Share via Email
    const shareViaEmail = () => {
        const subject = `Laporan Bagi Hasil - ${new Date().toLocaleDateString("id-ID")}`;
        const body = generateReportText().replace(/\*/g, "").replace(/📊|📅|📈|📋|🗓|•/g, "-");
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        toast.success("Membuka email client...");
    };

    // Print report
    const printReport = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Popup diblokir. Izinkan popup untuk mencetak.");
            return;
        }

        let html = `
            <html>
            <head>
                <title>Laporan Bagi Hasil</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; color: #333; }
                    .summary { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
                    th { background: #6366f1; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 20px; font-size: 10px; color: #666; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>LAPORAN BAGI HASIL</h1>
                <p style="text-align: center;">Tanggal: ${new Date().toLocaleDateString("id-ID")}</p>
                
                <div class="summary">
                    <h3>Ringkasan:</h3>
                    <p>Total ${settings?.owner_name || "Owner"}: <strong>Rp ${formatCurrencyPlain(totalPaidOwner)}</strong></p>
                    <p>Total ${settings?.manager_name || "Pengelola"}: <strong>Rp ${formatCurrencyPlain(totalPaidManager)}</strong></p>
                    <p>Total Reinvestasi Toko: <strong>Rp ${formatCurrencyPlain(totalStoreReinvest)}</strong></p>
                    <p>Total Distribusi: <strong>${distributions.length} periode</strong></p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Periode</th>
                            <th>Pendapatan</th>
                            <th>Laba Bersih</th>
                            <th>${settings?.owner_name || "Owner"}</th>
                            <th>${settings?.manager_name || "Pengelola"}</th>
                            <th>Toko</th>
                            <th>Status Owner</th>
                            <th>Status Pengelola</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${distributions.map(dist => `
                            <tr>
                                <td>${months[dist.period_month - 1]} ${dist.period_year}</td>
                                <td>Rp ${formatCurrencyPlain(dist.total_revenue)}</td>
                                <td>Rp ${formatCurrencyPlain(dist.net_profit)}</td>
                                <td>Rp ${formatCurrencyPlain(dist.owner_share)} (${dist.owner_percentage}%)</td>
                                <td>Rp ${formatCurrencyPlain(dist.manager_share)} (${dist.manager_percentage}%)</td>
                                <td>Rp ${formatCurrencyPlain(dist.store_share)} (${dist.store_percentage}%)</td>
                                <td>${dist.owner_paid ? "✅ Dibayar" : "⏳ Pending"}</td>
                                <td>${dist.manager_paid ? "✅ Dibayar" : "⏳ Pending"}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    const resetForm = () => {
        setFormData({
            period_month: currentMonth,
            period_year: currentYear,
            notes: "",
        });
        setCalculation(null);
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const total =
            Number(settingsForm.owner_percentage) +
            Number(settingsForm.manager_percentage) +
            Number(settingsForm.store_percentage);

        if (Math.abs(total - 100) > 0.01) {
            toast.error("Total persentase harus 100%!");
            setIsSubmitting(false);
            return;
        }

        try {
            await api.put("/profit-sharing/settings", settingsForm);
            toast.success("Pengaturan berhasil disimpan");
            setIsSettingsOpen(false);
            fetchSettings();
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan pengaturan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!calculation) {
            toast.error("Silakan hitung laba bersih terlebih dahulu");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await api.post("/profit-sharing/distributions", {
                period_month: formData.period_month,
                period_year: formData.period_year,
                total_revenue: calculation.total_revenue,
                total_costs: calculation.total_costs,
                total_expenses: calculation.total_expenses,
                net_profit: calculation.net_profit,
                owner_percentage: calculation.owner_percentage,
                manager_percentage: calculation.manager_percentage,
                store_percentage: calculation.store_percentage,
                owner_share: calculation.owner_share,
                manager_share: calculation.manager_share,
                store_share: calculation.store_share,
                notes: formData.notes,
            });

            // Automatically add store share to reinvestment fund
            if (calculation.store_share > 0) {
                try {
                    await api.post("/reinvestment/add-from-distribution", {
                        distribution_id: response.data.id,
                        amount: calculation.store_share,
                        period: `${months[formData.period_month - 1]} ${formData.period_year}`,
                    });
                } catch (reinvestError) {
                    console.error("Error adding to reinvestment:", reinvestError);
                    // Don't fail the whole operation if reinvestment fails
                }
            }

            toast.success("Bagi hasil berhasil disimpan");
            setIsDialogOpen(false);
            resetForm();
            fetchDistributions();
        } catch (error: any) {
            console.error("Error saving distribution:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan bagi hasil");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePayment = async (
        id: string,
        field: "owner_paid" | "manager_paid",
        value: boolean
    ) => {
        try {
            await api.put(`/profit-sharing/distributions/${id}/payment`, {
                [field]: value,
                [`${field.replace("_paid", "_paid_date")}`]: value
                    ? new Date().toISOString().split("T")[0]
                    : null,
            });
            toast.success("Status pembayaran diupdate");
            fetchDistributions();
        } catch (error: any) {
            console.error("Error updating payment:", error);
            toast.error("Gagal update status pembayaran");
        }
    };

    const handleDelete = async (distribution: ProfitDistribution) => {
        if (
            !confirm(
                `Apakah Anda yakin ingin menghapus bagi hasil periode ${months[distribution.period_month - 1]
                } ${distribution.period_year}?`
            )
        ) {
            return;
        }

        try {
            await api.delete(`/profit-sharing/distributions/${distribution.id}`);
            toast.success("Bagi hasil berhasil dihapus");
            fetchDistributions();
        } catch (error: any) {
            console.error("Error deleting distribution:", error);
            toast.error("Gagal menghapus bagi hasil");
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
                <XCircle className="w-12 h-12 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                <div className="flex flex-wrap gap-2">
                    {/* Export Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Export Laporan</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={exportToPDF}>
                                <FileText className="w-4 h-4 mr-2 text-red-500" />
                                Export ke PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                                Export ke Excel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={printReport}>
                                <Printer className="w-4 h-4 mr-2 text-blue-500" />
                                Cetak Laporan
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Share Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Bagikan Laporan</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={shareViaWhatsApp}>
                                <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                                Share via WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={shareViaEmail}>
                                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                                Share via Email
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings Dialog */}
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                Pengaturan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Pengaturan Persentase Bagi Hasil</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="owner_name">Nama Owner</Label>
                                        <Input
                                            id="owner_name"
                                            value={settingsForm.owner_name}
                                            onChange={(e) =>
                                                setSettingsForm({
                                                    ...settingsForm,
                                                    owner_name: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="owner_percentage">% Owner</Label>
                                        <Input
                                            id="owner_percentage"
                                            type="number"
                                            step="0.01"
                                            value={settingsForm.owner_percentage}
                                            onChange={(e) =>
                                                setSettingsForm({
                                                    ...settingsForm,
                                                    owner_percentage: Number(e.target.value),
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="manager_name">Nama Pengelola</Label>
                                        <Input
                                            id="manager_name"
                                            value={settingsForm.manager_name}
                                            onChange={(e) =>
                                                setSettingsForm({
                                                    ...settingsForm,
                                                    manager_name: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="manager_percentage">% Pengelola</Label>
                                        <Input
                                            id="manager_percentage"
                                            type="number"
                                            step="0.01"
                                            value={settingsForm.manager_percentage}
                                            onChange={(e) =>
                                                setSettingsForm({
                                                    ...settingsForm,
                                                    manager_percentage: Number(e.target.value),
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="store_percentage">% Toko (Reinvestasi)</Label>
                                    <Input
                                        id="store_percentage"
                                        type="number"
                                        step="0.01"
                                        value={settingsForm.store_percentage}
                                        onChange={(e) =>
                                            setSettingsForm({
                                                ...settingsForm,
                                                store_percentage: Number(e.target.value),
                                            })
                                        }
                                        required
                                    />
                                </div>

                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-semibold">
                                        Total:{" "}
                                        {(
                                            Number(settingsForm.owner_percentage) +
                                            Number(settingsForm.manager_percentage) +
                                            Number(settingsForm.store_percentage)
                                        ).toFixed(2)}
                                        %
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Harus berjumlah 100%
                                    </p>
                                </div>

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Pengaturan"
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

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
                                Bagi Hasil Baru
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Proses Bagi Hasil Baru</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="period_month">Bulan *</Label>
                                        <Select
                                            value={formData.period_month.toString()}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    period_month: Number(value),
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map((month, index) => (
                                                    <SelectItem
                                                        key={index}
                                                        value={(index + 1).toString()}
                                                    >
                                                        {month}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="period_year">Tahun *</Label>
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
                                            required
                                        />
                                    </div>
                                </div>

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
                                            Hitung Laba Bersih & Pembagian
                                        </>
                                    )}
                                </Button>

                                {calculation && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                            <h4 className="font-semibold">Ringkasan Keuangan:</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Total Pendapatan:
                                                    </p>
                                                    <p className="font-semibold">
                                                        {formatCurrency(calculation.total_revenue)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Total Biaya Modal:
                                                    </p>
                                                    <p className="font-semibold text-orange-600">
                                                        {formatCurrency(calculation.total_costs)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Total Pengeluaran:
                                                    </p>
                                                    <p className="font-semibold text-red-600">
                                                        {formatCurrency(calculation.total_expenses)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">
                                                        Laba Bersih:
                                                    </p>
                                                    <p className="font-bold text-green-600 text-lg">
                                                        {formatCurrency(calculation.net_profit)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                                            <h4 className="font-semibold">Pembagian Laba:</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between p-3 bg-background rounded border">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                        <span className="font-medium">
                                                            {settings?.owner_name || "Owner"} (
                                                            {calculation.owner_percentage}%)
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-blue-600">
                                                        {formatCurrency(calculation.owner_share)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-background rounded border">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-purple-600" />
                                                        <span className="font-medium">
                                                            {settings?.manager_name || "Pengelola"} (
                                                            {calculation.manager_percentage}%)
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-purple-600">
                                                        {formatCurrency(calculation.manager_share)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-background rounded border">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="w-4 h-4 text-green-600" />
                                                        <span className="font-medium">
                                                            Toko - Reinvestasi (
                                                            {calculation.store_percentage}%)
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-green-600">
                                                        {formatCurrency(calculation.store_share)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting || !calculation}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Bagi Hasil"
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                <StatCard
                    title={`Total ${settings?.owner_name || "Owner"}`}
                    value={formatCurrency(totalPaidOwner)}
                    icon={User}
                    iconColor="blue"
                />
                <StatCard
                    title={`Total ${settings?.manager_name || "Pengelola"}`}
                    value={formatCurrency(totalPaidManager)}
                    icon={Users}
                    iconColor="purple"
                />
                <StatCard
                    title="Total Reinvestasi Toko"
                    value={formatCurrency(totalStoreReinvest)}
                    icon={Store}
                    iconColor="green"
                />
                <StatCard
                    title="Total Distribusi"
                    value={distributions.length.toString()}
                    icon={TrendingUp}
                    iconColor="orange"
                />
            </div>

            {/* Current Settings */}
            {settings && (
                <Card className="bg-gradient-card border-0 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" />
                            Pengaturan Saat Ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-300">
                                <p className="text-sm text-muted-foreground mb-1">
                                    {settings.owner_name}
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {settings.owner_percentage}%
                                </p>
                            </div>
                            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-300">
                                <p className="text-sm text-muted-foreground mb-1">
                                    {settings.manager_name}
                                </p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {settings.manager_percentage}%
                                </p>
                            </div>
                            <div className="p-4 bg-green-500/10 rounded-lg border border-green-300">
                                <p className="text-sm text-muted-foreground mb-1">
                                    Toko (Reinvestasi)
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {settings.store_percentage}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Distributions List */}
            <Card className="bg-gradient-card border-0 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Riwayat Bagi Hasil ({distributions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {distributions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Belum ada riwayat bagi hasil.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {distributions.map((dist) => (
                                <div
                                    key={dist.id}
                                    className="p-4 bg-background rounded-lg border hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-sm">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {months[dist.period_month - 1]} {dist.period_year}
                                                </Badge>
                                                <span className="text-lg font-bold text-green-600">
                                                    {formatCurrency(dist.net_profit)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <p>
                                                    Pendapatan: {formatCurrency(dist.total_revenue)} |
                                                    Biaya: {formatCurrency(dist.total_costs)} |
                                                    Pengeluaran: {formatCurrency(dist.total_expenses)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(dist)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-blue-500/5 rounded border border-blue-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">
                                                    {settings?.owner_name || "Owner"}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        handleUpdatePayment(
                                                            dist.id,
                                                            "owner_paid",
                                                            !dist.owner_paid
                                                        )
                                                    }
                                                    className="text-xs"
                                                >
                                                    {dist.owner_paid ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-lg font-bold text-blue-600">
                                                {formatCurrency(dist.owner_share)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {dist.owner_percentage}%
                                            </p>
                                        </div>

                                        <div className="p-3 bg-purple-500/5 rounded border border-purple-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">
                                                    {settings?.manager_name || "Pengelola"}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        handleUpdatePayment(
                                                            dist.id,
                                                            "manager_paid",
                                                            !dist.manager_paid
                                                        )
                                                    }
                                                    className="text-xs"
                                                >
                                                    {dist.manager_paid ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-lg font-bold text-purple-600">
                                                {formatCurrency(dist.manager_share)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {dist.manager_percentage}%
                                            </p>
                                        </div>

                                        <div className="p-3 bg-green-500/5 rounded border border-green-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Toko</span>
                                                <Store className="w-4 h-4 text-green-600" />
                                            </div>
                                            <p className="text-lg font-bold text-green-600">
                                                {formatCurrency(dist.store_share)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {dist.store_percentage}% (Reinvestasi)
                                            </p>
                                        </div>
                                    </div>

                                    {dist.notes && (
                                        <p className="mt-3 text-sm text-muted-foreground italic">
                                            {dist.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfitSharing;
