import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/ui/kpi-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Loader2,
  Trash2,
  PackageCheck,
  Building2,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";

interface TransferItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface StockTransfer {
  id: string;
  transfer_number: string;
  from_outlet_id: string;
  from_outlet_name: string;
  to_outlet_id: string;
  to_outlet_name: string;
  status: 'pending' | 'shipped' | 'received' | 'cancelled';
  notes?: string;
  created_by: string;
  received_by?: string;
  created_at: string;
  items?: TransferItem[];
}

interface Outlet {
  id: string;
  name: string;
}

export default function StockTransfersPage() {
  const { state } = useApp();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Transfer Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromOutlet, setFromOutlet] = useState("");
  const [toOutlet, setToOutlet] = useState("");
  const [notes, setNotes] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  // Detail Modal
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [trfRes, outRes] = await Promise.all([
        api.get('/stock-transfers'),
        api.get('/outlets')
      ]);
      setTransfers(trfRes.data);
      setOutlets(outRes.data);
      if (outRes.data.length >= 2) {
        setFromOutlet(outRes.data[0].id);
        setToOutlet(outRes.data[1].id);
      }
    } catch (error) {
      console.error('Error fetching transfers data:', error);
      toast.error('Gagal mengambil data transfer stok');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    if (state.products.length === 0) return;
    const firstProd = state.products[0];
    setTransferItems([
      ...transferItems,
      { product_id: firstProd.id, product_name: firstProd.name, quantity: 1 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...transferItems];
    if (field === 'product_id') {
      const p = state.products.find(prod => prod.id === value);
      updated[index] = { ...updated[index], product_id: value, product_name: p?.name || "" };
    } else if (field === 'quantity') {
      updated[index] = { ...updated[index], quantity: parseFloat(value) || 1 };
    }
    setTransferItems(updated);
  };

  const handleCreateTransfer = async () => {
    if (!fromOutlet || !toOutlet) {
      toast.error('Pilih cabang asal dan cabang tujuan');
      return;
    }
    if (fromOutlet === toOutlet) {
      toast.error('Cabang asal dan tujuan tidak boleh sama');
      return;
    }
    if (transferItems.length === 0) {
      toast.error('Pilih minimal 1 produk untuk ditransfer');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/stock-transfers', {
        from_outlet_id: fromOutlet,
        to_outlet_id: toOutlet,
        items: transferItems,
        notes
      });
      toast.success('Permintaan transfer stok berhasil dibuat!');
      setIsCreateOpen(false);
      setTransferItems([]);
      setNotes("");
      fetchData();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(error.response?.data?.error || 'Gagal membuat transfer stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'received' && !confirm('Apakah Anda yakin barang transfer telah diterima dengan lengkap? Stok cabang penerima akan diperbarui.')) return;

    setIsUpdatingStatus(true);
    try {
      await api.put(`/stock-transfers/${id}/status`, { status: newStatus });
      toast.success(newStatus === 'received' ? 'Transfer stok berhasil diterima!' : 'Status transfer diperbarui');
      setIsDetailOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengupdate status transfer');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredTransfers = transfers.filter(t =>
    t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
    t.from_outlet_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.to_outlet_name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = transfers.filter(t => t.status === 'pending').length;
  const receivedCount = transfers.filter(t => t.status === 'received').length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-primary" />
            Transfer Stok Antar Cabang & Gudang
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pengiriman dan penerimaan mutasi persediaan barang antar lokasi outlet/cabang perusahaan.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          Buat Transfer Stok Baru
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Mutasi Transfer"
          value={transfers.length.toString()}
          icon={ArrowLeftRight}
          iconColor="blue"
        />
        <StatCard
          title="Menunggu Penerimaan"
          value={pendingCount.toString()}
          icon={Truck}
          iconColor="orange"
        />
        <StatCard
          title="Selesai Diterima"
          value={receivedCount.toString()}
          icon={CheckCircle2}
          iconColor="green"
        />
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            Daftar Transfer Stok ({filteredTransfers.length})
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nomor/cabang..."
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
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Belum ada riwayat transfer stok</p>
              <p className="text-xs mt-1">Klik "Buat Transfer Stok Baru" untuk memindahkan barang antar cabang.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4">No. Ref Transfer</th>
                    <th className="py-3 px-4">Rute Pengiriman (Asal ➔ Tujuan)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Pengirim</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransfers.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {t.transfer_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">{t.from_outlet_name}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-emerald-700 dark:text-emerald-400">{t.to_outlet_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {t.status === 'received' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Diterima
                          </Badge>
                        ) : t.status === 'shipped' ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                            <Truck className="w-3 h-3 mr-1" /> Dalam Pengiriman
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {t.created_by}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => { setSelectedTransfer(t); setIsDetailOpen(true); }}
                        >
                          Detail & Konfirmasi
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

      {/* Modal Create Transfer */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-primary">
              <ArrowLeftRight className="w-5 h-5" />
              Buat Transfer Stok Antar Cabang
            </DialogTitle>
            <DialogDescription>
              Pilih cabang asal pengirim, cabang tujuan penerima, dan daftar produk yang ditransfer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromOutlet">Cabang Asal (Pengirim) *</Label>
                <Select value={fromOutlet} onValueChange={setFromOutlet}>
                  <SelectTrigger id="fromOutlet" className="mt-1">
                    <SelectValue placeholder="Pilih Cabang Asal" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="toOutlet">Cabang Tujuan (Penerima) *</Label>
                <Select value={toOutlet} onValueChange={setToOutlet}>
                  <SelectTrigger id="toOutlet" className="mt-1">
                    <SelectValue placeholder="Pilih Cabang Tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.filter(o => o.id !== fromOutlet).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trfNotes">Catatan / Alasan Transfer</Label>
              <Input
                id="trfNotes"
                placeholder="Contoh: Pemindahan stok persiapan promo cabang"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            {/* Item selector */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-xs">Daftar Barang Ditransfer</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah Barang
                </Button>
              </div>

              {transferItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                  <p className="text-xs">Belum ada barang yang ditambahkan.</p>
                  <Button variant="link" size="sm" onClick={handleAddItem} className="text-xs mt-1">
                    + Pilih Produk Pertama
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {transferItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <Select
                          value={item.product_id}
                          onValueChange={(val) => handleItemChange(idx, 'product_id', val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Pilih Produk" />
                          </SelectTrigger>
                          <SelectContent>
                            {state.products.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} (Stok: {p.stock} {p.unit || 'pcs'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="h-8 text-xs w-24 text-center font-bold"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreateTransfer} disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Proses Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detail Transfer */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-primary">
              <ArrowLeftRight className="w-5 h-5" />
              Detail Transfer {selectedTransfer?.transfer_number}
            </DialogTitle>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4 my-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pengirim:</span>
                  <span className="font-bold text-foreground">{selectedTransfer.from_outlet_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Penerima:</span>
                  <span className="font-bold text-emerald-600">{selectedTransfer.to_outlet_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold uppercase">{selectedTransfer.status}</span>
                </div>
              </div>

              <div>
                <Label className="font-bold text-xs mb-1 block">Daftar Barang ({selectedTransfer.items?.length || 0}):</Label>
                <div className="border rounded-lg overflow-hidden divide-y">
                  {selectedTransfer.items?.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center bg-card">
                      <span className="font-semibold">{item.product_name}</span>
                      <Badge variant="outline" className="font-mono">x{item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTransfer.status !== 'received' && (
                <div className="pt-2 border-t flex justify-end gap-2">
                  <Button
                    onClick={() => handleUpdateStatus(selectedTransfer.id, 'received')}
                    disabled={isUpdatingStatus}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                    <PackageCheck className="w-4 h-4" /> Konfirmasi Terima Barang
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
