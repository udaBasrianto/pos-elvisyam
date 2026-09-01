import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  Zap,
  Building2,
  CheckCircle2,
  Calendar,
  Layers
} from "lucide-react";

interface GlobalAnalyticsItem {
  month: string;
  revenue: number;
  transactions: number;
}

interface SaasStats {
  totalTenants: number;
  activeTenants: number;
  mrr: number;
  arr: number;
  tiers: {
    free: number;
    pro: number;
    enterprise: number;
  };
  revenueHistory?: GlobalAnalyticsItem[];
}

interface SuperAdminAnalyticsProps {
  saasStats: SaasStats | null;
  analyticsData: GlobalAnalyticsItem[];
}

export default function SuperAdminAnalytics({ saasStats, analyticsData }: SuperAdminAnalyticsProps) {
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'transactions' | 'combined'>('combined');
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('6m');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatShortCurrency = (val: number) => {
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}k`;
    return `Rp ${val}`;
  };

  // Real data or empty
  const displayData = analyticsData && analyticsData.length > 0 ? analyticsData : [];

  // SaaS Tiers Pie Chart Data
  const tierData = [
    { name: 'Free', count: saasStats?.tiers?.free ?? 0, color: '#94a3b8' },
    { name: 'Pro', count: saasStats?.tiers?.pro ?? 0, color: '#3b82f6' },
    { name: 'Enterprise', count: saasStats?.tiers?.enterprise ?? 0, color: '#8b5cf6' },
  ];

  const totalTenants = saasStats?.totalTenants || tierData.reduce((acc, curr) => acc + curr.count, 0);
  const activeTenants = saasStats?.activeTenants || 0;
  const activePercent = totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0;
  const mrr = saasStats?.mrr || 0;
  const arr = saasStats?.arr || mrr * 12;

  // Custom Glassmorphic Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-3.5 rounded-xl shadow-2xl text-white text-xs space-y-1.5 min-w-[170px]">
          <p className="font-bold text-slate-300 border-b border-slate-700/80 pb-1 flex items-center justify-between">
            <span>📅 {label}</span>
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 font-mono">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-white">
                {entry.name.includes('Omset') || entry.name.includes('Revenue')
                  ? formatCurrency(entry.value)
                  : entry.value.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* SaaS Executive KPI Header Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* MRR Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-900/90 via-indigo-900/80 to-slate-900 text-white shadow-xl border border-purple-500/20 group hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-purple-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-purple-200/80 uppercase">Monthly Recurring Revenue</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px]">MRR</Badge>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white mb-1">
            {formatCurrency(mrr)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-purple-200/70">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Estimasi pendapatan bulanan SaaS</span>
          </div>
        </div>

        {/* ARR Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-900/90 via-sky-900/80 to-slate-900 text-white shadow-xl border border-blue-500/20 group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-blue-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-blue-200/80 uppercase">Annual Run Rate</span>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px]">ARR</Badge>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white mb-1">
            {formatCurrency(arr)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-200/70">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Proyeksi tahunan platform</span>
          </div>
        </div>

        {/* Active Tenants Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-900/90 via-teal-900/80 to-slate-900 text-white shadow-xl border border-emerald-500/20 group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building2 className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-emerald-200/80 uppercase">Tenant Aktif (30 Hari)</span>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">{activePercent}% Aktif</Badge>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white mb-1">
            {activeTenants} <span className="text-sm font-normal text-emerald-300/70">/ {totalTenants} toko</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-200/70">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aktif bertransaksi bulan ini</span>
          </div>
        </div>

        {/* Subscription Tiers Summary */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-slate-900 text-white shadow-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Paket Langganan</span>
            <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700">Tiers</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1 text-center">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <p className="text-[10px] text-slate-400 font-bold">FREE</p>
              <p className="text-lg font-black text-slate-200">{saasStats?.tiers?.free ?? 0}</p>
            </div>
            <div className="bg-blue-950/60 p-2 rounded-xl border border-blue-800/40">
              <p className="text-[10px] text-blue-400 font-bold">PRO</p>
              <p className="text-lg font-black text-blue-300">{saasStats?.tiers?.pro ?? 0}</p>
            </div>
            <div className="bg-purple-950/60 p-2 rounded-xl border border-purple-800/40">
              <p className="text-[10px] text-purple-400 font-bold">ENT</p>
              <p className="text-lg font-black text-purple-300">{saasStats?.tiers?.enterprise ?? 0}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue & Volume Main Chart (2 cols) */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-card overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Tren Pertumbuhan Platform
              </CardTitle>
              <CardDescription className="text-xs">
                Grafik gabungan omset & volume transaksi seluruh tenant
              </CardDescription>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border text-xs">
              <button
                onClick={() => setActiveChartTab('combined')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeChartTab === 'combined' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Gabungan
              </button>
              <button
                onClick={() => setActiveChartTab('revenue')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeChartTab === 'revenue' ? 'bg-background shadow text-purple-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Omset
              </button>
              <button
                onClick={() => setActiveChartTab('transactions')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeChartTab === 'transactions' ? 'bg-background shadow text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Transaksi
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />

                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] font-medium"
                    stroke="#94a3b8"
                  />

                  <YAxis
                    yAxisId="left"
                    tickFormatter={formatShortCurrency}
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] font-mono"
                    stroke="#8b5cf6"
                    hide={activeChartTab === 'transactions'}
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] font-mono"
                    stroke="#3b82f6"
                    hide={activeChartTab === 'revenue'}
                  />

                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />

                  {(activeChartTab === 'combined' || activeChartTab === 'revenue') && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Total Omset Platform"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      activeDot={{ r: 7, stroke: '#8b5cf6', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  )}

                  {(activeChartTab === 'combined' || activeChartTab === 'transactions') && (
                    <Area
                      yAxisId={activeChartTab === 'transactions' ? 'left' : 'right'}
                      type="monotone"
                      dataKey="transactions"
                      name="Jumlah Transaksi"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTransactions)"
                      activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Tier Distribution Donut Chart (1 col) */}
        <Card className="border-0 shadow-xl bg-card flex flex-col justify-between">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              Demografi Paket
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi status langganan tenant
            </CardDescription>
          </CardHeader>

          <CardContent className="py-4 flex-1 flex flex-col items-center justify-center">
            <div className="h-[220px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {tierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} Toko`, 'Jumlah']} />
                </PieChart>
              </ResponsiveContainer>
              {/* Central Text Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black font-mono text-foreground">{totalTenants}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">TOTAL TENANT</span>
              </div>
            </div>

            {/* Custom Legend Cards */}
            <div className="w-full space-y-2 pt-2">
              {tierData.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/40 border">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-semibold">{t.name} Tier</span>
                  </div>
                  <span className="font-bold font-mono">{t.count} toko ({totalTenants > 0 ? Math.round((t.count / totalTenants) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Secondary Bar Chart: Monthly Transaction Comparison */}
      <Card className="border-0 shadow-xl bg-card">
        <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Perbandingan Volume Transaksi per Bulan
            </CardTitle>
            <CardDescription className="text-xs">
              Melihat fluktuasi aktivitas belanja konsumen di seluruh jaringan toko
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <Activity className="w-3 h-3 text-emerald-500" /> Live Aggregated Data
          </Badge>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[11px]" stroke="#94a3b8" />
                <YAxis tickLine={false} axisLine={false} className="text-[11px] font-mono" stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="transactions"
                  name="Volume Transaksi"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
