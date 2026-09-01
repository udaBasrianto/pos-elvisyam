import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import {
  ArrowRight,
  CheckCircle2,
  Store,
  BarChart3,
  Users,
  Package,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  ShoppingCart,
  Database,
  Loader2,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Headphones,
  TrendingUp,
  Activity
} from "lucide-react";
import api from "@/lib/api";
import { updatePageMeta } from "@/utils/seo";

interface LandingCmsData {
  brandName: string;
  logoUrl?: string;
  brandLogo?: string;
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  stats: Array<{ label: string; value: string }>;
  featuresHeader: {
    title: string;
    description: string;
  };
  features: Array<{ icon: string; title: string; description: string }>;
  showcase: {
    title: string;
    bullets: string[];
    ctaText: string;
    imageUrl: string;
  };
  ctaSection: {
    title: string;
    description: string;
    primaryCta: string;
    primaryCtaUrl?: string;
    secondaryCta: string;
    secondaryCtaUrl?: string;
  };
  footer: {
    copyright: string;
    termsUrl: string;
    privacyUrl: string;
  };
}

const defaultLandingData: LandingCmsData = {
  brandName: "POS-INV",
  hero: {
    badge: "Solusi POS & Inventaris Modern",
    titlePrefix: "Kelola Inventaris & Penjualan ",
    titleHighlight: "Lebih Cerdas",
    description: "Sistem Kasir (POS) dan Inventaris terintegrasi yang dirancang untuk mempercepat transaksi, mengelola stok secara real-time, dan memberikan laporan bisnis yang akurat.",
    primaryCta: "Coba Gratis",
    secondaryCta: "Lihat Katalog Toko"
  },
  stats: [
    { label: "Transaksi/Bulan", value: "10K+" },
    { label: "UMKM Terbantu", value: "500+" },
    { label: "Efisiensi Waktu", value: "45%" },
    { label: "Akurasi Stok", value: "99.9%" }
  ],
  featuresHeader: {
    title: "Semua yang Anda Butuhkan untuk Berkembang",
    description: "Fitur lengkap yang dirancang khusus untuk memudahkan operasional harian bisnis ritel, cafe, minimarket, dan grosir."
  },
  features: [
    {
      icon: "Zap",
      title: "Point of Sale Kilat",
      description: "Proses transaksi kilat dengan scan barcode webcam/kamera dan antarmuka kasir yang sangat responsif."
    },
    {
      icon: "Package",
      title: "Manajemen Inventaris",
      description: "Pantau stok secara real-time, multi-satuan (Pcs/Dus/Lusin), dan peringatan otomatis saat stok menipis."
    },
    {
      icon: "BarChart3",
      title: "Laporan & Analitik",
      description: "Analisis performa penjualan, laba rugi, dan arus kas dengan grafik visual yang mudah dipahami."
    },
    {
      icon: "Users",
      title: "Member & Pelanggan",
      description: "Tingkatkan retensi dengan sistem poin loyalitas member (Silver, Gold, Platinum) dan riwayat transaksi."
    },
    {
      icon: "ShoppingCart",
      title: "Toko Online Terintegrasi",
      description: "Buka cabang digital dengan katalog toko publik yang memungkinkan pelanggan memesan langsung secara online."
    },
    {
      icon: "Database",
      title: "Keamanan Cloud & Backup",
      description: "Data tersimpan aman di cloud dengan fitur backup otomatis serta proteksi enkripsi standar industri."
    }
  ],
  showcase: {
    title: "Dashboard Interaktif untuk Keputusan Bisnis Lebih Cepat",
    bullets: [
      "Pantau omset harian, produk terlaris, dan laba secara langsung",
      "Kelola shift kasir, buka kasir, dan penutupan buku harian",
      "Scanner barcode kamera hp, tablet, dan usb hardware scanner",
      "Multi-device & responsif dari laptop, tablet, hingga smartphone"
    ],
    ctaText: "Mulai Akses Sekarang",
    imageUrl: ""
  },
  ctaSection: {
    title: "Siap Tingkatkan Omset Bisnis Anda?",
    description: "Bergabunglah sekarang dan rasakan kemudahan mengelola transaksi kasir dan inventaris dalam satu platform canggih.",
    primaryCta: "Daftar Sekarang",
    primaryCtaUrl: "/auth",
    secondaryCta: "Masuk Akun",
    secondaryCtaUrl: "/auth"
  },
  footer: {
    copyright: "© 2026 POS System. Solusi Bisnis & Kasir Modern Indonesia.",
    termsUrl: "#",
    privacyUrl: "#"
  }
};

const navLinks = [
  { id: "hero", label: "Beranda" },
  { id: "stats", label: "Keunggulan" },
  { id: "features", label: "Fitur" },
  { id: "showcase", label: "Preview" },
  { id: "cta", label: "Daftar" },
];

const Landing = () => {
  const { state } = useApp();
  const onlineStoreEnabled = state.settings?.onlineStoreEnabled;
  const [data, setData] = useState<LandingCmsData>(defaultLandingData);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Fetch dynamic CMS data
  useEffect(() => {
    const fetchCms = async () => {
      try {
        const response = await api.get("/landing-cms");
        if (response.data) {
          const raw = response.data;
          const cmsSeo = raw.seo || {};
          const brand = raw.brandName || "POS System";
          updatePageMeta({
            title: cmsSeo.title || `${brand} - Aplikasi Kasir & POS Modern Terintegrasi`,
            description: cmsSeo.description || raw.hero?.description || "Sistem Kasir (POS) dan Manajemen Inventaris Cloud Multi-Tenant.",
            keywords: cmsSeo.keywords,
            author: cmsSeo.author || brand,
            ogImage: cmsSeo.ogImage,
            faviconUrl: cmsSeo.faviconUrl,
          });

          setData({
            ...defaultLandingData,
            ...response.data,
            hero: { ...defaultLandingData.hero, ...(response.data.hero || {}) },
            featuresHeader: { ...defaultLandingData.featuresHeader, ...(response.data.featuresHeader || {}) },
            showcase: { ...defaultLandingData.showcase, ...(response.data.showcase || {}) },
            ctaSection: { ...defaultLandingData.ctaSection, ...(response.data.ctaSection || {}) },
            footer: { ...defaultLandingData.footer, ...(response.data.footer || {}) },
          });
        }
      } catch (error) {
        console.error("Error fetching dynamic landing data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCms();
  }, []);

  // Scrollspy & Header shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Determine active section based on scroll position
      const scrollPos = window.scrollY + 120;
      for (const link of navLinks) {
        const el = document.getElementById(link.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(link.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler with navbar offset
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      const navOffset = 70;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navOffset;
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
      setActiveSection(id);
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case "zap": return <Zap className="w-9 h-9 text-primary" />;
      case "package": return <Package className="w-9 h-9 text-primary" />;
      case "barchart3":
      case "barchart": return <BarChart3 className="w-9 h-9 text-primary" />;
      case "users": return <Users className="w-9 h-9 text-primary" />;
      case "shoppingcart": return <ShoppingCart className="w-9 h-9 text-primary" />;
      case "database": return <Database className="w-9 h-9 text-primary" />;
      case "shieldcheck": return <ShieldCheck className="w-9 h-9 text-primary" />;
      case "store": return <Store className="w-9 h-9 text-primary" />;
      default: return <Zap className="w-9 h-9 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      
      {/* 1. Header / Navbar One-Page Navigation */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-md py-3" 
          : "bg-background/60 backdrop-blur-md border-b border-transparent py-4"
      }`}>
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <button 
            onClick={() => scrollToSection("hero")}
            className="flex items-center gap-2.5 group text-left cursor-pointer transition-transform duration-200 active:scale-95"
          >
            {data.logoUrl || data.brandLogo ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-border/60 bg-card p-1 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src={data.logoUrl || data.brandLogo} alt={data.brandName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="bg-gradient-to-tr from-primary to-blue-500 p-2 rounded-xl text-primary-foreground shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                <Store className="w-5 h-5" />
              </div>
            )}
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
              {data.brandName || "POS-INV"}
            </span>
          </button>

          {/* Desktop One-Page Nav Links */}
          <div className="hidden md:flex items-center gap-1.5 bg-muted/70 p-1.5 rounded-full border border-border/60 backdrop-blur-md shadow-xs">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-background text-primary font-bold border border-primary/25 shadow-xs"
                      : "text-muted-foreground font-medium hover:text-foreground hover:bg-background/50 border border-transparent"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right Action Buttons & Mobile Toggle */}
          <div className="flex items-center gap-2.5">
            <Link to="/auth" className="hidden sm:inline-block">
              <Button variant="ghost" size="sm" className="text-xs font-semibold h-9 px-3.5">
                Masuk
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="text-xs font-bold h-9 px-4 rounded-xl shadow-md shadow-primary/25 bg-primary hover:opacity-90 transition-all active:scale-95">
                {data.hero.primaryCta || "Coba Gratis"}
              </Button>
            </Link>

            {/* Mobile Hamburger Menu Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-xl text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-2xl border-b border-border/80 px-4 py-4 space-y-2 animate-in slide-in-from-top-4 duration-200">
            <div className="grid grid-cols-1 gap-2">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => scrollToSection(link.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left border ${
                      isActive 
                        ? "bg-primary/10 text-primary border-primary/30 shadow-xs" 
                        : "bg-muted/50 text-foreground border-transparent hover:bg-muted"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-md">Aktif</span>}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 flex gap-2">
              <Link to="/auth" className="flex-1">
                <Button variant="outline" className="w-full text-xs font-semibold h-10">
                  Masuk Akun
                </Button>
              </Link>
              <Link to="/auth" className="flex-1">
                <Button className="w-full text-xs font-bold h-10 shadow-md">
                  Daftar
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section id="hero" className="pt-32 pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            
            {data.hero.badge && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs hover:bg-primary/15 transition-all">
                <Sparkles className="w-3.5 h-3.5" />
                {data.hero.badge}
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
              {data.hero.titlePrefix}{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
                {data.hero.titleHighlight}
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {data.hero.description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-bold gap-2 shadow-xl shadow-primary/25 rounded-xl hover:scale-105 active:scale-95 transition-all duration-200">
                  {data.hero.primaryCta} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              {onlineStoreEnabled && (
                <Link to="/store" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-semibold gap-2 rounded-xl hover:bg-muted/80 transition-all">
                    {data.hero.secondaryCta} <ShoppingCart className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* Ambient Glowing Backdrops */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      </section>

      {/* 3. Stats / Keunggulan Section */}
      {data.stats && data.stats.length > 0 && (
        <section id="stats" className="py-14 border-y bg-muted/25 backdrop-blur-xs scroll-mt-20 transition-all duration-500">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {data.stats.map((stat, i) => (
                <div key={i} className="text-center space-y-1.5 p-4 rounded-2xl bg-card/60 border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight font-mono">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Features / Fitur Section */}
      <section id="features" className="py-24 container mx-auto px-4 sm:px-6 scroll-mt-20 transition-all duration-500">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5" /> Fitur Unggulan
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {data.featuresHeader.title}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {data.featuresHeader.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {data.features.map((feature, i) => (
            <div 
              key={i} 
              className="p-8 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-2xl transition-all duration-300 space-y-4 group hover:-translate-y-1.5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-all" />
              <div className="p-3 bg-primary/10 rounded-2xl w-fit group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                {renderIcon(feature.icon)}
              </div>
              <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Showcase / Preview Section */}
      <section id="showcase" className="py-24 bg-muted/30 border-y scroll-mt-20 transition-all duration-500 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            
            {/* Left Content */}
            <div className="lg:w-1/2 space-y-8 text-left">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
                <Activity className="w-3.5 h-3.5" /> Antarmuka Modern
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {data.showcase.title}
              </h2>
              <div className="space-y-4">
                {data.showcase.bullets.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" className="inline-block pt-2">
                <Button size="lg" className="h-12 px-8 text-base font-bold gap-2 rounded-xl shadow-lg shadow-primary/20">
                  {data.showcase.ctaText} <LayoutDashboard className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Right Preview Card */}
            <div className="lg:w-1/2 w-full">
              <div className="relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card p-3 sm:p-5 group hover:shadow-primary/10 transition-all duration-500">
                {data.showcase.imageUrl ? (
                  <img
                    src={data.showcase.imageUrl}
                    alt="Dashboard Preview"
                    className="w-full h-auto rounded-2xl object-cover shadow-inner"
                  />
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl p-6 flex flex-col justify-between text-white border border-slate-700/50 shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        <span className="text-xs font-mono text-slate-400 ml-2">pos-terminal.system</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">● LIVE CLOUD</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 my-4">
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-400">Total Penjualan</p>
                        <p className="text-sm font-bold text-emerald-400 font-mono mt-1">Rp 12.450.000</p>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-400">Transaksi Kasir</p>
                        <p className="text-sm font-bold text-white font-mono mt-1">142 Struk</p>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-400">Barcode Scanner</p>
                        <p className="text-sm font-bold text-blue-400 font-mono mt-1">⚡ 60 FPS Active</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/60 pt-3">
                      <span>Multi-tenant Cloud System</span>
                      <span className="font-semibold text-white">Versi 2.0 Modern POS</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. CTA / Daftar Section */}
      <section id="cta" className="py-24 container mx-auto px-4 sm:px-6 text-center scroll-mt-20 transition-all duration-500">
        <div className="max-w-4xl mx-auto p-8 sm:p-14 rounded-[2.5rem] bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-primary-foreground space-y-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {data.ctaSection.title}
            </h2>
            <p className="text-primary-foreground/85 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              {data.ctaSection.description}
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {data.ctaSection.primaryCtaUrl?.startsWith('http') || data.ctaSection.primaryCtaUrl?.startsWith('wa.me') ? (
                <a href={data.ctaSection.primaryCtaUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 px-8 text-base font-bold shadow-lg rounded-xl">
                    {data.ctaSection.primaryCta}
                  </Button>
                </a>
              ) : (
                <Link to={data.ctaSection.primaryCtaUrl || "/auth"} className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 px-8 text-base font-bold shadow-lg rounded-xl hover:scale-105 active:scale-95 transition-all">
                    {data.ctaSection.primaryCta}
                  </Button>
                </Link>
              )}

              {data.ctaSection.secondaryCtaUrl?.startsWith('http') || data.ctaSection.secondaryCtaUrl?.startsWith('wa.me') ? (
                <a href={data.ctaSection.secondaryCtaUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl">
                    {data.ctaSection.secondaryCta}
                  </Button>
                </a>
              ) : (
                <Link to={data.ctaSection.secondaryCtaUrl || "/auth"} className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl">
                    {data.ctaSection.secondaryCta}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/20 rounded-full blur-3xl" />
        </div>
      </section>

      {/* 7. Footer */}
      <footer id="footer" className="mt-auto py-12 border-t bg-card">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            {data.logoUrl || data.brandLogo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-border/50 bg-card p-0.5 shadow-xs flex items-center justify-center">
                <img src={data.logoUrl || data.brandLogo} alt={data.brandName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="bg-primary p-1.5 rounded-xl text-primary-foreground shadow-sm">
                <Store className="w-5 h-5" />
              </div>
            )}
            <span className="text-lg font-bold">{data.brandName || "POS-INV"}</span>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm text-center">
            {data.footer.copyright}
          </p>
          <div className="flex gap-6 text-xs sm:text-sm">
            <a href={data.footer.termsUrl || "#"} className="text-muted-foreground hover:text-primary transition-colors">Syarat & Ketentuan</a>
            <a href={data.footer.privacyUrl || "#"} className="text-muted-foreground hover:text-primary transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
