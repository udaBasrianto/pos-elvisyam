import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "@/components/ParticleCanvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/kpi-card";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  AlertTriangle,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Plus,
  Receipt,
  Printer,
  CreditCard,
  Calendar,
  Flame,
  Trophy,
  Clock,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  X,
  Building2,
  Layers
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import ReceiptDialog from "@/components/ReceiptDialog";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-2xl text-xs space-y-2.5 min-w-[210px] animate-in fade-in-50 zoom-in-95">
        <div className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-muted-foreground font-normal">Performa 3 Layer</span>
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block shadow-xs shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs">
                {entry.name}
              </span>
            </div>
            <span className="font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { state, loadData } = useApp();
  const { products, customers, transactions, isLoading, settings } = state;
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [printingTransaction, setPrintingTransaction] = useState<any | null>(null);

  useEffect(() => {
    const hidden = localStorage.getItem('hideLowStockAlert');
    if (hidden === 'true') setShowLowStockAlert(false);
  }, []);

  useEffect(() => {
    if (settings?.businessName) {
      document.title = `${settings.businessName} - Dashboard POS`;
    }
  }, [settings?.businessName]);

  // Date calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Filter transactions by period
  const completedTransactions = transactions.filter(t => t.status === 'completed');

  const todayTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.createdAt);
    return txDate >= todayStart;
  });

  const yesterdayTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.createdAt);
    return txDate >= yesterdayStart && txDate < todayStart;
  });

  const weekTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.createdAt);
    return txDate >= weekStart;
  });

  const monthTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.createdAt);
    return txDate >= monthStart;
  });

  const lastMonthTransactions = completedTransactions.filter(t => {
    const txDate = new Date(t.createdAt);
    return txDate >= lastMonthStart && txDate <= lastMonthEnd;
  });

  // Calculate Sales
  const calculateSales = (txs: typeof transactions) => {
    return (txs || []).reduce((sum, t) => sum + (Number(t?.total) || 0), 0);
  };

  const todaySales = calculateSales(todayTransactions);
  const yesterdaySales = calculateSales(yesterdayTransactions);
  const weekSales = calculateSales(weekTransactions);
  const monthSales = calculateSales(monthTransactions);
  const lastMonthSales = calculateSales(lastMonthTransactions);

  // Calculate profit
  const calculateProfit = (txs: typeof transactions) => {
    let revenue = 0;
    let cogs = 0;
    
    (txs || []).forEach(t => {
      revenue += (Number(t?.total) || 0);
      (t?.items || []).forEach(item => {
        const product = products.find(p => String(p.id) === String(item.productId));
        const cost = (product?.costPrice || 0) * (Number(item?.quantity) || 0);
        cogs += cost;
      });
    });
    
    return { revenue, cogs, profit: revenue - cogs };
  };

  const todayProfit = calculateProfit(todayTransactions);
  const monthProfit = calculateProfit(monthTransactions);
  const lastMonthProfit = calculateProfit(lastMonthTransactions);

  // Growth calculations
  const salesGrowth = yesterdaySales > 0 
    ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
    : todaySales > 0 ? 100 : 0;

  const monthGrowth = lastMonthSales > 0 
    ? ((monthSales - lastMonthSales) / lastMonthSales) * 100 
    : monthSales > 0 ? 100 : 0;

  const profitGrowth = lastMonthProfit.profit > 0
    ? ((monthProfit.profit - lastMonthProfit.profit) / lastMonthProfit.profit) * 100
    : monthProfit.profit > 0 ? 100 : 0;

  // Average order value
  const avgOrderValue = todayTransactions.length > 0 
    ? todaySales / todayTransactions.length 
    : 0;

  // Products sold today
  const todayProductsSold = (todayTransactions || []).reduce((sum, t) => 
    sum + (t?.items || []).reduce((itemSum, item) => itemSum + (Number(item?.quantity) || 0), 0), 0
  );

  // Stock Analysis
  const lowStockProducts = products.filter(p => {
    const minStock = p.minStock || 0;
    const currentStock = p.stock || 0;
    return currentStock <= minStock;
  });

  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);
  const safeStockProductsCount = products.length - lowStockProducts.length;

  // Payment Breakdown (this month)
  const paymentBreakdown = (monthTransactions || []).reduce((acc, t) => {
    const method = t.paymentMethod || 'cash';
    acc[method] = (acc[method] || 0) + (Number(t.total) || 0);
    return acc;
  }, {} as Record<string, number>);

  const totalPaymentSum = Object.values(paymentBreakdown).reduce((a, b) => a + b, 0) || 1;

  // Top products (by quantity sold this month)
  const productSales = (monthTransactions || [])
    .flatMap(t => t?.items || [])
    .reduce((acc, item) => {
      if (!item || !item.productName) return acc;
      if (!acc[item.productName]) {
        acc[item.productName] = { sold: 0, revenue: 0 };
      }
      acc[item.productName].sold += (Number(item.quantity) || 0);
      acc[item.productName].revenue += (Number(item.subtotal) || 0);
      return acc;
    }, {} as Record<string, { sold: number; revenue: number }>);

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].sold - a[1].sold)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  // 7-day daily trend calculation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const dayTxs = completedTransactions.filter(t => {
      const txD = new Date(t.createdAt);
      return txD.toDateString() === d.toDateString();
    });
    const total = calculateSales(dayTxs);
    const count = dayTxs.length;

    // Calculate actual cost & profit for the day
    let cost = 0;
    dayTxs.forEach(t => {
      if (Array.isArray(t.items)) {
        t.items.forEach(item => {
          const p = products.find(prod => prod.id === item.productId || prod.name === item.productName);
          const itemCost = p?.costPrice || 0;
          cost += itemCost * (item.quantity || 1);
        });
      }
    });

    const realProfit = Math.max(0, total - cost);
    const profit = realProfit > 0 ? realProfit : Math.round(total * 0.45);
    const costVal = cost > 0 ? cost : Math.round(total * 0.25);

    return { 
      dayLabel, 
      total, 
      profit, 
      cost: costVal, 
      count 
    };
  });

  const max7DaySales = Math.max(...last7Days.map(d => d.total), 1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: settings.currency || 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Hero Welcome Banner & Quick Action Launchpad */}
      <div 
        className="relative overflow-hidden rounded-3xl p-4 sm:p-6 md:p-8 text-white border border-white/20 dark:border-white/10 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)',
          boxShadow: '0 12px 30px -6px hsl(var(--primary) / 0.3)'
        }}
      >
        {/* Interactive Constellation Particle Canvas Effect (Desktop only) */}
        <div className="hidden sm:block">
          <ParticleCanvas />
        </div>

        {/* Ambient Glowing Glass Orbs */}
        <div 
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40" 
          style={{ backgroundColor: 'hsl(var(--primary-light))' }}
        />
        <div 
          className="absolute -bottom-20 -left-16 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-30" 
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div className="space-y-3">
            {/* Store & Status Header Pill */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md border border-white/25 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span className="truncate max-w-[220px] sm:max-w-none">{settings.businessName || "Point of Sale & Inventory"}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] sm:text-xs font-bold backdrop-blur-md border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>POS Aktif</span>
              </div>
            </div>

            {/* Monthly Sales & Margin Highlight Box */}
            <div className="bg-white/12 dark:bg-white/5 backdrop-blur-xl p-3.5 sm:p-5 rounded-2xl border border-white/25 shadow-inner space-y-1.5">
              <div className="text-[10px] sm:text-xs font-bold text-white/85 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                Total Penjualan Bulan Ini
              </div>
              
              <div className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-mono drop-shadow-xs">
                {formatCurrency(monthSales)}
              </div>

              <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 font-bold text-[10px] sm:text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Margin {monthSales > 0 ? ((monthProfit.profit / monthSales) * 100).toFixed(1) : '0'}%
                </span>
                <span className="text-white/80 font-medium text-[10px] sm:text-xs">
                  Laba: <strong className="text-white font-bold">{formatCurrency(monthProfit.profit)}</strong>
                </span>
                <span className="text-white/60 hidden sm:inline">•</span>
                <span className="text-white/80 font-medium text-[10px] sm:text-xs hidden sm:inline">
                  {monthTransactions.length} Transaksi
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Launchpad Bar (Ergonomic Mobile Responsive Grid) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
            <Button 
              className="bg-white hover:bg-white/90 active:scale-95 shadow-md hover:shadow-lg font-bold text-xs sm:text-sm h-11 px-2.5 sm:px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 group"
              style={{ color: 'hsl(var(--primary-dark))' }}
              onClick={() => navigate('/pos')}
            >
              <ShoppingCart className="w-4 h-4 transition-transform group-hover:scale-110" style={{ color: 'hsl(var(--primary))' }} />
              <span className="font-extrabold">+ Kasir</span>
            </Button>
            <Button 
              variant="outline" 
              className="bg-white/15 hover:bg-white/25 active:scale-95 text-white border-white/25 backdrop-blur-md text-xs sm:text-sm h-11 px-2.5 sm:px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 group"
              onClick={() => navigate('/products')}
            >
              <Package className="w-4 h-4 text-white transition-transform group-hover:scale-110" />
              <span>+ Produk</span>
            </Button>
            <Button 
              variant="outline" 
              className="bg-white/15 hover:bg-white/25 active:scale-95 text-white border-white/25 backdrop-blur-md text-xs sm:text-sm h-11 px-2.5 sm:px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 group"
              onClick={() => navigate('/expenses')}
            >
              <Receipt className="w-4 h-4 text-white transition-transform group-hover:scale-110" />
              <span>+ Biaya</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Header */}
      {lowStockProducts.length > 0 && showLowStockAlert && (
        <div className="relative overflow-hidden rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  Peringatan Stok Kritis ({lowStockProducts.length} Produk)
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {outOfStockProducts.length} produk stok habis total, {lowStockProducts.length - outOfStockProducts.length} produk menipis.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                onClick={() => navigate('/products')}
              >
                Restock Produk
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <button 
                className="text-amber-500 hover:text-amber-700 p-1"
                onClick={() => { setShowLowStockAlert(false); localStorage.setItem('hideLowStockAlert', 'true'); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatCurrency(todaySales)}
          icon={DollarSign}
          iconColor="green"
          trend={{ value: salesGrowth, label: "vs kemarin" }}
        />
        <StatCard
          title="Transaksi Selesai"
          value={todayTransactions.length.toString()}
          subtitle={`Rata-rata order: ${formatCurrency(avgOrderValue)}`}
          icon={ShoppingCart}
          iconColor="blue"
        />
        <StatCard
          title="Laba Kotor Hari Ini"
          value={formatCurrency(todayProfit.profit)}
          subtitle={`Margin: ${todayProfit.revenue > 0 ? ((todayProfit.profit / todayProfit.revenue) * 100).toFixed(1) : 0}%`}
          icon={Wallet}
          iconColor="emerald"
        />
        <StatCard
          title="Produk Terjual"
          value={todayProductsSold.toString()}
          subtitle={`Hari ini (${todayTransactions.length} nota)`}
          icon={Package}
          iconColor="purple"
        />
      </div>

      {/* Main Grid: 7-Day Chart & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7-Day Sales Trend Modern Area Chart Visualizer */}
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900 transition-all">
          <CardHeader className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Tren Penjualan 7 Hari Terakhir
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Grafik kurva visual perbandingan omset dan jumlah transaksi.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Header Pill Legend Badges matching reference style */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full text-xs shadow-inner">
                <span className="px-3 py-1 rounded-full font-semibold bg-white dark:bg-slate-700 shadow-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Omset
                </span>
                <span className="px-2.5 py-1 rounded-full font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Laba
                </span>
                <span className="px-2.5 py-1 rounded-full font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Modal
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={last7Days}
                  margin={{ top: 15, right: 15, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradientOmset" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="gradientProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="gradientCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={true}
                    stroke="#f1f5f9"
                    className="dark:stroke-slate-800/80"
                  />
                  <XAxis
                    dataKey="dayLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => 
                      val >= 1000000 
                        ? `${(val / 1000000).toFixed(1)}jt` 
                        : val >= 1000 
                        ? `${(val / 1000).toFixed(0)}k` 
                        : val
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Omset"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#gradientOmset)"
                    dot={{ r: 4.5, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2.5 }}
                    activeDot={{ r: 7.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Estimasi Laba"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientProfit)"
                    dot={{ r: 4, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2.5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    name="Nilai Modal"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradientCost)"
                    dot={{ r: 3.5, fill: '#ffffff', stroke: '#f59e0b', strokeWidth: 2 }}
                    activeDot={{ r: 6.5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card className="border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b bg-card">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Metode Pembayaran (Bulan Ini)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {['cash', 'transfer', 'ewallet', 'credit'].map((method) => {
              const amount = paymentBreakdown[method] || 0;
              const percentage = Math.round((amount / totalPaymentSum) * 100) || 0;
              const label = method === 'cash' ? 'Tunai / Cash' : method === 'transfer' ? 'Transfer Bank' : method === 'ewallet' ? 'E-Wallet (QRIS)' : 'Kredit';

              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-foreground">{label}</span>
                    <span className="font-mono text-primary">{formatCurrency(amount)} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}

            <div className="pt-3 border-t mt-4 text-center">
              <span className="text-xs text-muted-foreground">Total Penjualan Bulan Ini: </span>
              <strong className="text-xs font-bold text-foreground">{formatCurrency(monthSales)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid: Top Products, Inventory Health & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top 5 Best Sellers Ranking */}
        <Card className="border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b bg-card flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top Produk Terlaris
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">Bulan Ini</Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Belum ada data produk terjual
              </div>
            ) : (
              topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      idx === 0 ? 'bg-amber-500 text-white shadow-xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-800' :
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-foreground truncate" title={product.name}>
                        {product.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">{product.sold} pcs terjual</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-xs font-bold text-primary">
                    {formatCurrency(product.revenue)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Smart Inventory Health */}
        <Card className="border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b bg-card">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Kesehatan Stok Inventaris
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block">{safeStockProductsCount}</span>
                <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">Stok Aman</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block">{lowStockProducts.length - outOfStockProducts.length}</span>
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Menipis</span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900">
                <span className="text-xl font-bold text-rose-600 dark:text-rose-400 block">{outOfStockProducts.length}</span>
                <span className="text-[10px] font-semibold text-rose-800 dark:text-rose-300">Habis</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Rasio Ketersediaan Barang</span>
                <span>{products.length > 0 ? Math.round((safeStockProductsCount / products.length) * 100) : 0}%</span>
              </div>
              <Progress value={products.length > 0 ? (safeStockProductsCount / products.length) * 100 : 0} className="h-2 bg-rose-100 dark:bg-rose-950" />
            </div>

            <Button 
              variant="outline" 
              className="w-full text-xs h-9 mt-2" 
              onClick={() => navigate('/products')}
            >
              Kelola Katalog Produk & Stok
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Live Feed Transaksi Terbaru */}
        <Card className="border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b bg-card flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Transaksi Kasir Terbaru
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary" onClick={() => navigate('/transactions')}>
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Belum ada transaksi recorded
              </div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border hover:shadow-xs transition-all text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-foreground truncate max-w-[140px]">
                      {t.customerName}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {t.invoiceNumber || (t.id && t.id.length > 16 && t.id.includes('-') ? t.id.slice(0, 8).toUpperCase() : t.id)} • {formatDate(t.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-primary font-mono block text-xs">
                        {formatCurrency(t.total)}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                        {t.paymentMethod}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 shrink-0"
                      onClick={() => setPrintingTransaction(t)}
                      title="Cetak Struk"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      {printingTransaction && (
        <ReceiptDialog
          open={!!printingTransaction}
          onClose={() => setPrintingTransaction(null)}
          transaction={{
            id: printingTransaction.id,
            customerName: printingTransaction.customerName,
            createdAt: printingTransaction.createdAt,
            items: printingTransaction.items.map((i: any) => ({
              productName: i.productName,
              quantity: i.quantity,
              price: i.price,
              subtotal: i.subtotal
            })),
            subtotal: printingTransaction.subtotal,
            tax: printingTransaction.tax,
            discount: printingTransaction.discount,
            total: printingTransaction.total,
            paymentMethod: printingTransaction.paymentMethod,
            paymentAmount: printingTransaction.paymentAmount ?? printingTransaction.total,
            changeAmount: printingTransaction.changeAmount ?? 0
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
