import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/kpi-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Save,
  Check,
  Trash2,
  Eye,
  Loader2,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Package
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface StockOpnameItem {
  id: string;
  opname_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  system_stock: number;
  physical_stock: number;
  difference_qty: number;
  unit_cost: number;
  difference_value: number;
  notes?: string;
}

interface StockOpname {
  id: string;
  opname_number: string;
  title: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  completed_at?: string;
  created_at: string;
  items?: StockOpnameItem[];
}

export default function StockOpnamePage() {
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Form new opname
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchOpnames = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/stock-opnames');
      setOpnames(res.data);
    } catch (error) {
      console.error('Error fetching opnames:', error);
      toast.error('Gagal mengambil daftar Stock Opname');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpnames();
  }, []);

  const handleCreateOpname = async () => {
    setIsCreating(true);
    try {
      const res = await api.post('/stock-opnames', {
        title: newTitle || `Stock Opname ${new Date().toLocaleDateString('id-ID')}`,
        notes: newNotes
      });
      toast.success('Sesi Stock Opname berhasil dibuat!');
      setIsCreateDialogOpen(false);
      setNewTitle("");
      setNewNotes("");
      fetchOpnames();
      openDetail(res.data.id);
    } catch (error: any) {
      console.error('Error creating opname:', error);
      toast.error(error.response?.data?.error || 'Gagal membuat Stock Opname');
    } finally {
      setIsCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const res = await api.get(`/stock-opnames/${id}`);
      setSelectedOpname(res.data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Error fetching detail:', error);
      toast.error('Gagal memuat detail Stock Opname');
    }
  };

  const handlePhysicalStockChange = (itemId: string, val: number) => {
    if (!selectedOpname || !selectedOpname.items) return;
    const updatedItems = selectedOpname.items.map(item => {
      if (item.id === itemId) {
        const sys = Number(item.system_stock) || 0;
        const phys = val;
        const diffQty = phys - sys;
        const cost = Number(item.unit_cost) || 0;
        return {
          ...item,
          physical_stock: phys,
          difference_qty: diffQty,
          difference_value: diffQty * cost
        };
      }
      return item;
    });
    setSelectedOpname({ ...selectedOpname, items: updatedItems });
  };

  const handleSaveDraft = async () => {
    if (!selectedOpname) return;
    setIsSaving(true);
    try {
      await api.put(`/stock-opnames/${selectedOpname.id}`, {
        title: selectedOpname.title,
        notes: selectedOpname.notes,
        items: selectedOpname.items
      });
      toast.success('Draft Stock Opname berhasil disimpan');
      fetchOpnames();
    } catch (error: any) {
      toast.error('Gagal menyimpan draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommitOpname = async () => {
    if (!selectedOpname) return;
    if (!confirm('Apakah Anda yakin ingin menyelesaikan Stock Opname ini? Stok produk di sistem akan otomatis disesuaikan secara permanen.')) return;

    setIsCommitting(true);
    try {
      // Save physical counts first
      await api.put(`/stock-opnames/${selectedOpname.id}`, {
        title: selectedOpname.title,
        notes: selectedOpname.notes,
        items: selectedOpname.items
      });

      const res = await api.post(`/stock-opnames/${selectedOpname.id}/commit`);
      toast.success(res.data.message || 'Stock Opname berhasil diselesaikan!');
      setIsDetailOpen(false);
      fetchOpnames();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menyetujui Stock Opname');
    } finally {
      setIsCommitting(false);
    }
  };

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  };

  const filteredOpnames = opnames.filter(o =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.opname_number.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = opnames.filter(o => o.status === 'completed').length;
  const draftCount = opnames.filter(o => o.status === 'draft').length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-primary" />
            Stock Opname & Perhitungan Fisik Stok
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit fisik persediaan barang massal, catat selisih stok, dan selesaikan rekonsiliasi persediaan otomatis.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          Mulai Sesi Opname Baru
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Sesi Opname"
          value={opnames.length.toString()}
          icon={ClipboardCheck}
          iconColor="blue"
        />
        <StatCard
          title="Opname Selesai (Completed)"
          value={completedCount.toString()}
          icon={CheckCircle}
          iconColor="emerald"
        />
        <StatCard
          title="Sesi Draft (In-Progress)"
          value={draftCount.toString()}
          icon={Clock}
          iconColor="orange"
        />
      </div>

      {/* Main Card */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            Daftar Sesi Stock Opname ({filteredOpnames.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nomor/judul opname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredOpnames.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Belum ada sesi Stock Opname</p>
              <p className="text-xs mt-1">Klik "Mulai Sesi Opname Baru" untuk memulai audit fisik stok.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4">No. Ref & Judul Sesi</th>
                    <th className="py-3 px-4">Pembuat</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Tanggal Pembuatan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOpnames.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-sm">{o.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{o.opname_number}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {o.created_by}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {o.status === 'completed' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                            <CheckCircle className="w-3 h-3 mr-1" /> Selesai
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
                            <Clock className="w-3 h-3 mr-1" /> Draft (Proses)
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => openDetail(o.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {o.status === 'draft' ? 'Input Fisik' : 'Lihat Hasil'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal New Opname */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <ClipboardCheck className="w-5 h-5" />
              Mulai Sesi Stock Opname Baru
            </DialogTitle>
            <DialogDescription>
              Sistem akan otomatis merekam stok saat ini dari seluruh daftar produk sebagai acuan perhitungan fisik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Judul Sesi Opname</Label>
              <Input
                id="title"
                placeholder="Contoh: Audit Stok Akhir Bulan Agustus"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
              <Input
                id="notes"
                placeholder="Contoh: Fokus kategori minuman & snack"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreateOpname} disabled={isCreating} className="gap-2">
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              Buat Sesi Opname
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detail & Input Physical Stock */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg font-bold">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                {selectedOpname?.title}
                <span className="text-xs font-mono font-normal text-muted-foreground">({selectedOpname?.opname_number})</span>
              </div>
              {selectedOpname?.status === 'completed' && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                  SELESAI (COMMITTED)
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOpname && (
            <div className="space-y-4 my-2">
              <div className="text-xs text-muted-foreground flex flex-wrap justify-between gap-2 bg-muted/40 p-3 rounded-lg border">
                <div>Pembuat: <span className="font-semibold text-foreground">{selectedOpname.created_by}</span></div>
                <div>Tanggal: <span className="font-semibold text-foreground">{new Date(selectedOpname.created_at).toLocaleString('id-ID')}</span></div>
                <div>Total Barang Di-audit: <span className="font-semibold text-foreground">{selectedOpname.items?.length || 0} Produk</span></div>
              </div>

              {/* Table of items */}
              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted sticky top-0 uppercase text-[10px] font-bold text-muted-foreground border-b z-10">
                      <tr>
                        <th className="py-2.5 px-3">Nama Produk & SKU</th>
                        <th className="py-2.5 px-3 text-center">Stok Sistem</th>
                        <th className="py-2.5 px-3 text-center w-32">Stok Fisik (Hitungan)</th>
                        <th className="py-2.5 px-3 text-center">Selisih (Qty)</th>
                        <th className="py-2.5 px-3 text-right">Estimasi Nilai Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOpname.items?.map((item) => {
                        const isDiff = item.difference_qty !== 0;
                        return (
                          <tr key={item.id} className={isDiff ? (item.difference_qty < 0 ? "bg-rose-50/50 dark:bg-rose-950/20" : "bg-emerald-50/50 dark:bg-emerald-950/20") : ""}>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-foreground text-xs">{item.product_name}</div>
                              {item.product_sku && <span className="font-mono text-[10px] text-muted-foreground">{item.product_sku}</span>}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                              {item.system_stock}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {selectedOpname.status === 'draft' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.physical_stock}
                                  onChange={(e) => handlePhysicalStockChange(item.id, parseFloat(e.target.value) || 0)}
                                  className="h-8 text-center font-bold text-xs"
                                />
                              ) : (
                                <span className="font-bold">{item.physical_stock}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-bold whitespace-nowrap">
                              {item.difference_qty === 0 ? (
                                <span className="text-muted-foreground font-normal">0 (Sesuai)</span>
                              ) : item.difference_qty > 0 ? (
                                <span className="text-emerald-600 flex items-center justify-center gap-0.5">
                                  <TrendingUp className="w-3.5 h-3.5" /> +{item.difference_qty}
                                </span>
                              ) : (
                                <span className="text-rose-600 flex items-center justify-center gap-0.5">
                                  <TrendingDown className="w-3.5 h-3.5" /> {item.difference_qty}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                              <span className={item.difference_value < 0 ? "text-rose-600" : item.difference_value > 0 ? "text-emerald-600" : "text-muted-foreground"}>
                                {formatCurrency(item.difference_value)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action bar for detail */}
              {selectedOpname.status === 'draft' && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    💡 Perubahan stok fisik dapat disimpan sebagai draft sebelum disetujui.
                  </span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving} className="gap-1.5 flex-1 sm:flex-initial">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" /> Simpan Draft
                    </Button>
                    <Button onClick={handleCommitOpname} disabled={isCommitting} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial">
                      {isCommitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Check className="w-4 h-4" /> Selesaikan & Update Stok
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
