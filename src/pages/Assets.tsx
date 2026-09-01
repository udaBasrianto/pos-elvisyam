import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Briefcase,
  Plus,
  TrendingDown,
  Calculator,
  Search,
  Trash2,
  Building,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface Asset {
  id: string;
  code: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  useful_life_years: number;
  salvage_value: number;
  notes?: string;
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "Peralatan Toko",
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_cost: "",
    useful_life_years: "5",
    salvage_value: "0",
    notes: "",
  });

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/assets");
      setAssets(res.data || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreateAsset = async () => {
    if (!formData.name.trim() || !formData.purchase_cost) {
      toast.error("Nama aset dan harga perolehan wajib diisi");
      return;
    }
    const cost = parseFloat(formData.purchase_cost);
    if (isNaN(cost) || cost <= 0) {
      toast.error("Harga perolehan harus berupa nominal angka valid");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        category: formData.category,
        purchase_date: formData.purchase_date,
        purchase_cost: cost,
        useful_life_years: parseInt(formData.useful_life_years) || 5,
        salvage_value: parseFloat(formData.salvage_value) || 0,
        notes: formData.notes.trim(),
      };
      await api.post("/assets", payload);
      toast.success("Aset toko baru berhasil dicatat!");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        code: "",
        category: "Peralatan Toko",
        purchase_date: new Date().toISOString().slice(0, 10),
        purchase_cost: "",
        useful_life_years: "5",
        salvage_value: "0",
        notes: "",
      });
      fetchAssets();
    } catch (error: any) {
      const msg = error.response?.data?.error || "Gagal mencatat aset";
      toast.error(msg);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await api.delete(`/assets/${id}`);
      toast.success("Aset berhasil dihapus");
      fetchAssets();
    } catch (error) {
      toast.error("Gagal menghapus aset");
    }
  };

  // Straight-line Depreciation calculation
  const calculateDepreciation = (asset: Asset) => {
    const cost = Number(asset.purchase_cost || 0);
    const salvage = Number(asset.salvage_value || 0);
    const lifeYears = Number(asset.useful_life_years || 5);

    const purchaseYear = new Date(asset.purchase_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsElapsed = Math.max(0, currentYear - purchaseYear);

    const annualDepreciation = Math.max(0, (cost - salvage) / lifeYears);
    const accumulatedDepreciation = Math.min(cost - salvage, annualDepreciation * yearsElapsed);
    const bookValue = Math.max(salvage, cost - accumulatedDepreciation);

    return {
      annualDepreciation,
      accumulatedDepreciation,
      bookValue,
    };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalAssetCost = assets.reduce((acc, a) => acc + Number(a.purchase_cost || 0), 0);
  const totalBookValue = assets.reduce((acc, a) => acc + calculateDepreciation(a).bookValue, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            Manajemen Aset Toko & Depresiasi (Asset Management)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pencatatan inventaris fisik usaha, nilai perolehan, estimasi masa manfaat, dan kalkulasi penyusutan nilai aset (depresiasi).
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 text-xs h-9 bg-primary text-white">
          <Plus className="w-4 h-4" /> Catat Aset Baru
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Nilai Perolehan Aset</CardTitle>
            <Building className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{formatCurrency(totalAssetCost)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{assets.length} Item Aset Fisik</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Nilai Buku Saat Ini (Net Book Value)</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-primary">{formatCurrency(totalBookValue)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Setelah Diperhitungkan Penyusutan</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Metode Penyusutan</CardTitle>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-foreground">Garis Lurus (Straight-Line)</div>
            <p className="text-[11px] text-muted-foreground mt-1">Sesuai Standar Akuntansi PPSA</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-base font-bold">Daftar Aset Toko & Kalkulator Penyusutan</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama aset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground font-bold border-b">
              <tr>
                <th className="p-3">Kode Aset</th>
                <th className="p-3">Nama Aset / Kategori</th>
                <th className="p-3">Tgl Perolehan</th>
                <th className="p-3 text-right">Harga Perolehan</th>
                <th className="p-3 text-center">Masa Manfaat</th>
                <th className="p-3 text-right">Penyusutan /Thn</th>
                <th className="p-3 text-right">Nilai Buku Saat Ini</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">Belum ada aset toko yang dicatat</p>
                    <p className="text-xs mt-1">Klik tombol "+ Catat Aset Baru" untuk mendaftarkan aset fisik toko.</p>
                  </td>
                </tr>
              ) : (
                assets
                  .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
                  .map((asset) => {
                    const dep = calculateDepreciation(asset);
                    return (
                      <tr key={asset.id} className="hover:bg-muted/40">
                        <td className="p-3 font-mono font-bold text-primary">{asset.code}</td>
                        <td className="p-3">
                          <div className="font-bold text-foreground">{asset.name}</div>
                          <div className="text-[10px] text-muted-foreground">{asset.category}</div>
                        </td>
                        <td className="p-3 font-mono">{asset.purchase_date}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatCurrency(asset.purchase_cost)}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {asset.useful_life_years} Tahun
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono text-amber-600">
                          {formatCurrency(dep.annualDepreciation)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(dep.bookValue)}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDeleteAsset(asset.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-primary">
              <Briefcase className="w-5 h-5" />
              Tambah Aset Fisik Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mendaftarkan inventaris toko (Mesin, Kulkas, Laptop Kasir, Perabotan, dll).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs my-2">
            <div>
              <Label>Nama Aset / Inventaris *</Label>
              <Input
                placeholder="Mesin Espresso Kopi 2-Group"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Kategori Aset</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Peralatan Toko" className="text-xs">Peralatan Toko</SelectItem>
                    <SelectItem value="Mesin & Elektronik" className="text-xs">Mesin & Elektronik</SelectItem>
                    <SelectItem value="Kendaraan" className="text-xs">Kendaraan</SelectItem>
                    <SelectItem value="Mebel & Bangunan" className="text-xs">Mebel & Bangunan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tanggal Beli</Label>
                <Input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Harga Perolehan (Rp) *</Label>
                <Input
                  type="number"
                  placeholder="15000000"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  className="h-8 text-xs mt-1 font-bold"
                />
              </div>
              <div>
                <Label>Estimasi Masa Manfaat (Tahun)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={formData.useful_life_years}
                  onChange={(e) => setFormData({ ...formData, useful_life_years: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateAsset} className="bg-primary text-white">
              Simpan Aset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
