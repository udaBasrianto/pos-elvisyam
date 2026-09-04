import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Home,
  Receipt,
  Settings,
  LogOut,
  FolderOpen,
  ArrowUpDown,
  Shield,
  Wallet,
  UserCog,
  Briefcase,
  TrendingUp,
  Landmark,
  ShoppingBag,
  Handshake,
  Tag,
  MessageSquare,
  Brain,
  History,
  Cpu,
  Store,
  Key,
  Mail,
  Sparkles,
  Globe,
  AlertTriangle,
  Activity,
  ClipboardCheck,
  UserCheck,
  Lightbulb,
  ScanBarcode,
  Chrome,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  badge?: number;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut, isAdmin, isManager, isSuperAdmin } = useAuth();
  const { state: appState } = useApp();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const fetchPendingOrders = useCallback(async () => {
    try {
      const response = await api.get('/admin/online-orders/pending-count');
      setPendingOrdersCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch pending orders count:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPendingOrders();
      const interval = setInterval(fetchPendingOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchPendingOrders]);

  useEffect(() => {
    if (location.pathname === '/online-orders') {
      fetchPendingOrders();
    }
  }, [location.pathname, fetchPendingOrders]);

  // SuperAdmin Menu Groups
  const superAdminMainGroup: MenuItem[] = [
    { title: "Daftar Tenant", url: "/dashboard?tab=tenants", icon: Store },
    { title: "Ringkasan Tenant", url: "/dashboard?tab=summaries", icon: BarChart3 },
    { title: "Kelola Tenant (SaaS)", url: "/tenants", icon: UserCog },
    { title: "Analytics System", url: "/dashboard?tab=analytics", icon: TrendingUp },
  ];

  const superAdminConfigGroup: MenuItem[] = [
    { title: "Manajemen Token", url: "/dashboard?tab=tokens", icon: Key },
    { title: "Konfigurasi SMTP", url: "/dashboard?tab=smtp", icon: Mail },
    { title: "Konfigurasi AI", url: "/dashboard?tab=ai", icon: Sparkles },
    { title: "Login Google (OAuth)", url: "/dashboard?tab=google-auth", icon: Chrome },
    { title: "Landing Page CMS", url: "/dashboard?tab=landing", icon: Globe },
  ];

  const superAdminLogsGroup: MenuItem[] = [
    { title: "Request Fitur", url: "/dashboard?tab=feature-requests", icon: Lightbulb },
    { title: "Pengumuman System", url: "/dashboard?tab=announcements", icon: AlertTriangle },
    { title: "Tiket & Diskusi", url: "/discussions", icon: MessageSquare },
    { title: "Log Aktivitas", url: "/dashboard?tab=audit", icon: Activity },
  ];
  // Structured Menu Groups for Tenant Admin/Manager/Kasir
  const isKasirOnly = user?.role === 'kasir';

  const tenantMenuGroups: MenuGroup[] = [
    {
      label: "Utama & Penjualan",
      items: [
        ...((isAdmin || isManager) ? [{ title: "Dashboard", url: "/dashboard", icon: Home }] : []),
        { title: "Kasir (POS)", url: "/pos", icon: ShoppingCart },
        { title: "Transaksi", url: "/transactions", icon: Receipt },
      ]
    },
    ...((isAdmin || appState.settings.onlineStoreEnabled) ? [
      {
        label: "Toko Online (Storefront)",
        items: [
          ...(appState.settings.onlineStoreEnabled ? [{ title: "Order Online", url: "/online-orders", icon: ShoppingBag, badge: pendingOrdersCount }] : []),
          ...(isAdmin ? [{ title: "Konfigurasi Toko", url: "/storefront-settings", icon: Globe }] : []),
        ]
      }
    ] : []),
    {
      label: "Inventaris & Katalog",
      items: [
        { title: "Produk", url: "/products", icon: Package },
        { title: "Cetak Barcode", url: "/barcode-settings", icon: ScanBarcode },
        ...((isAdmin || isManager) ? [
          { title: "Pembelian (PO)", url: "/purchases", icon: ShoppingBag },
          { title: "Stock Opname", url: "/stock-opname", icon: ClipboardCheck },
          { title: "Konsinyasi", url: "/consignment", icon: Handshake },
        ] : []),
        { title: "Kategori", url: "/categories", icon: FolderOpen },
        { title: "Merek (Brands)", url: "/brands", icon: Tag },
        ...((isAdmin || isManager) ? [{ title: "Riwayat Stok", url: "/stock-movements", icon: ArrowUpDown }] : []),
      ]
    },
    ...((isAdmin || isManager) ? [
      {
        label: "Keuangan & Laporan",
        items: [
          { title: "Pendapatan", url: "/incomes", icon: Briefcase },
          { title: "Pengeluaran", url: "/expenses", icon: Wallet },
          ...(isAdmin ? [{ title: "Manajemen Aset", url: "/assets", icon: Briefcase }] : []),
          { title: "Laporan", url: "/reports", icon: BarChart3 },
          ...(isAdmin ? [{ title: "Analisis AI", url: "/ai-analysis", icon: Brain }] : []),
          ...(isAdmin ? [{ title: "Bagi Hasil", url: "/profit-sharing", icon: TrendingUp }] : []),
          ...(isAdmin ? [{ title: "Dana Reinvestasi", url: "/reinvestment", icon: Landmark }] : []),
        ]
      }
    ] : []),
    {
      label: "Pelanggan & Pegawai",
      items: [
        { title: "Pelanggan", url: "/customers", icon: Users },
        { title: isKasirOnly ? "Absensi Saya" : "Absensi & Gaji", url: "/payroll", icon: UserCheck },
        ...(isAdmin ? [{ title: "Kelola User", url: "/users", icon: UserCog }] : []),
      ]
    },
    ...((isAdmin || isManager) ? [
      {
        label: "Pengaturan & Sistem",
        items: [
          { title: "Perangkat Keras", url: "/hardware-settings", icon: Cpu },
          ...(isAdmin ? [{ title: "Pengaturan Toko", url: "/settings", icon: Settings }] : []),
          ...(isAdmin ? [{ title: "Riwayat Edit", url: "/audit-logs", icon: History }] : []),
          { title: "Request Fitur", url: "/feature-requests", icon: Lightbulb },
          { title: "Pusat Bantuan", url: "/discussions", icon: MessageSquare },
        ]
      }
    ] : [])
  ].filter(group => group.items.length > 0);

  const getRoleBadge = () => {
    if (!user?.role) return 'Kasir';
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrator',
      manager: 'Manager',
      kasir: 'Kasir'
    };
    return roleLabels[user.role] || 'Kasir';
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "sidebar-menu-active font-medium"
      : "sidebar-menu-item";

  const handleSignOut = async () => {
    await signOut();
  };

  const renderMenuItem = (item: MenuItem) => {
    const isItemActive = location.pathname + location.search === item.url || (
      item.url === '/dashboard?tab=tenants' && location.pathname === '/dashboard' && (!location.search || location.search === '?tab=tenants')
    ) || (location.pathname === item.url && !location.search && !item.url.includes('?'));

    const navLink = (
      <NavLink
        to={item.url}
        end
        className={() => `
          flex items-center ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} rounded-lg transition-all duration-200 relative
          ${getNavCls({ isActive: isItemActive })}
        `}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!collapsed && (
          <span className="font-medium flex-1 text-sm truncate">{item.title}</span>
        )}
        {!collapsed && item.badge !== undefined && item.badge > 0 && (
          <Badge
            variant="destructive"
            className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5 animate-pulse"
          >
            {item.badge > 99 ? '99+' : item.badge}
          </Badge>
        )}
        {collapsed && item.badge !== undefined && item.badge > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <SidebarMenuItem key={item.title}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild isActive={isItemActive}>
                  {navLink}
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold text-xs bg-slate-900 text-white border-slate-800 shadow-xl z-50">
                {item.title} {item.badge ? `(${item.badge})` : ''}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isItemActive}>
          {navLink}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="transition-all duration-300"
    >
      <SidebarContent className="bg-pos-sidebar border-r flex flex-col scrollbar-hide">
        {/* Header Logo */}
        <div className={`p-4 border-b border-primary/20 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 flex items-center ${collapsed ? "justify-center px-2" : "gap-3"}`}>
          <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            {appState.settings?.logoUrl ? (
              <img src={appState.settings.logoUrl} alt="Logo Toko" className="w-full h-full object-cover" />
            ) : (
              <ShoppingCart className="w-5 h-5 text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-base text-foreground truncate">
                {appState.settings?.businessName || "POS Modern"}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {appState.settings?.description || "Point of Sale"}
              </p>
            </div>
          )}
        </div>

        {/* Super Admin Groups or General Menu */}
        {isSuperAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className={collapsed ? "sr-only" : "text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2"}>
                Super Admin Dashboard
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminMainGroup.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={collapsed ? "sr-only" : "text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2"}>
                Pengaturan System
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminConfigGroup.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={collapsed ? "sr-only" : "text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2"}>
                Pusat Informasi & Log
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminLogsGroup.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 py-2">
            {tenantMenuGroups.map((group, idx) => (
              <SidebarGroup key={idx} className="px-2 py-0">
                <SidebarGroupLabel className={collapsed ? "sr-only" : "text-[10px] font-bold uppercase tracking-widest text-primary/80 px-2 mb-1"}>
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {group.items.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </div>
        )}

        {/* User Profile & Sign Out Footer */}
        <div className={`p-3 border-t flex flex-col ${collapsed ? "items-center" : ""}`}>
          {!collapsed && user && (
            <div className="mb-3 px-1">
              <p className="text-sm font-bold text-foreground truncate">{user.full_name || user.email}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium mt-0.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                {getRoleBadge()}
              </p>
            </div>
          )}

          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold text-xs bg-red-900 text-white border-red-800 shadow-xl">
                  Keluar
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold h-9"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Keluar Sesi</span>
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
