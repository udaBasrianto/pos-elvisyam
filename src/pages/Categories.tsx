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
  FolderOpen,
  Loader2,
  Search,
  Package
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

interface ProductCount {
  category: string;
  count: number;
}

const COLOR_OPTIONS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
];

const Categories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });

  useEffect(() => {
    if (user) {
      loadCategories();
      loadProductCounts();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Gagal memuat kategori');
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
        const cat = product.category || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
      });

      setProductCounts(
        Object.entries(counts).map(([category, count]) => ({ category, count }))
      );
    } catch (error) {
      console.error('Error loading product counts:', error);
    }
  };

  const getProductCount = (categoryName: string) => {
    const found = productCounts.find(pc => pc.category === categoryName);
    return found?.count || 0;
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#6366f1" });
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#6366f1",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, {
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        });
        toast.success('Kategori berhasil diperbarui');
      } else {
        await api.post('/categories', {
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        });
        toast.success('Kategori berhasil ditambahkan');
      }
      setIsDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error('Gagal menyimpan kategori: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kategori ini?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Kategori berhasil dihapus');
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error('Gagal menghapus kategori');
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
              Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Kategori</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Masukkan nama kategori" required />
              </div>
              <div>
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Masukkan deskripsi kategori" rows={3} />
              </div>
              <div>
                <Label>Warna Kategori</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button key={color.value} type="button" onClick={() => setFormData({ ...formData, color: color.value })} className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 ${formData.color === color.value ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: color.value }} title={color.name} />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : (editingCategory ? "Update Kategori" : "Tambah Kategori")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-card border-0 shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Cari kategori..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Daftar Kategori ({filteredCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada kategori. Tambahkan kategori pertama Anda!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => {
                const productCount = getProductCount(category.name);
                return (
                  <div key={category.id} className="flex flex-col p-4 bg-background rounded-lg border hover:shadow-md transition-all duration-300 hover:scale-[1.02] hover:border-primary/30">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: category.color || '#6366f1' }}>
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{category.name}</h3>
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit mt-1">
                          <Package className="w-3 h-3" />
                          {productCount} produk
                        </Badge>
                      </div>
                    </div>
                    {category.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{category.description}</p>}
                    <div className="flex gap-2 mt-auto pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(category)}><Edit className="w-4 h-4 mr-1" /> Edit</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}><Trash2 className="w-4 h-4 mr-1" /> Hapus</Button>
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

export default Categories;