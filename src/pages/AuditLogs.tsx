import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/kpi-card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  RefreshCw, 
  History, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  User, 
  Calendar, 
  Loader2,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string;
  old_data?: string | object;
  new_data?: string | object;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("semua");
  const [entityFilter, setEntityFilter] = useState("transaction");

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      toast.error(err.response?.data?.error || 'Gagal memuat data riwayat edit');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const parseJson = (data: any) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesEntity = entityFilter === 'semua' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'semua' || log.action_type === actionFilter;
    
    const userName = log.user_name || log.user_email || '';
    const entityId = log.entity_id || '';
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesEntity && matchesAction && matchesSearch;
  });

  const totalLogs = filteredLogs.length;
  const totalEdits = filteredLogs.filter(l => l.action_type === 'UPDATE').length;
  const totalDeletes = filteredLogs.filter(l => l.action_type === 'DELETE').length;
  const totalCreates = filteredLogs.filter(l => l.action_type === 'CREATE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
            <span className="truncate sm:whitespace-normal">Riwayat Edit & Audit Log</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Lacak seluruh histori perubahan, pengeditan, dan penghapusan data.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <StatCard
          title="Total Riwayat Log"
          value={totalLogs.toString()}
          icon={History}
          iconColor="blue"
        />
        <StatCard
          title="Riwayat Edit (Update)"
          value={totalEdits.toString()}
          icon={Edit3}
          iconColor="purple"
        />
        <StatCard
          title="Riwayat Dihapus"
          value={totalDeletes.toString()}
          icon={Trash2}
          iconColor="red"
        />
        <StatCard
          title="Data Baru Dibuat"
          value={totalCreates.toString()}
          icon={PlusCircle}
          iconColor="green"
        />
      </div>

      {/* Filter Options */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Cari nama kasir/admin, ID transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Tipe Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tipe Data</SelectItem>
                  <SelectItem value="transaction">Transaksi</SelectItem>
                  <SelectItem value="product">Produk</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Jenis Aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Aksi</SelectItem>
                  <SelectItem value="UPDATE">Edit (UPDATE)</SelectItem>
                  <SelectItem value="DELETE">Hapus (DELETE)</SelectItem>
                  <SelectItem value="CREATE">Buat (CREATE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            Daftar Log Aktivitas & Perubahan ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-base">Tidak ada riwayat edit/audit log ditemukan</p>
              <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan kata kunci pencarian atau filter di atas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const oldData = parseJson(log.old_data);
                const newData = parseJson(log.new_data);

                const getActionBadge = () => {
                  switch (log.action_type) {
                    case 'UPDATE':
                      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold">EDIT / UPDATE</Badge>;
                    case 'DELETE':
                      return <Badge variant="destructive" className="font-bold">HAPUS / DELETE</Badge>;
                    case 'CREATE':
                      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">BUAT BARU</Badge>;
                    default:
                      return <Badge variant="outline">{log.action_type}</Badge>;
                  }
                };

                return (
                  <div 
                    key={log.id} 
                    className="p-4 bg-background rounded-xl border hover:shadow-md transition-all duration-200 space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col gap-2 border-b pb-2.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {getActionBadge()}
                        <span className="font-bold text-foreground capitalize">
                          {log.entity_type === 'transaction' ? 'Transaksi' : log.entity_type}
                        </span>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          ID: #{log.entity_id ? log.entity_id.slice(0, 8) : '-'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatDate(log.created_at)}</span>
                      </div>
                    </div>

                    {/* Meta Row: User & Network */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-1.5 sm:gap-2 bg-muted/40 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">Oleh: <strong className="text-foreground">{log.user_name || log.user_email || 'Kasir/Admin'}</strong></span>
                      </div>

                      {log.ip_address && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span>IP: {log.ip_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Detail Comparison for UPDATE action */}
                    {log.action_type === 'UPDATE' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-amber-950 dark:text-amber-300">
                          <div className="flex items-center justify-between font-bold border-b border-amber-500/20 pb-1.5 text-amber-800 dark:text-amber-200">
                            <span>Data Sebelum Edit</span>
                            <span className="text-[10px] font-mono uppercase bg-amber-200/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">Sebelum</span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <p>Pelanggan: <strong className="text-foreground">{oldData.customer_name || oldData.customerName || '-'}</strong></p>
                            <p>Status: <strong className="text-foreground">{oldData.status || '-'}</strong></p>
                            <p>Metode Bayar: <strong className="text-foreground">{oldData.payment_method || oldData.paymentMethod || '-'}</strong></p>
                            <p>Subtotal: <strong>{formatCurrency(Number(oldData.subtotal || 0))}</strong></p>
                            <p>Diskon: <strong>{formatCurrency(Number(oldData.discount || 0))}</strong></p>
                            <p className="font-extrabold text-sm text-amber-900 dark:text-amber-200 pt-1 border-t border-amber-500/20">
                              Total: {formatCurrency(Number(oldData.total || 0))}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5 text-emerald-950 dark:text-emerald-300">
                          <div className="flex items-center justify-between font-bold border-b border-emerald-500/20 pb-1.5 text-emerald-800 dark:text-emerald-200">
                            <span>Data Sesudah Edit</span>
                            <span className="text-[10px] font-mono uppercase bg-emerald-200/50 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">Sesudah</span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <p>Pelanggan: <strong className="text-foreground">{newData.customer_name || newData.customerName || oldData.customer_name || '-'}</strong></p>
                            <p>Status: <strong className="text-foreground">{newData.status || oldData.status || '-'}</strong></p>
                            <p>Metode Bayar: <strong className="text-foreground">{newData.payment_method || newData.paymentMethod || oldData.payment_method || '-'}</strong></p>
                            <p>Subtotal: <strong>{formatCurrency(Number(newData.subtotal || oldData.subtotal || 0))}</strong></p>
                            <p>Diskon: <strong>{formatCurrency(Number(newData.discount || oldData.discount || 0))}</strong></p>
                            <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200 pt-1 border-t border-emerald-500/20">
                              Total: {formatCurrency(Number(newData.total || oldData.total || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detail for DELETE action */}
                    {log.action_type === 'DELETE' && oldData.total && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs space-y-1.5 text-destructive font-medium">
                        <div className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>Data yang Dihapus:</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                          <span>Pelanggan: <strong>{oldData.customer_name || oldData.customerName || '-'}</strong></span>
                          <span className="hidden sm:inline mx-1.5">|</span>
                          <span>Total: <strong>{formatCurrency(Number(oldData.total || 0))}</strong></span>
                          <span className="hidden sm:inline mx-1.5">|</span>
                          <span>Status: <strong>{oldData.status || '-'}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
