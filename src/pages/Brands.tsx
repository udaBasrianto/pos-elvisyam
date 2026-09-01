import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Loader2,
  Search,
  Package
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductCount {
  brand: string;
  count: number;
}

const Brands = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (user) {
      loadBrands();
      loadProductCounts();
    }
  }, [user]);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/brands');
      setBrands(res.data);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Gagal memuat Merek');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductCounts = async () => {
    try {
      const res = await api.get('/products');
      const data = res.data;

      const counts: { [key: string]: number } = {};
      (data || []).forEach((product: any) => {
        const brand = product.brand || 'Tanpa Merek';
        counts[brand] = (counts[brand] || 0) + 1;
      });

      setProductCounts(
        Object.entries(counts).map(([brand, count]) => ({ brand, count }))
      );
    } catch (error) {
      console.error('Error loading product counts:', error);
    }
  };

  const getProductCount = (brandName: string) => {
    const found = productCounts.find(pc => pc.brand === brandName);
    return found?.count || 0;
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingBrand(null);
  };

  const openEditDialog = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand.id}`, {
          name: formData.name,
          description: formData.description || null,
        });
        toast.success('Merek berhasil diperbarui');
      } else {
        await api.post('/brands', {
          name: formData.name,
          description: formData.description || null,
        });
        toast.success('Merek berhasil ditambahkan');
      }
      setIsDialogOpen(false);
      resetForm();
      loadBrands();
      loadProductCounts(); // Reload to capture any newly orphaned/relinked
    } catch (error: any) {
      console.error("Error saving brand:", error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error('Gagal menyimpan Merek: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Merek ini? (Produk dengan Merek ini tidak akan dihapus, hanya label mereknya yang hilang)")) return;
    try {
      await api.delete(`/brands/${id}`);
      toast.success('Merek berhasil dihapus');
      loadBrands();
      loadProductCounts();
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error('Gagal menghapus Merek');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Merek
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBrand ? "Edit Merek" : "Tambah Merek Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Merek</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Nike, Indomie..." required />
              </div>
              <div>
                <Label htmlFor="description">Detail/Deskripsi (Opsional)</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Masukkan detail tambahan tentang merek" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : (editingBrand ? "Update Merek" : "Simpan Merek")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Cari merek..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-500" />
            Daftar Merek ({filteredBrands.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBrands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-lg font-medium">Belum ada Merek</p>
              <p className="text-sm">Tambahkan merek pertama untuk membedakan produk Anda!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBrands.map((brand) => {
                const productCount = getProductCount(brand.name);
                return (
                  <div key={brand.id} className="flex flex-col p-4 bg-gray-50/50 dark:bg-slate-800/40 rounded-xl border hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30">
                        <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground truncate">{brand.name}</h3>
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit mt-1.5 font-normal bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800">
                          <Package className="w-3 h-3" />
                          {productCount} produk terkait
                        </Badge>
                      </div>
                    </div>
                    {brand.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{brand.description}</p>}
                    <div className="flex gap-2 mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button variant="outline" size="sm" className="flex-1 hover:text-indigo-600 hover:border-indigo-200" onClick={() => openEditDialog(brand)}><Edit className="w-4 h-4 mr-1.5" /> Edit</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(brand.id)}><Trash2 className="w-4 h-4 mr-1.5" /> Hapus</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Brands;
