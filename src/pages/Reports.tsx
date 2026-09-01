import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, ColoredCard } from "@/components/ui/colored-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart as BarChartIcon,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ShoppingCart,
  PieChart as PieChartIcon,
  Activity,
  Calculator,
  Wallet,
  CreditCard,
  Receipt,
  Calendar,
  FileSpreadsheet,
  FileText,
  Coins,
  Scale,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp, Transaction } from "@/contexts/AppContext";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
}

const Reports = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("30-hari");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [yearlyExpenses, setYearlyExpenses] = useState<Expense[]>([]);
  const [yearlyTransactions, setYearlyTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [incomeSummary, setIncomeSummary] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Zakat Maal State (Metode Salafy - Urudh at-Tijarah)
  const [goldPricePerGram, setGoldPricePerGram] = useState<number>(1400000);
  const [zakatCalendarType, setZakatCalendarType] = useState<"hijriyah" | "masehi">("hijriyah");
  const [customStockValue, setCustomStockValue] = useState<string>("");
  const [manualCash, setManualCash] = useState<string>("");
  const [manualReceivables, setManualReceivables] = useState<string>("0");
  const [manualPayables, setManualPayables] = useState<string>("0");
  const [showZakatGuide, setShowZakatGuide] = useState<boolean>(false);

  const periodOptions = ["hari-ini", "7-hari", "30-hari", "90-hari", "tahun-ini", "kustom"];

  // Map period to API format
  const getPeriodParam = () => {
    switch (selectedPeriod) {
      case "hari-ini": return "today";
      case "7-hari": return "week";
      case "30-hari": return "month";
      case "90-hari": return "month"; // 90 days use month filter
      case "tahun-ini": return "year";
      default: return "month";
    }
  };

  // Fetch expenses, income summary, and financial summary
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const periodParam = getPeriodParam();
        if (selectedPeriod === "kustom" && customStartDate && customEndDate) {
          const [expensesRes, summaryRes, incomeRes] = await Promise.all([
            api.get(`/expenses?from_date=${customStartDate}&to_date=${customEndDate}`),
            api.get(`/reports/financial-summary?from_date=${customStartDate}&to_date=${customEndDate}`),
            api.get(`/incomes/summary?from_date=${customStartDate}&to_date=${customEndDate}`)
          ]);
          setExpenses(expensesRes.data);
          setFinancialSummary(summaryRes.data);
          setIncomeSummary(incomeRes.data);
        } else {
          const [expensesRes, summaryRes, incomeRes] = await Promise.all([
            api.get(`/expenses?period=${periodParam}`),
            api.get(`/reports/financial-summary?period=${periodParam}`),
            api.get(`/incomes/summary?period=${periodParam}`)
          ]);
          setExpenses(expensesRes.data);
          setFinancialSummary(summaryRes.data);
          setIncomeSummary(incomeRes.data);
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }
    };
    fetchFinancialData();
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Fetch full expenses & transactions for the selected year to ensure 100% accurate monthly table
  useEffect(() => {
    const fetchYearlyData = async () => {
      try {
        const [expRes, txRes] = await Promise.all([
          api.get(`/expenses?from_date=${selectedYear}-01-01&to_date=${selectedYear}-12-31`),
          api.get(`/transactions?startDate=${selectedYear}-01-01 00:00:00&endDate=${selectedYear}-12-31 23:59:59&limit=50000`)
        ]);
        setYearlyExpenses(expRes.data || []);
        if (Array.isArray(txRes.data)) {
          const mappedTx: Transaction[] = txRes.data.map((t: any) => ({
            id: t.id,
            customerId: t.customer_id,
            customerName: t.customer_name,
            invoiceNumber: t.invoice_number,
            items: (t.items || []).map((i: any) => ({
              id: i.id,
              productId: i.product_id,
              productName: i.product_name,
              quantity: Number(i.quantity) || 0,
              price: Number(i.price) || 0,
              subtotal: Number(i.subtotal) || 0,
              costPrice: Number(i.cost_price) || 0,
            })),
            subtotal: Number(t.subtotal) || Number(t.total) || 0,
            tax: Number(t.tax) || 0,
            taxAmount: Number(t.tax_amount) || 0,
            discount: Number(t.discount) || 0,
            total: Number(t.total) || 0,
            paymentMethod: t.payment_method || 'cash',
            paymentAmount: Number(t.payment_amount) || Number(t.total) || 0,
            changeAmount: Number(t.change_amount) || 0,
            cashierName: t.cashier_name,
            notes: t.notes,
            status: t.status || 'completed',
            createdAt: t.created_at || t.createdAt,
          }));
          setYearlyTransactions(mappedTx);
        }
      } catch (err) {
        console.error("Error fetching yearly data:", err);
      }
    };
    fetchYearlyData();
  }, [selectedYear]);

  // Calculate date range based on selected period
  const getDateRange = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    let startDate = new Date();

    switch (selectedPeriod) {
      case "hari-ini":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Start of today
        break;
      case "7-hari":
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "30-hari":
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "90-hari":
        startDate.setDate(today.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "tahun-ini":
        startDate = new Date(today.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "kustom":
        if (customStartDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { startDate, endDate: end };
        }
        break;
    }

    return { startDate, endDate: today };
  };

  const { startDate, endDate } = getDateRange();

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      return transactionDate >= startDate && transactionDate <= endDate && transaction.status === 'completed';
    });
  }, [state.transactions, startDate, endDate]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalRevenue = (filteredTransactions || []).reduce((sum, t) => sum + (Number(t?.total) || 0), 0);

    const totalTransactions = (filteredTransactions || []).length;
    const totalItems = (filteredTransactions || []).reduce((sum, t) => sum + (t?.items || []).reduce((itemSum, item) => itemSum + (Number(item?.quantity) || 0), 0), 0);
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalDiscount = (filteredTransactions || []).reduce((sum, t) => sum + (Number(t?.discount) || 0), 0);
    const totalTax = (filteredTransactions || []).reduce((sum, t) => sum + (Number(t?.tax) || 0), 0);
    const subtotalRevenue = (filteredTransactions || []).reduce((sum, t) => sum + (Number(t?.subtotal) || 0), 0);

    return { totalRevenue, totalTransactions, totalItems, averageOrderValue, totalDiscount, totalTax, subtotalRevenue };
  }, [filteredTransactions, state.products]);

  // Calculate profit/loss (Cost of Goods Sold)
  const profitLoss = useMemo(() => {
    let totalCOGS = 0;
    let totalRevenue = 0;

    (filteredTransactions || []).forEach(transaction => {
      totalRevenue += (Number(transaction?.total) || 0);
      
      (transaction?.items || []).forEach(item => {
        const product = (state.products || []).find(p => String(p.id) === String(item.productId));
        const costPrice = product?.costPrice || 0;
        
        totalCOGS += costPrice * (Number(item?.quantity) || 0);
      });
    });

    // Calculate total expenses from fetched data
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e?.amount || 0), 0);

    // Calculate service income (pendapatan jasa)
    const serviceIncome = incomeSummary?.paid_amount ? Number(incomeSummary.paid_amount) : 0;
    const pendingServiceIncome = incomeSummary?.pending_amount ? Number(incomeSummary.pending_amount) : 0;

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = 0;
      acc[e.category] += Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

    // Total revenue now includes product sales + service income
    const totalRevenueWithServices = totalRevenue + serviceIncome;

    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Net profit = Gross Profit + Service Income - Tax - Expenses
    const netProfit = grossProfit + serviceIncome - metrics.totalTax - totalExpenses;
    const netMargin = totalRevenueWithServices > 0 ? (netProfit / totalRevenueWithServices) * 100 : 0;

    return {
      totalCOGS,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      totalExpenses,
      expensesByCategory,
      serviceIncome,
      pendingServiceIncome,
      totalRevenueWithServices
    };
  }, [filteredTransactions, state.products, metrics.totalTax, expenses, incomeSummary]);

  // Calculate previous period for comparison
  const previousPeriodMetrics = useMemo(() => {
    const periodDiff = endDate.getTime() - startDate.getTime();
    const previousPeriodStart = new Date(startDate.getTime() - periodDiff);

    const previousTransactions = state.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      return transactionDate >= previousPeriodStart && transactionDate < startDate && transaction.status === 'completed';
    });

    const previousRevenue = previousTransactions.reduce((sum, t) => sum + t.total, 0);
    const revenueChange = previousRevenue > 0 ? ((metrics.totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return { previousRevenue, revenueChange, previousTransactions: previousTransactions.length };
  }, [state.transactions, startDate, endDate, metrics.totalRevenue]);

  // Daily sales data for chart
  const dailySalesData = useMemo(() => {
    const rangeDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const days = Math.min(rangeDays, 365);
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayTransactions = filteredTransactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate.toDateString() === date.toDateString();
      });

      const revenue = (dayTransactions || []).reduce((sum, t) => sum + (Number(t?.total) || 0), 0);
      const profit = (dayTransactions || []).reduce((sum, t) => {
        return sum + (t?.items || []).reduce((itemSum, item) => {
          const product = (state.products || []).find(p => String(p.id) === String(item.productId));
          const costPrice = product?.costPrice || 0;
          return itemSum + ((Number(item?.subtotal) || 0) - (costPrice * (Number(item?.quantity) || 0)));
        }, 0);
      }, 0);

      data.push({
        date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        fullDate: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        revenue,
        profit,
        transactions: dayTransactions.length,
      });
    }

    return data;
  }, [filteredTransactions, state.products, selectedPeriod]);

  // Weekly sales data
  const weeklySalesData = useMemo(() => {
    const weeks = selectedPeriod === "hari-ini" ? 1 : selectedPeriod === "7-hari" ? 1 : selectedPeriod === "30-hari" ? 4 : selectedPeriod === "90-hari" ? 13 : 52;
    const data = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weekTransactions = (filteredTransactions || []).filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= weekStart && tDate <= weekEnd;
      });

      const revenue = (weekTransactions || []).reduce((sum, t) => sum + (Number(t?.total) || 0), 0);
      const profit = (weekTransactions || []).reduce((sum, t) => {
        return sum + (t?.items || []).reduce((itemSum, item) => {
          const product = (state.products || []).find(p => String(p.id) === String(item.productId));
          const costPrice = product?.costPrice || 0;
          return itemSum + ((Number(item?.subtotal) || 0) - (costPrice * (Number(item?.quantity) || 0)));
        }, 0);
      }, 0);

      data.push({
        week: `Minggu ${weeks - i}`,
        dateRange: `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`,
        revenue,
        profit,
        transactions: weekTransactions.length,
      });
    }

    return data;
  }, [filteredTransactions, state.products, selectedPeriod]);

  // Monthly sales data
  const monthlySalesData = useMemo(() => {
    const monthsCount = selectedPeriod === "hari-ini" ? 1 : selectedPeriod === "7-hari" ? 1 : selectedPeriod === "30-hari" ? 1 : selectedPeriod === "90-hari" ? 3 : 12;
    const data = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const txSource = yearlyTransactions.length > 0 ? yearlyTransactions : (state.transactions || []);
      const monthTransactions = (txSource || []).filter(t => {
        const st = (t.status || 'completed').toLowerCase();
        if (st === 'void' || st === 'cancelled' || st === 'batal') return false;

        const rawDate = t.createdAt || (t as any).created_at || (t as any).date;
        if (!rawDate) return false;
        const dateStr = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
        const tDate = new Date(dateStr);
        if (isNaN(tDate.getTime())) return false;

        return tDate >= monthStart && tDate <= monthEnd;
      });

      const revenue = (monthTransactions || []).reduce((sum, t) => sum + (Number(t?.total) || 0), 0);
      const profit = (monthTransactions || []).reduce((sum, t) => {
        return sum + (t?.items || []).reduce((itemSum, item) => {
          const product = (state.products || []).find(p => String(p.id) === String(item.productId));
          const costPrice = item.costPrice || product?.costPrice || 0;
          return itemSum + ((Number(item?.subtotal) || 0) - (costPrice * (Number(item?.quantity) || 0)));
        }, 0);
      }, 0);

      data.push({
        month: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        shortMonth: date.toLocaleDateString('id-ID', { month: 'short' }),
        revenue,
        profit,
        transactions: monthTransactions.length,
      });
    }

    return data;
  }, [yearlyTransactions, state.transactions, state.products, selectedPeriod]);

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    const txSource = yearlyTransactions.length > 0 ? yearlyTransactions : (state.transactions || []);
    (txSource || []).forEach(t => {
      const rawDate = t.createdAt || (t as any).created_at || (t as any).date;
      if (rawDate) {
        const dateStr = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
        const y = new Date(dateStr).getFullYear();
        if (!isNaN(y) && y > 2000) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [yearlyTransactions, state.transactions]);

  // Comprehensive monthly table data for the selected year
  const detailedMonthlyTable = useMemo(() => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const currentYear = selectedYear;

    return months.map((monthName, monthIndex) => {
      const monthStart = new Date(currentYear, monthIndex, 1, 0, 0, 0, 0);
      const monthEnd = new Date(currentYear, monthIndex + 1, 0, 23, 59, 59, 999);

      // Transactions for this month (uses yearlyTransactions or falls back to state.transactions)
      const txSource = yearlyTransactions.length > 0 ? yearlyTransactions : (state.transactions || []);
      const monthTx = (txSource || []).filter(t => {
        const st = (t.status || 'completed').toLowerCase();
        if (st === 'void' || st === 'cancelled' || st === 'batal') return false;

        const rawDate = t.createdAt || (t as any).created_at || (t as any).date;
        if (!rawDate) return false;
        const dateStr = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;

        return d >= monthStart && d <= monthEnd;
      });

      const totalTransactions = monthTx.length;
      let totalQty = 0;
      let subtotalRevenue = 0;
      let totalDiscount = 0;
      let totalRevenue = 0;
      let totalCOGS = 0;

      monthTx.forEach(t => {
        subtotalRevenue += Number(t.subtotal) || Number(t.total) || 0;
        totalDiscount += Number(t.discount) || 0;
        totalRevenue += Number(t.total) || 0;

        (t.items || []).forEach(item => {
          totalQty += Number(item.quantity) || 0;
          const product = (state.products || []).find(p => String(p.id) === String(item.productId));
          const cost = item.costPrice || product?.costPrice || 0;
          totalCOGS += cost * (Number(item.quantity) || 0);
        });
      });

      // Expenses for this month (uses yearlyExpenses or falls back to expenses)
      const expensesSource = yearlyExpenses.length > 0 ? yearlyExpenses : expenses;
      const monthExpenses = expensesSource.filter(e => {
        const rawDate = e.expense_date || (e as any).date || (e as any).created_at;
        if (!rawDate) return false;
        const dateStr = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        return d >= monthStart && d <= monthEnd;
      }).reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const grossProfit = totalRevenue - totalCOGS;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netProfit = grossProfit - monthExpenses;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        monthIndex,
        monthName,
        year: currentYear,
        periodLabel: `${monthName} ${currentYear}`,
        totalTransactions,
        totalQty,
        subtotalRevenue,
        totalDiscount,
        totalRevenue,
        totalCOGS,
        grossProfit,
        grossMargin,
        expenses: monthExpenses,
        netProfit,
        netMargin,
      };
    });
  }, [selectedYear, yearlyTransactions, state.transactions, state.products, expenses, yearlyExpenses]);

  // Annual Totals from the monthly table
  const annualTotals = useMemo(() => {
    return detailedMonthlyTable.reduce((acc, m) => {
      acc.totalTransactions += m.totalTransactions;
      acc.totalQty += m.totalQty;
      acc.subtotalRevenue += m.subtotalRevenue;
      acc.totalDiscount += m.totalDiscount;
      acc.totalRevenue += m.totalRevenue;
      acc.totalCOGS += m.totalCOGS;
      acc.grossProfit += m.grossProfit;
      acc.expenses += m.expenses;
      acc.netProfit += m.netProfit;
      return acc;
    }, {
      totalTransactions: 0,
      totalQty: 0,
      subtotalRevenue: 0,
      totalDiscount: 0,
      totalRevenue: 0,
      totalCOGS: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
    });
  }, [detailedMonthlyTable]);

  // Payment method data for pie chart
  const paymentMethodData = useMemo(() => {
    const methods = filteredTransactions.reduce((acc, transaction) => {
      const method = transaction.paymentMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count += 1;
      acc[method].total += transaction.total;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const labels: Record<string, string> = {
      cash: 'Tunai',
      transfer: 'Transfer',
      ewallet: 'E-Wallet',
      credit: 'Kredit',
    };

    return Object.entries(methods).map(([key, value]) => ({
      name: labels[key] || key,
      value: value.count,
      total: value.total,
    }));
  }, [filteredTransactions]);

  // Top products analysis
  const topProducts = useMemo(() => {
    const productSales = (filteredTransactions || []).reduce((acc, transaction) => {
      (transaction?.items || []).forEach(item => {
        if (!item || !item.productId) return;
        if (!acc[item.productId]) {
          const product = (state.products || []).find(p => String(p.id) === String(item.productId));
          acc[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
            transactions: 0,
            costPrice: product?.costPrice || 0,
            ownershipType: product?.ownershipType || 'owned',
          };
        }
        acc[item.productId].quantity += (Number(item.quantity) || 0);
        acc[item.productId].revenue += (Number(item.subtotal) || 0);
        acc[item.productId].profit += (Number(item.subtotal) || 0) - (acc[item.productId].costPrice * (Number(item.quantity) || 0));
        acc[item.productId].transactions += 1;
      });
      return acc;
    }, {} as Record<string, any>);

    return Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 50);
  }, [filteredTransactions, state.products]);

  const categorySummary = useMemo(() => {
    const summary = (filteredTransactions || []).reduce((acc, transaction) => {
      (transaction?.items || []).forEach(item => {
        if (!item) return;
        const product = (state.products || []).find(p => String(p.id) === String(item.productId));
        const category = product?.category || 'Tanpa Kategori';
        const costPrice = product?.costPrice || 0;

        if (!acc[category]) {
          acc[category] = {
            category,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        acc[category].quantity += (Number(item.quantity) || 0);
        acc[category].revenue += (Number(item.subtotal) || 0);
        acc[category].profit += (Number(item.subtotal) || 0) - costPrice * (Number(item.quantity) || 0);
      });
      return acc;
    }, {} as Record<string, { category: string; quantity: number; revenue: number; profit: number }>);

    return Object.values(summary).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions, state.products]);

  const cashierSummary = useMemo(() => {
    const summary = (filteredTransactions || []).reduce((acc, transaction) => {
      const key = transaction.cashierId || transaction.cashierName || 'unknown';
      const name = transaction.cashierName || 'Tidak diketahui';
      if (!acc[key]) {
        acc[key] = {
          cashierKey: key,
          cashierName: name,
          transactions: 0,
          revenue: 0,
          profit: 0,
        };
      }
      acc[key].transactions += 1;
      
      acc[key].revenue += (Number(transaction?.total) || 0);
      
      const txProfit = (transaction?.items || []).reduce((sum, item) => {
        const product = (state.products || []).find(p => p.id === item.productId);
        const costPrice = product?.costPrice || 0;
        return sum + ((Number(item?.subtotal) || 0) - costPrice * (Number(item?.quantity) || 0));
      }, 0);
      acc[key].profit += txProfit;
      return acc;
    }, {} as Record<string, { cashierKey: string; cashierName: string; transactions: number; revenue: number; profit: number }>);

    return Object.values(summary).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions, state.products]);

  // Customer analysis
  const topCustomers = useMemo(() => {
    const customerAnalysis = filteredTransactions.reduce((acc, transaction) => {
      if (transaction.customerId) {
        if (!acc[transaction.customerId]) {
          acc[transaction.customerId] = {
            customerId: transaction.customerId,
            customerName: transaction.customerName,
            transactions: 0,
            totalSpent: 0,
            lastPurchase: transaction.createdAt
          };
        }
        acc[transaction.customerId].transactions += 1;
        acc[transaction.customerId].totalSpent += transaction.total;

        if (new Date(transaction.createdAt) > new Date(acc[transaction.customerId].lastPurchase)) {
          acc[transaction.customerId].lastPurchase = transaction.createdAt;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(customerAnalysis)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Pendapatan & Performa Bisnis", 14, 15);
    doc.setFontSize(11);
    doc.text(`Periode: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`, 14, 25);
    
    autoTable(doc, {
      startY: 30,
      head: [["Metrik", "Nilai"]],
      body: [
        ["Total Pendapatan", formatCurrency(metrics.totalRevenue)],
        ["Jasa Layanan", formatCurrency(profitLoss.serviceIncome)],
        ["Total Transaksi", metrics.totalTransactions.toString()],
        ["Laba Kotor", formatCurrency(profitLoss.grossProfit)],
        ["Laba Bersih", formatCurrency(profitLoss.netProfit)],
        ["Biaya Operasional", formatCurrency(profitLoss.totalExpenses)],
      ],
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Kategori Terjual", "Quantity", "Pendapatan"]],
      body: categorySummary.map(c => [c.category, c.quantity.toString(), formatCurrency(c.revenue)])
    });

    doc.save(`Laporan_Bisnis_${selectedPeriod}.pdf`);
  };

  const handleExportExcel = () => {
    const summaryData = [
      { Metrik: "Total Pendapatan", Nilai: metrics.totalRevenue },
      { Metrik: "Jasa Layanan", Nilai: profitLoss.serviceIncome },
      { Metrik: "Total Transaksi", Nilai: metrics.totalTransactions },
      { Metrik: "Laba Kotor", Nilai: profitLoss.grossProfit },
      { Metrik: "Laba Bersih", Nilai: profitLoss.netProfit },
      { Metrik: "Biaya Operasional", Nilai: profitLoss.totalExpenses },
    ];

    const categoryData = categorySummary.map(c => ({
      Kategori: c.category,
      Quantity: c.quantity,
      Pendapatan: c.revenue,
      Laba: c.profit
    }));

    const detailsData = filteredTransactions.map((t: any) => ({
      ID: t.id,
      Tanggal: formatDate(t.createdAt),
      Kasir: t.cashierName || '-',
      Pelanggan: t.customerName || 'Umum',
      Total: t.total,
      Metode_Pembayaran: t.paymentMethod,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsCategory = XLSX.utils.json_to_sheet(categoryData);
    const wsDetails = XLSX.utils.json_to_sheet(detailsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsCategory, "Kategori");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Transaksi");

    XLSX.writeFile(wb, `Laporan_Bisnis_${selectedPeriod}.xlsx`);
  };

  const handleExportMonthlyExcel = () => {
    const monthlyData = detailedMonthlyTable.map((m) => ({
      Bulan: m.periodLabel,
      "Jml Transaksi": m.totalTransactions,
      "Item Terjual (Qty)": m.totalQty,
      "Penjualan Kotor (Rp)": m.subtotalRevenue,
      "Diskon (Rp)": m.totalDiscount,
      "Penjualan Bersih / Omset (Rp)": m.totalRevenue,
      "HPP / Modal (Rp)": m.totalCOGS,
      "Laba Kotor (Rp)": m.grossProfit,
      "Margin Kotor (%)": `${m.grossMargin.toFixed(1)}%`,
      "Biaya Operasional (Rp)": m.expenses,
      "Laba Bersih (Rp)": m.netProfit,
      "Margin Bersih (%)": `${m.netMargin.toFixed(1)}%`,
    }));

    // Add total row
    monthlyData.push({
      Bulan: `TOTAL TAHUN ${selectedYear}`,
      "Jml Transaksi": annualTotals.totalTransactions,
      "Item Terjual (Qty)": annualTotals.totalQty,
      "Penjualan Kotor (Rp)": annualTotals.subtotalRevenue,
      "Diskon (Rp)": annualTotals.totalDiscount,
      "Penjualan Bersih / Omset (Rp)": annualTotals.totalRevenue,
      "HPP / Modal (Rp)": annualTotals.totalCOGS,
      "Laba Kotor (Rp)": annualTotals.grossProfit,
      "Margin Kotor (%)": `${annualTotals.totalRevenue > 0 ? ((annualTotals.grossProfit / annualTotals.totalRevenue) * 100).toFixed(1) : 0}%`,
      "Biaya Operasional (Rp)": annualTotals.expenses,
      "Laba Bersih (Rp)": annualTotals.netProfit,
      "Margin Bersih (%)": `${annualTotals.totalRevenue > 0 ? ((annualTotals.netProfit / annualTotals.totalRevenue) * 100).toFixed(1) : 0}%`,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, ws, `Rekap_Bulanan_${selectedYear}`);
    XLSX.writeFile(wb, `Laporan_Bulanan_${selectedYear}.xlsx`);
  };

  const handleExportMonthlyPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text(`Laporan Rekapitulasi Penjualan Bulanan (Tahun ${selectedYear})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, 14, 22);

    const headers = [
      ["Bulan", "Trx", "Item", "Penjualan Bersih", "HPP (Modal)", "Laba Kotor", "Margin", "Pengeluaran", "Laba Bersih"]
    ];

    const body = detailedMonthlyTable.map((m) => [
      m.monthName,
      m.totalTransactions.toString(),
      m.totalQty.toString(),
      formatCurrency(m.totalRevenue),
      formatCurrency(m.totalCOGS),
      formatCurrency(m.grossProfit),
      `${m.grossMargin.toFixed(1)}%`,
      formatCurrency(m.expenses),
      formatCurrency(m.netProfit),
    ]);

    body.push([
      `TOTAL ${selectedYear}`,
      annualTotals.totalTransactions.toString(),
      annualTotals.totalQty.toString(),
      formatCurrency(annualTotals.totalRevenue),
      formatCurrency(annualTotals.totalCOGS),
      formatCurrency(annualTotals.grossProfit),
      `${annualTotals.totalRevenue > 0 ? ((annualTotals.grossProfit / annualTotals.totalRevenue) * 100).toFixed(1) : 0}%`,
      formatCurrency(annualTotals.expenses),
      formatCurrency(annualTotals.netProfit),
    ]);

    autoTable(doc, {
      startY: 27,
      head: headers,
      body: body,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      footStyles: { fontStyle: "bold" },
    });

    doc.save(`Laporan_Bulanan_${selectedYear}.pdf`);
  };

  // -------------------------------------------------------------
  // ZAKAT MAAL CALCULATIONS (METODE SALAFY - URUDH AT-TIJARAH)
  // -------------------------------------------------------------
  const defaultInventoryValue = useMemo(() => {
    return (state.products || []).reduce((sum, p) => {
      const qty = Math.max(0, Number(p.stock) || 0);
      const cost = Number(p.costPrice) || 0;
      return sum + (qty * cost);
    }, 0);
  }, [state.products]);

  const activeStockValue = customStockValue !== "" ? Math.max(0, Number(customStockValue) || 0) : defaultInventoryValue;
  const activeCash = manualCash !== "" ? Math.max(0, Number(manualCash) || 0) : Math.max(0, annualTotals.netProfit);
  const activeReceivables = Math.max(0, Number(manualReceivables) || 0);
  const activePayables = Math.max(0, Number(manualPayables) || 0);

  // Total Harta Lancar Perniagaan
  const totalCurrentAssets = activeStockValue + activeCash + activeReceivables;
  // Harta Bersih Wajib Zakat (setelah dikurangi hutang jatuh tempo)
  const netZakatBase = Math.max(0, totalCurrentAssets - activePayables);

  // Nishab 85 gram emas
  const nishabEmasGram = 85;
  const nishabNominal = nishabEmasGram * (goldPricePerGram || 1400000);

  // Persentase Zakat (Hijriyah 2.5%, Masehi 2.577%)
  const zakatRatePercent = zakatCalendarType === "hijriyah" ? 2.5 : 2.577;
  const zakatRateMultiplier = zakatCalendarType === "hijriyah" ? 0.025 : 0.02577;

  // Status Nishab
  const isZakatEligible = netZakatBase >= nishabNominal;
  const totalZakatDue = isZakatEligible ? Math.round(netZakatBase * zakatRateMultiplier) : 0;

  const handleExportZakatPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Perhitungan Zakat Maal Perniagaan", 14, 18);
    doc.setFontSize(10);
    doc.text("Metode Fiqh Salafy ('Urudh at-Tijarah - Berdasarkan Nishab 85 gr Emas)", 14, 25);
    doc.text(`Tahun Buku / Haul: ${selectedYear} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 31);

    autoTable(doc, {
      startY: 38,
      head: [["Komponen Perhitungan Zakat", "Keterangan Syar'i", "Nominal (Rp)"]],
      body: [
        ["1. Nilai Stok Barang Dagangan (Inventory)", "Nilai pokok barang siap jual saat haul", formatCurrency(activeStockValue)],
        ["2. Saldo Kas & Rekening Bank Usaha", "Uang tunai di kasir & rekening perniagaan", formatCurrency(activeCash)],
        ["3. Piutang Lancar Tertagih", "Piutang kepada pihak lain yang diharapkan kembali", formatCurrency(activeReceivables)],
        ["TOTAL HARTA LANCAR (AKTIVA BRUTO)", "Penjumlahan seluruh komponen harta lancar", formatCurrency(totalCurrentAssets)],
        ["4. Hutang Usaha Jatuh Tempo", "Hutang pembelian barang / kewajiban jangka pendek", `-${formatCurrency(activePayables)}`],
        ["HARTA BERSIH WAJIB ZAKAT", "Harta Lancar dikurangi Hutang Jatuh Tempo", formatCurrency(netZakatBase)],
        ["Nishab (85 gram Emas)", `Harga Emas: ${formatCurrency(goldPricePerGram)}/gr`, formatCurrency(nishabNominal)],
        ["Status Kewajiban Zakat", isZakatEligible ? "WAJIB ZAKAT (Mencapai Nishab)" : "BELUM MENCAPAI NISHAB", isZakatEligible ? "WAJIB" : "TIDAK WAJIB"],
        ["Kadar Zakat Dikeluarkan", `Berdasarkan Kalender ${zakatCalendarType === "hijriyah" ? "Hijriyah (2.5%)" : "Masehi (2.577%)"}`, `${zakatRatePercent}%`],
        ["TOTAL ZAKAT YANG WAJIB DIKELUARKAN", isZakatEligible ? "Wajib disalurkan ke 8 Ashnaf" : "Disunnahkan Infaq/Sedekah", formatCurrency(totalZakatDue)],
      ],
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`Zakat_Maal_Perniagaan_${selectedYear}.pdf`);
  };

  const handleExportZakatExcel = () => {
    const zakatData = [
      { Pos: "Tahun Buku / Haul", Keterangan: `Tahun ${selectedYear}`, Nilai: selectedYear },
      { Pos: "Metode Kalender", Keterangan: zakatCalendarType === "hijriyah" ? "Tahun Hijriyah (Qamariyah 2.5%)" : "Tahun Masehi (Syamsiyah 2.577%)", Nilai: `${zakatRatePercent}%` },
      { Pos: "Harga Emas per Gram", Keterangan: "Harga pasar emas murni saat haul", Nilai: goldPricePerGram },
      { Pos: "Nishab (85 Gram Emas)", Keterangan: "85 gr x Harga Emas", Nilai: nishabNominal },
      { Pos: "1. Nilai Stok Barang Dagangan", Keterangan: "Nilai stok barang siap jual", Nilai: activeStockValue },
      { Pos: "2. Uang Kas & Saldo Rekening", Keterangan: "Uang tunai perniagaan", Nilai: activeCash },
      { Pos: "3. Piutang Lancar", Keterangan: "Piutang yang kuat harapan tertagih", Nilai: activeReceivables },
      { Pos: "Total Harta Lancar (Bruto)", Keterangan: "Stok + Kas + Piutang", Nilai: totalCurrentAssets },
      { Pos: "4. Hutang Usaha Jatuh Tempo", Keterangan: "Hutang jangka pendek usaha", Nilai: -activePayables },
      { Pos: "Harta Bersih Wajib Zakat", Keterangan: "Total Harta Lancar - Hutang", Nilai: netZakatBase },
      { Pos: "Status Kewajiban Zakat", Keterangan: isZakatEligible ? "Mencapai Nishab" : "Belum Mencapai Nishab", Nilai: isZakatEligible ? "WAJIB" : "TIDAK WAJIB" },
      { Pos: "TOTAL ZAKAT WAJIB DIBAYARKAN", Keterangan: `${zakatRatePercent}% dari Harta Bersih`, Nilai: totalZakatDue },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(zakatData);
    XLSX.utils.book_append_sheet(wb, ws, `Zakat_Maal_${selectedYear}`);
    XLSX.writeFile(wb, `Laporan_Zakat_Maal_${selectedYear}.xlsx`);
  };

  const chartConfig = {
    revenue: {
      label: "Pendapatan",
      color: "hsl(var(--primary))",
    },
    profit: {
      label: "Laba Kotor",
      color: "hsl(var(--success))",
    },
    transactions: {
      label: "Transaksi",
      color: "hsl(var(--warning))",
    },
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Laporan", href: "/reports" }]} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-foreground">Periode:</span>
            {periodOptions.map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period === "hari-ini" ? "Hari Ini" :
                  period === "7-hari" ? "7 Hari" :
                    period === "30-hari" ? "30 Hari" :
                      period === "90-hari" ? "90 Hari" :
                        period === "tahun-ini" ? "Tahun Ini" : "Kustom"}
              </Button>
            ))}
            {selectedPeriod === "kustom" && (
              <div className="flex items-center gap-2 ml-2">
                <div className="flex items-center gap-2">
                  <Label>Dari</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Sampai</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <MetricCard
          title="Total Pendapatan"
          value={formatCurrency(metrics.totalRevenue)}
          icon={DollarSign}
          iconColor="green"
          subtitle={`${previousPeriodMetrics.revenueChange >= 0 ? '+' : ''}${previousPeriodMetrics.revenueChange.toFixed(1)}% dari periode sebelumnya`}
        />
        <MetricCard
          title="Total Transaksi"
          value={metrics.totalTransactions.toString()}
          icon={ShoppingCart}
          iconColor="blue"
          subtitle={`${previousPeriodMetrics.previousTransactions} periode sebelumnya`}
        />
        <MetricCard
          title="Laba Kotor"
          value={formatCurrency(profitLoss.grossProfit)}
          icon={Calculator}
          iconColor="emerald"
          subtitle={`Margin: ${profitLoss.grossMargin.toFixed(1)}%`}
        />
        <MetricCard
          title="Laba Bersih"
          value={formatCurrency(profitLoss.netProfit)}
          icon={Wallet}
          iconColor="orange"
          subtitle={`Margin: ${profitLoss.netMargin.toFixed(1)}%`}
        />
      </div>

      {/* Profit/Loss Statement */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Laporan Laba Rugi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Section */}
              <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50 shadow-xs">
                <h4 className="font-semibold text-blue-950 dark:text-blue-200 border-b border-blue-200/80 dark:border-blue-900/80 pb-2 flex items-center justify-between">
                  <span>Pendapatan</span>
                  <Badge variant="outline" className="text-[10px] bg-blue-100/80 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-300/60">Arus Masuk</Badge>
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Penjualan Kotor</span>
                    <span className="font-medium">{formatCurrency(metrics.subtotalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="font-medium text-destructive">-{formatCurrency(metrics.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-blue-200/60 dark:border-blue-900/50 pt-2">
                    <span className="font-semibold text-blue-950 dark:text-blue-200">Penjualan Bersih</span>
                    <span className="font-bold text-primary text-base">{formatCurrency(metrics.totalRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Cost Section */}
              <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 shadow-xs">
                <h4 className="font-semibold text-amber-950 dark:text-amber-200 border-b border-amber-200/80 dark:border-amber-900/80 pb-2 flex items-center justify-between">
                  <span>Biaya & Laba</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-100/80 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300/60">HPP & Beban</Badge>
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Harga Pokok Penjualan (HPP)</span>
                    <span className="font-medium text-destructive">-{formatCurrency(profitLoss.totalCOGS)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-semibold">Laba Kotor</span>
                    <span className={`font-bold ${profitLoss.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(profitLoss.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pajak</span>
                    <span className="font-medium text-destructive">-{formatCurrency(metrics.totalTax)}</span>
                  </div>

                  {/* Expenses Section */}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> Biaya Operasional
                      </span>
                      <span className="font-medium text-destructive">-{formatCurrency(profitLoss.totalExpenses)}</span>
                    </div>
                    {Object.entries(profitLoss.expensesByCategory || {}).slice(0, 5).map(([category, amount]) => (
                      <div key={category} className="flex justify-between text-xs pl-4 text-muted-foreground">
                        <span>• {category}</span>
                        <span>-{formatCurrency(amount as number)}</span>
                      </div>
                    ))}
                    {Object.keys(profitLoss.expensesByCategory || {}).length > 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs p-0 h-auto mt-1"
                        onClick={() => navigate('/expenses')}
                      >
                        Lihat semua pengeluaran →
                      </Button>
                    )}
                  </div>

                  {/* Service Income Section */}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Pendapatan Jasa
                      </span>
                      <span className="font-medium text-success">+{formatCurrency(profitLoss.serviceIncome || 0)}</span>
                    </div>
                    {incomeSummary?.byCategory?.slice(0, 5).map((cat: any) => (
                      <div key={cat.category} className="flex justify-between text-xs pl-4 text-muted-foreground">
                        <span>• {cat.category} ({cat.count})</span>
                        <span>+{formatCurrency(Number(cat.total))}</span>
                      </div>
                    ))}
                    {profitLoss.pendingServiceIncome > 0 && (
                      <div className="flex justify-between text-xs pl-4 text-yellow-600 mt-1">
                        <span>⏳ Pending</span>
                        <span>{formatCurrency(profitLoss.pendingServiceIncome)}</span>
                      </div>
                    )}
                    {(profitLoss.serviceIncome > 0 || profitLoss.pendingServiceIncome > 0) && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs p-0 h-auto mt-1"
                        onClick={() => navigate('/incomes')}
                      >
                        Lihat semua pendapatan jasa →
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-between text-sm border-t pt-2 bg-muted/50 p-2 rounded">
                    <span className="font-bold">Laba Bersih</span>
                    <span className={`font-bold text-lg ${profitLoss.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(profitLoss.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Total Item Terjual</p>
                <p className="text-xl font-bold text-foreground">{metrics.totalItems}</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Rata-rata per Transaksi</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(metrics.averageOrderValue)}</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Margin Laba Kotor</p>
                <p className={`text-xl font-bold ${profitLoss.grossMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {profitLoss.grossMargin.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Margin Laba Bersih</p>
                <p className={`text-xl font-bold ${profitLoss.netMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {profitLoss.netMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📅 Tabel Rekapitulasi Laporan Tiap Bulan */}
      <Card className="bg-gradient-to-br from-indigo-500/[0.05] via-card to-indigo-500/[0.02] border-2 border-indigo-200/90 dark:border-indigo-900/60 shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-100 dark:border-indigo-900/40">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <CardTitle className="text-base md:text-lg font-bold text-indigo-950 dark:text-indigo-100">
                Tabel Rekapitulasi Penjualan & Laba Tiap Bulan
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rincian performa transaksi, omset penjualan, HPP, pengeluaran operasional, dan laba bersih per bulan pada tahun {selectedYear}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-background border border-indigo-200 dark:border-indigo-800 rounded-lg px-2.5 py-1">
              <span className="text-xs font-semibold text-muted-foreground">Tahun:</span>
              <Select
                value={String(selectedYear)}
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="h-8 w-24 border-0 shadow-none focus:ring-0 text-xs font-bold p-0 text-indigo-600 dark:text-indigo-400">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((yr) => (
                    <SelectItem key={yr} value={String(yr)} className="text-xs font-medium">
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMonthlyPDF}
              className="h-8 text-xs gap-1.5 shadow-sm font-semibold border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Bulanan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMonthlyExcel}
              className="h-8 text-xs gap-1.5 shadow-sm font-semibold border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel Bulanan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Quick Year Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/70 dark:border-indigo-800/50">
              <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">Total Penjualan ({selectedYear})</p>
              <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 font-mono">
                {formatCurrency(annualTotals.totalRevenue)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {annualTotals.totalTransactions} Transaksi • {annualTotals.totalQty} Qty
              </p>
            </div>
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Total Laba Kotor</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {formatCurrency(annualTotals.grossProfit)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Margin: {annualTotals.totalRevenue > 0 ? ((annualTotals.grossProfit / annualTotals.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200/70 dark:border-rose-800/50">
              <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">Total Pengeluaran</p>
              <p className="text-base sm:text-lg font-bold text-destructive mt-0.5 font-mono">
                {formatCurrency(annualTotals.expenses)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Biaya Operasional Toko
              </p>
            </div>
            <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200/70 dark:border-teal-800/50">
              <p className="text-[11px] font-medium text-teal-700 dark:text-teal-300">Total Laba Bersih</p>
              <p className={`text-base sm:text-lg font-bold mt-0.5 font-mono ${annualTotals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {formatCurrency(annualTotals.netProfit)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Margin: {annualTotals.totalRevenue > 0 ? ((annualTotals.netProfit / annualTotals.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="border-2 border-indigo-200/80 dark:border-indigo-900/60 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-indigo-100/90 dark:bg-indigo-950/90 text-indigo-950 dark:text-indigo-100 font-bold border-b border-indigo-200 dark:border-indigo-800">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Bulan</th>
                    <th className="py-3 px-3 text-center">Trx</th>
                    <th className="py-3 px-3 text-right">Item</th>
                    <th className="py-3 px-3 text-right">Penjualan Bersih</th>
                    <th className="py-3 px-3 text-right">HPP (Modal)</th>
                    <th className="py-3 px-3 text-right">Laba Kotor</th>
                    <th className="py-3 px-3 text-center">Margin</th>
                    <th className="py-3 px-3 text-right">Pengeluaran</th>
                    <th className="py-3 px-3.5 text-right font-bold">Laba Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100/70 dark:divide-indigo-900/40 bg-background/70">
                  {detailedMonthlyTable.map((m) => {
                    const isCurrentMonth =
                      new Date().getFullYear() === selectedYear &&
                      new Date().getMonth() === m.monthIndex;

                    return (
                      <tr
                        key={m.monthIndex}
                        className={`transition-colors hover:bg-muted/30 ${
                          isCurrentMonth ? "bg-primary/5 font-medium" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{m.monthName}</span>
                            {isCurrentMonth && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                                Berjalan
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {m.totalTransactions}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground font-medium">
                          {m.totalQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                          {formatCurrency(m.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {formatCurrency(m.totalCOGS)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-medium ${m.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(m.grossProfit)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground font-medium">
                            {m.grossMargin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-destructive font-medium">
                          {m.expenses > 0 ? `-${formatCurrency(m.expenses)}` : formatCurrency(0)}
                        </td>
                        <td className={`py-2.5 px-3.5 text-right font-bold ${m.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(m.netProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-indigo-100/90 dark:bg-indigo-950 font-bold border-t-2 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100">
                  <tr>
                    <td className="py-3 px-3.5 uppercase tracking-wider text-xs font-bold">
                      TOTAL ({selectedYear})
                    </td>
                    <td className="py-3 px-3 text-center text-xs">
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold">
                        {annualTotals.totalTransactions}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-mono">
                      {annualTotals.totalQty}
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-indigo-700 dark:text-indigo-300 font-extrabold font-mono">
                      {formatCurrency(annualTotals.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-muted-foreground font-mono">
                      {formatCurrency(annualTotals.totalCOGS)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {formatCurrency(annualTotals.grossProfit)}
                    </td>
                    <td className="py-3 px-3 text-center text-xs">
                      {annualTotals.totalRevenue > 0 ? ((annualTotals.grossProfit / annualTotals.totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-destructive font-mono">
                      {annualTotals.expenses > 0 ? `-${formatCurrency(annualTotals.expenses)}` : formatCurrency(0)}
                    </td>
                    <td className={`py-3 px-3.5 text-right text-sm font-black font-mono ${annualTotals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {formatCurrency(annualTotals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* KALKULATOR & TABEL ZAKAT MAAL PERNIAGAAN                                 */}
      {/* ========================================================================= */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Perhitungan Zakat Maal Perniagaan (Tahun {selectedYear})
                </CardTitle>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                  Nishab 85 gr Emas
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Kalkulasi zakat perdagangan (<em>'Urudh at-Tijarah</em>) berdasarkan nishab 85 gram emas murni dan haul tahun perniagaan.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowZakatGuide(true)}
                className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Panduan Zakat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportZakatExcel}
                className="h-8 text-xs gap-1.5 text-emerald-600 hover:bg-emerald-50 border-emerald-200"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportZakatPDF}
                className="h-8 text-xs gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Prominent Status Banner */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              isZakatEligible
                ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-emerald-500/5 border-emerald-500/30 text-foreground shadow-xs"
                : "bg-muted/40 border-border/80 text-muted-foreground"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    isZakatEligible
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isZakatEligible
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isZakatEligible ? "Wajib Dikeluarkan Zakat" : "Belum Wajib Zakat"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (Nishab: {formatCurrency(nishabNominal)})
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground mt-1">
                    {isZakatEligible
                      ? "Harta Perniagaan Telah Mencapai Nishab"
                      : "Harta Bersih Belum Mencapai Batas Nishab (85g Emas)"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    {isZakatEligible
                      ? `Harta bersih wajib zakat (${formatCurrency(netZakatBase)}) telah melampaui nishab (${formatCurrency(nishabNominal)}). Wajib dikeluarkan zakat ${zakatRatePercent}% untuk 8 golongan mustahiq.`
                      : `Harta bersih (${formatCurrency(netZakatBase)}) masih di bawah nishab (${formatCurrency(nishabNominal)}). Tidak ada kewajiban zakat maal perniagaan pada tahun ini, namun disunnahkan sedekah tathawwu'.`}
                  </p>
                </div>
              </div>

              <div className="sm:text-right w-full sm:w-auto p-3 sm:p-0 bg-background/60 sm:bg-transparent rounded-xl border sm:border-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Zakat Wajib ({zakatRatePercent}%)
                </p>
                <div
                  className={`text-2xl sm:text-3xl font-black mt-0.5 font-mono ${
                    isZakatEligible ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {formatCurrency(totalZakatDue)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Kadar: {zakatRatePercent}% ({zakatCalendarType === "hijriyah" ? "Tahun Hijriyah 1/40" : "Tahun Masehi Penyesuaian"})
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Parameters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                Harga Emas Murni / Gram (Rp)
              </Label>
              <Input
                type="number"
                value={goldPricePerGram}
                onChange={(e) => setGoldPricePerGram(Math.max(1, Number(e.target.value) || 0))}
                placeholder="1400000"
                className="h-9 text-xs font-mono bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                Nishab 85g: <span className="font-bold text-foreground">{formatCurrency(nishabNominal)}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Kalender Haul Usaha
              </Label>
              <Select
                value={zakatCalendarType}
                onValueChange={(val: "hijriyah" | "masehi") => setZakatCalendarType(val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hijriyah">Tahun Hijriyah (Qamariyah - 2.50%)</SelectItem>
                  <SelectItem value="masehi">Tahun Masehi (Syamsiyah - 2.577%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Kadar zakat: <span className="font-bold text-foreground">{zakatRatePercent}%</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Tahun Buku / Haul
              </Label>
              <div className="h-9 px-3 rounded-md bg-background border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tahun Rekapitulasi:</span>
                <span className="font-bold text-foreground">{selectedYear}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Otomatis mengikuti filter tahun laporan di atas.
              </p>
            </div>
          </div>

          {/* Rincian Komponen Harta Wajib Zakat Table */}
          <div className="border rounded-xl overflow-hidden shadow-xs">
            <div className="p-3.5 bg-muted/60 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  Rincian Neraca Harta Perniagaan Wajib Zakat
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Sesuai fatwa Salafy: Seluruh harta lancar dijumlahkan, lalu dikurangi hutang jatuh tempo.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomStockValue("");
                  setManualCash("");
                  setManualReceivables("0");
                  setManualPayables("0");
                  toast.success("Komponen zakat disinkronkan kembali dengan data sistem!");
                }}
                className="h-7 text-xs text-primary hover:bg-primary/10 gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" />
                Reset ke Data Sistem
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3.5 w-12 text-center">Pos</th>
                    <th className="py-2.5 px-3 font-semibold text-foreground">Komponen Harta & Kewajiban</th>
                    <th className="py-2.5 px-3 text-muted-foreground hidden md:table-cell">Kaidah Fiqh Syar'i</th>
                    <th className="py-2.5 px-3.5 text-right font-bold text-foreground w-64">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-background/50">
                  {/* Pos 1: Stok Barang Dagangan */}
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                        +
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground">1. Nilai Stok Barang Dagangan (Inventory)</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Nilai modal/pokok dari {state.products?.length || 0} jenis barang siap jual di etalase/gudang.
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      Dihitung dari barang yang disiapkan untuk diperjualbelikan (<em>'Urudh at-Tijarah</em>).
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={customStockValue !== "" ? customStockValue : defaultInventoryValue}
                          onChange={(e) => setCustomStockValue(e.target.value)}
                          className="h-8 text-xs font-mono text-right w-44 bg-background"
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Sistem: {formatCurrency(defaultInventoryValue)}
                      </div>
                    </td>
                  </tr>

                  {/* Pos 2: Uang Kas & Saldo Rekening */}
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                        +
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground">2. Saldo Uang Kas & Rekening Toko</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Uang tunai di laci kasir dan tabungan di rekening operasional perniagaan saat haul.
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      Uang tunai hasil laba/modal yang siap digunakan dalam operasional usaha.
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={manualCash !== "" ? manualCash : Math.max(0, annualTotals.netProfit)}
                          onChange={(e) => setManualCash(e.target.value)}
                          className="h-8 text-xs font-mono text-right w-44 bg-background"
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Laba Buku: {formatCurrency(Math.max(0, annualTotals.netProfit))}
                      </div>
                    </td>
                  </tr>

                  {/* Pos 3: Piutang Lancar */}
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                        +
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground">3. Piutang Lancar (Diharapkan Tertagih)</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Tagihan bon / piutang kepada pelanggan yang kuat harapan pembayarannya (<em>Marjuwwul Ada'</em>).
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      Piutang macet / tidak ada harapan cair TIDAK dihitung zakatnya hingga uang tersebut diterima.
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={manualReceivables}
                          onChange={(e) => setManualReceivables(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs font-mono text-right w-44 bg-background"
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatCurrency(activeReceivables)}
                      </div>
                    </td>
                  </tr>

                  {/* Subtotal Harta Lancar Bruto */}
                  <tr className="bg-muted/30 font-semibold border-t border-b">
                    <td className="py-2.5 px-3.5 text-center text-xs text-muted-foreground">=</td>
                    <td className="py-2.5 px-3 text-foreground" colSpan={2}>
                      TOTAL HARTA LANCAR PERNIAGAAN (AKTIVA BRUTO)
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-foreground font-mono font-bold">
                      {formatCurrency(totalCurrentAssets)}
                    </td>
                  </tr>

                  {/* Pos 4: Hutang Usaha Jatuh Tempo */}
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                        -
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-destructive">4. Hutang Usaha Jatuh Tempo (Kewajiban Mendesak)</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Hutang pembelian barang dagangan ke supplier atau tagihan operasional yang harus segera dilunasi.
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      Hutang jangka pendek yang jatuh tempo saat haul menjadi pengurang harta zakat.
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={manualPayables}
                          onChange={(e) => setManualPayables(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs font-mono text-right w-44 bg-background border-rose-300"
                        />
                      </div>
                      <div className="text-[10px] text-destructive mt-0.5">
                        -{formatCurrency(activePayables)}
                      </div>
                    </td>
                  </tr>
                </tbody>

                <tfoot className="border-t-2 border-border text-foreground">
                  {/* Harta Bersih */}
                  <tr className="bg-muted/60 font-bold">
                    <td className="py-3 px-3.5 text-center text-primary">=</td>
                    <td className="py-3 px-3 text-sm text-foreground uppercase tracking-wider" colSpan={2}>
                      HARTA BERSIH WAJIB ZAKAT (BASIS ZAKAT)
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-base font-extrabold text-primary">
                      {formatCurrency(netZakatBase)}
                    </td>
                  </tr>

                  {/* Status Nishab */}
                  <tr className="bg-muted/40 font-semibold text-xs">
                    <td className="py-2.5 px-3.5 text-center text-muted-foreground">•</td>
                    <td className="py-2.5 px-3 text-muted-foreground" colSpan={2}>
                      Batas Nishab (85 gram Emas @ {formatCurrency(goldPricePerGram)}/gr)
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-muted-foreground">
                      {formatCurrency(nishabNominal)} ({isZakatEligible ? "✅ Terpenuhi" : "❌ Belum Terpenuhi"})
                    </td>
                  </tr>

                  {/* Final Total Zakat */}
                  <tr className={`border-t-2 ${isZakatEligible ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-extrabold' : 'bg-muted/70 text-muted-foreground font-bold'}`}>
                    <td className="py-4 px-3.5 text-center">
                      <Sparkles className={`w-5 h-5 ${isZakatEligible ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    </td>
                    <td className="py-4 px-3 text-sm sm:text-base font-black uppercase tracking-wider" colSpan={2}>
                      TOTAL ZAKAT YANG WAJIB DIKELUARKAN ({zakatRatePercent}%)
                    </td>
                    <td className={`py-4 px-3.5 text-right font-mono text-lg sm:text-xl font-black ${isZakatEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {formatCurrency(totalZakatDue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Dialog Popup Panduan Zakat Maal */}
      <Dialog open={showZakatGuide} onOpenChange={setShowZakatGuide}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Panduan & Kaidah Syar'i Zakat Perniagaan ('Urudh at-Tijarah)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Pedoman perhitungan zakat perdagangan tahunan berdasarkan nishab 85 gram emas murni.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 text-emerald-950 dark:text-emerald-200">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Landasan Dalil Syar'i
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                QS. Al-Baqarah: 267 & Hadits Samurah bin Jundub RA: <em>“Rasulullah ﷺ memerintahkan kami mengeluarkan zakat dari barang yang kami persiapkan untuk diperjualbelikan.”</em> (HR. Abu Dawud).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
              <div className="p-3 bg-muted/40 rounded-xl border space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  1. Aset Tetap Bebas Zakat
                </p>
                <p className="leading-relaxed">
                  Tanah toko, bangunan ruko, etalase, rak pajangan, mesin kasir POS, printer, AC, dan kendaraan operasional <strong>TIDAK DIHITUNG ZAKATNYA</strong> karena bukan komoditas yang diperjualbelikan (<em>li ghairi at-tijarah</em>).
                </p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  2. Penilaian Barang Dagangan
                </p>
                <p className="leading-relaxed">
                  Barang dagangan dinilai berdasarkan harga pokok/pasar saat genap satu tahun (haul), bukan harga jual eceran kotor, sebagaimana difatwakan para ulama dalam <em>Majmu' Fatawa</em>.
                </p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  3. Pengurang Hutang Jatuh Tempo
                </p>
                <p className="leading-relaxed">
                  Hutang usaha yang jatuh tempo saat haul dibayarkan atau dikurangkan terlebih dahulu dari total aktiva lancar sebelum menghitung nishab zakat.
                </p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  4. Penyaluran ke 8 Golongan (Ashnaf)
                </p>
                <p className="leading-relaxed">
                  Zakat wajib disalurkan kepada 8 asnaf yang disebutkan dalam QS. At-Taubah: 60, diutamakan kepada fakir miskin di sekitar lingkungan toko/usaha Anda.
                </p>
              </div>
            </div>

            <div className="p-3 bg-background rounded-xl border flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground text-xs">Rumus Harta Bersih Wajib Zakat:</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  (Stok Barang + Kas/Bank + Piutang) - Hutang Jatuh Tempo
                </p>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary font-bold">
                Kadar 2.5%
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Charts */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Grafik Penjualan & Laba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily">Harian</TabsTrigger>
              <TabsTrigger value="weekly">Mingguan</TabsTrigger>
              <TabsTrigger value="monthly">Bulanan</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySalesData.slice(-14)}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Pendapatan"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(var(--success))"
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      name="Laba Kotor"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="weekly">
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySalesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Pendapatan" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="hsl(var(--success))" name="Laba Kotor" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="monthly">
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySalesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="shortMonth"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      name="Pendapatan"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(var(--success))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--success))", strokeWidth: 2 }}
                      name="Laba Kotor"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Pie Chart */}
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Metode Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm text-muted-foreground">{data.value} transaksi</p>
                            <p className="text-sm font-medium">{formatCurrency(data.total)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethodData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products Bar Chart */}
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts.slice(0, 5)}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 11 }}
                    width={75}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.productName}</p>
                            <p className="text-sm">Pendapatan: {formatCurrency(data.revenue)}</p>
                            <p className="text-sm text-success">Laba: {formatCurrency(data.profit)}</p>
                            <p className="text-sm text-muted-foreground">{data.quantity} terjual</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit per Product, Category, Cashier */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
            <Package className="w-5 h-5 text-primary" />
            Laba per Produk, Kategori, dan Kasir
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-6">
            {/* Table 1: Produk Terlaris (Amber Theme) */}
            <div className="space-y-3 bg-gradient-to-br from-amber-500/[0.05] via-card to-amber-500/[0.02] p-4 rounded-xl border-2 border-amber-200/90 dark:border-amber-900/60 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Produk Terlaris (berdasarkan laba)
                </p>
                <Badge variant="outline" className="text-xs bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300/60 font-semibold">
                  Top 20 Item
                </Badge>
              </div>
              <div className="border border-amber-200/80 dark:border-amber-900/60 rounded-lg max-h-80 overflow-y-auto shadow-xs">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 sticky top-0 z-10 font-bold border-b border-amber-200 dark:border-amber-900">
                    <tr>
                      <th className="text-left px-4 py-2.5">Nama Produk</th>
                      <th className="text-right px-4 py-2.5">Qty Terjual</th>
                      <th className="text-right px-4 py-2.5">Total Pendapatan</th>
                      <th className="text-right px-4 py-2.5">Total Laba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60 dark:divide-amber-900/40 bg-background/70">
                    {topProducts.slice(0, 20).map((p: any) => (
                      <tr key={p.productId} className="hover:bg-amber-50/50 dark:hover:bg-amber-950/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{p.productName}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{p.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(p.revenue)}</td>
                        <td className={`px-4 py-2.5 text-right font-bold font-mono ${p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(p.profit)}
                        </td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          Belum ada data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Laba per Kategori (Purple Theme) */}
            <div className="space-y-3 bg-gradient-to-br from-purple-500/[0.05] via-card to-purple-500/[0.02] p-4 rounded-xl border-2 border-purple-200/90 dark:border-purple-900/60 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-base font-bold text-purple-950 dark:text-purple-100 flex items-center gap-2">
                  <BarChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Laba per Kategori
                </p>
                <Badge variant="outline" className="text-xs bg-purple-100/80 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300/60 font-semibold">
                  Top 20 Kategori
                </Badge>
              </div>
              <div className="border border-purple-200/80 dark:border-purple-900/60 rounded-lg max-h-80 overflow-y-auto shadow-xs">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-purple-100/90 dark:bg-purple-950/80 text-purple-950 dark:text-purple-100 sticky top-0 z-10 font-bold border-b border-purple-200 dark:border-purple-900">
                    <tr>
                      <th className="text-left px-4 py-2.5">Kategori</th>
                      <th className="text-right px-4 py-2.5">Qty Terjual</th>
                      <th className="text-right px-4 py-2.5">Total Pendapatan</th>
                      <th className="text-right px-4 py-2.5">Total Laba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100/60 dark:divide-purple-900/40 bg-background/70">
                    {categorySummary.slice(0, 20).map((c) => (
                      <tr key={c.category} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{c.category}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{c.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(c.revenue)}</td>
                        <td className={`px-4 py-2.5 text-right font-bold font-mono ${c.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(c.profit)}
                        </td>
                      </tr>
                    ))}
                    {categorySummary.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          Belum ada data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: Performa per Kasir (Sky Theme) */}
            <div className="space-y-3 bg-gradient-to-br from-sky-500/[0.05] via-card to-sky-500/[0.02] p-4 rounded-xl border-2 border-sky-200/90 dark:border-sky-900/60 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-base font-bold text-sky-950 dark:text-sky-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Performa per Kasir
                </p>
                <Badge variant="outline" className="text-xs bg-sky-100/80 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300/60 font-semibold">
                  Ringkasan Kasir
                </Badge>
              </div>
              <div className="border border-sky-200/80 dark:border-sky-900/60 rounded-lg max-h-80 overflow-y-auto shadow-xs">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-sky-100/90 dark:bg-sky-950/80 text-sky-950 dark:text-sky-100 sticky top-0 z-10 font-bold border-b border-sky-200 dark:border-sky-900">
                    <tr>
                      <th className="text-left px-4 py-2.5">Nama Kasir</th>
                      <th className="text-right px-4 py-2.5">Jumlah Transaksi</th>
                      <th className="text-right px-4 py-2.5">Total Pendapatan</th>
                      <th className="text-right px-4 py-2.5">Total Laba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60 dark:divide-sky-900/40 bg-background/70">
                    {cashierSummary.slice(0, 20).map((c) => (
                      <tr key={c.cashierKey} className="hover:bg-sky-50/50 dark:hover:bg-sky-950/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{c.cashierName}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{c.transactions}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(c.revenue)}</td>
                        <td className={`px-4 py-2.5 text-right font-bold font-mono ${c.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(c.profit)}
                        </td>
                      </tr>
                    ))}
                    {cashierSummary.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          Belum ada data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Customers (Rose Theme) */}
      <Card className="bg-gradient-to-br from-rose-500/[0.05] via-card to-rose-500/[0.02] border-2 border-rose-200/90 dark:border-rose-900/60 shadow-md">
        <CardHeader className="pb-3 border-b border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Users className="w-5 h-5" />
            </div>
            <CardTitle className="text-base md:text-lg font-bold text-rose-950 dark:text-rose-100">
              Pelanggan Terbaik
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 md:gap-4">
            {topCustomers.map((customer: any, index) => (
              <div key={customer.customerId} className="p-3 sm:p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 rounded-xl text-center shadow-xs">
                <div className="w-9 h-9 sm:w-12 sm:h-12 mx-auto bg-gradient-to-r from-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg mb-1.5 sm:mb-2 shadow-xs">
                  {index + 1}
                </div>
                <p className="font-bold text-foreground text-xs sm:text-sm truncate">{customer.customerName}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-extrabold font-mono mt-0.5">{formatCurrency(customer.totalSpent)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{customer.transactions} transaksi</p>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground text-xs">
                Belum ada data pelanggan tercatat
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Report */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
            <BarChartIcon className="w-5 h-5 text-primary" />
            Ringkasan Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-background rounded-xl border shadow-sm">
              <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Performa Penjualan
              </h4>
              <ul className="space-y-2 text-xs md:text-sm divide-y">
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Total Pendapatan</span>
                  <span className="font-semibold">{formatCurrency(metrics.totalRevenue)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Jumlah Transaksi</span>
                  <span className="font-semibold">{metrics.totalTransactions}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Rata-rata / Transaksi</span>
                  <span className="font-semibold">{formatCurrency(metrics.averageOrderValue)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Pertumbuhan</span>
                  <span className={`font-semibold ${previousPeriodMetrics.revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {previousPeriodMetrics.revenueChange.toFixed(1)}%
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-background rounded-xl border shadow-sm">
              <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                <Calculator className="w-5 h-5 text-success" />
                Profitabilitas
              </h4>
              <ul className="space-y-2 text-xs md:text-sm divide-y">
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">HPP (Harga Pokok Penjualan)</span>
                  <span className="font-semibold">{formatCurrency(profitLoss.totalCOGS)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Laba Kotor</span>
                  <span className="font-semibold text-success">{formatCurrency(profitLoss.grossProfit)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Laba Bersih</span>
                  <span className="font-semibold text-success">{formatCurrency(profitLoss.netProfit)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Margin Bersih</span>
                  <span className={`font-semibold ${profitLoss.netMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {profitLoss.netMargin.toFixed(1)}%
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-background rounded-xl border shadow-sm">
              <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                <Package className="w-5 h-5 text-warning" />
                Produk & Inventori
              </h4>
              <ul className="space-y-2 text-xs md:text-sm divide-y">
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Total Jenis Produk</span>
                  <span className="font-semibold">{state.products.length}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Item Terjual</span>
                  <span className="font-semibold">{metrics.totalItems}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Produk Aktif Terjual</span>
                  <span className="font-semibold">{topProducts.length}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Stok Rendah / Habis</span>
                  <span className="font-semibold text-destructive">
                    {state.products.filter(p => p.stock <= p.minStock).length}
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-background rounded-xl border shadow-sm">
              <h4 className="font-semibold text-sm md:text-base text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Pembayaran & Diskon
              </h4>
              <ul className="space-y-2 text-xs md:text-sm divide-y">
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Total Diskon Diberikan</span>
                  <span className="font-semibold">{formatCurrency(metrics.totalDiscount)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Total Pajak</span>
                  <span className="font-semibold">{formatCurrency(metrics.totalTax)}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Pelanggan Bertransaksi</span>
                  <span className="font-semibold">{topCustomers.length}</span>
                </li>
                <li className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Total Terdaftar Pelanggan</span>
                  <span className="font-semibold">{state.customers.length}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
