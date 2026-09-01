import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  RefreshCw,
  Layers,
  Store,
  User,
  Calendar,
  Send
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface AdminFeatureRequestItem {
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
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  planned: number;
  inProgress: number;
  completed: number;
  declined: number;
}

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

const AdminFeatureRequests = () => {
  const [requests, setRequests] = useState<AdminFeatureRequestItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    planned: 0,
    inProgress: 0,
    completed: 0,
    declined: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Response Modal State
  const [selectedRequest, setSelectedRequest] = useState<AdminFeatureRequestItem | null>(null);
  const [modalStatus, setModalStatus] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/feature-requests");
      if (res.data?.data) {
        setRequests(res.data.data);
      }
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error("Failed to load admin feature requests:", err);
      toast.error("Gagal memuat daftar feature requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenResponseModal = (item: AdminFeatureRequestItem) => {
    setSelectedRequest(item);
    setModalStatus(item.status);
    setModalNotes(item.adminNotes || "");
  };

  const handleSaveResponse = async () => {
    if (!selectedRequest) return;
    setIsSavingResponse(true);

    try {
      const res = await api.patch(`/admin/feature-requests/${selectedRequest.id}`, {
        status: modalStatus,
        adminNotes: modalNotes.trim(),
      });

      if (res.data?.success) {
        toast.success("Status & balasan admin berhasil disimpan!");
        setRequests((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? {
                  ...r,
                  status: modalStatus,
                  adminNotes: modalNotes.trim(),
                }
              : r
          )
        );
        setSelectedRequest(null);
        fetchRequests(); // Refresh stats
      }
    } catch (err) {
      toast.error("Gagal menyimpan respon admin.");
    } finally {
      setIsSavingResponse(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus request usulan fitur ini?")) return;
    try {
      await api.delete(`/admin/feature-requests/${id}`);
      toast.success("Usulan fitur berhasil dihapus.");
      setRequests((prev) => prev.filter((r) => r.id !== id));
      fetchRequests();
    } catch (err) {
      toast.error("Gagal menghapus usulan.");
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.businessName && r.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" /> Manajemen Feature Requests Tenant
          </h2>
          <p className="text-xs text-muted-foreground">
            Kelola ide dan usulan fitur dari para tenant, berikan balasan progres, dan atur status roadmap produk.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          disabled={isLoading}
          className="gap-1.5 rounded-xl text-xs h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="bg-card/70 border-border/70 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase">Total Usulan</span>
            <div className="text-2xl font-bold font-mono text-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Menunggu Review</span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Direncanakan</span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{stats.planned}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold uppercase">In Progress</span>
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Selesai & Rilis</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-card p-3 rounded-2xl border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari judul, deskripsi, atau tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[160px] rounded-xl">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
              <SelectItem value="pending" className="text-xs">🟡 Menunggu Review</SelectItem>
              <SelectItem value="planned" className="text-xs">🔵 Direncanakan</SelectItem>
              <SelectItem value="in_progress" className="text-xs">🟣 Sedang Dikerjakan</SelectItem>
              <SelectItem value="completed" className="text-xs">🟢 Selesai & Dirilis</SelectItem>
              <SelectItem value="declined" className="text-xs">⚪ Ditunda / Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Request Table / List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat feature requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed p-6 text-muted-foreground text-xs">
          Tidak ada usulan fitur yang sesuai dengan filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-md transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-mono font-bold text-xs px-2.5 py-1 rounded-xl">
                    <ThumbsUp className="w-3.5 h-3.5 fill-current" /> {item.upvotesCount} Vote
                  </div>
                  {getStatusBadge(item.status)}
                  <Badge variant="secondary" className="text-[11px]">
                    {item.category?.toUpperCase()}
                  </Badge>
                  {item.priority === "high" && (
                    <Badge variant="destructive" className="text-[10px]">
                      HIGH PRIORITY
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 rounded-xl"
                    onClick={() => handleOpenResponseModal(item)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-primary" /> Tanggapi & Update Status
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
                    onClick={() => handleDelete(item.id)}
                    title="Hapus Request"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>

              {/* Mockup Button */}
              {item.imageUrl && (
                <div>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(item.imageUrl || null)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Lihat Lampiran Gambar Mockup
                  </button>
                </div>
              )}

              {/* Admin Note if already responded */}
              {item.adminNotes && (
                <div className="p-3 rounded-xl bg-muted/60 border text-xs space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Catatan Balasan Super Admin:
                  </div>
                  <p className="text-foreground/80 pl-5 leading-relaxed">{item.adminNotes}</p>
                </div>
              )}

              {/* Footer Meta */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40 gap-2">
                <div className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5 text-primary/70" />
                  <span className="font-semibold text-foreground/80">{item.businessName || "Tenant"}</span>
                  <span>({item.userEmail || "No email"})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(item.createdAt).toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response & Status Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Respon & Update Status Usulan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah tahapan pengembangan dan tulis catatan yang akan ditampilkan kepada tenant.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-muted/50 border space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Judul Usulan:</span>
                <p className="text-xs font-bold text-foreground">{selectedRequest.title}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status Pengembangan</Label>
                <Select value={modalStatus} onValueChange={setModalStatus}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="text-xs">🟡 Menunggu Review</SelectItem>
                    <SelectItem value="planned" className="text-xs">🔵 Direncanakan (Roadmap)</SelectItem>
                    <SelectItem value="in_progress" className="text-xs">🟣 Sedang Dikerjakan</SelectItem>
                    <SelectItem value="completed" className="text-xs">🟢 Selesai & Dirilis</SelectItem>
                    <SelectItem value="declined" className="text-xs">⚪ Ditunda / Tidak Sesuai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminNotes" className="text-xs font-bold">
                  Catatan / Balasan Admin untuk Tenant
                </Label>
                <Textarea
                  id="adminNotes"
                  rows={4}
                  placeholder="Contoh: Fitur ini sudah masuk sprint pengerjaan tim kami dan dijadwalkan rilis pada update v2.2..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="rounded-xl text-xs leading-relaxed"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSaveResponse}
                  disabled={isSavingResponse}
                  className="rounded-xl text-xs font-bold bg-primary hover:opacity-90 gap-1.5"
                >
                  {isSavingResponse ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Image Modal */}
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

export default AdminFeatureRequests;
