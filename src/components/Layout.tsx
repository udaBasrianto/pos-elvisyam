import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DemoSessionBanner } from "@/components/DemoSessionBanner";
import {
  Bell,
  User,
  PanelLeftClose,
  PanelLeft,
  Clock,
  Calendar,
  LogOut,
  Settings,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
  Store,
  WifiOff,
  CloudOff,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CashierShiftDialog } from "@/components/CashierShiftDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import AppBottomNav from "./AppBottomNav";
import api from "@/lib/api";
import { getSyncQueue } from "@/lib/db";

interface SystemAnnouncement {
  id: string;
  message: string;
  type: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

// Helper to map pathname to dynamic page title & description
const getPageHeaderInfo = (pathname: string) => {
  const path = pathname.toLowerCase();
  
  if (path.startsWith('/dashboard')) {
    return { title: 'Dashboard', desc: 'Ringkasan performa dan metrik bisnis Anda' };
  }
  if (path.startsWith('/pos')) {
    return { title: 'Kasir (POS)', desc: 'Point of Sale - Proses transaksi penjualan' };
  }
  if (path.startsWith('/laundry')) {
    return { title: 'Manajemen Laundry & Dry Clean', desc: 'Papan Kanban Cucian, Kasir Laundry Kiloan/Satuan, Penempatan Rak, dan Notifikasi WA' };
  }
  if (path.startsWith('/workshop')) {
    return { title: 'Manajemen Bengkel', desc: 'Surat Perintah Kerja (SPK), Pit/Stall, Database Kendaraan, dan Service Reminder' };
  }
  if (path.startsWith('/barbershop')) {
    return { title: 'Barbershop & Salon Premier', desc: 'Kalender Booking, Status Kursi Kapster, Hair Passport CRM, dan Bagi Hasil' };
  }
  if (path.startsWith('/queue')) {
    return { title: 'Manajemen Jasa & Antrian', desc: 'Papan antrian nomor harian, display TV, dan panggil suara pelanggan' };
  }
  if (path.startsWith('/products')) {
    return { title: 'Produk & Inventori', desc: 'Kelola katalog produk, stok, dan harga' };
  }
  if (path.startsWith('/categories')) {
    return { title: 'Kategori Produk', desc: 'Kelompokkan produk Anda agar rapi' };
  }
  if (path.startsWith('/brands')) {
    return { title: 'Merek Produk (Brands)', desc: 'Kelola merek dagang produk Anda' };
  }
  if (path.startsWith('/customers')) {
    return { title: 'Kelola Pelanggan', desc: 'Data profil pelanggan dan piutang' };
  }
  if (path.startsWith('/transactions')) {
    return { title: 'Riwayat Transaksi', desc: 'Daftar transaksi penjualan dan statusnya' };
  }
  if (path.startsWith('/incomes')) {
    return { title: 'Pendapatan Jasa', desc: 'Pemasukan di luar transaksi kasir' };
  }
  if (path.startsWith('/expenses')) {
    return { title: 'Pengeluaran Bisnis', desc: 'Catat biaya operasional dan belanja toko' };
  }
  if (path.startsWith('/profit-sharing')) {
    return { title: 'Bagi Hasil (Profit Sharing)', desc: 'Distribusi keuntungan dengan mitra bisnis' };
  }
  if (path.startsWith('/reinvestment')) {
    return { title: 'Dana Reinvestasi', desc: 'Kelola alokasi modal reinvestasi' };
  }
  if (path.startsWith('/reports')) {
    return { title: 'Laporan Analisis', desc: 'Analitik penjualan, margin, dan keuntungan' };
  }
  if (path.startsWith('/ai-analysis')) {
    return { title: 'Analisis Pintar AI', desc: 'Rekomendasi pertumbuhan bisnis berbasis AI' };
  }
  if (path.startsWith('/barcode-settings')) {
    return { title: 'Pengaturan Barcode & Label', desc: 'Konfigurasi tipografi, ukuran font, tipe barcode, dan tata letak stiker' };
  }
  if (path.startsWith('/hardware-settings')) {
    return { title: 'Pengaturan Hardware', desc: 'Kelola printer thermal, barcode scanner, dan laci kasir' };
  }
  if (path.startsWith('/storefront-settings')) {
    return { title: 'Konfigurasi Toko Online', desc: 'Atur branding, logo, favicon, domain, tema, WhatsApp CS, dan ulasan storefront' };
  }
  if (path.startsWith('/settings')) {
    return { title: 'Pengaturan Sistem', desc: 'Konfigurasi profil toko, struk, pajak, dan PWA' };
  }
  if (path.startsWith('/discussions')) {
    return { title: 'Pusat Bantuan', desc: 'Ajukan pertanyaan dan tiket keluhan ke admin' };
  }
  if (path.startsWith('/tenants')) {
    return { title: 'Kelola Tenant', desc: 'Super Admin - Manajemen pendaftaran toko baru' };
  }
  if (path.startsWith('/tenant-summaries')) {
    return { title: 'Ringkasan Tenant', desc: 'Super Admin - Rekapitulasi penjualan semua toko' };
  }
  if (path.startsWith('/consignment')) {
    return { title: 'Konsinyasi Barang', desc: 'Kelola penitipan barang dari supplier dan settlement' };
  }
  if (path.startsWith('/online-orders')) {
    return { title: 'Pesanan Online', desc: 'Kelola pesanan masuk dari toko online online-store' };
  }
  
  return { title: 'POS Modern', desc: 'Sistem Point of Sale Terpadu' };
};

function LayoutContent({ children }: LayoutProps) {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { title, desc } = getPageHeaderInfo(location.pathname);
  const { user, signOut, isSuperAdmin } = useAuth();
  const { state: appState } = useApp();

  // Live clock state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAnnouncements, setActiveAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkSyncQueue = async () => {
      try {
        const queue = await getSyncQueue();
        setPendingSync(queue.length);
      } catch (e) { }
    };
    
    checkSyncQueue();
    const inv = setInterval(checkSyncQueue, 5000);
    return () => clearInterval(inv);
  }, []);

  useEffect(() => {
    // Fetch active system announcements
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements/active');
        setActiveAnnouncements(res.data);
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      }
    };
    
    fetchAnnouncements();
    const inv = setInterval(fetchAnnouncements, 60000); // Check every minute
    return () => clearInterval(inv);
  }, []);

  // Generate notifications based on app state
  useEffect(() => {
    const newNotifications: Notification[] = [];

    // Check for low stock products
    const lowStockProducts = appState.products.filter(
      p => (p.stock || 0) <= (p.minStock || 0) && (p.stock || 0) > 0
    );

    // Check for out of stock products
    const outOfStockProducts = appState.products.filter(p => (p.stock || 0) === 0);

    if (outOfStockProducts.length > 0) {
      newNotifications.push({
        id: 'out-of-stock',
        type: 'error',
        title: 'Stok Habis!',
        message: `${outOfStockProducts.length} produk kehabisan stok`,
        time: new Date(),
        read: false
      });
    }

    if (lowStockProducts.length > 0) {
      newNotifications.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Stok Menipis',
        message: `${lowStockProducts.length} produk perlu restock`,
        time: new Date(),
        read: false
      });
    }

    // Add individual low stock notifications (top 5)
    lowStockProducts.slice(0, 5).forEach(product => {
      newNotifications.push({
        id: `low-${product.id}`,
        type: 'warning',
        title: product.name,
        message: `Sisa stok: ${product.stock} unit`,
        time: new Date(),
        read: false
      });
    });

    setNotifications(newNotifications);
  }, [appState.products]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM:SS (Asia/Jakarta WIB)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format date as Hari, DD MMM YYYY (Asia/Jakarta WIB)
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleLogout = () => {
    signOut();
    navigate('/auth');
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      default: return <Package className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="h-screen max-h-screen flex w-full max-w-full overflow-hidden bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col pt-0 transition-all w-full max-w-full h-full overflow-hidden">
        <DemoSessionBanner />
        {/* Impersonation Banner */}
        {localStorage.getItem('original_admin_token') && (
          <div className="w-full bg-slate-900 text-slate-100 py-2 px-4 flex items-center justify-between text-xs sm:text-sm font-semibold border-b border-slate-800 shadow-md relative z-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
              <span>Sesi Bantuan Toko: <strong className="text-white underline">{user?.full_name}</strong> ({user?.email})</span>
            </div>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => {
                const origToken = localStorage.getItem('original_admin_token');
                if (origToken) {
                  localStorage.setItem('pos_token', origToken);
                  localStorage.setItem('token', origToken);
                  localStorage.removeItem('pos_user');
                  localStorage.removeItem('original_admin_token');
                  window.location.href = '/dashboard?tab=tenants';
                }
              }}
              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold shadow-xs"
            >
              Kembali ke Super Admin
            </Button>
          </div>
        )}

        {/* System Announcements Banner */}
        {activeAnnouncements.length > 0 && (
          <div className="w-full relative z-50">
            {activeAnnouncements.map((ann) => (
              <div 
                key={ann.id} 
                className={`w-full py-2 px-4 shadow-sm text-sm font-semibold flex items-center justify-center gap-2 text-center text-white ${ann.type === 'error' ? 'bg-red-600' : ann.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}`}
              >
                <AlertTriangle className="w-4 h-4 inline" /> {ann.message}
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <header className="h-14 sm:h-16 bg-card/90 border-b border-border/80 flex items-center justify-between px-3 sm:px-6 shadow-xs backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Toggle Button */}
            {!isMobile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSidebar}
                      className="h-9 w-9 hover:bg-accent rounded-lg transition-colors"
                    >
                      {isCollapsed ? (
                        <PanelLeft className="h-5 w-5" />
                      ) : (
                        <PanelLeftClose className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{isCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}</p>
                    <p className="text-xs text-muted-foreground">Ctrl + B</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Mobile Toggle */}
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 p-1.5 hover:bg-accent rounded-lg transition-colors" />
            )}

            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <div className="md:hidden">
              <h1 className="text-base font-bold text-foreground tracking-tight">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">

            {/* Cashier Shift Dialog Trigger Button (Only for Tenant Stores) */}
            {!isSuperAdmin && (
              <CashierShiftDialog
                trigger={
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hidden sm:flex items-center gap-1.5 h-8 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Shift Kasir</span>
                  </Button>
                }
              />
            )}

            {/* Offline Status */}
            {isOffline && (
              <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
                <WifiOff className="w-3 h-3" /> Offline
              </Badge>
            )}
            {!isOffline && pendingSync > 0 && (
              <Badge variant="default" className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 cursor-pointer" title="Auto-syncing soon...">
                <RefreshCw className="w-3 h-3 animate-spin" /> {pendingSync}
              </Badge>
            )}
            {/* Date and Time Display (Desktop only) */}
            <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              {/* Date */}
              <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-300 dark:border-slate-600">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  {formatDate(currentTime)}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary tabular-nums">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>

            {/* Store Link Button (Only for Tenant Stores) */}
            {!isSuperAdmin && appState.settings.onlineStoreEnabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/${user?.shop_slug || 'shop'}`, '_blank')}
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Store className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Lihat Toko Online</p>
                    <p className="text-xs text-muted-foreground">Buka di tab baru</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Notifications */}
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h4 className="font-semibold">Notifikasi</h4>
                    <p className="text-xs text-muted-foreground">{unreadCount} belum dibaca</p>
                  </div>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                      Tandai dibaca
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckCircle className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">Tidak ada notifikasi</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-accent/50 cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''
                            }`}
                          onClick={() => {
                            if (notification.id.includes('stock')) {
                              navigate('/products');
                              setNotificationOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      navigate('/products');
                      setNotificationOpen(false);
                    }}
                  >
                    Lihat Semua Produk
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <Badge variant="secondary" className="w-fit mt-1 text-[10px]">
                      {user?.role?.toUpperCase() || 'USER'}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 bg-pos-bg overflow-y-auto pb-24 md:pb-6 relative z-0 w-full max-w-full">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AppBottomNav />
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}