import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  UserCheck,
  DollarSign,
  Plus,
  Printer,
  Calendar,
  FileCheck,
  User,
  Building,
  CheckCircle2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface Attendance {
  id: string;
  employee_name: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  status: string;
  notes?: string;
}

export interface PayrollItem {
  id: string;
  employee_name: string;
  period: string;
  base_salary: number;
  bonus_commission: number;
  deductions: number;
  net_salary: number;
  status: "draft" | "paid";
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Live Device Clock state
  const [currentDeviceTime, setCurrentDeviceTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Clock in/out form
  const [employeeName, setEmployeeName] = useState("");

  // Create Payroll Dialog
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    employee_name: "",
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    base_salary: "",
    bonus_commission: "",
    deductions: "",
    notes: "",
  });

  // Print Payslip modal
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollItem | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [attRes, payRes] = await Promise.all([
        api.get("/payroll/attendance"),
        api.get("/payroll"),
      ]);
      setAttendances(attRes.data || []);
      setPayrolls(payRes.data || []);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClockAction = async (type: "in" | "out") => {
    try {
      await api.post("/payroll/attendance/clock", {
        employee_name: employeeName || undefined,
        type,
        client_time: new Date().toISOString(),
      });
      toast.success(type === "in" ? "Berhasil Clock-In Masuk!" : "Berhasil Clock-Out Pulang!");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal melakukan absensi");
    }
  };

  const handleDirectClockOut = async (id: string) => {
    try {
      await api.put(`/payroll/attendance/${id}/clock-out`, {});
      toast.success("Berhasil mencatat Jam Pulang (Clock-Out)!");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal melakukan Clock-Out");
    }
  };

  const handleResetAttendance = async (all = false) => {
    if (!window.confirm(all ? "Kosongkan SEMUA riwayat absensi?" : "Reset absensi hari ini agar kasir dapat Clock-In ulang?")) {
      return;
    }
    try {
      await api.post("/payroll/attendance/reset", { all });
      toast.success(all ? "Semua riwayat absensi berhasil dikosongkan!" : "Absensi hari ini berhasil direset!");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mereset absensi");
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!window.confirm("Hapus baris data absensi ini?")) return;
    try {
      await api.delete(`/payroll/attendance/${id}`);
      toast.success("Data absensi berhasil dihapus!");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menghapus data absensi");
    }
  };

  const handleCreatePayroll = async () => {
    if (!payrollForm.employee_name || !payrollForm.period) {
      toast.error("Nama pegawai dan periode wajib diisi");
      return;
    }
    try {
      await api.post("/payroll", payrollForm);
      toast.success("Draf Gaji Pegawai berhasil disimpan!");
      setIsPayrollDialogOpen(false);
      setPayrollForm({
        employee_name: "",
        period: new Date().toISOString().slice(0, 7),
        base_salary: "",
        bonus_commission: "",
        deductions: "",
        notes: "",
      });
      fetchData();
    } catch (error) {
      toast.error("Gagal menyimpan draf gaji");
    }
  };

  const handlePaySalary = async (id: string) => {
    try {
      await api.put(`/payroll/${id}/pay`, {});
      toast.success("Gaji berhasil dibayarkan!");
      fetchData();
    } catch (error) {
      toast.error("Gagal memperbarui status pembayaran gaji");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatTime = (ts?: string) => {
    if (!ts || ts === "-") return "-";
    try {
      // If it's already a plain time string (e.g., "15:22:14" or "15:22")
      if (typeof ts === "string" && !ts.includes("T") && !ts.includes("-") && ts.includes(":")) {
        const parts = ts.split(":");
        if (parts.length >= 2) {
          const hh = parts[0].padStart(2, '0');
          const mm = parts[1].padStart(2, '0');
          const ss = parts[2] ? parts[2].slice(0, 2).padStart(2, '0') : '00';
          return `${hh}.${mm}.${ss}`;
        }
        return ts.replace(/:/g, ".");
      }

      let d = new Date(ts);
      if (isNaN(d.getTime())) {
        const fallback = new Date(String(ts).replace(" ", "T"));
        if (!isNaN(fallback.getTime())) {
          d = fallback;
        } else {
          return String(ts);
        }
      }

      // Format using id-ID (same as Header)
      return d.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch (e) {
      return String(ts);
    }
  };

  const totalPayrollCost = payrolls.reduce((acc, p) => acc + Number(p.net_salary || 0), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-primary" />
            Absensi & Penggajian Staf (HRM & Payroll)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola absensi harian kasir/pegawai, pembuatan slip gaji bulanan, komisi, dan pencetakan slip gaji.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsPayrollDialogOpen(true)} className="gap-2 text-xs h-9 bg-primary text-white">
            <Plus className="w-4 h-4" /> Hitung Gaji Bulanan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Absensi Hari Ini</CardTitle>
            <Clock className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">
              {attendances.filter((a) => a.date === new Date().toISOString().slice(0, 10)).length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Pegawai Masuk Kerja</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Beban Gaji</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{formatCurrency(totalPayrollCost)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{payrolls.length} Slip Gaji Dibuat</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Status Pembayaran Gaji</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600">
              {payrolls.filter((p) => p.status === "paid").length} / {payrolls.length} Lunas
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Gaji Terbayar Bulan Ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="attendance" className="text-xs font-bold gap-2">
            <Clock className="w-4 h-4" /> Absensi Clock-In/Out ({attendances.length})
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs font-bold gap-2">
            <DollarSign className="w-4 h-4" /> Penggajian Bulanan ({payrolls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          {/* Quick Clock In/Out Bar */}
          <Card className="border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Clock className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Absensi Cepat Kasir</h3>
                    <Badge variant="outline" className="font-mono text-xs bg-background/80 px-2 py-0.5 border-primary/40 text-primary">
                      {currentDeviceTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Catat jam masuk & pulang kasir sesuai jam perangkat saat ini.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Nama Kasir / Pegawai"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="h-9 text-xs w-full sm:w-44 bg-background"
                />
                <Button
                  size="sm"
                  onClick={() => handleClockAction("in")}
                  className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Clock-In (Masuk)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClockAction("out")}
                  className="h-9 text-xs border-rose-500 text-rose-600 hover:bg-rose-50 font-bold"
                >
                  Clock-Out (Pulang)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResetAttendance(false)}
                  className="h-9 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 font-bold gap-1"
                  title="Reset status absensi hari ini agar kasir bisa Clock-In ulang"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Hari Ini
                </Button>
              </div>
            </div>
          </Card>

          {/* Attendance Table */}
          <Card className="border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Riwayat Absensi Staf</CardTitle>
                <CardDescription className="text-xs">Daftar kehadiran dan jam masuk-pulang pegawai.</CardDescription>
              </div>
              {attendances.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetAttendance(true)}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Kosongkan Semua
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-bold border-b">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Nama Pegawai</th>
                    <th className="p-3">Jam Masuk (In)</th>
                    <th className="p-3">Jam Pulang (Out)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Belum ada riwayat absensi.
                      </td>
                    </tr>
                  ) : (
                    attendances.map((att) => (
                      <tr key={att.id} className="hover:bg-muted/40">
                        <td className="p-3 font-mono">{att.date}</td>
                        <td className="p-3 font-bold text-foreground">{att.employee_name}</td>
                        <td className="p-3 font-mono text-emerald-600 font-bold">
                          {formatTime(att.clock_in)}
                        </td>
                        <td className="p-3 font-mono">
                          {att.clock_out && att.clock_out !== "-" ? (
                            <span className="text-rose-600 font-bold">{formatTime(att.clock_out)}</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDirectClockOut(att.id)}
                              className="h-6 text-[10px] px-2.5 border-rose-500 text-rose-600 hover:bg-rose-50 font-bold shadow-xs"
                            >
                              Clock-Out Sekarang
                            </Button>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] font-semibold ${att.clock_out && att.clock_out !== "-" ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {att.clock_out && att.clock_out !== "-" ? 'Selesai' : 'Sedang Kerja'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAttendance(att.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Hapus baris absensi ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payrolls.map((p) => (
              <Card key={p.id} className="border shadow-xs space-y-2">
                <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">{p.employee_name}</CardTitle>
                    <CardDescription className="text-xs">Periode: {p.period}</CardDescription>
                  </div>
                  <Badge variant={p.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                    {p.status === "paid" ? "Sudah Dibayar" : "Draf Gaji"}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 pt-2 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gaji Pokok:</span>
                    <span className="font-mono">{formatCurrency(p.base_salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonus / Komisi:</span>
                    <span className="font-mono text-emerald-600">+{formatCurrency(p.bonus_commission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potongan:</span>
                    <span className="font-mono text-rose-600">-{formatCurrency(p.deductions)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-sm">
                    <span>Gaji Bersih (THP):</span>
                    <span className="text-primary font-mono">{formatCurrency(p.net_salary)}</span>
                  </div>

                  <div className="flex gap-2 pt-3">
                    {p.status !== "paid" && (
                      <Button
                        size="sm"
                        onClick={() => handlePaySalary(p.id)}
                        className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Bayar Sekarang
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPayslip(p)}
                      className="gap-1 text-xs h-8"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Slip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Payroll Dialog */}
      <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2 text-primary">
              <DollarSign className="w-5 h-5" />
              Hitung & Buat Draf Gaji
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs my-2">
            <div>
              <Label>Nama Pegawai / Kasir *</Label>
              <Input
                placeholder="Budi Santoso"
                value={payrollForm.employee_name}
                onChange={(e) => setPayrollForm({ ...payrollForm, employee_name: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label>Periode Bulan (YYYY-MM) *</Label>
              <Input
                type="month"
                value={payrollForm.period}
                onChange={(e) => setPayrollForm({ ...payrollForm, period: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Gaji Pokok (Rp)</Label>
                <Input
                  type="number"
                  placeholder="3000000"
                  value={payrollForm.base_salary}
                  onChange={(e) => setPayrollForm({ ...payrollForm, base_salary: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label>Bonus / Komisi (Rp)</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={payrollForm.bonus_commission}
                  onChange={(e) => setPayrollForm({ ...payrollForm, bonus_commission: e.target.value })}
                  className="h-8 text-xs mt-1 text-emerald-600"
                />
              </div>
            </div>
            <div>
              <Label>Potongan (Rp)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={payrollForm.deductions}
                onChange={(e) => setPayrollForm({ ...payrollForm, deductions: e.target.value })}
                className="h-8 text-xs mt-1 text-rose-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setIsPayrollDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreatePayroll} className="bg-primary text-white">
              Simpan Draf Gaji
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printable Payslip Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-md p-6">
          {selectedPayslip && (
            <div className="space-y-4 text-xs font-mono">
              <div className="text-center border-b pb-3">
                <h2 className="text-base font-black tracking-wider">SLIP GAJI PEGAWAI</h2>
                <p className="text-[10px] text-muted-foreground">Periode: {selectedPayslip.period}</p>
              </div>

              <div className="space-y-1">
                <div>Nama Pegawai: <strong>{selectedPayslip.employee_name}</strong></div>
                <div>Status: <span className="uppercase font-bold text-emerald-600">{selectedPayslip.status}</span></div>
              </div>

              <div className="border-t border-b py-2 space-y-1.5">
                <div className="flex justify-between">
                  <span>Gaji Pokok</span>
                  <span>{formatCurrency(selectedPayslip.base_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonus / Komisi</span>
                  <span>+{formatCurrency(selectedPayslip.bonus_commission)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Potongan</span>
                  <span>-{formatCurrency(selectedPayslip.deductions)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-sm pt-1">
                <span>TOTAL DITERIMA (THP)</span>
                <span className="text-primary">{formatCurrency(selectedPayslip.net_salary)}</span>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
