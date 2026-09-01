import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Clock,
  Banknote,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  History,
  FileText,
  Loader2,
  DollarSign,
  Printer
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface CashShift {
  id: string;
  tenant_id: string;
  user_id: string;
  cashier_name: string;
  starting_cash: number;
  ending_cash?: number | null;
  expected_cash?: number | null;
  difference?: number | null;
  total_cash_sales: number;
  total_non_cash_sales: number;
  total_sales: number;
  transaction_count: number;
  status: 'open' | 'closed';
  notes?: string | null;
  opened_at: string;
  closed_at?: string | null;
}

interface CashierShiftDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShiftChange?: (activeShift: CashShift | null) => void;
}

export const CashierShiftDialog: React.FC<CashierShiftDialogProps> = ({
  trigger,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  onShiftChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashShift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [startingCashInput, setStartingCashInput] = useState('');
  const [endingCashInput, setEndingCashInput] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [closedShiftSummary, setClosedShiftSummary] = useState<CashShift | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const loadCurrentShift = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/shifts/current');
      const shift = res.data.activeShift;
      setActiveShift(shift);
      if (onShiftChange) onShiftChange(shift);
    } catch (error) {
      console.error('Error loading active shift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadShiftHistory = async () => {
    try {
      const res = await api.get('/shifts/history');
      setShiftHistory(res.data);
    } catch (error) {
      console.error('Error loading shift history:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
      loadShiftHistory();
    }
  }, [isOpen]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const startingNum = parseFloat(startingCashInput.replace(/[^0-9]/g, '')) || 0;

    setIsSubmitting(true);
    try {
      const res = await api.post('/shifts/open', {
        starting_cash: startingNum,
        notes: shiftNotes
      });

      toast.success('🟢 Shift Kasir berhasil dibuka! Modal awal tercatat.');
      setStartingCashInput('');
      setShiftNotes('');
      loadCurrentShift();
    } catch (error: any) {
      console.error('Error opening shift:', error);
      const msg = error.response?.data?.error || error.message;
      toast.error('Gagal membuka shift: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const endingNum = parseFloat(endingCashInput.replace(/[^0-9]/g, '')) || 0;

    setIsSubmitting(true);
    try {
      const res = await api.post('/shifts/close', {
        ending_cash: endingNum,
        notes: shiftNotes
      });

      const summary: CashShift = res.data.summary;
      setClosedShiftSummary(summary);
      setActiveShift(null);
      if (onShiftChange) onShiftChange(null);
      toast.success('🔒 Shift Kasir / Toko berhasil ditutup!');
      setEndingCashInput('');
      setShiftNotes('');
      loadShiftHistory();
    } catch (error: any) {
      console.error('Error closing shift:', error);
      const msg = error.response?.data?.error || error.message;
      toast.error('Gagal menutup shift: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for live/ending shift
  const endingCashNum = parseFloat(endingCashInput.replace(/[^0-9]/g, '')) || 0;
  const expectedCashNum = activeShift ? Number(activeShift.expected_cash || 0) : 0;
  const liveDiffNum = endingCashNum - expectedCashNum;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50/80 dark:bg-slate-900/80">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <span>Manajemen Shift & Kas Toko</span>
            </div>
            {activeShift ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Shift Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-500 gap-1 font-semibold text-xs">
                <Lock className="w-3 h-3" /> Shift Tutup
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Pencatatan modal kas awal, transaksi tunai/non-tunai, dan rekap selisih kas toko saat tutup shift.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="shift-status" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shift-status" className="text-xs sm:text-sm font-semibold">
                <Unlock className="w-4 h-4 mr-1.5" /> Shift Kasir Sekarang
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm font-semibold">
                <History className="w-4 h-4 mr-1.5" /> Riwayat Shift
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Shift Status (Open or Close Form) */}
            <TabsContent value="shift-status" className="space-y-4 pt-2">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : closedShiftSummary ? (
                /* Summary Receipt View after closing shift */
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Shift Kasir Berhasil Ditutup</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(closedShiftSummary.closed_at || '').toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left pt-3 border-t">
                      <div className="bg-background p-2.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Modal Awal</span>
                        <p className="font-semibold text-sm">{formatCurrency(Number(closedShiftSummary.starting_cash))}</p>
                      </div>
                      <div className="bg-background p-2.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Penjualan Tunai</span>
                        <p className="font-semibold text-sm text-emerald-600">{formatCurrency(Number(closedShiftSummary.total_cash_sales))}</p>
                      </div>
                      <div className="bg-background p-2.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Kas Ekspektasi</span>
                        <p className="font-semibold text-sm">{formatCurrency(Number(closedShiftSummary.expected_cash || 0))}</p>
                      </div>
                      <div className="bg-background p-2.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Uang Fisik Kasir</span>
                        <p className="font-bold text-sm text-blue-600">{formatCurrency(Number(closedShiftSummary.ending_cash || 0))}</p>
                      </div>
                      <div className="bg-background p-2.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Selisih Kas</span>
                        <p className={`font-bold text-sm ${Number(closedShiftSummary.difference) < 0 ? 'text-red-500' : Number(closedShiftSummary.difference) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatCurrency(Number(closedShiftSummary.difference || 0))}
                        </p>
                      </div>
                      <div className="bg-background p-2.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Transaksi</span>
                        <p className="font-semibold text-sm">{closedShiftSummary.transaction_count} Transaksi</p>
                      </div>
                    </div>

                    {closedShiftSummary.notes && (
                      <p className="text-xs italic text-muted-foreground bg-background p-2.5 rounded-lg border text-left">
                        💬 Catatan: "{closedShiftSummary.notes}"
                      </p>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setClosedShiftSummary(null)}
                    >
                      Buka Shift Baru
                    </Button>
                  </div>
                </div>
              ) : activeShift ? (
                /* ACTIVE SHIFT: View & Close Shift Form */
                <form onSubmit={handleCloseShift} className="space-y-4">
                  {/* Current Active Shift Summary Card */}
                  <Card className="bg-gradient-to-br from-slate-900 to-slate-950 text-white border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                            {activeShift.cashier_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Kasir Bertugas</p>
                            <p className="text-sm font-bold">{activeShift.cashier_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Waktu Buka Shift</p>
                          <p className="text-xs font-semibold text-slate-200">
                            {new Date(activeShift.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Modal Awal Kas</span>
                          <p className="text-sm font-bold text-white">{formatCurrency(Number(activeShift.starting_cash))}</p>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Penjualan Tunai</span>
                          <p className="text-sm font-bold text-emerald-400">{formatCurrency(activeShift.total_cash_sales)}</p>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Penjualan Non-Tunai</span>
                          <p className="text-sm font-bold text-blue-400">{formatCurrency(activeShift.total_non_cash_sales)}</p>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Ekspektasi Kas Laci</span>
                          <p className="text-sm font-bold text-amber-400">{formatCurrency(activeShift.expected_cash || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Close Shift Input Form */}
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b pb-2">
                      <Lock className="w-4 h-4 text-red-500" />
                      Penutupan Shift & Hitung Kas Akhir Toko
                    </h4>

                    <div>
                      <Label htmlFor="endingCash" className="font-semibold text-xs">
                        Hitung & Masukkan Uang Fisik di Laci Kasir (Rp) *
                      </Label>
                      <Input
                        id="endingCash"
                        placeholder="Contoh: 350000"
                        value={endingCashInput}
                        onChange={(e) => setEndingCashInput(e.target.value)}
                        required
                        className="mt-1 font-bold text-base text-primary"
                        autoFocus
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Ekspektasi Kas di Laci: <strong className="text-foreground">{formatCurrency(expectedCashNum)}</strong> (Modal Awal + Penjualan Tunai)
                      </p>
                    </div>

                    {/* Live Discrepancy Indicator */}
                    {endingCashInput && (
                      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                        liveDiffNum === 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : liveDiffNum < 0
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          {liveDiffNum === 0 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          <span>
                            {liveDiffNum === 0
                              ? 'Kas Sesuai! Tidak ada selisih.'
                              : liveDiffNum < 0
                              ? 'Kas Kurang (Defisit)'
                              : 'Kas Lebih (Surplus)'}
                          </span>
                        </div>
                        <span className="font-bold text-sm">
                          {formatCurrency(liveDiffNum)}
                        </span>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="shiftNotes" className="font-semibold text-xs">
                        Catatan Penutupan Shift / Keterangan Selisih (Opsional)
                      </Label>
                      <Textarea
                        id="shiftNotes"
                        placeholder="Masukkan catatan jika ada selisih uang..."
                        value={shiftNotes}
                        onChange={(e) => setShiftNotes(e.target.value)}
                        className="mt-1 text-xs"
                        rows={2}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10 shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Memproses Tutup Shift...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Tutup Shift & Rekap Kas Toko
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* NO SHIFT: Open Shift Form */
                <form onSubmit={handleOpenShift} className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Unlock className="w-4 h-4 text-blue-600" />
                      Shift Kasir Belum Dibuka
                    </p>
                    <p>Silakan buka shift kasir baru dan masukkan modal awal (uang pecahan kecil untuk kembalian di laci kasir).</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="startingCash" className="font-semibold text-xs">
                        Modal Kas Awal / Uang Kembalian (Rp) *
                      </Label>
                      <Input
                        id="startingCash"
                        placeholder="Contoh: 100000"
                        value={startingCashInput}
                        onChange={(e) => setStartingCashInput(e.target.value)}
                        required
                        className="mt-1 font-bold text-base text-emerald-600"
                        autoFocus
                      />
                    </div>

                    <div>
                      <Label htmlFor="openNotes" className="font-semibold text-xs">
                        Catatan Pembukaan (Opsional)
                      </Label>
                      <Textarea
                        id="openNotes"
                        placeholder="Catatan saat buka kasir..."
                        value={shiftNotes}
                        onChange={(e) => setShiftNotes(e.target.value)}
                        className="mt-1 text-xs"
                        rows={2}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Membuka Shift...
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Mulai Shift & Buka Kasir
                      </>
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>

            {/* TAB 2: History of closed shifts */}
            <TabsContent value="history" className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Riwayat Shift Kasir Toko</h4>
              {shiftHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Belum ada riwayat penutupan shift.</p>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {shiftHistory.map((shift) => (
                    <div
                      key={shift.id}
                      className="p-3.5 rounded-xl border bg-card hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{shift.cashier_name}</span>
                          <Badge variant={shift.status === 'open' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {shift.status === 'open' ? '🟢 Shift Aktif' : '🔒 Closed'}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(shift.opened_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                          <span className="text-[9px] text-muted-foreground">Modal Awal:</span>
                          <p className="font-bold">{formatCurrency(Number(shift.starting_cash))}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                          <span className="text-[9px] text-muted-foreground">Penjualan Tunai:</span>
                          <p className="font-bold text-emerald-600">{formatCurrency(Number(shift.total_cash_sales))}</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
                          <span className="text-[9px] text-muted-foreground">Selisih Kas:</span>
                          <p className={`font-bold ${Number(shift.difference || 0) < 0 ? 'text-red-500' : Number(shift.difference || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatCurrency(Number(shift.difference || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
