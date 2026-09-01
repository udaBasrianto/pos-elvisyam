import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingBag,
  Plus,
  Truck,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  FileText,
  DollarSign,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useApp } from "@/contexts/AppContext";

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  qty_ordered: number;
  qty_received?: number;
  unit_cost: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  payment_status: "unpaid" | "partial" | "paid";
  total_amount: number;
  paid_amount: number;
  due_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: PurchaseOrderItem[];
}

export default function Purchases() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState("po");
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Create PO Dialog
  const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poDueDate, setPoDueDate] = useState("");
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  // Create Supplier Dialog
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [supplierData, setSupplierData] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [poRes, supRes] = await Promise.all([
        api.get("/purchases"),
        api.get("/suppliers"),
      ]);
      setPurchases(poRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPoItem = () => {
    if (state.products.length === 0) {
      toast.error("Belum ada produk untuk dipesan.");
      return;
    }
    const firstProd = state.products[0];
    setPoItems([
      ...poItems,
      {
        product_id: firstProd.id,
        product_name: firstProd.name,
        qty_ordered: 10,
        unit_cost: firstProd.costPrice || 0,
        total: (firstProd.costPrice || 0) * 10,
      },
    ]);
  };

  const handlePoItemChange = (index: number, field: string, value: any) => {
    const updated = [...poItems];
    if (field === "product_id") {
      const prod = state.products.find((p) => p.id === value);
      if (prod) {
        updated[index] = {
          ...updated[index],
          product_id: prod.id,
          product_name: prod.name,
          unit_cost: prod.costPrice || 0,
          total: (prod.costPrice || 0) * updated[index].qty_ordered,
        };
      }
    } else if (field === "qty_ordered") {
      const qty = parseFloat(value) || 0;
      updated[index].qty_ordered = qty;
      updated[index].total = qty * updated[index].unit_cost;
    } else if (field === "unit_cost") {
      const cost = parseFloat(value) || 0;
      updated[index].unit_cost = cost;
      updated[index].total = updated[index].qty_ordered * cost;
    }
    setPoItems(updated);
  };

  const handleCreatePo = async () => {
    if (poItems.length === 0) {
      toast.error("Tambahkan minimal 1 barang dalam PO");
      return;
    }
    const sup = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      await api.post("/purchases", {
        supplier_id: selectedSupplierId,
        supplier_name: sup ? sup.name : "Supplier Umum",
        items: poItems,
        notes: poNotes,
        due_date: poDueDate || null,
      });
      toast.success("Purchase Order berhasil dibuat!");
      setIsPoDialogOpen(false);
      setPoItems([]);
      fetchData();
    } catch (error: any) {
      toast.error("Gagal membuat PO");
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierData.name) {
      toast.error("Nama supplier wajib diisi");
      return;
    }
    try {
      await api.post("/suppliers", supplierData);
      toast.success("Supplier baru berhasil disimpan!");
      setIsSupplierDialogOpen(false);
      setSupplierData({ name: "", code: "", phone: "", email: "", address: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan supplier");
    }
  };

  const handleUpdateStatus = async (poId: string, status: string, payment_status?: string) => {
    try {
      await api.put(`/purchases/${poId}/status`, {
        status,
        payment_status,
      });
      toast.success(
        status === "received"
          ? "Barang diterima! Stok produk otomatis bertambah di gudang."
          : "Status PO berhasil diperbarui"
      );
      fetchData();
    } catch (error) {
      toast.error("Gagal memperbarui status PO");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalPoAmount = purchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
  const totalUnpaid = purchases
    .filter((p) => p.payment_status !== "paid")
    .reduce((acc, p) => acc + (Number(p.total_amount) - Number(p.paid_amount || 0)), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-primary" />
            Pembelian & PO Supplier (ERP Purchasing)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola pemesanan barang ke supplier, penerimaan stok otomatis, dan pemantauan utang usaha (Accounts Payable).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSupplierDialogOpen(true)} className="gap-2 text-xs h-9">
            <Users className="w-4 h-4" /> Master Supplier
          </Button>
          <Button onClick={() => setIsPoDialogOpen(true)} className="gap-2 text-xs h-9 bg-primary text-white">
            <Plus className="w-4 h-4" /> Buat PO Baru
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Nilai Pembelian</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{formatCurrency(totalPoAmount)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{purchases.length} Dokumen PO</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Utang Supplier (AP)</CardTitle>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-600">{formatCurrency(totalUnpaid)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Belum Lunas ke Supplier</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Supplier Aktif</CardTitle>
            <Truck className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{suppliers.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Pemasok Terdaftar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="po" className="text-xs font-bold gap-2">
            <FileText className="w-4 h-4" /> Daftar Purchase Order ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs font-bold gap-2">
            <Truck className="w-4 h-4" /> Data Supplier ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="po" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari No. PO atau Supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          {purchases.length === 0 ? (
            <Card className="border border-dashed p-12 text-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Belum ada dokumen Purchase Order (PO)</p>
              <p className="text-xs mt-1">Klik "+ Buat PO Baru" untuk melakukan pemesanan stok ke supplier.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {purchases
                .filter(
                  (p) =>
                    p.po_number.toLowerCase().includes(search.toLowerCase()) ||
                    (p.supplier_name && p.supplier_name.toLowerCase().includes(search.toLowerCase()))
                )
                .map((po) => (
                  <Card key={po.id} className="border shadow-xs hover:border-primary/40 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-foreground">{po.po_number}</h3>
                            <Badge
                              variant={
                                po.status === "received"
                                  ? "default"
                                  : po.status === "ordered"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {po.status === "received"
                                ? "Selesai Diterima"
                                : po.status === "ordered"
                                ? "Dikirim Supplier"
                                : "Draft PO"}
                            </Badge>
                            <Badge
                              variant={po.payment_status === "paid" ? "outline" : "destructive"}
                              className="text-[10px]"
                            >
                              {po.payment_status === "paid" ? "Lunas" : "Belum Lunas (Utang)"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            Supplier: <strong className="text-foreground">{po.supplier_name}</strong> | Dibuat:{" "}
                            {new Date(po.created_at).toLocaleDateString("id-ID")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {po.status !== "received" && (
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleUpdateStatus(po.id, "received", "paid")}
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Terima Barang & Lunas
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {po.items?.map((item, idx) => (
                          <div key={idx} className="bg-muted/40 p-2.5 rounded-lg border flex items-center justify-between">
                            <div>
                              <span className="font-semibold block text-foreground">{item.product_name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                Qty: <strong>{item.qty_ordered}</strong> @ {formatCurrency(item.unit_cost)}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-2 border-t text-muted-foreground">
                        <span>Total Nilai Pesanan:</span>
                        <span className="text-sm font-black text-primary">{formatCurrency(po.total_amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <Card key={s.id} className="border shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    {s.name}
                  </CardTitle>
                  <CardDescription className="text-[11px] font-mono">{s.code}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-xs space-y-1">
                  <div>📞 Telepon: {s.phone || "-"}</div>
                  <div>✉️ Email: {s.email || "-"}</div>
                  <div>📍 Alamat: {s.address || "-"}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create PO Dialog */}
      <Dialog open={isPoDialogOpen} onOpenChange={setIsPoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-primary">
              <ShoppingBag className="w-5 h-5" />
              Buat Purchase Order (PO) Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat pesanan barang ke supplier. Ketika barang diterima, stok di sistem akan bertambah otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Pilih Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="-- Pilih Supplier --" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Tgl Jatuh Tempo Bayar (Opsional)</Label>
                <Input
                  type="date"
                  value={poDueDate}
                  onChange={(e) => setPoDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <Label className="text-xs font-bold">Daftar Barang Dipesan</Label>
                <Button size="sm" variant="outline" onClick={handleAddPoItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah Barang
                </Button>
              </div>

              {poItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl">
                  <p className="text-xs">Belum ada barang dimasukkan.</p>
                  <Button variant="link" onClick={handleAddPoItem} className="text-xs">
                    + Tambah Barang Pertama
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-card text-xs">
                      <Select
                        value={item.product_id}
                        onValueChange={(val) => handlePoItemChange(idx, "product_id", val)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {state.products.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name} (Stok: {p.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.qty_ordered}
                        onChange={(e) => handlePoItemChange(idx, "qty_ordered", e.target.value)}
                        className="h-8 w-20 text-center font-bold text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Harga Modal"
                        value={item.unit_cost}
                        onChange={(e) => handlePoItemChange(idx, "unit_cost", e.target.value)}
                        className="h-8 w-28 text-right font-mono text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsPoDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreatePo} className="bg-primary text-white">
              Simpan PO
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Supplier Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-primary">
              <Truck className="w-5 h-5" />
              Tambah Supplier Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <Label>Nama Supplier / Pemasok *</Label>
              <Input
                placeholder="PT Sumber Makmur"
                value={supplierData.name}
                onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label>No. Telepon / WhatsApp</Label>
              <Input
                placeholder="08123456789"
                value={supplierData.phone}
                onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label>Alamat Lengkap</Label>
              <Input
                placeholder="Jl. Industry No. 12, Jakarta"
                value={supplierData.address}
                onChange={(e) => setSupplierData({ ...supplierData, address: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateSupplier} className="bg-primary text-white">
              Simpan Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
