import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import Customers from "./pages/Customers";
import Transactions from "./pages/Transactions";
import AuditLogs from "./pages/AuditLogs";
import Expenses from "./pages/Expenses";
import Incomes from "./pages/Incomes";
import ProfitSharing from "./pages/ProfitSharing";
import Reinvestment from "./pages/Reinvestment";
import Reports from "./pages/Reports";
import AIAnalysis from "./pages/AIAnalysis";
import Settings from "./pages/Settings";
import Discussions from "./pages/Discussions";
import FeatureRequests from "./pages/FeatureRequests";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import StockMovements from "./pages/StockMovements";
import UserManagement from "./pages/UserManagement";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import TenantSummaries from "./pages/TenantSummaries";
import TenantManagement from "./pages/TenantManagement";
import OnlineOrders from "./pages/OnlineOrders";
import NotFound from "./pages/NotFound";
import Consignment from "./pages/Consignment";
import { UserRole } from "@/contexts/AuthContext";
import { 
  StoreHome as Store, 
  StoreCart, 
  StoreCheckout, 
  StoreProductDetail, 
  StoreCategories, 
  StoreProfile, 
  StoreAuth,
  StoreProvider,
  StoreAuthProvider
} from "@/storefront";
import HardwareSettings from "./pages/HardwareSettings";
import CustomerDisplay from "./pages/CustomerDisplay";
import StockOpname from "./pages/StockOpname";
import Purchases from "./pages/Purchases";
import Payroll from "./pages/Payroll";
import Assets from "./pages/Assets";
import BarcodePrint from "./pages/BarcodePrint";
import LabelDesigner from "./pages/LabelDesigner";
import StorefrontSettings from "./pages/StorefrontSettings";

import { HardwareProvider } from "@/contexts/HardwareContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import api from "@/lib/api";
import { updatePageMeta } from "@/utils/seo";
import { getCustomDomainInfo } from "@/utils/domain";

const queryClient = new QueryClient();

// Global SEO & Metadata initializer that loads Super Admin CMS configuration
function GlobalSEOLoader() {
  useEffect(() => {
    // 1. Apply from local cache immediately for instantaneous rendering
    const cachedSeo = localStorage.getItem("pos-app-seo");
    if (cachedSeo) {
      try {
        const parsed = JSON.parse(cachedSeo);
        updatePageMeta(parsed);
      } catch (_) {}
    }

    // 2. Fetch latest Super Admin SEO from server
    api.get("/landing-cms")
      .then((res) => {
        if (res.data) {
          const cmsSeo = res.data.seo || {};
          const brand = res.data.brandName || "POS System";
          const seoOptions = {
            title: cmsSeo.title || `${brand} - Aplikasi Kasir & POS Modern Terintegrasi`,
            description: cmsSeo.description || res.data.hero?.description || "Sistem Kasir (POS) dan Manajemen Inventaris Cloud Multi-Tenant, Cepat, Akurat, dan Terintegrasi.",
            keywords: cmsSeo.keywords || "aplikasi kasir, pos system, software kasir, manajemen stok, inventori, point of sale, toko online",
            author: cmsSeo.author || brand,
            ogImage: cmsSeo.ogImage || "/pwa-512x512.png",
            faviconUrl: cmsSeo.faviconUrl || "/logo.svg",
          };
          updatePageMeta(seoOptions);
          localStorage.setItem("pos-app-seo", JSON.stringify(seoOptions));
        }
      })
      .catch((err) => {
        console.debug("Could not fetch global SEO:", err);
      });
  }, []);

  return null;
}

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Role-protected Route component
function RoleProtectedRoute({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasRole(...roles)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-2xl font-bold text-destructive mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}

// Auth Route component (redirect if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'kasir') {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Dashboard router - properly calls useAuth at component top level
function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'kasir') {
    return <Navigate to="/pos" replace />;
  }
  return user?.role === 'super_admin' ? <SuperAdminDashboard /> : <Dashboard />;
}

function AppRoutes() {
  const customDomain = getCustomDomainInfo();

  // If accessed via custom domain (e.g. tokosaya.com or www.tokosaya.com)
  if (customDomain.isCustomDomain) {
    return (
      <Routes>
        {/* Custom Domain Storefront Public Routes */}
        <Route path="/" element={<Store />} />
        <Route path="/auth" element={<StoreAuth />} />
        <Route path="/categories" element={<StoreCategories />} />
        <Route path="/product/:id" element={<StoreProductDetail />} />
        <Route path="/cart" element={<StoreCart />} />
        <Route path="/checkout" element={<StoreCheckout />} />
        <Route path="/profile" element={<StoreProfile />} />
        <Route path="/account" element={<StoreProfile />} />

        {/* Allow Staff / Store Owner to login to POS even from custom domain */}
        <Route path="/admin" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/pos-login" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route
          path="/dashboard"
          element={
            <RoleProtectedRoute roles={['admin', 'manager', 'super_admin']}>
              <Layout>
                <DashboardRouter />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
              <Layout>
                <POS />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
              <Layout>
                <Products />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/barcode-settings"
          element={
            <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
              <Layout>
                <BarcodePrint />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/print-barcode"
          element={
            <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
              <Layout>
                <BarcodePrint />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/label-designer"
          element={
            <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
              <Layout>
                <LabelDesigner />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <Layout>
                <Settings />
              </Layout>
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/storefront-settings"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <Layout>
                <StorefrontSettings />
              </Layout>
            </RoleProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route
        path="/"
        element={
          <AuthRoute>
            <Landing />
          </AuthRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'super_admin']}>
            <Layout>
              <DashboardRouter />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/pos"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <POS />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <Products />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/barcode-settings"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <BarcodePrint />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/print-barcode"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <BarcodePrint />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/barcode-print"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <BarcodePrint />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/label-designer"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <LabelDesigner />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/label-templates"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <LabelDesigner />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/consignment"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <Consignment />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/stock-opname"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <StockOpname />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <Purchases />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <Payroll />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <RoleProtectedRoute roles={['admin']}>
            <Layout>
              <Assets />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <Categories />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/brands"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <Brands />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <Customers />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <Transactions />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <RoleProtectedRoute roles={['admin', 'super_admin']}>
            <Layout>
              <AuditLogs />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/feature-requests"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'super_admin']}>
            <Layout>
              <FeatureRequests />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <Expenses />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/incomes"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <Incomes />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/profit-sharing"
        element={
          <RoleProtectedRoute roles={['admin']}>
            <Layout>
              <ProfitSharing />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/reinvestment"
        element={
          <RoleProtectedRoute roles={['admin']}>
            <Layout>
              <Reinvestment />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <Reports />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/ai-analysis"
        element={
          <RoleProtectedRoute roles={['admin']}>
            <Layout>
              <AIAnalysis />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <RoleProtectedRoute roles={['admin']}>
            <Layout>
              <Settings />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/storefront-settings"
        element={
          <RoleProtectedRoute roles={['admin']}>
            <Layout>
              <StorefrontSettings />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenant-summaries"
        element={
          <RoleProtectedRoute roles={['super_admin']}>
            <Layout>
              <TenantSummaries />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <RoleProtectedRoute roles={['super_admin']}>
            <Layout>
              <TenantManagement />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/discussions"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'super_admin']}>
            <Layout>
              <Discussions />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/stock-movements"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <StockMovements />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <RoleProtectedRoute roles={['admin', 'super_admin']}>
            <Layout>
              <UserManagement />
            </Layout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/online-orders"
        element={
          <RoleProtectedRoute roles={['admin', 'manager', 'kasir']}>
            <Layout>
              <OnlineOrders />
            </Layout>
          </RoleProtectedRoute>
        }
      />


      {/* Public Store Routes - Both Direct (/:slug) and Legacy (/s/:slug) */}
      <Route path="/s/:slug" element={<Store />} />
      <Route path="/s/:slug/auth" element={<StoreAuth />} />
      <Route path="/s/:slug/categories" element={<StoreCategories />} />
      <Route path="/s/:slug/product/:id" element={<StoreProductDetail />} />
      <Route path="/s/:slug/cart" element={<StoreCart />} />
      <Route path="/s/:slug/checkout" element={<StoreCheckout />} />
      <Route path="/s/:slug/profile" element={<StoreProfile />} />

      {/* Hardware Settings */}
      <Route
        path="/hardware-settings"
        element={
          <RoleProtectedRoute roles={['admin', 'manager']}>
            <Layout>
              <HardwareSettings />
            </Layout>
          </RoleProtectedRoute>
        }
      />

      {/* Customer Display — public, designed for secondary screen */}
      <Route path="/customer-display" element={<CustomerDisplay />} />

      {/* Legacy store route - redirect to landing or a default if possible */}
      <Route path="/store" element={<Navigate to="/" replace />} />

      {/* Direct Root Slug Store Routes (e.g. /sarahmebel, /sarahmebel/cart) */}
      <Route path="/:slug" element={<Store />} />
      <Route path="/:slug/auth" element={<StoreAuth />} />
      <Route path="/:slug/categories" element={<StoreCategories />} />
      <Route path="/:slug/product/:id" element={<StoreProductDetail />} />
      <Route path="/:slug/cart" element={<StoreCart />} />
      <Route path="/:slug/checkout" element={<StoreCheckout />} />
      <Route path="/:slug/profile" element={<StoreProfile />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <FontSizeProvider>
          <AuthProvider>
            <AppProvider>
              <HardwareProvider>
                <StoreProvider>
                  <StoreAuthProvider>
                    <TooltipProvider>
                      <GlobalSEOLoader />
                      <Toaster />
                      <Sonner />
                      <ErrorBoundary>
                        <AppRoutes />
                      </ErrorBoundary>
                    </TooltipProvider>
                  </StoreAuthProvider>
                </StoreProvider>
              </HardwareProvider>
            </AppProvider>
          </AuthProvider>
        </FontSizeProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
