import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ColoredCard } from "@/components/ui/colored-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Globe,
  Store,
  Palette,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Trash2,
  Save,
  Loader2,
  Star,
  Plus,
  Phone,
  Mail,
  MapPin,
  Share2,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldCheck,
  Eye,
  Image as ImageIcon,
  Search,
  MessageCircle,
  Truck,
  Heart,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getStoreThemeStyles, STORE_THEME_PALETTES } from "@/storefront/utils/storeTheme";

export interface StoreReviewItem {
  id: string;
  name: string;
  city: string;
  rating: number;
  comment: string;
  date?: string;
}

const defaultStoreReviews: StoreReviewItem[] = [
  {
    id: "rev-1",
    name: "Siti Rahmawati",
    city: "Bandung",
    rating: 5,
    comment: "Kualitas produknya luar biasa! Pelayanan cepat, kemasan aman, dan admin ramah sekali.",
    date: "Baru saja",
  },
  {
    id: "rev-2",
    name: "Budi Santoso",
    city: "Surabaya",
    rating: 5,
    comment: "Langganan belanja produk di sini. Selalu original, kualitas terjamin dan pengiriman cepat.",
    date: "2 hari lalu",
  },
  {
    id: "rev-3",
    name: "Dewi Lestari",
    city: "Jakarta Selatan",
    rating: 5,
    comment: "Pesan pagi, sore langsung dikirim. Respon pemesanan via WhatsApp sangat ramah dan solutif.",
    date: "1 minggu lalu",
  },
];

const THEME_OPTIONS = [
  { id: "emerald", label: "Emerald (Herbal & Segar)", color: "#059669", bg: "bg-emerald-600" },
  { id: "indigo", label: "Indigo (Modern & Pro)", color: "#4f46e5", bg: "bg-indigo-600" },
  { id: "blue", label: "Blue (Elegan & Terpercaya)", color: "#2563eb", bg: "bg-blue-600" },
  { id: "amber", label: "Amber (Hangat & Mewah)", color: "#d97706", bg: "bg-amber-600" },
  { id: "rose", label: "Rose (Cantik & Fashion)", color: "#e11d48", bg: "bg-rose-600" },
  { id: "violet", label: "Violet (Luxury & Kreatif)", color: "#7c3aed", bg: "bg-violet-600" },
  { id: "cyan", label: "Cyan (Aqua & Bersih)", color: "#0891b2", bg: "bg-cyan-600" },
];

export default function StorefrontSettings() {
  const navigate = useNavigate();
  const { state, saveSettings } = useApp();
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState("branding");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedTargetHost, setCopiedTargetHost] = useState(false);

  // Upload States & Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  // Domain Verification State
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [verifyDomainResult, setVerifyDomainResult] = useState<{
    success: boolean;
    resolved: boolean;
    isMatched: boolean;
    domain: string;
    cname?: string;
    ips?: string[];
    targetHost?: string;
    message: string;
  } | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    ...state.settings,
    shop_slug: user?.shop_slug || state.settings?.shop_slug || "",
    custom_domain: state.settings?.custom_domain || "",
    theme_color: state.settings?.theme_color || "emerald",
    logo_url: state.settings?.logo_url || state.settings?.businessLogo || "",
    business_logo: state.settings?.business_logo || state.settings?.logoUrl || "",
    favicon_url: state.settings?.favicon_url || state.settings?.faviconUrl || "",
    whatsapp_number: state.settings?.whatsapp_number || "",
    tagline: state.settings?.tagline || "Sehat Alami, Hidup Harmoni",
    description: state.settings?.description || "",
    footer_text: state.settings?.footer_text || "",
    instagram_url: state.settings?.instagram_url || "",
    facebook_url: state.settings?.facebook_url || "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...state.settings,
      shop_slug: prev.shop_slug || user?.shop_slug || "",
      custom_domain: state.settings?.custom_domain !== undefined ? state.settings.custom_domain : prev.custom_domain || "",
      theme_color: state.settings?.theme_color || prev.theme_color || "emerald",
      logo_url: state.settings?.logo_url || state.settings?.businessLogo || prev.logo_url || "",
      business_logo: state.settings?.business_logo || state.settings?.logoUrl || prev.business_logo || "",
      favicon_url: state.settings?.favicon_url || state.settings?.faviconUrl || prev.favicon_url || "",
      whatsapp_number: state.settings?.whatsapp_number || prev.whatsapp_number || "",
    }));
  }, [state.settings]);

  useEffect(() => {
    if (user?.shop_slug) {
      setFormData((prev) => ({
        ...prev,
        shop_slug: user.shop_slug || prev.shop_slug,
      }));
    }
  }, [user?.shop_slug]);

  // Review List State
  const [reviewList, setReviewList] = useState<StoreReviewItem[]>(() => {
    try {
      if (state.settings?.store_reviews) {
        const parsed = JSON.parse(state.settings.store_reviews);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultStoreReviews;
  });

  useEffect(() => {
    if (state.settings?.store_reviews) {
      try {
        const parsed = JSON.parse(state.settings.store_reviews);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviewList(parsed);
        }
      } catch (e) {}
    }
  }, [state.settings?.store_reviews]);

  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editingReviewData, setEditingReviewData] = useState<StoreReviewItem>({
    id: "",
    name: "",
    city: "",
    rating: 5,
    comment: "",
    date: "Baru saja",
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Upload Handlers
  const handleUploadLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file logo maksimal 5MB");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("image", file);

    setIsUploadingLogo(true);
    try {
      const res = await api.post("/products/upload-image", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          logoUrl: res.data.imageUrl,
          businessLogo: res.data.imageUrl,
          logo_url: res.data.imageUrl,
          business_logo: res.data.imageUrl,
        }));
        toast.success("Logo toko berhasil diupload! Klik 'Simpan Perubahan' untuk mengaktifkan.");
      }
    } catch (err: any) {
      toast.error("Gagal mengupload logo toko");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleClearLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: "",
      businessLogo: "",
      logo_url: "",
      business_logo: "",
    }));
    toast.info("Logo toko dihapus. Klik 'Simpan Perubahan' untuk menerapkan.");
  };

  const handleUploadFaviconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file favicon maksimal 2MB");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("image", file);

    setIsUploadingFavicon(true);
    try {
      const res = await api.post("/products/upload-image", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          faviconUrl: res.data.imageUrl,
          favicon_url: res.data.imageUrl,
        }));
        // Instant visual feedback in browser tab
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "shortcut icon";
          document.head.appendChild(link);
        }
        link.href = res.data.imageUrl;
        toast.success("Favicon berhasil diupload! Klik 'Simpan Perubahan' untuk mengaktifkan.");
      }
    } catch (err: any) {
      toast.error("Gagal mengupload favicon toko");
    } finally {
      setIsUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const handleClearFavicon = () => {
    setFormData((prev) => ({
      ...prev,
      faviconUrl: "",
      favicon_url: "",
    }));
    toast.info("Favicon toko direset ke default.");
  };

  // Review Modal Handlers
  const handleOpenAddReview = () => {
    setEditingReviewData({
      id: "",
      name: "",
      city: "",
      rating: 5,
      comment: "",
      date: "Baru saja",
    });
    setIsEditingReview(true);
  };

  const handleOpenEditReview = (item: StoreReviewItem) => {
    setEditingReviewData(item);
    setIsEditingReview(true);
  };

  const handleSaveReviewModal = () => {
    if (!editingReviewData.name.trim() || !editingReviewData.comment.trim()) {
      toast.error("Nama dan komentar ulasan wajib diisi");
      return;
    }
    let updated: StoreReviewItem[];
    if (editingReviewData.id) {
      updated = reviewList.map((r) => (r.id === editingReviewData.id ? editingReviewData : r));
    } else {
      updated = [{ ...editingReviewData, id: `rev-${Date.now()}` }, ...reviewList];
    }
    setReviewList(updated);
    handleInputChange("store_reviews", JSON.stringify(updated));
    setIsEditingReview(false);
    toast.success("Ulasan berhasil disimpan! Klik 'Simpan Perubahan' untuk memperbarui toko.");
  };

  const handleDeleteReview = (id: string) => {
    const updated = reviewList.filter((r) => r.id !== id);
    setReviewList(updated);
    handleInputChange("store_reviews", JSON.stringify(updated));
    toast.success("Ulasan dihapus! Klik 'Simpan Perubahan' untuk memperbarui.");
  };

  // Slug & Domain Actions
  const handleSaveSlug = async () => {
    const cleanSlug = formData.shop_slug?.trim().toLowerCase();
    if (!cleanSlug) {
      toast.error("Slug toko tidak boleh kosong");
      return;
    }

    setIsSavingSlug(true);
    try {
      const res = await api.put("/auth/update-slug", { shop_slug: cleanSlug });
      const updatedSlug = res.data?.shop_slug || cleanSlug;
      updateUser({ shop_slug: updatedSlug });
      setFormData((prev) => ({ ...prev, shop_slug: updatedSlug }));
      toast.success("Alamat web toko online berhasil disimpan!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan alamat toko");
    } finally {
      setIsSavingSlug(false);
    }
  };

  const handleCopyLink = () => {
    const activeSlug = formData.shop_slug || user?.shop_slug || "shop";
    const url = `${window.location.origin}/${activeSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(true);
    toast.success("Link web toko online disalin ke clipboard!");
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const handleCopyDomain = (domainStr: string) => {
    const url = `https://${domainStr}`;
    navigator.clipboard.writeText(url);
    setCopiedDomain(true);
    toast.success("Link custom domain disalin ke clipboard!");
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleCopyTargetHost = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTargetHost(true);
    toast.success(`Target DNS (${text}) disalin!`);
    setTimeout(() => setCopiedTargetHost(false), 2000);
  };

  const handleVerifyDomain = async () => {
    const domain = formData.custom_domain?.trim();
    if (!domain) {
      toast.error("Masukkan nama domain terlebih dahulu (contoh: tokoberkah.com)");
      return;
    }
    setIsVerifyingDomain(true);
    try {
      const res = await api.post("/settings/verify-domain", { domain });
      setVerifyDomainResult(res.data);
      if (res.data?.isMatched) {
        toast.success(res.data?.message || "Domain berhasil terhubung ke server!");
      } else {
        toast.info(res.data?.message || "Hasil pengecekan DNS ditampilkan.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal melakukan verifikasi DNS domain");
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  // Main Save Handler
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const cleanSlug = formData.shop_slug?.trim().toLowerCase();
      if (cleanSlug && cleanSlug !== user?.shop_slug) {
        try {
          const slugRes = await api.put("/auth/update-slug", { shop_slug: cleanSlug });
          const updatedSlug = slugRes.data?.shop_slug || cleanSlug;
          updateUser({ shop_slug: updatedSlug });
        } catch (slugErr: any) {
          toast.error(slugErr.response?.data?.error || "Gagal memperbarui alamat web toko");
        }
      }

      await saveSettings({
        ...formData,
        logoUrl: formData.logo_url || formData.business_logo || formData.logoUrl,
        businessLogo: formData.business_logo || formData.logo_url || formData.businessLogo,
        faviconUrl: formData.favicon_url || formData.faviconUrl,
        favicon_url: formData.favicon_url || formData.faviconUrl,
        theme_color: formData.theme_color,
        themeColor: formData.theme_color,
        store_reviews: JSON.stringify(reviewList),
      });
      toast.success("Konfigurasi Toko Online berhasil disimpan!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan konfigurasi");
    } finally {
      setIsSaving(false);
    }
  };

  const activeSlug = formData.shop_slug || user?.shop_slug || "hana";
  const liveStoreUrl = `${window.location.origin}/${activeSlug}`;
  const currentTheme = getStoreThemeStyles(formData.theme_color);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                Konfigurasi Toko Online (Storefront)
              </h1>
              <p className="text-xs text-muted-foreground">
                Kelola identitas publik, branding visual, alamat domain, tema warna, WhatsApp CS, dan ulasan pelanggan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(liveStoreUrl, "_blank")}
            className="text-xs font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Buka Toko Online
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:opacity-90 shadow-xs text-xs font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="branding" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto bg-card border p-1 rounded-xl gap-1 h-auto scrollbar-hide">
          <TabsTrigger value="branding" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Store className="w-4 h-4 mr-2" />
            Branding &amp; Identitas
          </TabsTrigger>
          <TabsTrigger value="domain" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Globe className="w-4 h-4 mr-2" />
            Alamat Web &amp; Domain
          </TabsTrigger>
          <TabsTrigger value="appearance" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Palette className="w-4 h-4 mr-2" />
            Tema &amp; Tampilan
          </TabsTrigger>
          <TabsTrigger value="contact" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Phone className="w-4 h-4 mr-2" />
            Kontak &amp; WhatsApp
          </TabsTrigger>
          <TabsTrigger value="reviews" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Star className="w-4 h-4 mr-2" />
            Ulasan &amp; Testimoni
          </TabsTrigger>
          <TabsTrigger value="seo" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Share2 className="w-4 h-4 mr-2" />
            Pratinjau Medsos &amp; SEO
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BRANDING & IDENTITAS */}
        <TabsContent value="branding" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kartu Status & Info Dasar */}
            <ColoredCard icon={Store} iconColor="blue" title="Informasi Publik Toko">
              <div className="space-y-4">
                {/* Switch Toko Online */}
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Status Toko Online</p>
                      <p className="text-xs text-muted-foreground">
                        {formData.onlineStoreEnabled ? "Aktif - etalase dapat diakses & menerima pesanan" : "Nonaktif - halaman toko online ditutup sementara"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.onlineStoreEnabled}
                    onCheckedChange={(checked) => handleInputChange("onlineStoreEnabled", checked)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-xs font-semibold">Nama Toko Online / Brand</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName || ""}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    placeholder="Contoh: Hana Collection"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tagline" className="text-xs font-semibold">Slogan / Tagline Singkat</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline || ""}
                    onChange={(e) => handleInputChange("tagline", e.target.value)}
                    placeholder="Contoh: Belanja Mudah, Kualitas Terjamin"
                  />
                  <p className="text-[10px] text-muted-foreground">Ditampilkan tepat di bawah nama brand pada navbar toko online.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">Deskripsi Toko Online</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Deskripsi singkat mengenai produk, keunggulan layanan, dan profil usaha Anda..."
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">Deskripsi ini juga digunakan sebagai ringkasan cuplikan di Google Search dan kartu WhatsApp.</p>
                </div>
              </div>
            </ColoredCard>

            {/* Kartu Media Visual: Logo & Favicon */}
            <ColoredCard icon={Sparkles} iconColor="purple" title="Media Visual (Logo &amp; Favicon)">
              <div className="space-y-5">
                {/* 1. Upload Logo */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        Logo Toko Online
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Ditampilkan di header etalase, struk pesanan, dan profil.</p>
                    </div>
                    {(formData.logo_url || formData.business_logo) && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Terpasang
                      </Badge>
                    )}
                  </div>

                  {/* Logo Preview Box */}
                  <div className="relative rounded-lg border border-dashed border-border bg-card p-3 flex flex-col items-center justify-center min-h-[120px] overflow-hidden">
                    {formData.logo_url || formData.business_logo ? (
                      <div className="relative w-full flex items-center justify-center">
                        <img
                          src={formData.logo_url || formData.business_logo}
                          alt="Logo Toko"
                          className="max-h-24 max-w-full object-contain drop-shadow-xs"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={handleClearLogo}
                          className="absolute top-0 right-0 h-6 w-6 rounded-full opacity-80 hover:opacity-100 shadow-sm cursor-pointer"
                          title="Hapus Logo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="flex flex-col items-center justify-center text-center cursor-pointer p-3 hover:opacity-80 transition-opacity"
                      >
                        <div className="p-2.5 rounded-full bg-muted text-muted-foreground mb-1.5">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-foreground">Klik untuk Upload File Logo</span>
                        <span className="text-[10px] text-muted-foreground">PNG, JPG, SVG, atau WebP (Maks 5MB)</span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogoFile}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 text-xs h-8 cursor-pointer"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Mengupload Logo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {formData.logo_url || formData.business_logo ? "Ganti Logo Toko" : "Upload File Logo"}
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    value={formData.logo_url || formData.business_logo || ""}
                    onChange={(e) => {
                      handleInputChange("logo_url", e.target.value);
                      handleInputChange("business_logo", e.target.value);
                    }}
                    placeholder="Atau masukkan URL logo (https://...)"
                    className="text-[11px] h-7 font-mono"
                  />
                </div>

                {/* 2. Upload Favicon */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        Favicon Toko (Icon Tab Browser)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Icon kecil di tab browser Google Chrome, Safari, atau Edge.</p>
                    </div>
                    {(formData.favicon_url || formData.faviconUrl) && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Terpasang
                      </Badge>
                    )}
                  </div>

                  {/* Browser Tab Simulator Preview */}
                  <div className="rounded-lg border bg-muted/60 p-3 space-y-2 select-none">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-[9px] text-muted-foreground font-mono ml-1">Simulasi Tampilan Tab Browser:</span>
                    </div>
                    <div className="flex items-center justify-between bg-card px-3 py-1.5 rounded-md border shadow-xs text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {formData.favicon_url || formData.faviconUrl ? (
                          <img
                            src={formData.favicon_url || formData.faviconUrl}
                            alt="Favicon"
                            className="w-4 h-4 object-contain rounded-xs shrink-0"
                          />
                        ) : formData.logo_url || formData.business_logo ? (
                          <img
                            src={formData.logo_url || formData.business_logo}
                            alt="Favicon Fallback"
                            className="w-4 h-4 object-contain rounded-xs shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-xs bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {(formData.businessName || "T")[0]}
                          </div>
                        )}
                        <span className="font-semibold text-foreground truncate text-[11px]">
                          {formData.businessName || "Toko Saya"} - Belanja Online
                        </span>
                      </div>
                      {formData.favicon_url || formData.faviconUrl ? (
                        <button
                          type="button"
                          onClick={handleClearFavicon}
                          className="text-muted-foreground hover:text-destructive text-xs ml-1 shrink-0 p-0.5 cursor-pointer"
                          title="Reset Favicon"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/jpeg,image/svg+xml,image/webp,.ico"
                    onChange={handleUploadFaviconFile}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingFavicon}
                      onClick={() => faviconInputRef.current?.click()}
                      className="flex-1 text-xs h-8 cursor-pointer"
                    >
                      {isUploadingFavicon ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Mengupload Favicon...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {formData.favicon_url || formData.faviconUrl ? "Ganti Favicon" : "Upload File Favicon"}
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    value={formData.favicon_url || formData.faviconUrl || ""}
                    onChange={(e) => {
                      handleInputChange("favicon_url", e.target.value);
                      handleInputChange("faviconUrl", e.target.value);
                    }}
                    placeholder="Atau masukkan URL favicon (https://...)"
                    className="text-[11px] h-7 font-mono"
                  />
                </div>
              </div>
            </ColoredCard>
          </div>
        </TabsContent>

        {/* TAB 2: ALAMAT WEB & DOMAIN */}
        <TabsContent value="domain" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom Slug Card */}
            <ColoredCard icon={Globe} iconColor="green" title="Alamat URL Toko (Custom Slug)">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shopSlug" className="text-xs font-semibold">Slug Alamat Toko</Label>
                    {user?.shop_slug && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Aktif: /{user.shop_slug}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="bg-background px-3 py-2 rounded-md text-xs text-muted-foreground border font-mono truncate shrink-0">
                      {window.location.origin}/
                    </div>
                    <Input
                      id="shopSlug"
                      value={formData.shop_slug || ""}
                      onChange={(e) =>
                        handleInputChange("shop_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                      }
                      placeholder="nama-toko-anda"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveSlug}
                      disabled={isSavingSlug || !formData.shop_slug}
                      className="shrink-0 h-9"
                    >
                      {isSavingSlug ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Simpan Slug
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan huruf kecil, angka, dan tanda hubung (-). Contoh: <code>hana</code> atau <code>tokoberkah</code>
                  </p>
                </div>

                <div className="p-3 bg-card rounded-lg border border-dashed border-primary/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Link Halaman Katalog Toko:</p>
                    <p className="text-xs font-mono font-medium text-foreground truncate mt-0.5">
                      {window.location.origin}/{formData.shop_slug || user?.shop_slug || "shop"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} className="h-8 text-xs">
                      {copiedSlug ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedSlug ? "Disalin!" : "Salin Link"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(`${window.location.origin}/${formData.shop_slug || user?.shop_slug || "shop"}`, "_blank")}
                      className="h-8 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Buka
                    </Button>
                  </div>
                </div>
              </div>
            </ColoredCard>

            {/* Custom Domain Card */}
            <ColoredCard icon={Globe} iconColor="blue" title="Domain Sendiri (Custom Domain)">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customDomain" className="text-xs font-semibold">Nama Domain Pribadi Anda</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customDomain"
                      value={formData.custom_domain || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "custom_domain",
                          e.target.value.toLowerCase().trim().replace(/^(https?:\/\/)/, "").replace(/\/.*$/, "")
                        )
                      }
                      placeholder="tokosaya.com atau katalog.bisnis.id"
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyDomain}
                      disabled={isVerifyingDomain || !formData.custom_domain}
                      className="shrink-0 text-xs"
                    >
                      {isVerifyingDomain ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                      Cek DNS
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Masukkan tanpa <code>https://</code> atau <code>/</code>. Contoh: <code>tokohana.com</code>
                  </p>
                </div>

                {/* Status Verifikasi DNS */}
                {verifyDomainResult && (
                  <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${verifyDomainResult.isMatched ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"}`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {verifyDomainResult.isMatched ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                      <span>{verifyDomainResult.message}</span>
                    </div>
                  </div>
                )}

                {/* Panduan Setting DNS */}
                <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Info className="w-4 h-4 text-primary" />
                    <span>Panduan Setting DNS di Registrar Domain (Cloudflare / Niagahoster / dll)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-card p-2.5 rounded border text-[11px] font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">TYPE</span>
                      <strong className="text-foreground">CNAME</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">NAME</span>
                      <strong className="text-foreground">@ / toko</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">TARGET</span>
                      <div className="flex items-center gap-1">
                        <strong className="text-foreground truncate">{window.location.hostname}</strong>
                        <button type="button" onClick={() => handleCopyTargetHost(window.location.hostname)} className="text-muted-foreground hover:text-foreground">
                          {copiedTargetHost ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ColoredCard>
          </div>
        </TabsContent>

        {/* TAB 3: TEMA & TAMPILAN */}
        <TabsContent value="appearance" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Palette Selector */}
            <ColoredCard icon={Palette} iconColor="pink" title="Warna Tema Toko Online">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pilih warna identitas yang selaras dengan karakter brand produk Anda. Warna ini diterapkan pada tombol, badge promo, hero banner, dan link toko online.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEME_OPTIONS.map((t) => {
                    const isSelected = (formData.theme_color || "emerald") === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleInputChange("theme_color", t.id)}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary" : "hover:bg-muted/50 border-border"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${t.bg} shadow-xs shrink-0 flex items-center justify-center text-white`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{t.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Mini Preview Box */}
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pratinjau Elemen Toko Online ({formData.theme_color || "emerald"}):
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" className={`text-xs font-semibold ${currentTheme.primaryBg}`}>
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      + Tambah ke Keranjang
                    </Button>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${currentTheme.badgeBg} border ${currentTheme.softBorder}`}>
                      Diskon 20%
                    </span>
                    <span className={`font-bold text-sm ${currentTheme.primaryText}`}>
                      Rp 85.000
                    </span>
                  </div>
                </div>
              </div>
            </ColoredCard>

            {/* Highlights Keunggulan Toko */}
            <ColoredCard icon={ShieldCheck} iconColor="green" title="4 Pilar Keunggulan Toko (Trust Badges)">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Badge kepercayaan yang secara otomatis ditampilkan pada bagian atas katalog untuk meningkatkan konversi dan keyakinan pembeli.
                </p>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">100% Produk Original</p>
                      <p className="text-[10px] text-muted-foreground">Jaminan kualitas produk asli langsung dari produsen terpercaya.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Pengiriman Cepat &amp; Aman</p>
                      <p className="text-[10px] text-muted-foreground">Pesanan dipacking rapi dengan bubble wrap dan dikirim pada hari yang sama.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Garansi Retur 7 Hari</p>
                      <p className="text-[10px] text-muted-foreground">Kemudahan retur jika barang tidak sesuai atau mengalami kendala fisik.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Layanan CS Ramah</p>
                      <p className="text-[10px] text-muted-foreground">Admin kami siap membantu konsultasi produk melalui WhatsApp setiap saat.</p>
                    </div>
                  </div>
                </div>
              </div>
            </ColoredCard>
          </div>
        </TabsContent>

        {/* TAB 4: KONTAK & WHATSAPP */}
        <TabsContent value="contact" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Integration Card */}
            <ColoredCard icon={MessageCircle} iconColor="green" title="Integrasi Pesanan WhatsApp (Fast Order)">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsappNumber" className="text-xs font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Nomor WhatsApp CS / Admin Toko
                  </Label>
                  <Input
                    id="whatsappNumber"
                    value={formData.whatsapp_number || ""}
                    onChange={(e) => handleInputChange("whatsapp_number", e.target.value)}
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Nomor ini digunakan pada tombol <strong>"Pesan Cepat via WhatsApp"</strong> di halaman detail produk agar pembeli bisa langsung chat pesan otomatis.
                  </p>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Format Chat Otomatis WhatsApp yang Dihasilkan:
                  </p>
                  <p className="font-mono text-[11px] bg-background/80 p-2 rounded border border-emerald-500/20 text-foreground">
                    "Halo Admin, saya ingin memesan: [Nama Produk] seharga Rp [Harga]. Mohon info stok dan ongkirnya."
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="instagramUrl" className="text-xs font-semibold">Link Instagram Toko</Label>
                    <Input
                      id="instagramUrl"
                      value={formData.instagram_url || ""}
                      onChange={(e) => handleInputChange("instagram_url", e.target.value)}
                      placeholder="https://instagram.com/namatoko"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="facebookUrl" className="text-xs font-semibold">Link Facebook Toko</Label>
                    <Input
                      id="facebookUrl"
                      value={formData.facebook_url || ""}
                      onChange={(e) => handleInputChange("facebook_url", e.target.value)}
                      placeholder="https://facebook.com/namatoko"
                    />
                  </div>
                </div>
              </div>
            </ColoredCard>

            {/* Alamat Fisik & Teks Footer */}
            <ColoredCard icon={MapPin} iconColor="amber" title="Alamat Fisik &amp; Footer Toko">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="businessPhone" className="text-xs font-semibold">Nomor Telepon Kantor / Toko</Label>
                    <Input
                      id="businessPhone"
                      value={formData.businessPhone || ""}
                      onChange={(e) => handleInputChange("businessPhone", e.target.value)}
                      placeholder="081234567890"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="businessEmail" className="text-xs font-semibold">Email Resmi Bisnis</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={formData.businessEmail || ""}
                      onChange={(e) => handleInputChange("businessEmail", e.target.value)}
                      placeholder="support@domain.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessAddress" className="text-xs font-semibold">Alamat Lengkap Toko</Label>
                  <Textarea
                    id="businessAddress"
                    value={formData.businessAddress || ""}
                    onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                    placeholder="Alamat lengkap toko / kantor operasional..."
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="footerText" className="text-xs font-semibold">Catatan Kaki Footer (Footer Note)</Label>
                  <Input
                    id="footerText"
                    value={formData.footer_text || ""}
                    onChange={(e) => handleInputChange("footer_text", e.target.value)}
                    placeholder="Contoh: Belanja aman dengan sistem pembayaran terverifikasi & garansi uang kembali."
                  />
                  <p className="text-[10px] text-muted-foreground">Teks kecil yang muncul di bagian footer paling bawah etalase online.</p>
                </div>
              </div>
            </ColoredCard>
          </div>
        </TabsContent>

        {/* TAB 5: ULASAN & TESTIMONI */}
        <TabsContent value="reviews" className="space-y-6 m-0">
          <ColoredCard icon={Star} iconColor="amber" title="Manajer Ulasan / Testimoni Pelanggan Toko Online">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/40 rounded-xl border">
                <div>
                  <p className="font-semibold text-xs text-foreground">Daftar Testimoni Aktif di Toko Online</p>
                  <p className="text-[11px] text-muted-foreground">
                    Testimoni dinamis ini akan ditampilkan di section review toko online Anda untuk meningkatkan kepercayaan pelanggan.
                  </p>
                </div>
                <Button size="sm" onClick={handleOpenAddReview} className="text-xs h-8 cursor-pointer shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tambah Ulasan Baru
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reviewList.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl border bg-card relative group flex flex-col justify-between shadow-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{rev.date || "Baru saja"}</span>
                      </div>
                      <p className="text-xs text-foreground italic line-clamp-3">"{rev.comment}"</p>
                    </div>

                    <div className="pt-3 mt-3 border-t flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">{rev.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rev.city || "Indonesia"}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditReview(rev)}
                          className="h-7 px-2 text-[11px] cursor-pointer"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="h-7 px-2 text-[11px] text-destructive hover:text-destructive cursor-pointer"
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ColoredCard>
        </TabsContent>

        {/* TAB 6: PRATINJAU MEDSOS & SEO */}
        <TabsContent value="seo" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Simulator Card */}
            <ColoredCard icon={Share2} iconColor="green" title="Simulator Pratinjau Link WhatsApp (Open Graph)">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Beginilah tampilan kartu link ketika URL toko atau produk Anda dibagikan ke obrolan WhatsApp, Telegram, Facebook, atau Twitter/X:
                </p>

                {/* WhatsApp Chat Bubble Mockup */}
                <div className="bg-[#e5ddd5] dark:bg-zinc-900 p-4 rounded-2xl border flex flex-col items-start select-none">
                  <div className="bg-[#dcf8c6] dark:bg-emerald-950 text-foreground max-w-sm rounded-2xl rounded-tl-xs p-2.5 shadow-sm border border-emerald-600/10 space-y-2">
                    <p className="text-xs">
                      Silakan cek katalog produk resmi kami di sini ya kak:
                    </p>

                    {/* WhatsApp Card Preview */}
                    <div className="bg-[#f0f2f5] dark:bg-zinc-800 rounded-xl overflow-hidden border border-border/60">
                      <div className="h-32 bg-muted/60 flex items-center justify-center overflow-hidden relative">
                        {formData.logo_url || formData.business_logo ? (
                          <img
                            src={formData.logo_url || formData.business_logo}
                            alt="Preview"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Store className="w-8 h-8 opacity-40 mb-1" />
                            <span className="text-[10px]">Logo Toko Online</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                          {window.location.hostname}
                        </span>
                        <p className="text-xs font-bold text-foreground line-clamp-1">
                          {formData.businessName || "Toko Saya"} - Belanja Online Resmi
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {formData.description || `${formData.businessName || "Toko Kami"} - ${formData.tagline || "Pemesanan produk praktis, cepat, dan terpercaya."}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-muted-foreground">12:30 ✓✓</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border text-xs space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Endpoint Open Graph Server-Side Aktif:
                  </p>
                  <code className="text-[10px] block p-1.5 bg-background rounded font-mono break-all border">
                    {window.location.origin}/api/store/og/{activeSlug}/product/[ID_PRODUK]
                  </code>
                </div>
              </div>
            </ColoredCard>

            {/* Google Search Result Simulator Card */}
            <ColoredCard icon={Search} iconColor="blue" title="Simulator Cuplikan Google Search (SEO)">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pratinjau bagaimana toko online Anda muncul di halaman hasil pencarian Google Search lengkap dengan Schema.org JSON-LD:
                </p>

                {/* Google SERP Mockup */}
                <div className="bg-card p-4 rounded-xl border shadow-xs space-y-1.5 font-sans">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0">
                      {formData.favicon_url || formData.faviconUrl ? (
                        <img src={formData.favicon_url || formData.faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        (formData.businessName || "T")[0]
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs text-foreground font-medium truncate">{formData.businessName || "Toko Saya"}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate -mt-0.5">
                        {window.location.origin} › {activeSlug}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    {formData.businessName || "Toko Saya"} - Belanja Online Resmi
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {formData.description || `Belanja online mudah, aman, dan cepat di ${formData.businessName || "Toko Kami"}. Produk original bergaransi dengan pilihan pengiriman lengkap.`}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl border text-xs space-y-1.5">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    Structured Data (Schema.org):
                  </p>
                  <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                    <li><code>@type: Store</code> (Untuk halaman beranda katalog)</li>
                    <li><code>@type: Product</code> &amp; <code>Offer</code> (Untuk setiap detail produk dengan harga &amp; ketersediaan stok)</li>
                  </ul>
                </div>
              </div>
            </ColoredCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL DIALOG: EDIT / TAMBAH ULASAN */}
      <Dialog open={isEditingReview} onOpenChange={setIsEditingReview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingReviewData.id ? "Edit Ulasan Pelanggan" : "Tambah Ulasan Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ulasan ini akan muncul di bagian testimoni toko online Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reviewName" className="text-xs font-semibold">Nama Pembeli</Label>
                <Input
                  id="reviewName"
                  value={editingReviewData.name}
                  onChange={(e) => setEditingReviewData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Siti Rahma"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reviewCity" className="text-xs font-semibold">Kota / Asal</Label>
                <Input
                  id="reviewCity"
                  value={editingReviewData.city}
                  onChange={(e) => setEditingReviewData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Contoh: Bandung"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rating Bintang</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setEditingReviewData((prev) => ({ ...prev, rating: star }))}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= editingReviewData.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold ml-2 text-foreground">{editingReviewData.rating} dari 5</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reviewComment" className="text-xs font-semibold">Komentar / Ulasan</Label>
              <Textarea
                id="reviewComment"
                value={editingReviewData.comment}
                onChange={(e) => setEditingReviewData((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="Tulis testimoni pembeli mengenai produk atau pelayanan toko..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reviewDate" className="text-xs font-semibold">Waktu / Tanggal</Label>
              <Input
                id="reviewDate"
                value={editingReviewData.date || ""}
                onChange={(e) => setEditingReviewData((prev) => ({ ...prev, date: e.target.value }))}
                placeholder="Contoh: 2 hari lalu atau 12 Mei 2026"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsEditingReview(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveReviewModal}>
              Simpan Ulasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
