import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/ui/kpi-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Edit3,
  CheckCircle,
  Loader2,
  Building2,
  Crown
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Outlet {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_main: number | boolean;
  is_active: number | boolean;
  created_at: string;
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    is_main: false,
    is_active: true
  });

  const fetchOutlets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/outlets');
      setOutlets(res.data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
      toast.error('Gagal mengambil daftar cabang toko');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const openAddDialog = () => {
    setEditingOutlet(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      is_main: false,
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address || "",
      phone: outlet.phone || "",
      is_main: Boolean(outlet.is_main),
      is_active: Boolean(outlet.is_active)
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nama cabang/gudang wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingOutlet) {
        await api.put(`/outlets/${editingOutlet.id}`, formData);
        toast.success('Data cabang berhasil diupdate!');
      } else {
        await api.post('/outlets', formData);
        toast.success('Cabang baru berhasil ditambahkan!');
      }
      setIsDialogOpen(false);
      fetchOutlets();
    } catch (error: any) {
      console.error('Error saving outlet:', error);
      toast.error(error.response?.data?.error || 'Gagal menyimpan cabang');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mainOutlet = outlets.find(o => Boolean(o.is_main));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            Manajemen Multi-Cabang & Gudang (Multi-Outlet)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola cabang toko, outlet penjualan, dan gudang dalam 1 sistem perusahaan terintegrasi.
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          Tambah Cabang / Gudang
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Cabang & Gudang"
          value={outlets.length.toString()}
          icon={Building2}
          iconColor="blue"
        />
        <StatCard
          title="Cabang Utama (Pusat)"
          value={mainOutlet?.name || "Belum Ditentukan"}
          icon={Crown}
          iconColor="orange"
        />
        <StatCard
          title="Status Multi-Outlet"
          value="Aktif"
          icon={CheckCircle}
          iconColor="green"
          subtitle="Mendukung transfer stok antar cabang"
        />
      </div>

      {/* Outlets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          outlets.map((outlet) => (
            <Card key={outlet.id} className="border shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              {Boolean(outlet.is_main) && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3" /> PUSAT
                </div>
              )}
              <CardHeader className="p-4 border-b bg-muted/30">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  {outlet.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-1.5 text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                    <span>{outlet.address || "Alamat belum diatur"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span>{outlet.phone || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant={Boolean(outlet.is_active) ? "default" : "secondary"} className="text-[10px]">
                    {Boolean(outlet.is_active) ? "Aktif Operasional" : "Non-Aktif"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(outlet)} className="h-7 text-xs gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Add/Edit Outlet */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-primary">
              <Building2 className="w-5 h-5" />
              {editingOutlet ? "Edit Cabang / Gudang" : "Tambah Cabang / Gudang Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi informasi lokasi cabang toko atau gudang penyimpanan persediaan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Nama Cabang / Gudang *</Label>
              <Input
                id="name"
                placeholder="Contoh: Cabang Sudirman / Gudang Utama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Input
                id="address"
                placeholder="Alamat jalan, kota..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">No. Telepon Cabang</Label>
              <Input
                id="phone"
                placeholder="0812xxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
              <div>
                <Label className="text-xs font-bold block">Tetapkan Sebagai Cabang Utama (Pusat)</Label>
                <span className="text-[10px] text-muted-foreground block">Cabang utama menjadi acuan persediaan default.</span>
              </div>
              <Switch
                checked={formData.is_main}
                onCheckedChange={(checked) => setFormData({ ...formData, is_main: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Cabang
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
