import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  Clock, 
  Package, 
  Share2, 
  Send, 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle,
  FileText
} from "lucide-react";
import api from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";

interface HourlySale {
  hour: number;
  count: number;
  total: number;
}

interface ProductVelocity {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  unit: string;
  quantity_sold: number;
  revenue: number;
}

interface MarketBasket {
  pair: string;
  count: number;
}

interface AIInsights {
  executiveSummary: string;
  peakHourAnalysis: string;
  productAnalysis: string;
  affinityAnalysis: string;
  strategicPlan: string;
}

interface AIData {
  hourlySales: HourlySale[];
  productVelocity: ProductVelocity[];
  marketBasket: MarketBasket[];
  insights: AIInsights;
}

// Simple helper to render backend markdown answers cleanly
const parseMarkdownToJsx = (text: string) => {
  if (!text) return null;
  const safeText = typeof text === 'string' ? text : String(text);
  const lines = safeText.split("\n");
  return lines.map((line, index) => {
    let cleanLine = line.trim();
    if (cleanLine.startsWith("###")) {
      return (
        <h4 key={index} className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">
          {cleanLine.replace("###", "").trim()}
        </h4>
      );
    }
    if (cleanLine.startsWith("-")) {
      const parts = cleanLine.replace("-", "").trim().split("**");
      return (
        <li key={index} className="text-sm text-muted-foreground list-none pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary mb-1">
          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-foreground">{part}</strong> : part)}
        </li>
      );
    }
    if (cleanLine.match(/^\d+\./)) {
      const parts = cleanLine.replace(/^\d+\./, "").trim().split("**");
      const num = cleanLine.match(/^\d+/)?.[0];
      return (
        <li key={index} className="text-sm text-muted-foreground list-none pl-5 relative mb-2">
          <span className="absolute left-0 font-bold text-primary">{num}.</span>
          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-foreground">{part}</strong> : part)}
        </li>
      );
    }
    // Parse bold in standard text line
    const parts = cleanLine.split("**");
    return (
      <p key={index} className="text-sm text-muted-foreground leading-relaxed mb-2">
        {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-foreground">{part}</strong> : part)}
      </p>
    );
  });
};

const AIAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AIData | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "bot"; message: string }>>([
    {
      sender: "bot",
      message: "Halo! Saya AI Business Analyst Anda. Silakan tanyakan hal-hal terkait strategi optimasi jam sepi, analisis produk, kebutuhan stok, atau rencana penjualan bundling toko Anda."
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchAIData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/analytics/ai-report");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load AI analytics report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const handleSendChat = async (questionText?: string) => {
    const textToSend = questionText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    setChatHistory(prev => [...prev, { sender: "user", message: textToSend }]);
    if (!questionText) setChatInput("");
    setChatLoading(true);

    try {
      const res = await api.post("/analytics/ai-chat", { question: textToSend });
      if (res.data.success) {
        setChatHistory(prev => [...prev, { sender: "bot", message: res.data.answer }]);
      }
    } catch (err) {
      console.error("AI chat assistant error:", err);
      setChatHistory(prev => [...prev, { sender: "bot", message: "Maaf, terjadi kendala saat menghubungi AI Analyst. Silakan coba kembali." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePresetQuestion = (q: string) => {
    handleSendChat(q);
  };

  const exportReportToPDF = () => {
    if (!data) return;
    const doc = new jsPDF();

    // Document title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("LAPORAN AI BUSINESS ANALYST", 20, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 20, 28);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 32, 190, 32);

    // Section 1: Executive Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Executive Summary", 20, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(data.insights.executiveSummary.replace(/\*\*/g, ""), 170);
    doc.text(summaryLines, 20, 50);

    // Section 2: Peak Trading Hours Analysis
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. Analisis Jam Belanja Pelanggan", 20, 80);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const peakLines = doc.splitTextToSize(data.insights.peakHourAnalysis.replace(/\*\*/g, ""), 170);
    doc.text(peakLines, 20, 88);

    // Section 3: Product Analysis
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. Analisis Produk & Turn-Over Inventori", 20, 115);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const productLines = doc.splitTextToSize(data.insights.productAnalysis.replace(/\*\*/g, "").replace(/###.*/g, ""), 170);
    doc.text(productLines, 20, 123);

    // Section 4: Affinity Analysis
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. Analisis Asosiasi & Rekomendasi Bundling", 20, 160);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const affinityLines = doc.splitTextToSize(data.insights.affinityAnalysis.replace(/\*\*/g, "").replace(/###.*/g, ""), 170);
    doc.text(affinityLines, 20, 168);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Dibuat secara otomatis oleh POS Modern AI Business Advisor", 20, 280);

    doc.save(`Laporan_AI_Analyst_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getHourLabel = (h: number) => {
    return `${String(h).padStart(2, '0')}:00`;
  };

  // Setup peak hours chart data
  const chartData = data?.hourlySales.map(item => ({
    hour: getHourLabel(item.hour),
    transaksi: item.count,
    pendapatan: item.total
  })) || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Menghubungi AI Analyst dan memproses data transaksi Anda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Brain className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Business Analyst</h1>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Standard Pro
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Analisis mendalam perilaku transaksi dan optimasi performa bisnis otomatis.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAIData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Perbarui Data
          </Button>
          <Button onClick={exportReportToPDF} className="gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white border-0 shadow-md">
            <FileText className="w-4 h-4" /> Unduh Laporan PDF
          </Button>
        </div>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metrics & Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Executive Summary Card */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Brain className="w-36 h-36 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-400">
                <Sparkles className="w-5 h-5" /> AI Executive Overview
              </CardTitle>
              <CardDescription className="text-slate-400">Ringkasan rekomendasi utama operasional toko Anda.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base text-slate-200 leading-relaxed font-medium">
                {data?.insights.executiveSummary}
              </p>
            </CardContent>
          </Card>

          {/* Peak Hours Chart */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Jam Sibuk & Distribusi Transaksi
                </CardTitle>
                <CardDescription>Pola waktu tersibuk berdasarkan transaksi selesai.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-72 w-full mt-4">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Belum ada data transaksi yang tercatat.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} tickFormatter={(val)=>val} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0',
                          color: '#0f172a'
                        }}
                      />
                      <Area type="monotone" dataKey="transaksi" name="Transaksi" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-sm border">
                {parseMarkdownToJsx(data?.insights.peakHourAnalysis || "")}
              </div>
            </CardContent>
          </Card>

          {/* Product Velocity & Stocks */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Performa Produk & Stok
              </CardTitle>
              <CardDescription>Kecepatan penjualan produk terlaris versus sisa stok saat ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.productVelocity.slice(0, 4).map(prod => {
                  const isLow = prod.stock <= prod.min_stock;
                  return (
                    <div key={prod.id} className="p-4 rounded-xl border bg-background hover:shadow-sm transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-sm line-clamp-1 text-foreground">{prod.name}</h4>
                          {isLow ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 flex items-center gap-1 font-bold animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Restock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold">
                              Aman
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">SKU: {prod.sku}</p>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Stok Saat Ini:</span>
                          <span className={isLow ? "text-destructive font-bold" : "text-foreground"}>
                            {prod.stock} {prod.unit || 'pcs'} / Min: {prod.min_stock}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${Math.min((prod.stock / (prod.min_stock || 10)) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground pt-1">
                          <span>Terjual: <strong>{prod.quantity_sold} {prod.unit || 'pcs'}</strong></span>
                          <span className="font-semibold text-primary">Rp {(prod.revenue).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-sm border mt-4">
                {parseMarkdownToJsx(data?.insights.productAnalysis || "")}
              </div>
            </CardContent>
          </Card>

          {/* Market Basket Analysis */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" /> Analisis Asosiasi Produk (Bundling)
              </CardTitle>
              <CardDescription>Produk-produk yang paling sering dibeli secara bersamaan dalam satu struk belanja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {data?.marketBasket.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Data struk penjualan belum memiliki variasi item yang cukup untuk memetakan promo bundling.
                  </div>
                ) : (
                  data?.marketBasket.map((item, index) => {
                    const products = item.pair.split(' & ');
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="font-semibold">{products[0]}</Badge>
                            <span className="text-muted-foreground text-xs font-semibold">+</span>
                            <Badge variant="outline" className="font-semibold">{products[1]}</Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dibeli bersama: <strong className="text-foreground">{item.count}x</strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-sm border">
                {parseMarkdownToJsx(data?.insights.affinityAnalysis || "")}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: AI Consultant Panel */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Strategic Plans */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Rencana Strategis AI
              </CardTitle>
              <CardDescription>Langkah aksi taktis berstandar internasional.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-sm">
                {parseMarkdownToJsx(data?.insights.strategicPlan || "")}
              </div>
            </CardContent>
          </Card>

          {/* AI Consultant Chat Box */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md flex flex-col h-[500px]">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" /> AI Consultant Chat
              </CardTitle>
              <CardDescription>Konsultasikan taktik penjualan toko secara langsung.</CardDescription>
            </CardHeader>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((chat, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm ${
                      chat.sender === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-slate-100 dark:bg-slate-900 text-foreground rounded-tl-none border"
                    }`}
                  >
                    {chat.sender === "bot" ? parseMarkdownToJsx(chat.message) : chat.message}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl rounded-tl-none border flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Prompts */}
            <div className="p-3 border-t bg-muted/20 flex flex-wrap gap-1.5">
              <button 
                onClick={() => handlePresetQuestion("Bagaimana cara menaikkan penjualan di jam sepi?")}
                className="text-xs bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border px-2.5 py-1.5 rounded-full transition-colors font-medium text-muted-foreground hover:text-foreground"
              >
                Taktik Jam Sepi ⏰
              </button>
              <button 
                onClick={() => handlePresetQuestion("Produk apa saja yang perlu saya restock?")}
                className="text-xs bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border px-2.5 py-1.5 rounded-full transition-colors font-medium text-muted-foreground hover:text-foreground"
              >
                Urgensi Restock 📦
              </button>
              <button 
                onClick={() => handlePresetQuestion("Bagaimana cara membuat promo bundling yang tepat?")}
                className="text-xs bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border px-2.5 py-1.5 rounded-full transition-colors font-medium text-muted-foreground hover:text-foreground"
              >
                Strategi Bundling 🤝
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t flex gap-2">
              <Input 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Tanyakan analisis lain..." 
                className="flex-1"
                disabled={chatLoading}
              />
              <Button 
                onClick={() => handleSendChat()} 
                disabled={chatLoading || !chatInput.trim()}
                size="icon"
                className="bg-primary text-primary-foreground shrink-0 shadow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default AIAnalysis;
