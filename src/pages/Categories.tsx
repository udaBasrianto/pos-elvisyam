import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  Loader2,
  Search,
  Package,
  Layers,
  Sparkles
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

interface SubCategory {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string | null;
  product_count: number;
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
  const [activeTab, setActiveTab] = useState("categories");

  // Category State
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

  // Sub-Category State
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [filterParentCatId, setFilterParentCatId] = useState("all");
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [isSubSubmitting, setIsSubSubmitting] = useState(false);

  const [subFormData, setSubFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
  });

  useEffect(() => {
    if (user) {
      loadAll();
    }
  }, [user]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadCategories(), loadSubCategories(), loadProductCounts()]);
    setIsLoading(false);
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Gagal memuat kategori');
    }
  };

  const loadSubCategories = async () => {
    try {
      const res = await api.get('/sub-categories');
      setSubCategories(res.data || []);
    } catch (error) {
      console.error('Error loading sub-categories:', error);
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

  // -------------------------------------------------------------
  // CATEGORY HANDLERS
  // -------------------------------------------------------------
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
    if (!confirm("Apakah Anda yakin ingin menghapus kategori ini? Sub-kategori terkait juga perlu disesuaikan.")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Kategori berhasil dihapus');
      loadCategories();
      loadSubCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error('Gagal menghapus kategori');
    }
  };

  // -------------------------------------------------------------
  // SUB-CATEGORY HANDLERS
  // -------------------------------------------------------------
  const filteredSubCategories = subCategories.filter(sc => {
    const matchesSearch = sc.name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
      (sc.category_name && sc.category_name.toLowerCase().includes(subSearchQuery.toLowerCase()));
    const matchesParent = filterParentCatId === "all" || sc.category_id === filterParentCatId;
    return matchesSearch && matchesParent;
  });

  const resetSubForm = () => {
    setSubFormData({ name: "", categoryId: "", description: "" });
    setEditingSubCategory(null);
  };

  const openEditSubDialog = (sc: SubCategory) => {
    setEditingSubCategory(sc);
    setSubFormData({
      name: sc.name,
      categoryId: sc.category_id,
      description: sc.description || "",
    });
    setIsSubDialogOpen(true);
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subFormData.categoryId) {
      toast.error("Wajib memilih kategori induk!");
      return;
    }

    setIsSubSubmitting(true);
    try {
      if (editingSubCategory) {
        await api.put(`/sub-categories/${editingSubCategory.id}`, {
          name: subFormData.name,
          category_id: subFormData.categoryId,
          description: subFormData.description || null,
        });
        toast.success('Sub-kategori berhasil diperbarui');
      } else {
        await api.post('/sub-categories', {
          name: subFormData.name,
          category_id: subFormData.categoryId,
          description: subFormData.description || null,
        });
        toast.success('Sub-kategori berhasil ditambahkan');
      }
      setIsSubDialogOpen(false);
      resetSubForm();
      loadSubCategories();
    } catch (error: any) {
      console.error("Error saving sub-category:", error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error('Gagal menyimpan sub-kategori: ' + errorMsg);
    } finally {
      setIsSubSubmitting(false);
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus sub-kategori ini?")) return;
    try {
      await api.delete(`/sub-categories/${id}`);
      toast.success('Sub-kategori berhasil dihapus');
      loadSubCategories();
    } catch (error) {
      console.error("Error deleting sub-category:", error);
      toast.error('Gagal menghapus sub-kategori');
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
      {/* Top Header & Tabs Control */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="grid grid-cols-2 w-full sm:w-auto h-10 p-1">
            <TabsTrigger value="categories" className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <FolderOpen className="w-4 h-4" />
              <span>Kategori Utama ({categories.length})</span>
            </TabsTrigger>
            <TabsTrigger value="subcategories" className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <Layers className="w-4 h-4" />
              <span>Sub-Kategori ({subCategories.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Action Button depending on active tab */}
          {activeTab === "categories" ? (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 font-bold shadow-xs">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Kategori Induk
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nama Kategori</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Misal: Makanan, Minuman, Herbal..." required />
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
                  <Button type="submit" className="w-full font-bold" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : (editingCategory ? "Update Kategori" : "Tambah Kategori")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isSubDialogOpen} onOpenChange={(open) => {
              setIsSubDialogOpen(open);
              if (!open) resetSubForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 font-bold shadow-xs">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Sub-Kategori
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingSubCategory ? "Edit Sub-Kategori" : "Tambah Sub-Kategori Baru"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="subCategoryParent">Kategori Induk (Wajib)</Label>
                    <Select
                      value={subFormData.categoryId}
                      onValueChange={(val) => setSubFormData({ ...subFormData, categoryId: val })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih Kategori Induk..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subName">Nama Sub-Kategori</Label>
                    <Input
                      id="subName"
                      value={subFormData.name}
                      onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })}
                      placeholder="Misal: Kapsul Herbal, Madu Hutan, Kopi Tubruk..."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subDescription">Deskripsi (Opsional)</Label>
                    <Textarea
                      id="subDescription"
                      value={subFormData.description}
                      onChange={(e) => setSubFormData({ ...subFormData, description: e.target.value })}
                      placeholder="Deskripsi spesifik sub-kategori ini..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full font-bold" disabled={isSubSubmitting}>
                    {isSubSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : (editingSubCategory ? "Update Sub-Kategori" : "Tambah Sub-Kategori")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: KATEGORI UTAMA */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="categories" className="space-y-6 mt-0">
          <Card className="bg-card border shadow-2xs">
            <CardContent className="p-3 sm:p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Cari kategori utama..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-2xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FolderOpen className="w-5 h-5 text-primary" />
                Daftar Kategori Induk ({filteredCategories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-sm">Belum ada kategori ditemukan.</p>
                  <p className="text-xs text-muted-foreground mt-1">Tambahkan kategori induk pertama Anda untuk mengelompokkan produk &amp; sub-kategori.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCategories.map((category) => {
                    const productCount = getProductCount(category.name);
                    const subCount = subCategories.filter(sc => sc.category_id === category.id).length;
                    return (
                      <div key={category.id} className="flex flex-col p-4 bg-background rounded-xl border border-border hover:shadow-md transition-all duration-300 hover:border-primary/40">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style={{ backgroundColor: category.color || '#6366f1' }}>
                            <FolderOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground truncate text-sm sm:text-base">{category.name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <Badge variant="secondary" className="text-[11px] font-semibold flex items-center gap-1 w-fit">
                                <Package className="w-3 h-3 text-muted-foreground" />
                                {productCount} produk
                              </Badge>
                              <Badge variant="outline" className="text-[11px] font-medium flex items-center gap-1 w-fit">
                                <Layers className="w-3 h-3 text-primary" />
                                {subCount} sub-kategori
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {category.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{category.description}</p>}
                        <div className="flex gap-2 mt-auto pt-3 border-t border-border/60">
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => openEditDialog(category)}><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(category.id)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: SUB-KATEGORI */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="subcategories" className="space-y-6 mt-0">
          <Card className="bg-card border shadow-2xs">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Cari sub-kategori atau kategori induk..." value={subSearchQuery} onChange={(e) => setSubSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <div className="w-full sm:w-60">
                <Select value={filterParentCatId} onValueChange={setFilterParentCatId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua Kategori Induk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori Induk</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-2xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Layers className="w-5 h-5 text-primary" />
                Daftar Sub-Kategori ({filteredSubCategories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSubCategories.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-sm">Belum ada sub-kategori ditemukan.</p>
                  <p className="text-xs text-muted-foreground mt-1">Buat sub-kategori baru dan pilih kategori induknya agar pengelompokan produk semakin rapi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubCategories.map((sc) => {
                    const parentCat = categories.find(c => c.id === sc.category_id);
                    return (
                      <div key={sc.id} className="flex flex-col p-4 bg-background rounded-xl border border-border hover:shadow-md transition-all duration-300 hover:border-primary/40">
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white"
                            style={{ backgroundColor: parentCat?.color || '#3b82f6' }}
                          >
                            <Layers className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground truncate text-sm sm:text-base">{sc.name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <Badge className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                <FolderOpen className="w-2.5 h-2.5" />
                                Induk: {sc.category_name || parentCat?.name || '-'}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] font-semibold flex items-center gap-1">
                                <Package className="w-2.5 h-2.5" />
                                {sc.product_count || 0} produk
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {sc.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{sc.description}</p>}
                        <div className="flex gap-2 mt-auto pt-3 border-t border-border/60">
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => openEditSubDialog(sc)}><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSub(sc.id)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Categories;