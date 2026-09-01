import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, History, AlertCircle, Handshake } from "lucide-react";
import api from "@/lib/api";

const formatCurrency = (amount: number | string | undefined | null) => {
  const val = Number(amount);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(isNaN(val) ? 0 : val);
};

interface UnsettledItem {
  supplier: string;
  item_count: number;
  total_quantity: number;
  total_debt: number;
  first_transaction_date: string;
  last_transaction_date: string;
}

interface SettlementHistory {
  id: string;
  supplier_name: string;
  total_amount: number;
  total_quantity: number;
  settlement_date: string;
  period_start: string;
  period_end: string;
  notes: string;
}

export default function Consignment() {
  const [activeTab, setActiveTab] = useState("unsettled");
  const [selectedSupplier, setSelectedSupplier] = useState<UnsettledItem | null>(null);
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleNotes, setSettleNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Unsettled Data
  const { data: unsettledData, isLoading: isLoadingUnsettled } = useQuery<UnsettledItem[]>({
    queryKey: ['consignment-unsettled'],
    queryFn: async () => {
      const res = await api.get('/consignment/unsettled');
      return res.data;
    }
  });

  // Fetch History Data
  const { data: historyData, isLoading: isLoadingHistory } = useQuery<SettlementHistory[]>({
    queryKey: ['consignment-history'],
    queryFn: async () => {
      const res = await api.get('/consignment/settlements');
      return res.data;
    }
  });

  // Settle Mutation
  const settleMutation = useMutation({
    mutationFn: async (data: { supplier: string, period_end: string, notes: string }) => {
      const res = await api.post('/consignment/settle', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consignment-unsettled'] });
      queryClient.invalidateQueries({ queryKey: ['consignment-history'] });
      toast({
        title: "Berhasil",
        description: "Penyelesaian konsinyasi berhasil dicatat.",
      });
      setIsSettleDialogOpen(false);
      setSelectedSupplier(null);
      setSettleNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.error || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive"
      });
    }
  });

  const handleSettle = () => {
    if (!selectedSupplier) return;
    settleMutation.mutate({
      supplier: selectedSupplier.supplier,
      period_end: settleDate,
      notes: settleNotes
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Konsinyasi</h2>
          <p className="text-muted-foreground">
            Kelola penyelesaian pembayaran ke supplier konsinyasi
          </p>
        </div>
        <div className="p-2 bg-primary/10 rounded-full">
          <Handshake className="w-6 h-6 text-primary" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="unsettled" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Belum Dibayar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Riwayat Penyelesaian
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unsettled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Hutang ke Supplier</CardTitle>
              <CardDescription>
                Daftar supplier yang memiliki barang terjual namun belum disetorkan uangnya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUnsettled ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !unsettledData || unsettledData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada hutang konsinyasi yang belum dibayar.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">Item Terjual</TableHead>
                        <TableHead className="text-center">Total Qty</TableHead>
                        <TableHead className="text-right">Total Hutang (HPP)</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unsettledData.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.supplier}</TableCell>
                          <TableCell className="text-center">{item.item_count}</TableCell>
                          <TableCell className="text-center">{item.total_quantity}</TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            {formatCurrency(Number(item.total_debt))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedSupplier(item);
                                setIsSettleDialogOpen(true);
                              }}
                            >
                              Lunasi
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Penyelesaian</CardTitle>
              <CardDescription>
                Catatan pembayaran yang sudah dilakukan ke supplier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !historyData || historyData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada riwayat penyelesaian.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal Bayar</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead className="text-center">Total Qty</TableHead>
                        <TableHead className="text-right">Total Bayar</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {format(new Date(item.settlement_date), "dd MMM yyyy HH:mm", { locale: id })}
                          </TableCell>
                          <TableCell className="font-medium">{item.supplier_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            s/d {format(new Date(item.period_end), "dd MMM yyyy", { locale: id })}
                          </TableCell>
                          <TableCell className="text-center">{item.total_quantity}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(Number(item.total_amount))}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.notes}>
                            {item.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settle Dialog */}
      <Dialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penyelesaian Konsinyasi</DialogTitle>
            <DialogDescription>
              Konfirmasi pembayaran ke supplier. Semua transaksi sampai tanggal yang dipilih akan ditandai lunas.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSupplier && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium text-lg">{selectedSupplier.supplier}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Total Hutang:</span>
                  <p className="font-bold text-xl text-primary">
                    {formatCurrency(Number(selectedSupplier.total_debt))}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settle-date">Bayar transaksi sampai tanggal:</Label>
                <Input 
                  id="settle-date" 
                  type="date" 
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Hanya transaksi yang terjadi pada atau sebelum tanggal ini yang akan dilunasi.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settle-notes">Catatan (Opsional):</Label>
                <Textarea 
                  id="settle-notes" 
                  placeholder="Misal: Transfer via BCA, Bukti no. 123"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettleDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSettle} disabled={settleMutation.isPending}>
              {settleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Konfirmasi Bayar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}