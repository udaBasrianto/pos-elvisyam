import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/ui/kpi-card";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  Loader2,
  UserCheck,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History,
  Award
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp, Customer } from "@/contexts/AppContext";
import { toast } from "sonner";
import api from "@/lib/api";

const Customers = () => {
  const { state, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const { customers, isLoading } = state;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const statusOptions = ["semua", "active", "inactive"];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "semua" || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeCustomers = customers.filter(customer => customer.status === 'active').length;
  const totalRevenue = customers.reduce((total, customer) => total + (Number(customer.totalSpent) || 0), 0);
  const totalPurchases = customers.reduce((total, customer) => total + (Number(customer.totalPurchases) || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatWhatsAppNumber = (phone: string) => {
    if (!phone) return "";
    let formatted = phone.replace(/\D/g, "");
    if (formatted.startsWith("0")) {
      formatted = "62" + formatted.substring(1);
    }
    return formatted;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 text-[10px] px-2 py-0.5">Aktif</Badge>
      : <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Nonaktif</Badge>;
  };

  const [selectedPointCustomer, setSelectedPointCustomer] = useState<Customer | null>(null);
  const [pointHistoryList, setPointHistoryList] = useState<any[]>([]);
  const [isLoadingPointHistory, setIsLoadingPointHistory] = useState(false);

  const handleOpenPointHistory = async (customer: Customer) => {
    setSelectedPointCustomer(customer);
    setIsLoadingPointHistory(true);
    try {
      const res = await api.get(`/customers/${customer.id}/point-history`);
      setPointHistoryList(res.data || []);
    } catch (err) {
      console.error('Error fetching point history:', err);
      toast.error('Gagal memuat riwayat poin');
    } finally {
      setIsLoadingPointHistory(false);
    }
  };

  const getCustomerType = (customer: Customer) => {
    if (!customer.isMember && (customer.totalSpent || 0) < (state.settings.minSpendForMember || 100000)) {
      return { label: "Reguler", color: "text-gray-600 bg-gray-100 border-gray-200" };
    }
    const tier = customer.memberTier || ((customer.totalSpent || 0) >= (state.settings.platinumThreshold || 5000000) ? 'platinum' : (customer.totalSpent || 0) >= (state.settings.goldThreshold || 1000000) ? 'gold' : 'silver');
    if (tier === 'platinum') return { label: "Member Platinum", color: "text-purple-700 bg-purple-100 border-purple-200 font-bold" };
    if (tier === 'gold') return { label: "Member Gold", color: "text-amber-700 bg-amber-100 border-amber-200 font-bold" };
    return { label: "Member Silver", color: "text-slate-700 bg-slate-100 border-slate-200 font-semibold" };
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCustomer) {
        await updateCustomer({
          ...editingCustomer,
          ...formData,
        });
        toast.success("Data pelanggan berhasil diperbarui");
      } else {
        await addCustomer(formData);
        toast.success("Pelanggan baru berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan data pelanggan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) {
      try {
        await deleteCustomer(id);
        toast.success("Pelanggan berhasil dihapus");
      } catch (error) {
        toast.error("Gagal menghapus pelanggan");
      }
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Manajemen Pelanggan & Member
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola profil pelanggan, WhatsApp, saldo top up, dan riwayat akumulasi belanja.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pelanggan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama pelanggan"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Nomor Telepon / WhatsApp</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081234567890"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (Opsional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pelanggan@email.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="address">Alamat (Opsional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat lengkap..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan khusus pelanggan..."
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingCustomer ? (
                  "Update Pelanggan"
                ) : (
                  "Tambah Pelanggan"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Pelanggan" value={customers.length.toString()} icon={Users} iconColor="blue" />
        <StatCard title="Pelanggan Aktif" value={activeCustomers.toString()} icon={UserCheck} iconColor="green" />
        <StatCard title="Total Transaksi Belanja" value={totalPurchases.toString()} icon={ShoppingBag} iconColor="purple" />
        <StatCard title="Total Akumulasi Omset" value={formatCurrency(totalRevenue)} icon={DollarSign} iconColor="orange" />
      </div>

      {/* DataTable Section */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Daftar Pelanggan ({filteredCustomers.length})
          </CardTitle>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cari nama atau no WA..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginatedCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Belum ada pelanggan ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4">Pelanggan & Membership Tier</th>
                    <th className="py-3 px-4">Kontak WhatsApp</th>
                    <th className="py-3 px-4 text-center">Saldo Poin</th>
                    <th className="py-3 px-4 text-right">Saldo Deposit / Hutang</th>
                    <th className="py-3 px-4 text-right">Total Akumulasi Belanja</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedCustomers.map((customer) => {
                    const customerType = getCustomerType(customer);
                    const balance = Number(customer.balance || 0);
                    const points = customer.points || 0;

                    return (
                      <tr key={customer.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-foreground text-sm truncate max-w-[160px]" title={customer.name}>
                              {customer.name}
                            </div>
                            <Badge variant="outline" className={`${customerType.color} text-[10px] px-1.5 py-0`}>
                              {customerType.label}
                            </Badge>
                          </div>
                          {customer.notes && (
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[180px]">
                              {customer.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {customer.phone ? (
                            <a
                              href={`https://wa.me/${formatWhatsAppNumber(customer.phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-mono font-medium"
                              title="Hubungi via WhatsApp"
                            >
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {points} Poin
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold whitespace-nowrap">
                          <span className={balance < 0 ? "text-rose-600" : balance > 0 ? "text-emerald-600" : "text-muted-foreground"}>
                            {formatCurrency(Math.abs(balance))}
                            {balance < 0 && <span className="text-[10px] block font-normal text-rose-500">Hutang</span>}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-primary whitespace-nowrap text-sm">
                          {formatCurrency(Number(customer.totalSpent) || 0)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(customer.status)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                              onClick={() => handleOpenPointHistory(customer)}
                              title="Riwayat Poin"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 px-2">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Top Up
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xs">
                                <DialogHeader>
                                  <DialogTitle>Top Up Saldo</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Jumlah Nominal Top Up</Label>
                                    <Input
                                      type="number"
                                      placeholder="50000"
                                      id={`topup-${customer.id}`}
                                    />
                                  </div>
                                  <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={async () => {
                                      const input = document.getElementById(`topup-${customer.id}`) as HTMLInputElement;
                                      const amount = parseFloat(input.value);
                                      if (amount > 0) {
                                        await updateCustomer({
                                          ...customer,
                                          balance: (customer.balance || 0) + amount
                                        });
                                        input.value = "";
                                        toast.success(`Berhasil menambah saldo ${customer.name}`);
                                      }
                                    }}
                                  >
                                    Konfirmasi Top Up
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => openEditDialog(customer)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {filteredCustomers.length > 0 && (
            <div className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</strong> dari <strong>{filteredCustomers.length}</strong> pelanggan
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / hal</SelectItem>
                    <SelectItem value="15">15 / hal</SelectItem>
                    <SelectItem value="25">25 / hal</SelectItem>
                    <SelectItem value="50">50 / hal</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Point History Dialog */}
      <Dialog open={!!selectedPointCustomer} onOpenChange={() => setSelectedPointCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Riwayat Poin - {selectedPointCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 flex justify-between items-center">
              <div>
                <span className="text-muted-foreground block text-[11px]">Total Saldo Poin:</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
                  {selectedPointCustomer?.points || 0} Poin
                </span>
              </div>
              <Badge className="bg-amber-500 text-white capitalize text-xs">
                {selectedPointCustomer?.memberTier || 'Silver'} Member
              </Badge>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border p-2.5 rounded-xl bg-muted/30">
              {isLoadingPointHistory ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              ) : pointHistoryList.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Belum ada catatan mutasi poin.
                </div>
              ) : (
                pointHistoryList.map((log) => (
                  <div key={log.id} className="p-2 bg-card rounded-lg border flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold block">{log.notes || log.type}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <div className={`font-mono font-bold text-sm ${log.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {log.points > 0 ? `+${log.points}` : log.points} Poin
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
