import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Lightbulb,
  ThumbsUp,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Layers,
  Store
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface FeatureRequestItem {
  id: string;
  userId: string;
  tenantId?: string;
  userEmail?: string;
  businessName?: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  imageUrl?: string;
  status: string;
  adminNotes?: string;
  upvotesCount: number;
  hasUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: "all", label: "Semua Kategori" },
  { id: "pos", label: "POS & Kasir" },
  { id: "inventory", label: "Stok & Inventaris" },
  { id: "finance", label: "Laporan & Keuangan" },
  { id: "store", label: "Toko Online" },
  { id: "hardware", label: "Hardware & Printer" },
  { id: "general", label: "Lainnya" },
];

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
          <Clock className="w-3 h-3" /> Menunggu Review
        </Badge>
      );
    case "planned":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-xs">
          <Layers className="w-3 h-3" /> Direncanakan
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" /> Sedang Dikerjakan
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs">
          <CheckCircle2 className="w-3 h-3" /> Selesai & Dirilis
        </Badge>
      );
    case "declined":
    case "rejected":
      return (
        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30 gap-1 text-xs">
          <AlertCircle className="w-3 h-3" /> Ditunda
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
};

const getCategoryLabel = (cat: string) => {
  const found = CATEGORIES.find((c) => c.id === cat);
  return found ? found.label : cat || "Umum";
};

const FeatureRequests = () => {
  const { state } = useApp();
  const currentUserId = state.user?.id;

  const [requests, setRequests] = useState<FeatureRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "in_progress" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest">("popular");

  // Modal Submit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("pos");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      let url = `/feature-requests?sort=${sortBy}`;
      if (activeTab === "mine") {
        url += "&mine=true";
      } else if (activeTab === "in_progress") {
        url += "&status=in_progress";
      } else if (activeTab === "completed") {
        url += "&status=completed";
      }

      if (selectedCategory !== "all") {
        url += `&category=${selectedCategory}`;
      }

      const res = await api.get(url);
      if (res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to load feature requests:", err);
      toast.error("Gagal memuat usulan fitur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, selectedCategory, sortBy]);

  // Handle Upvote
  const handleUpvote = async (item: FeatureRequestItem) => {
    try {
      const res = await api.post(`/feature-requests/${item.id}/upvote`);
      if (res.data?.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  hasUpvoted: res.data.hasUpvoted,
                  upvotesCount: res.data.upvotesCount,
                }
              : r
          )
        );
        if (res.data.hasUpvoted) {
          toast.success("Dukungan (Upvote) Anda berhasil ditambahkan! 👍");
        } else {
          toast.info("Dukungan (Upvote) dibatalkan.");
        }
      }
    } catch (err) {
      toast.error("Gagal melakukan upvote.");
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    setIsUploadingImage(true);

    try {
      const res = await api.post("/products/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.imageUrl) {
        setNewImageUrl(res.data.imageUrl);
        toast.success("Lampiran gambar berhasil diunggah!");
      }
    } catch (error) {
      toast.error("Gagal mengunggah lampiran gambar.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error("Judul dan deskripsi usulan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/feature-requests", {
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        description: newDescription.trim(),
        imageUrl: newImageUrl || undefined,
      });

      if (res.data?.success) {
        toast.success("Usulan fitur berhasil diajukan! Terima kasih atas feedback Anda.");
        setIsModalOpen(false);
        setNewTitle("");
        setNewDescription("");
        setNewImageUrl("");
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal mengajukan usulan fitur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete (Own Pending Request)
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus usulan ini?")) return;
    try {
      await api.delete(`/feature-requests/${id}`);
      toast.success("Usulan fitur berhasil dihapus.");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error("Gagal menghapus usulan.");
    }
  };

  // Filtered requests by search
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      (r.businessName && r.businessName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-blue-600 to-indigo-700 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5" /> Roadmap & Komunitas Tenant
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Request Fitur & Feedback
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Ajukan fitur yang Anda butuhkan, dukung ide pengguna lain dengan tombol Upvote, dan pantau status pengembangannya secara transparan!
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            size="lg"
            className="bg-white hover:bg-white/90 text-primary font-bold shadow-lg gap-2 rounded-2xl shrink-0 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Ajukan Usulan Fitur
          </Button>
        </div>
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-black/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card p-3 rounded-2xl border shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-muted/60 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-background text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🌟 Semua Usulan
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "mine"
                ? "bg-background text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🙋 Usulan Saya
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "in_progress"
                ? "bg-background text-purple-600 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🟣 Sedang Dikerjakan
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "completed"
                ? "bg-background text-emerald-600 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🟢 Selesai & Rilis
          </button>
        </div>

        {/* Search, Category, and Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari usulan fitur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-xs w-[140px] rounded-xl">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-9 text-xs w-[120px] rounded-xl">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular" className="text-xs">🔥 Terpopuler</SelectItem>
              <SelectItem value="newest" className="text-xs">⚡ Terbaru</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat daftar usulan fitur...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed p-8 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Lightbulb className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-bold">Belum Ada Usulan Fitur</h3>
            <p className="text-xs text-muted-foreground">
              Jadilah yang pertama mengajukan ide atau fitur baru untuk meningkatkan kemudahan bisnis Anda!
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Ajukan Usulan Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((item) => (
            <div
              key={item.id}
              className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 group"
            >
              {/* Upvote Button Card */}
              <button
                type="button"
                onClick={() => handleUpvote(item)}
                className={`flex sm:flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all shrink-0 w-full sm:w-20 active:scale-95 cursor-pointer ${
                  item.hasUpvoted
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold"
                    : "bg-muted/50 text-foreground hover:bg-muted border-border/80"
                }`}
              >
                <ThumbsUp className={`w-5 h-5 ${item.hasUpvoted ? "fill-current" : ""}`} />
                <span className="text-sm font-mono font-extrabold">{item.upvotesCount}</span>
                <span className="text-[10px] uppercase font-bold opacity-80">Vote</span>
              </button>

              {/* Content Body */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    <Badge variant="secondary" className="text-[11px] font-semibold">
                      {getCategoryLabel(item.category)}
                    </Badge>
                    {item.priority === "high" && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                        Penting
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Store className="w-3.5 h-3.5 text-primary/70" />
                    <span className="font-semibold text-foreground/80">{item.businessName || "Tenant"}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                    
                    {/* Delete button if user is owner and status is pending */}
                    {item.userId === currentUserId && item.status === "pending" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-1"
                        onClick={() => handleDelete(item.id)}
                        title="Hapus Usulan Saya"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                </div>

                {/* Attached Image Preview */}
                {item.imageUrl && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(item.imageUrl || null)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl border border-primary/20 transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Lihat Lampiran Mockup / Foto
                    </button>
                  </div>
                )}

                {/* Admin Notes & Response Callout */}
                {item.adminNotes && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" /> Tanggapan & Info Rilis dari Super Admin:
                    </div>
                    <p className="leading-relaxed font-medium pl-5">
                      {item.adminNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajukan Usulan Fitur Baru */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" /> Ajukan Usulan Fitur Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sampaikan ide fitur atau perbaikan sistem yang Anda butuhkan untuk membantu operasional bisnis Anda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold">Judul Fitur <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="Contoh: Tambahkan Opsi Cetak Struk 58mm & 80mm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kategori</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pos">POS & Kasir</SelectItem>
                    <SelectItem value="inventory">Stok & Inventaris</SelectItem>
                    <SelectItem value="finance">Laporan & Keuangan</SelectItem>
                    <SelectItem value="store">Toko Online</SelectItem>
                    <SelectItem value="hardware">Hardware & Printer</SelectItem>
                    <SelectItem value="general">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tingkat Kebutuhan</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Kebutuhan Normal</SelectItem>
                    <SelectItem value="medium">Penting / Dibutuhkan</SelectItem>
                    <SelectItem value="high">Sangat Mendesak 🔥</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-bold">Penjelasan Kebutuhan Bisnis <span className="text-red-500">*</span></Label>
              <Textarea
                id="desc"
                rows={4}
                placeholder="Jelaskan secara singkat bagaimana alur kerja fitur ini dan mengapa fitur ini sangat bermanfaat bagi toko Anda..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                required
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>

            {/* Upload Mockup / Screenshot */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Lampiran Screenshot / Mockup (Opsional)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs gap-1.5 rounded-xl h-9"
                >
                  {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  Pilih Gambar / Screenshot
                </Button>
                {newImageUrl && (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-border shrink-0">
                    <img src={newImageUrl} alt="Attachment" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold bg-primary hover:opacity-90 gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Kirim Usulan Fitur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Image Attachment */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Lampiran Mockup / Screenshot
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="rounded-2xl overflow-hidden border bg-black/5 flex items-center justify-center max-h-[75vh]">
              <img src={previewImage} alt="Mockup" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureRequests;
