import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredCard } from "@/components/ui/colored-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Store,
  CreditCard,
  Printer,
  Bell,
  Shield,
  Palette,
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Loader2,
  Type,
  Eye,
  Moon,
  Sun,
  Check,
  Copy,
  Mail,
  Send,
  MonitorSmartphone,
  ExternalLink,
  Lock,
  Tag,
  Barcode,
  Globe,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Trash2,
  Star,
  MessageSquare,
  Plus,
  Phone,
  Share2,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFontSize, FontSize, fontSizeLabels } from "@/contexts/FontSizeContext";
import { useTheme, themeColors, fontOptions, ThemeColor, FontFamily } from "@/contexts/ThemeContext";
import api from "@/lib/api";
import { DeviceStatusPanel } from "@/components/DeviceStatusPanel";

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
    date: "Baru saja"
  },
  {
    id: "rev-2",
    name: "Budi Santoso",
    city: "Surabaya",
    rating: 5,
    comment: "Langganan belanja produk di sini. Selalu original, kualitas terjamin dan pengiriman cepat.",
    date: "2 hari lalu"
  },
  {
    id: "rev-3",
    name: "Dewi Lestari",
    city: "Jakarta Selatan",
    rating: 5,
    comment: "Pesan pagi, sore langsung dikirim. Respon pemesanan via WhatsApp sangat ramah dan solutif.",
    date: "1 minggu lalu"
  }
];

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
}

interface PromoCodeSetting {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  description?: string;
  is_active: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const { state, saveSettings } = useApp();
  const { user, isAdmin, isSuperAdmin, updateUser, refreshUser } = useAuth();
  const { fontSize, setFontSize, fontSizeValue } = useFontSize();
  const { themeColor, setThemeColor, fontFamily, setFontFamily, isDarkMode, toggleDarkMode } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedTargetHost, setCopiedTargetHost] = useState(false);
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
  const [activeTab, setActiveTab] = useState("store");
  const [formData, setFormData] = useState({
    ...state.settings,
    shop_slug: user?.shop_slug || '',
    custom_domain: state.settings?.custom_domain || '',
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...state.settings,
      shop_slug: prev.shop_slug || user?.shop_slug || '',
      custom_domain: state.settings?.custom_domain !== undefined ? state.settings.custom_domain : (prev.custom_domain || ''),
    }));
    if (state.settings.theme_color && state.settings.theme_color !== themeColor) {
      if (themeColors[state.settings.theme_color as ThemeColor]) {
        setThemeColor(state.settings.theme_color as ThemeColor);
      }
    }
  }, [state.settings]);

  useEffect(() => {
    if (user?.shop_slug) {
      setFormData(prev => ({
        ...prev,
        shop_slug: user.shop_slug || prev.shop_slug
      }));
    }
  }, [user?.shop_slug]);

  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Online Store Toggle Handler
  const handleToggleOnlineStore = (checked: boolean) => {
    setFormData(prev => ({ ...prev, onlineStoreEnabled: checked }));
  };

  // SMTP Settings State
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: true
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const [promoCodes, setPromoCodes] = useState<PromoCodeSetting[]>([]);
  const [isLoadingPromo, setIsLoadingPromo] = useState(false);
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percent' | 'fixed'>('fixed');
  const [newPromoValue, setNewPromoValue] = useState('');
  const [newPromoDescription, setNewPromoDescription] = useState('');
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const bgPresets = [
    { name: 'Modern Cafe', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop', icon: '☕' },
    { name: 'Supermarket', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1600&auto=format&fit=crop', icon: '🏬' },
    { name: 'Boutique Fashion', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop', icon: '👗' },
    { name: 'Dark Luxury', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop', icon: '🌌' },
    { name: 'Minimalist Studio', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop', icon: '🌿' },
  ];

  const handleUploadBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    setIsUploadingBg(true);
    try {
      const res = await api.post('/products/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.imageUrl) {
        setFormData(prev => ({ ...prev, authBackground: res.data.imageUrl }));
        toast.success("Foto background berhasil diupload! Klik 'Simpan Perubahan' untuk mengaktifkan.");
      }
    } catch (err: any) {
      toast.error("Gagal mengupload gambar background");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleSelectPresetBg = (url: string) => {
    setFormData(prev => ({ ...prev, authBackground: url }));
    toast.success("Preset background dipilih! Klik 'Simpan Perubahan' untuk menerapkan.");
  };

  const handleClearBg = () => {
    setFormData(prev => ({ ...prev, authBackground: '' }));
    toast.info("Background login direset ke default.");
  };

  // Logo & Favicon Upload State & Handlers
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  const handleUploadLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file logo maksimal 5MB");
      return;
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    setIsUploadingLogo(true);
    try {
      const res = await api.post('/products/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.imageUrl) {
        setFormData(prev => ({ 
          ...prev, 
          logoUrl: res.data.imageUrl,
          businessLogo: res.data.imageUrl 
        }));
        toast.success("Logo toko berhasil diupload! Klik 'Simpan Perubahan' untuk mengaktifkan.");
      }
    } catch (err: any) {
      toast.error("Gagal mengupload logo toko");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleClearLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: '', businessLogo: '' }));
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
    uploadData.append('image', file);

    setIsUploadingFavicon(true);
    try {
      const res = await api.post('/products/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.imageUrl) {
        setFormData(prev => ({ 
          ...prev, 
          faviconUrl: res.data.imageUrl,
          favicon_url: res.data.imageUrl 
        }));
        // Instant visual feedback in current browser tab
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.head.appendChild(link);
        }
        link.href = res.data.imageUrl;
        toast.success("Favicon berhasil diupload! Klik 'Simpan Perubahan' untuk mengaktifkan.");
      }
    } catch (err: any) {
      toast.error("Gagal mengupload favicon toko");
    } finally {
      setIsUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
  };

  const handleClearFavicon = () => {
    setFormData(prev => ({ ...prev, faviconUrl: '', favicon_url: '' }));
    toast.info("Favicon toko direset ke default.");
  };

  // Review List State & Handlers
  const [reviewList, setReviewList] = useState<StoreReviewItem[]>(() => {
    try {
      if (state.settings.store_reviews) {
        const parsed = JSON.parse(state.settings.store_reviews);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultStoreReviews;
  });

  useEffect(() => {
    if (state.settings.store_reviews) {
      try {
        const parsed = JSON.parse(state.settings.store_reviews);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviewList(parsed);
        }
      } catch (e) {}
    }
  }, [state.settings.store_reviews]);

  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editingReviewData, setEditingReviewData] = useState<StoreReviewItem>({
    id: '',
    name: '',
    city: '',
    rating: 5,
    comment: '',
    date: 'Baru saja'
  });

  const handleOpenAddReview = () => {
    setEditingReviewData({
      id: '',
      name: '',
      city: '',
      rating: 5,
      comment: '',
      date: 'Baru saja'
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
      updated = reviewList.map(r => r.id === editingReviewData.id ? editingReviewData : r);
    } else {
      updated = [{ ...editingReviewData, id: `rev-${Date.now()}` }, ...reviewList];
    }
    setReviewList(updated);
    handleInputChange('store_reviews', JSON.stringify(updated));
    setIsEditingReview(false);
    toast.success("Ulasan berhasil disimpan! Klik 'Simpan Perubahan' di pojok atas untuk memperbarui toko.");
  };

  const handleDeleteReview = (id: string) => {
    const updated = reviewList.filter(r => r.id !== id);
    setReviewList(updated);
    handleInputChange('store_reviews', JSON.stringify(updated));
    toast.success("Ulasan dihapus! Klik 'Simpan Perubahan' untuk memperbarui.");
  };

  // Load SMTP & Promo settings
  useEffect(() => {
    if (isSuperAdmin) {
      loadSmtpSettings();
    }
    if (isAdmin) {
      loadPromoCodes();
    }
  }, [isAdmin, isSuperAdmin]);

  const loadSmtpSettings = async () => {
    try {
      const res = await api.get('/admin/smtp-settings');
      setSmtpSettings({
        smtp_host: res.data.smtp_host || 'smtp.gmail.com',
        smtp_port: res.data.smtp_port || 465,
        smtp_user: res.data.smtp_user || '',
        smtp_pass: '',
        smtp_secure: res.data.smtp_secure === 1
      });
    } catch (error) {
      console.error("Gagal memuat pengaturan SMTP:", error);
    }
  };

  const loadPromoCodes = async () => {
    setIsLoadingPromo(true);
    try {
      const res = await api.get('/promo-codes');
      if (res.data && Array.isArray(res.data)) {
        setPromoCodes(res.data);
      }
    } catch (error) {
      console.error("Gagal memuat kode promo:", error);
    } finally {
      setIsLoadingPromo(false);
    }
  };

  const handleSmtpChange = (field: keyof SmtpSettings, value: any) => {
    setSmtpSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true);
    try {
      await api.put('/admin/smtp-settings', smtpSettings);
      toast.success("Pengaturan SMTP berhasil disimpan");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan SMTP");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toast.error("Masukkan email tujuan test");
      return;
    }
    setIsTestingSmtp(true);
    try {
      await api.post('/admin/test-smtp', { email: testEmail });
      toast.success(`Email test berhasil dikirim ke ${testEmail}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengirim email test");
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleAddPromoCode = () => {
    const code = newPromoCode.trim().toUpperCase();
    const value = parseFloat(newPromoValue);

    if (!code) {
      toast.error("Kode promo tidak boleh kosong");
      return;
    }

    if (!value || value <= 0) {
      toast.error("Nilai promo harus lebih dari 0");
      return;
    }

    setPromoCodes(prev => {
      const filtered = prev.filter(p => p.code.toUpperCase() !== code);
      return [
        ...filtered,
        {
          id: `local-${Date.now()}`,
          code,
          type: newPromoType,
          value,
          description: newPromoDescription || undefined,
          is_active: true,
        }
      ];
    });

    setNewPromoCode('');
    setNewPromoValue('');
    setNewPromoDescription('');
  };

  const handleTogglePromoActive = (id: string) => {
    setPromoCodes(prev =>
      prev.map(code =>
        code.id === id ? { ...code, is_active: !code.is_active } : code
      )
    );
  };

  const handleRemovePromoCode = (id: string) => {
    setPromoCodes(prev => prev.filter(code => code.id !== id));
  };

  const handleSavePromoCodes = async () => {
    setIsSavingPromo(true);
    try {
      const payload = promoCodes.map(code => ({
        code: code.code.toUpperCase(),
        type: code.type,
        value: code.value,
        description: code.description || '',
        is_active: code.is_active,
      }));

      await api.put('/promo-codes', { codes: payload });
      toast.success("Kode promo berhasil disimpan");
      await loadPromoCodes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan kode promo");
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSlug = async () => {
    const cleanSlug = formData.shop_slug?.trim().toLowerCase();
    if (!cleanSlug) {
      toast.error("Slug toko tidak boleh kosong");
      return;
    }

    setIsSavingSlug(true);
    try {
      const res = await api.put('/auth/update-slug', { shop_slug: cleanSlug });
      const updatedSlug = res.data?.shop_slug || cleanSlug;
      updateUser({ shop_slug: updatedSlug });
      setFormData(prev => ({ ...prev, shop_slug: updatedSlug }));
      toast.success("Alamat web toko online berhasil disimpan!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan alamat toko");
    } finally {
      setIsSavingSlug(false);
    }
  };

  const handleCopyLink = () => {
    const activeSlug = formData.shop_slug || user?.shop_slug || 'shop';
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
      const res = await api.post('/settings/verify-domain', { domain });
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

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const cleanSlug = formData.shop_slug?.trim().toLowerCase();
      if (cleanSlug && cleanSlug !== user?.shop_slug) {
        try {
          const slugRes = await api.put('/auth/update-slug', { shop_slug: cleanSlug });
          const updatedSlug = slugRes.data?.shop_slug || cleanSlug;
          updateUser({ shop_slug: updatedSlug });
        } catch (slugErr: any) {
          toast.error(slugErr.response?.data?.error || "Gagal memperbarui alamat web toko");
        }
      }

      await saveSettings({
        ...formData,
        theme_color: themeColor,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan pengaturan ke default?')) {
      setFormData({
        ...state.settings,
        shop_slug: user?.shop_slug || '',
        custom_domain: state.settings?.custom_domain || ''
      });
      toast.info("Pengaturan direset");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password baru harus minimal 6 karakter");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        newPassword,
        new_password: newPassword,
        password: newPassword,
      });
      toast.success("Password berhasil diubah");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengubah password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            Pengaturan Sistem
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola identitas toko, preferensi transaksi, tema tampilan, dan koneksi perangkat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-primary hover:opacity-90 shadow-sm">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="store" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto bg-card border p-1 rounded-xl gap-1 h-auto scrollbar-hide">
          <TabsTrigger value="store" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Store className="w-4 h-4 mr-2" />
            Profil & Toko
          </TabsTrigger>
          <TabsTrigger value="pos" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <CreditCard className="w-4 h-4 mr-2" />
            Transaksi & Struk
          </TabsTrigger>
          <TabsTrigger value="theme" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Palette className="w-4 h-4 mr-2" />
            Tema & Tampilan
          </TabsTrigger>
          <TabsTrigger value="devices" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <MonitorSmartphone className="w-4 h-4 mr-2" />
            Perangkat Hardware
          </TabsTrigger>
          <TabsTrigger value="security" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
            <Shield className="w-4 h-4 mr-2" />
            Keamanan & Server
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFIL & TOKO */}
        <TabsContent value="store" className="space-y-6 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Menu Khusus Konfigurasi Toko Online Tersedia!</h3>
                <p className="text-xs text-muted-foreground">
                  Kelola logo &amp; favicon, custom slug &amp; domain, tema warna, WhatsApp CS, dan ulasan di menu storefront terpisah.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/storefront-settings')} className="shrink-0 text-xs font-semibold cursor-pointer">
              Buka Konfigurasi Toko Online
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Identitas Bisnis & Brand */}
            <ColoredCard icon={Store} iconColor="blue" title="Informasi Identitas Bisnis &amp; Brand">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="businessName" className="text-xs font-semibold">Nama Bisnis / Toko</Label>
                    <Input id="businessName" value={formData.businessName} onChange={(e) => handleInputChange('businessName', e.target.value)} placeholder="Masukkan nama toko" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="businessPhone" className="text-xs font-semibold">Nomor Telepon Toko</Label>
                    <Input id="businessPhone" value={formData.businessPhone} onChange={(e) => handleInputChange('businessPhone', e.target.value)} placeholder="081234567890" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="businessEmail" className="text-xs font-semibold">Email Resmi Bisnis</Label>
                    <Input id="businessEmail" type="email" value={formData.businessEmail} onChange={(e) => handleInputChange('businessEmail', e.target.value)} placeholder="toko@domain.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tagline" className="text-xs font-semibold">Slogan / Tagline Toko Online</Label>
                    <Input id="tagline" value={formData.tagline || ''} onChange={(e) => handleInputChange('tagline', e.target.value)} placeholder="Contoh: Sehat Alami, Hidup Harmoni" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">Deskripsi Singkat Toko Online</Label>
                  <Input id="description" value={formData.description || ''} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Deskripsi singkat produk dan layanan toko Anda..." />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessAddress" className="text-xs font-semibold">Alamat Lengkap Toko</Label>
                  <Textarea id="businessAddress" value={formData.businessAddress} onChange={(e) => handleInputChange('businessAddress', e.target.value)} placeholder="Alamat lengkap toko / usaha..." rows={2} />
                </div>

                {/* Visual Branding Section: Logo & Favicon Upload */}
                <div className="pt-3 border-t space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Identitas Visual (Logo &amp; Favicon Toko)
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload logo toko untuk etalase &amp; struk, serta icon favicon untuk tab browser pelanggan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Upload Logo Toko */}
                    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                            Logo Toko Online
                          </Label>
                          {(formData.logoUrl || formData.businessLogo) && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              Terpasang
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Format PNG, JPG, SVG, WebP (Maks 5MB)
                        </p>
                      </div>

                      {/* Logo Preview Box */}
                      <div className="relative rounded-lg border border-dashed border-border bg-card/60 p-3 flex flex-col items-center justify-center min-h-[110px] overflow-hidden group">
                        {(formData.logoUrl || formData.businessLogo) ? (
                          <div className="relative w-full flex items-center justify-center">
                            <img 
                              src={formData.logoUrl || formData.businessLogo} 
                              alt="Logo Toko" 
                              className="max-h-20 max-w-full object-contain drop-shadow-xs"
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
                            className="flex flex-col items-center justify-center text-center cursor-pointer p-2 hover:opacity-80 transition-opacity"
                          >
                            <div className="p-2 rounded-full bg-muted text-muted-foreground mb-1.5">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-foreground">Pilih File Logo</span>
                            <span className="text-[10px] text-muted-foreground">Klik untuk upload file foto logo</span>
                          </div>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input 
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogoFile}
                        className="hidden"
                      />

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full text-xs h-8 cursor-pointer"
                        >
                          {isUploadingLogo ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              Mengupload Logo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 mr-1.5" />
                              {(formData.logoUrl || formData.businessLogo) ? 'Ganti Logo Toko' : 'Upload File Logo'}
                            </>
                          )}
                        </Button>
                        <Input 
                          value={formData.logoUrl || ''} 
                          onChange={(e) => {
                            handleInputChange('logoUrl', e.target.value);
                            handleInputChange('businessLogo', e.target.value);
                          }} 
                          placeholder="Atau URL logo (https://...)"
                          className="text-[11px] h-7 font-mono"
                        />
                      </div>
                    </div>

                    {/* 2. Upload Favicon Toko */}
                    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-emerald-500" />
                            Favicon (Icon Tab Browser)
                          </Label>
                          {(formData.favicon_url || formData.faviconUrl) && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              Terpasang
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Icon tab browser (PNG, ICO, SVG maks 2MB)
                        </p>
                      </div>

                      {/* Browser Tab Mock Preview */}
                      <div className="rounded-lg border bg-muted/60 p-2.5 space-y-1.5 select-none min-h-[110px] flex flex-col justify-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-400"></div>
                          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                          <span className="text-[9px] text-muted-foreground font-mono ml-1">Pratinjau Tab Browser:</span>
                        </div>
                        <div className="flex items-center justify-between bg-card px-2.5 py-1.5 rounded-md border shadow-xs text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {(formData.favicon_url || formData.faviconUrl) ? (
                              <img 
                                src={formData.favicon_url || formData.faviconUrl} 
                                alt="Favicon" 
                                className="w-4 h-4 object-contain rounded-xs shrink-0"
                              />
                            ) : (formData.logoUrl || formData.businessLogo) ? (
                              <img 
                                src={formData.logoUrl || formData.businessLogo} 
                                alt="Favicon Fallback" 
                                className="w-4 h-4 object-contain rounded-xs shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-xs bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                {(formData.businessName || 'T')[0]}
                              </div>
                            )}
                            <span className="font-semibold text-foreground truncate text-[11px]">
                              {formData.businessName || 'Toko Saya'} - Toko Online
                            </span>
                          </div>
                          {(formData.favicon_url || formData.faviconUrl) && (
                            <button 
                              type="button"
                              onClick={handleClearFavicon}
                              className="text-muted-foreground hover:text-destructive text-xs ml-1 shrink-0 p-0.5 cursor-pointer"
                              title="Reset Favicon"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hidden Favicon File Input */}
                      <input 
                        ref={faviconInputRef}
                        type="file"
                        accept="image/png,image/x-icon,image/jpeg,image/svg+xml,image/webp,.ico"
                        onChange={handleUploadFaviconFile}
                        className="hidden"
                      />

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingFavicon}
                          onClick={() => faviconInputRef.current?.click()}
                          className="w-full text-xs h-8 cursor-pointer"
                        >
                          {isUploadingFavicon ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              Mengupload Favicon...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 mr-1.5" />
                              {(formData.favicon_url || formData.faviconUrl) ? 'Ganti Favicon' : 'Upload File Favicon'}
                            </>
                          )}
                        </Button>
                        <Input 
                          value={formData.favicon_url || formData.faviconUrl || ''} 
                          onChange={(e) => {
                            handleInputChange('favicon_url', e.target.value);
                            handleInputChange('faviconUrl', e.target.value);
                          }} 
                          placeholder="Atau URL favicon (https://...)"
                          className="text-[11px] h-7 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ColoredCard>

            {/* Card 2: Toko Online & Custom Slug */}
            <ColoredCard icon={Globe} iconColor="green" title="Toko Online &amp; URL Publik">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Status Toko Online</p>
                      <p className="text-xs text-muted-foreground">
                        {formData.onlineStoreEnabled ? 'Aktif - pelanggan dapat memesan secara publik' : 'Nonaktif - halaman toko publik ditutup'}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={formData.onlineStoreEnabled} 
                    onCheckedChange={handleToggleOnlineStore} 
                  />
                </div>

                {formData.onlineStoreEnabled && (
                  <div className="p-4 bg-muted/60 rounded-xl space-y-4 border">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="shopSlug" className="text-xs font-semibold">Custom Slug (Alamat Web Toko)</Label>
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
                          value={formData.shop_slug || ''} 
                          onChange={(e) => handleInputChange('shop_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
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
                          {isSavingSlug ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Simpan Slug
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Gunakan huruf kecil, angka, dan tanda hubung (-). Contoh: <code>hana</code>
                      </p>
                    </div>

                    <div className="p-3 bg-card rounded-lg border border-dashed border-primary/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Link Halaman Katalog Toko:</p>
                        <a 
                          href={`/${formData.shop_slug || user?.shop_slug || 'shop'}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs font-mono font-medium truncate block mt-0.5"
                        >
                          {window.location.origin}/{formData.shop_slug || user?.shop_slug || 'shop'}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyLink}
                          className="h-8 text-xs gap-1.5"
                        >
                          {copiedSlug ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedSlug ? "Tersalin!" : "Salin Link"}
                        </Button>
                        <a
                          href={`/${formData.shop_slug || user?.shop_slug || 'shop'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors shrink-0 font-medium h-8"
                        >
                          Buka <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* FULL CUSTOM DOMAIN SECTION */}
                    <div className="pt-4 border-t border-border/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          <Label htmlFor="custom_domain" className="text-xs font-bold text-foreground">
                            Custom Domain Pribadi Toko
                          </Label>
                        </div>
                        {formData.custom_domain ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono">
                            {formData.custom_domain}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                            Belum Dikonfigurasi
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="bg-background px-3 py-2 rounded-md text-xs text-muted-foreground border font-mono shrink-0">
                            https://
                          </div>
                          <Input 
                            id="custom_domain" 
                            value={formData.custom_domain || ''} 
                            onChange={(e) => handleInputChange('custom_domain', e.target.value.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))}
                            placeholder="tokosaya.com atau shop.tokosaya.com"
                            className="flex-1 font-mono text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleVerifyDomain}
                            disabled={isVerifyingDomain || !formData.custom_domain}
                            className="shrink-0 h-9 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                          >
                            {isVerifyingDomain ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                            {isVerifyingDomain ? "Mengecek DNS..." : "Verifikasi DNS"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Masukkan nama domain milik toko Anda tanpa <code>http://</code> atau <code>https://</code>. Klik <strong>Simpan Perubahan</strong> di atas untuk menyimpan.
                        </p>
                      </div>

                      {/* DNS Verification Results Alert */}
                      {verifyDomainResult && (
                        <div className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                          verifyDomainResult.isMatched 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" 
                            : verifyDomainResult.resolved 
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                        }`}>
                          <div className="flex items-start gap-2">
                            {verifyDomainResult.isMatched ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                            ) : verifyDomainResult.resolved ? (
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                            )}
                            <div className="space-y-1 flex-1">
                              <p className="font-semibold">{verifyDomainResult.message}</p>
                              {verifyDomainResult.cname && (
                                <p className="font-mono text-[11px] opacity-80">CNAME Terdeteksi: <strong>{verifyDomainResult.cname}</strong></p>
                              )}
                              {verifyDomainResult.ips && verifyDomainResult.ips.length > 0 && (
                                <p className="font-mono text-[11px] opacity-80">IP Terdeteksi: <strong>{verifyDomainResult.ips.join(', ')}</strong></p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DNS Setup Guide Card */}
                      <div className="p-3.5 bg-background/80 rounded-xl border space-y-2.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Info className="w-3.5 h-3.5 text-primary" />
                          <span>Panduan Konfigurasi DNS di Registrar Domain Anda:</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Buka dashboard pengelola domain Anda (misal <i>Niagahoster, Domainesia, Rumahweb, Cloudflare, Namecheap</i>), lalu tambahkan DNS record berikut:
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                          <div className="p-2.5 bg-muted/60 rounded-lg border flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground font-sans uppercase font-bold">Jenis Record (Type)</p>
                              <p className="font-semibold text-foreground">CNAME</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">Rekomendasi</Badge>
                          </div>
                          <div className="p-2.5 bg-muted/60 rounded-lg border flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground font-sans uppercase font-bold">Nama Host (Name)</p>
                              <p className="font-semibold text-foreground">@ / www / subdomain</p>
                            </div>
                          </div>
                          <div className="p-2.5 bg-muted/60 rounded-lg border sm:col-span-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground font-sans uppercase font-bold">Target / Tujuan (Value)</p>
                              <p className="font-semibold text-primary truncate">pos.elvisyam.com</p>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCopyTargetHost("pos.elvisyam.com")}
                              className="h-7 text-[10px] shrink-0 gap-1 font-sans"
                            >
                              {copiedTargetHost ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              {copiedTargetHost ? "Tersalin" : "Salin Target"}
                            </Button>
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground italic">
                          Catatan: Setelah mengatur DNS di registrar, perubahan biasanya membutuhkan waktu propagasi 5-30 menit.
                        </p>
                      </div>

                      {/* Active Custom Domain Link Banner */}
                      {formData.custom_domain && (
                        <div className="p-3 bg-card rounded-lg border border-dashed border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Link Domain Toko:</p>
                            <a 
                              href={`https://${formData.custom_domain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-mono font-medium truncate block mt-0.5"
                            >
                              https://{formData.custom_domain}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyDomain(formData.custom_domain)}
                              className="h-8 text-xs gap-1.5"
                            >
                              {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedDomain ? "Tersalin!" : "Salin Link"}
                            </Button>
                            <a
                              href={`https://${formData.custom_domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-md hover:bg-emerald-500/20 transition-colors shrink-0 font-medium h-8"
                            >
                              Buka Domain <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ColoredCard>

            {/* Card 3: Kontak & Media Sosial & Footer */}
            <ColoredCard icon={Share2} iconColor="purple" title="Kontak, Media Sosial &amp; Footer Toko">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp_number" className="text-xs font-semibold flex items-center justify-between">
                    <span>Nomor WhatsApp Pemesanan Publik</span>
                    <span className="text-[10px] text-muted-foreground">Awali dengan 62 (contoh: 6281234567890)</span>
                  </Label>
                  <Input 
                    id="whatsapp_number" 
                    value={formData.whatsapp_number || ''} 
                    onChange={(e) => handleInputChange('whatsapp_number', e.target.value)} 
                    placeholder="6281234567890" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="instagram_url" className="text-xs font-semibold">Link Instagram</Label>
                    <Input 
                      id="instagram_url" 
                      value={formData.instagram_url || ''} 
                      onChange={(e) => handleInputChange('instagram_url', e.target.value)} 
                      placeholder="https://instagram.com/tokosaya" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="facebook_url" className="text-xs font-semibold">Link Facebook</Label>
                    <Input 
                      id="facebook_url" 
                      value={formData.facebook_url || ''} 
                      onChange={(e) => handleInputChange('facebook_url', e.target.value)} 
                      placeholder="https://facebook.com/tokosaya" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="footer_text" className="text-xs font-semibold flex items-center justify-between">
                    <span>Teks Informasi / Tagline Footer</span>
                    <span className="text-[10px] text-muted-foreground">Ditampilkan di bagian bawah toko online</span>
                  </Label>
                  <Textarea 
                    id="footer_text" 
                    value={formData.footer_text || ''} 
                    onChange={(e) => handleInputChange('footer_text', e.target.value)} 
                    placeholder="Pusat produk herbal &amp; kebutuhan berkualitas. Melayani pesanan ke seluruh Indonesia dengan aman dan cepat." 
                    rows={2} 
                  />
                </div>
              </div>
            </ColoredCard>

            {/* Card 4: Manajer Ulasan / Testimoni Pelanggan */}
            <ColoredCard icon={Star} iconColor="amber" title="Manajer Ulasan / Testimoni Pelanggan Toko Online">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Testimoni dinamis ini akan ditampilkan di section review toko online Anda.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenAddReview}
                    className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Tambah Review
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {reviewList.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{rev.name}</span>
                          {rev.city && <span className="text-[10px] text-muted-foreground">({rev.city})</span>}
                          <div className="flex text-amber-500 ml-auto">
                            {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground italic line-clamp-2">"{rev.comment}"</p>
                        {rev.date && <p className="text-[10px] text-muted-foreground/70">{rev.date}</p>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditReview(rev)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="h-7 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {reviewList.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-xl">
                      Belum ada ulasan yang dibuat. Klik tombol "+ Tambah Review" di atas.
                    </div>
                  )}
                </div>
              </div>
            </ColoredCard>
          </div>

          {/* Modal Edit / Tambah Review */}
          {isEditingReview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-card w-full max-w-md p-5 rounded-2xl border shadow-xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    {editingReviewData.id ? 'Edit Ulasan Pelanggan' : 'Tambah Ulasan Pelanggan Baru'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingReview(false)} 
                    className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama Pelanggan</Label>
                      <Input
                        value={editingReviewData.name}
                        onChange={(e) => setEditingReviewData({ ...editingReviewData, name: e.target.value })}
                        placeholder="Contoh: Siti Rahma"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Kota / Wilayah</Label>
                      <Input
                        value={editingReviewData.city}
                        onChange={(e) => setEditingReviewData({ ...editingReviewData, city: e.target.value })}
                        placeholder="Contoh: Bandung"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Rating Bintang</Label>
                      <select
                        value={editingReviewData.rating}
                        onChange={(e) => setEditingReviewData({ ...editingReviewData, rating: parseInt(e.target.value) || 5 })}
                        className="w-full h-9 px-3 border border-input bg-background rounded-md text-xs"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5 Bintang)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Bintang)</option>
                        <option value="3">⭐⭐⭐ (3 Bintang)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Keterangan Waktu</Label>
                      <Input
                        value={editingReviewData.date || ''}
                        onChange={(e) => setEditingReviewData({ ...editingReviewData, date: e.target.value })}
                        placeholder="Contoh: Baru saja, 2 hari lalu"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Isi Ulasan / Testimoni</Label>
                    <Textarea
                      value={editingReviewData.comment}
                      onChange={(e) => setEditingReviewData({ ...editingReviewData, comment: e.target.value })}
                      placeholder="Tuliskan pengalaman pelanggan saat berbelanja..."
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingReview(false)}
                    className="text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveReviewModal}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Simpan Ulasan
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: TRANSAKSI & STRUK */}
        <TabsContent value="pos" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ColoredCard icon={CreditCard} iconColor="blue" title="Pengaturan Kasir & Struk">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="taxRate" className="text-xs font-semibold">Pajak (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.taxRate}
                      onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="defaultDiscount" className="text-xs font-semibold">Diskon Default (Rp)</Label>
                    <Input
                      id="defaultDiscount"
                      type="number"
                      min="0"
                      value={formData.defaultDiscount}
                      onChange={(e) => handleInputChange('defaultDiscount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-semibold">Mata Uang</Label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    >
                      <option value="IDR">Rupiah (IDR)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiptTemplate" className="text-xs font-semibold">Format Layout Struk</Label>
                  <select
                    id="receiptTemplate"
                    value={formData.receiptTemplate}
                    onChange={(e) => handleInputChange('receiptTemplate', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="default">Default Standard Thermal (58mm/80mm)</option>
                    <option value="minimal">Minimalis Ringkas</option>
                    <option value="detailed">Lengkap Detail Transaksi</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiptFooter" className="text-xs font-semibold">Pesan Kaki Struk (Footer Note)</Label>
                  <Textarea
                    id="receiptFooter"
                    value={formData.receiptFooter || ''}
                    onChange={(e) => handleInputChange('receiptFooter', e.target.value)}
                    placeholder="Terima kasih atas kunjungan Anda! Barang yang sudah dibeli tidak dapat ditukar."
                    rows={3}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Pesan ucapan atau syarat garansi di bagian bawah nota cetak.
                  </p>
                </div>
              </div>
            </ColoredCard>

            <ColoredCard icon={Sparkles} iconColor="purple" title="Pengaturan Loyalty Poin & Member">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="minSpendForMember" className="text-xs font-semibold">Min. Belanja Kualifikasi Member (Rp)</Label>
                    <Input
                      id="minSpendForMember"
                      type="number"
                      value={formData.minSpendForMember || 100000}
                      onChange={(e) => handleInputChange('minSpendForMember', parseFloat(e.target.value) || 0)}
                      placeholder="100000"
                    />
                    <p className="text-[10px] text-muted-foreground">Akumulasi belanja minimal agar pembeli otomatis jadi Member.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pointRate" className="text-xs font-semibold">Rasio Perolehan Poin (Rp)</Label>
                    <Input
                      id="pointRate"
                      type="number"
                      value={formData.pointRate || 10000}
                      onChange={(e) => handleInputChange('pointRate', parseFloat(e.target.value) || 0)}
                      placeholder="10000"
                    />
                    <p className="text-[10px] text-muted-foreground">Setiap belanja kelipatan ini = dapat 1 Poin.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pointValue" className="text-xs font-semibold">Nilai 1 Poin (Rp)</Label>
                    <Input
                      id="pointValue"
                      type="number"
                      value={formData.pointValue || 100}
                      onChange={(e) => handleInputChange('pointValue', parseFloat(e.target.value) || 0)}
                      placeholder="100"
                    />
                    <p className="text-[10px] text-muted-foreground">1 Poin = Rp potongan harga.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="goldThreshold" className="text-xs font-semibold">Batas Member Gold (Rp)</Label>
                    <Input
                      id="goldThreshold"
                      type="number"
                      value={formData.goldThreshold || 1000000}
                      onChange={(e) => handleInputChange('goldThreshold', parseFloat(e.target.value) || 0)}
                      placeholder="1000000"
                    />
                    <p className="text-[10px] text-muted-foreground">Gold = 1.5x Poin multiplier.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="platinumThreshold" className="text-xs font-semibold">Batas Platinum / VIP (Rp)</Label>
                    <Input
                      id="platinumThreshold"
                      type="number"
                      value={formData.platinumThreshold || 5000000}
                      onChange={(e) => handleInputChange('platinumThreshold', parseFloat(e.target.value) || 0)}
                      placeholder="5000000"
                    />
                    <p className="text-[10px] text-muted-foreground">Platinum = 2x Poin multiplier.</p>
                  </div>
                </div>
              </div>
            </ColoredCard>

            {/* Promo Codes */}
            {isAdmin && (
              <ColoredCard icon={Tag} iconColor="green" title="Manajemen Kode Promo">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Buat kupon potongan nota yang dapat digunakan kasir saat checkout.
                    </p>
                    {isLoadingPromo && (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Memuat...
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-muted/50 rounded-xl space-y-3 border">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Kode (mis. PROMO10)"
                        value={newPromoCode}
                        onChange={(e) => setNewPromoCode(e.target.value)}
                        className="text-sm uppercase font-mono"
                      />
                      <select
                        value={newPromoType}
                        onChange={(e) => setNewPromoType(e.target.value === 'fixed' ? 'fixed' : 'percent')}
                        className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="fixed">Nominal (Rp)</option>
                        <option value="percent">Persen (%)</option>
                      </select>
                      <Input
                        type="number"
                        placeholder={newPromoType === 'percent' ? 'Nilai %' : 'Nilai Rp'}
                        value={newPromoValue}
                        onChange={(e) => setNewPromoValue(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Keterangan promo (opsional)"
                        value={newPromoDescription}
                        onChange={(e) => setNewPromoDescription(e.target.value)}
                        className="text-sm flex-1"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddPromoCode}
                        disabled={isLoadingPromo}
                      >
                        Tambah
                      </Button>
                    </div>
                  </div>

                  {promoCodes.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-2 bg-card">
                      {promoCodes.map((code) => (
                        <div
                          key={code.id}
                          className="flex items-center justify-between text-xs py-2 px-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Badge variant={code.is_active ? "default" : "outline"} className="font-mono">
                                {code.code}
                              </Badge>
                              <span className="font-semibold text-foreground">
                                {code.type === "percent" ? `${code.value}%` : `Rp ${code.value.toLocaleString('id-ID')}`}
                              </span>
                            </div>
                            {code.description && (
                              <span className="text-[11px] text-muted-foreground mt-0.5">
                                {code.description}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={code.is_active}
                              onCheckedChange={() => handleTogglePromoActive(code.id)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemovePromoCode(code.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4 border rounded-xl">
                      Belum ada kode promo aktif. Tambahkan kupon di atas.
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSavePromoCodes}
                      disabled={isSavingPromo}
                      className="bg-primary text-primary-foreground"
                    >
                      {isSavingPromo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menyimpan promo...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Semua Promo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ColoredCard>
            )}

            {/* 🏷️ Barcode & Label Print Settings Card */}
            <div className="lg:col-span-2">
              <ColoredCard icon={Barcode} iconColor="blue" title="Pengaturan Cetak Stiker Barcode & Label Produk">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Kustomisasi Format Barcode, Jenis Font, Ukuran Font, dan Multi-Kolom
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atur jenis barcode (Code128, EAN-13, QR Code), ukuran font Nama Toko/Produk/Harga, dan preset kertas stiker (33x15mm, 30x20mm, dll.).
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate('/products?openLabelSettings=true')}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-2 h-9 px-4"
                  >
                    <Barcode className="w-4 h-4" />
                    Buka Konfigurasi Barcode
                  </Button>
                </div>
              </ColoredCard>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: TEMA & TAMPILAN */}
        <TabsContent value="theme" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ColoredCard icon={Palette} iconColor="purple" title="Warna Tema Aplikasi">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pilih skema warna utama aplikasi POS yang sesuai dengan identitas toko Anda.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {(Object.keys(themeColors) as ThemeColor[]).map((color) => {
                    const colorValue = themeColors[color];
                    const isSelected = themeColor === color;
                    return (
                      <button
                        key={color}
                        onClick={async () => {
                          setThemeColor(color);
                          handleInputChange('theme_color', color);
                          try {
                            await saveSettings({
                              ...formData,
                              theme_color: color,
                            });
                            toast.success(`Tema diperbarui ke ${themeColors[color].name}`);
                          } catch (err) {
                            // Handled by saveSettings
                          }
                        }}
                        className={`relative group p-1 rounded-xl transition-all duration-200 ${isSelected ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'hover:scale-105'
                          }`}
                        title={colorValue.name}
                      >
                        <div
                          className="w-full aspect-square rounded-lg shadow-md"
                          style={{ backgroundColor: `hsl(${colorValue.primary})` }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                              <Check className="w-3 h-3 text-gray-800" />
                            </div>
                          </div>
                        )}
                        <span className="block text-[10px] text-center mt-1 truncate text-muted-foreground font-medium">
                          {colorValue.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 p-3 bg-muted/60 rounded-xl border">
                  <div
                    className="w-10 h-10 rounded-lg shadow-md shrink-0"
                    style={{ backgroundColor: `hsl(${themeColors[themeColor].primary})` }}
                  />
                  <div>
                    <p className="font-semibold text-sm">{themeColors[themeColor].name}</p>
                    <p className="text-xs text-muted-foreground">Warna tema aktif saat ini</p>
                  </div>
                </div>
              </div>
            </ColoredCard>

            <ColoredCard icon={Eye} iconColor="orange" title="Mode Tampilan & Font">
              <div className="space-y-6">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/60 rounded-xl border">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-warning" />}
                    <div>
                      <p className="font-semibold text-sm">Mode Gelap (Dark Mode)</p>
                      <p className="text-xs text-muted-foreground">
                        {isDarkMode ? 'Mode gelap aktif - nyaman di mata saat malam' : 'Mode terang aktif - cocok di tempat terang'}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                </div>

                {/* Font Choice */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold">Gaya Jenis Font (Typography)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(fontOptions) as FontFamily[]).map((font) => {
                      const fontData = fontOptions[font];
                      const isSelected = fontFamily === font;
                      return (
                        <button
                          key={font}
                          onClick={() => setFontFamily(font)}
                          className={`p-3 rounded-xl border transition-all duration-200 text-left ${isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          style={{ fontFamily: fontData.family }}
                        >
                          <span className="block text-sm font-semibold">{fontData.name}</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">Aa Bb Cc 123</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Ukuran Teks Tampilan</Label>
                    <Badge variant="secondary" className="text-xs">{fontSizeValue}px</Badge>
                  </div>
                  <RadioGroup
                    value={fontSize}
                    onValueChange={(value) => setFontSize(value as FontSize)}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    {(Object.keys(fontSizeLabels) as FontSize[]).map((size) => (
                      <div key={size} className="flex items-center space-x-2">
                        <RadioGroupItem value={size} id={`font-${size}`} />
                        <Label
                          htmlFor={`font-${size}`}
                          className="cursor-pointer flex-1 p-2.5 border rounded-lg hover:bg-accent transition-colors text-center"
                        >
                          <span className="block font-semibold text-xs">{fontSizeLabels[size].split(' (')[0]}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </ColoredCard>

            {/* Card Kustomisasi Background Login */}
            <div className="lg:col-span-2">
              <ColoredCard icon={ImageIcon} iconColor="pink" title="Background Halaman Login (/auth)">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Kustomisasi Wallpaper / Banner Halaman Login Toko
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Unggah foto toko, banner promosi, atau pilih preset visual untuk mempercantik halaman <code>/auth</code>.
                      </p>
                    </div>
                    <a
                      href="/auth"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Pratinjau /auth
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Live Thumbnail Mockup */}
                    <div className="space-y-2 md:col-span-1">
                      <Label className="text-xs font-semibold">Pratinjau Tampilan Login</Label>
                      <div 
                        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border shadow-inner flex items-center justify-center bg-cover bg-center transition-all"
                        style={{
                          backgroundImage: formData.authBackground ? `url("${formData.authBackground}")` : undefined,
                        }}
                      >
                        <div className={`absolute inset-0 ${formData.authBackground ? 'bg-slate-950/60 backdrop-blur-[2px]' : 'bg-gradient-to-br from-primary/20 via-background to-secondary/20'}`} />
                        
                        {/* Miniature Card Mockup */}
                        <div className="relative z-10 w-[78%] bg-card/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-white/20 shadow-xl flex flex-col items-center gap-1.5 text-center">
                          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                            <Store className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                          <span className="text-[10px] font-bold truncate max-w-[120px]">{formData.businessName || 'Toko Saya'}</span>
                          <div className="w-full h-2 bg-muted rounded" />
                          <div className="w-full h-2 bg-muted rounded" />
                          <div className="w-full h-3 bg-primary rounded mt-1" />
                        </div>
                      </div>

                      {formData.authBackground && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearBg}
                          className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Background Kustom
                        </Button>
                      )}
                    </div>

                    {/* Upload Controls & Presets */}
                    <div className="space-y-4 md:col-span-2">
                      {/* Upload File */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">1. Unggah Gambar dari Perangkat</Label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/40 hover:border-primary rounded-xl bg-primary/5 hover:bg-primary/10 transition-all text-xs font-medium text-primary">
                              {isUploadingBg ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Mengunggah Gambar...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Pilih Foto / Banner (JPG, PNG, WebP maks 5MB)
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleUploadBgFile}
                              disabled={isUploadingBg}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">2. Atau Pilih Preset Desain Siap Pakai</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {bgPresets.map((preset) => {
                            const isSelected = formData.authBackground === preset.url;
                            return (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => handleSelectPresetBg(preset.url)}
                                className={`relative group rounded-xl overflow-hidden border text-left transition-all aspect-[16/9] flex flex-col justify-end p-2 bg-cover bg-center ${
                                  isSelected ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]' : 'hover:opacity-90'
                                }`}
                                style={{ backgroundImage: `url("${preset.url}")` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                {isSelected && (
                                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                )}
                                <span className="relative z-10 text-[11px] font-bold text-white truncate drop-shadow-md">
                                  {preset.icon} {preset.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ColoredCard>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: PERANGKAT HARDWARE */}
        <TabsContent value="devices" className="space-y-6 m-0">
          <ColoredCard icon={MonitorSmartphone} iconColor="blue" title="Koneksi Perangkat Hardware Kasir">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Deteksi otomatis dan status printer kasir thermal, barcode scanner USB, dan kamera scan QR.
              </p>
              <DeviceStatusPanel />
            </div>
          </ColoredCard>
        </TabsContent>

        {/* TAB 6: KEAMANAN & SERVER */}
        <TabsContent value="security" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ColoredCard icon={Lock} iconColor="purple" title="Keamanan Akun & Password">
              <div className="space-y-4">
                <div className="p-3 bg-muted/60 rounded-xl border space-y-3">
                  <p className="text-xs font-semibold text-foreground">Ganti Password Akun Login</p>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Masukkan password baru (minimal 6 karakter)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !newPassword}
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Memperbarui...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-card rounded-xl border">
                  <div>
                    <p className="font-semibold text-xs text-foreground">Database Engine</p>
                    <p className="text-xs text-muted-foreground">PostgreSQL Active Connection</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs">Terhubung</Badge>
                </div>
              </div>
            </ColoredCard>

            {/* SMTP Settings */}
            {isSuperAdmin && (
              <ColoredCard icon={Mail} iconColor="red" title="Konfigurasi Email Server SMTP">
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Server pengiriman email otomatis untuk fitur OTP dan reset password.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp_host" className="text-xs font-semibold">SMTP Host</Label>
                      <Input
                        id="smtp_host"
                        value={smtpSettings.smtp_host}
                        onChange={(e) => handleSmtpChange('smtp_host', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp_port" className="text-xs font-semibold">Port</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        value={smtpSettings.smtp_port}
                        onChange={(e) => handleSmtpChange('smtp_port', parseInt(e.target.value) || 465)}
                        placeholder="465"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp_user" className="text-xs font-semibold">Email Pengirim</Label>
                      <Input
                        id="smtp_user"
                        type="email"
                        value={smtpSettings.smtp_user}
                        onChange={(e) => handleSmtpChange('smtp_user', e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp_pass" className="text-xs font-semibold">App Password</Label>
                      <Input
                        id="smtp_pass"
                        type="password"
                        value={smtpSettings.smtp_pass}
                        onChange={(e) => handleSmtpChange('smtp_pass', e.target.value)}
                        placeholder="••••••••"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="smtp_secure"
                      checked={smtpSettings.smtp_secure}
                      onCheckedChange={(checked) => handleSmtpChange('smtp_secure', checked)}
                    />
                    <Label htmlFor="smtp_secure" className="text-xs font-medium cursor-pointer">Gunakan SSL/TLS (Secure)</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveSmtp} disabled={isSavingSmtp} className="flex-1">
                      {isSavingSmtp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="w-4 h-4 mr-2" />Simpan SMTP</>}
                    </Button>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs font-semibold">Uji Coba Pengiriman Email (Test Connection)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Email penerima test"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="text-sm flex-1"
                      />
                      <Button size="sm" variant="outline" onClick={handleTestSmtp} disabled={isTestingSmtp || !testEmail}>
                        {isTestingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Test</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </ColoredCard>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
