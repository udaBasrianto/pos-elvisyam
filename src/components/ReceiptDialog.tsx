import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, X, CheckCircle, Unlock, FileText, Loader2, Bluetooth, Globe, Usb, Plug } from "lucide-react";
import Receipt from "./Receipt";
import { useApp } from "@/contexts/AppContext";
import { useHardware } from "@/contexts/HardwareContext";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectedBluetoothPrinterName } from "@/lib/bluetoothPrinter";
import { type PaperWidth } from "@/lib/hardwareManager";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface ReceiptItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface TransactionData {
  id?: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
  earnedPoints?: number;
  accumulatedPoints?: number;
}

interface ReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  transaction: TransactionData | null;
}

const ReceiptDialog = ({ open, onClose, transaction }: ReceiptDialogProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { state } = useApp();
  const { user } = useAuth();
  const { printReceipt, activePrinterType, printerStatus, config, connectPrinter, openCashDrawer, updateConfig } = useHardware();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(config.printer.paperWidth || 58);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return 'Tunai';
      case 'transfer': return 'Transfer Bank';
      case 'ewallet':
      case 'e-wallet': return 'E-Wallet';
      case 'qris': return 'QRIS';
      case 'balance': return 'Saldo Pelanggan';
      case 'credit': return 'Hutang / Tempo';
      default: return method || 'Tunai';
    }
  };

  const btPrinterName = getConnectedBluetoothPrinterName();

  // 🖨️ DIRECT HARDWARE / BLUETOOTH THERMAL PRINT (ESC/POS)
  const handleDirectPrint = async () => {
    if (!transaction) return;
    setIsPrintingThermal(true);

    const formattedInvoiceNum = transaction.id
      ? (transaction.id.length > 16 && transaction.id.includes('-') ? transaction.id.slice(0, 8).toUpperCase() : transaction.id.toUpperCase())
      : 'STRUK';

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const receiptPayload = {
      storeName: state.settings.businessName || "Toko Kami",
      storeAddress: state.settings.businessAddress,
      storePhone: state.settings.businessPhone,
      invoiceNumber: formattedInvoiceNum,
      customerName: transaction.customerName || "Umum",
      cashierName: user?.full_name || user?.email || "Kasir",
      date: dateStr,
      time: timeStr,
      items: transaction.items.map(item => ({
        name: item.productName,
        qty: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      })),
      subtotal: transaction.subtotal,
      discount: transaction.discount,
      tax: transaction.tax,
      total: transaction.total,
      paid: transaction.paymentAmount,
      change: transaction.changeAmount,
      paymentMethod: getPaymentMethodLabel(transaction.paymentMethod),
      footer: state.settings.receiptFooter || "Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat dikembalikan atau ditukar.",
      earnedPoints: transaction.earnedPoints,
      accumulatedPoints: transaction.accumulatedPoints,
      paperWidth: paperWidth,
    };

    try {
      // 1. Try sending directly to active or auto-reconnected hardware printer
      const success = await printReceipt(receiptPayload);
      if (success) {
        toast.success(`🖨️ Struk berhasil dicetak ke Printer (${activePrinterType === 'bluetooth' ? 'Bluetooth' : activePrinterType.toUpperCase()})!`);
        openCashDrawer();
        setIsPrintingThermal(false);
        return;
      }

      // 2. If printer is not yet connected but Bluetooth is available, trigger one-click pairing/connect
      if (config.printer.connectionType === 'bluetooth' || 'bluetooth' in navigator) {
        toast.info("🔄 Menghubungkan ke Printer Bluetooth...");
        const connectOk = await connectPrinter('bluetooth');
        if (connectOk) {
          const retryOk = await printReceipt(receiptPayload);
          if (retryOk) {
            toast.success("🖨️ Struk berhasil dicetak ke Printer Bluetooth!");
            openCashDrawer();
            setIsPrintingThermal(false);
            return;
          }
        }
      }

      // 3. Fallback to browser print if user cancelled or Bluetooth unavailable
      toast.info("💡 Tidak ada printer Bluetooth aktif, membuka dialog cetak sistem...");
      handleBrowserPrint();
    } catch (err: any) {
      console.error("Direct print error:", err);
      toast.error("Gagal mencetak langsung ke printer thermal, membuka cetak sistem.");
      handleBrowserPrint();
    } finally {
      setIsPrintingThermal(false);
    }
  };

  // 📄 BROWSER / SYSTEM PRINT FALLBACK (window.print)
  const handleBrowserPrint = () => {
    if (!transaction) return;

    const formattedInvoiceNum = transaction.id
      ? (transaction.id.length > 16 && transaction.id.includes('-') ? transaction.id.slice(0, 8).toUpperCase() : transaction.id.toUpperCase())
      : 'STRUK';

    const storeName = state.settings.businessName || "Toko Anda";
    const storeAddress = state.settings.businessAddress || "Alamat Toko";
    const customerName = transaction.customerName || "Umum";
    const footerText = state.settings.receiptFooter;

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const itemsHtml = transaction.items.map(item => `
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 600; color: #0f172a; font-size: 11px;">${item.productName}</div>
        <div style="display: flex; justify-content: space-between; color: #475569; font-size: 11px; margin-top: 2px;">
          <span>${item.quantity} x ${formatCurrency(item.price)}</span>
          <span style="font-weight: 600; color: #1e293b;">${formatCurrency(item.subtotal)}</span>
        </div>
      </div>
    `).join('');

    const discountHtml = transaction.discount > 0 ? `
      <div style="display: flex; justify-content: space-between; color: #059669; font-weight: 600; font-size: 11px; margin: 3px 0;">
        <span>Diskon:</span>
        <span>-${formatCurrency(transaction.discount)}</span>
      </div>
    ` : '';

    const taxHtml = transaction.tax > 0 ? `
      <div style="display: flex; justify-content: space-between; color: #334155; font-size: 11px; margin: 3px 0;">
        <span>Pajak:</span>
        <span>${formatCurrency(transaction.tax)}</span>
      </div>
    ` : '';

    const changeHtml = transaction.changeAmount > 0 ? `
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: #0f172a; font-size: 11px; margin-top: 3px;">
        <span>Kembalian:</span>
        <span>${formatCurrency(transaction.changeAmount)}</span>
      </div>
    ` : '';

    const footerContent = (footerText !== undefined && footerText !== "")
      ? footerText.replace(/\n/g, '<br/>')
      : `Terima kasih atas kunjungan Anda!<br/>Barang yang sudah dibeli tidak dapat<br/>dikembalikan atau ditukar.`;

    const printWindow = window.open('', '_blank', 'width=420,height=700');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Struk_${formattedInvoiceNum}</title>
            <style>
              @page {
                size: ${paperWidth === 58 ? '58mm' : '80mm'} auto;
                margin: 0;
              }
              @media print {
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  width: 100% !important;
                }
                .receipt-card {
                  width: 100% !important;
                  max-width: ${paperWidth === 58 ? '54mm' : '76mm'} !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  padding: 4px 2px !important;
                  margin: 0 auto !important;
                }
              }
              body {
                font-family: Consolas, "Courier New", Courier, monospace;
                font-size: 11px;
                color: #0f172a;
                background: #f8fafc;
                margin: 0;
                padding: 16px;
                display: flex;
                justify-content: center;
              }
              .receipt-card {
                width: ${paperWidth === 58 ? '210px' : '290px'};
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 14px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                box-sizing: border-box;
              }
              .divider {
                border-bottom: 1px dashed #cbd5e1;
                margin: 10px 0;
              }
              .flex-row {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                margin: 3px 0;
              }
              .text-slate-700 { color: #334155; }
              .text-slate-900 { color: #0f172a; }
              .font-bold { font-weight: 700; }
              .font-medium { font-weight: 500; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <div class="receipt-card">
              <div class="text-center">
                <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">${storeName}</h2>
                <p style="font-size: 11px; color: #64748b; margin: 0; line-height: 1.4;">${storeAddress}</p>
              </div>

              <div class="divider"></div>

              <div class="flex-row"><span class="text-slate-700">No. Transaksi:</span><span class="font-medium text-slate-900">${formattedInvoiceNum}</span></div>
              <div class="flex-row"><span class="text-slate-700">Tanggal:</span><span class="text-slate-900">${dateStr}</span></div>
              <div class="flex-row"><span class="text-slate-700">Waktu:</span><span class="text-slate-900">${timeStr}</span></div>
              <div class="flex-row"><span class="text-slate-700">Pelanggan:</span><span class="font-medium text-slate-900">${customerName}</span></div>

              <div class="divider"></div>

              <div style="font-weight: 700; font-size: 11px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">ITEM PEMBELIAN</div>
              ${itemsHtml}

              <div class="divider"></div>

              <div class="flex-row"><span class="text-slate-700">Subtotal:</span><span class="font-medium text-slate-900">${formatCurrency(transaction.subtotal)}</span></div>
              ${discountHtml}
              ${taxHtml}
              <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px;">
                <span>TOTAL:</span>
                <span style="font-size: 15px;">${formatCurrency(transaction.total)}</span>
              </div>

              <div class="divider"></div>

              <div class="flex-row"><span class="text-slate-700">Metode Bayar:</span><span class="font-medium text-slate-900">${getPaymentMethodLabel(transaction.paymentMethod)}</span></div>
              <div class="flex-row"><span class="text-slate-700">Jumlah Bayar:</span><span class="font-medium text-slate-900">${formatCurrency(transaction.paymentAmount)}</span></div>
              ${changeHtml}

              <div class="divider"></div>

              <div class="text-center" style="font-size: 10px; color: #64748b; line-height: 1.4;">
                <div style="color: #cbd5e1;">=================================</div>
                <div style="margin: 4px 0; color: #475569;">${footerContent}</div>
                <div style="color: #cbd5e1;">=================================</div>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !transaction) return;

    try {
      setIsGeneratingPdf(true);
      toast.loading("Sedang membuat file PDF struk...", { id: "pdf-gen" });

      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = paperWidth || 58;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const invoiceNum = transaction.id
        ? (transaction.id.length > 16 && transaction.id.includes('-') ? transaction.id.slice(0, 8).toUpperCase() : transaction.id.toUpperCase())
        : 'STRUK';

      pdf.save(`Struk_${invoiceNum}.pdf`);
      toast.success("File PDF struk berhasil diunduh!", { id: "pdf-gen" });
    } catch (error) {
      console.error("Gagal mengunduh PDF:", error);
      toast.error("Gagal membuat PDF struk", { id: "pdf-gen" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!transaction) return null;

  const receiptData = {
    id: transaction.id,
    storeName: state.settings.businessName || "Toko Anda",
    storeAddress: state.settings.businessAddress || "Alamat Toko",
    customerName: transaction.customerName,
    items: transaction.items,
    subtotal: transaction.subtotal,
    tax: transaction.tax,
    discount: transaction.discount,
    total: transaction.total,
    paymentMethod: transaction.paymentMethod,
    paymentAmount: transaction.paymentAmount,
    changeAmount: transaction.changeAmount,
    createdAt: new Date(),
    receiptFooter: state.settings.receiptFooter,
    earnedPoints: transaction.earnedPoints,
    accumulatedPoints: transaction.accumulatedPoints,
  };

  const isBluetoothActive = activePrinterType === 'bluetooth' || printerStatus === 'connected';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-50 border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
              <CheckCircle className="w-5 h-5" />
              Pembayaran Berhasil!
            </DialogTitle>
            {isBluetoothActive && (
              <Badge className="bg-blue-600 text-white text-[11px] font-semibold gap-1 py-0.5">
                <Bluetooth className="w-3 h-3" />
                {btPrinterName || 'BT Printer Aktif'}
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 my-2">
          {/* Receipt Preview */}
          <div className="shadow-md rounded-2xl overflow-hidden bg-white p-1 border border-slate-200/80">
            <Receipt ref={receiptRef} data={receiptData} />
          </div>

          {/* Quick Paper Size Selector */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-200/60 rounded-xl text-xs w-full">
            <span className="text-slate-700 font-semibold">Ukuran Kertas Thermal:</span>
            <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-slate-300/80 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setPaperWidth(58);
                  updateConfig({ printer: { ...config.printer, paperWidth: 58 } });
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${paperWidth === 58 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                58mm (Standar BT)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaperWidth(80);
                  updateConfig({ printer: { ...config.printer, paperWidth: 80 } });
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${paperWidth === 80 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                80mm (Besar)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 text-xs border-amber-500/30 text-amber-700 hover:bg-amber-50 shadow-sm"
                onClick={async () => {
                  const ok = await openCashDrawer();
                  if (ok) {
                    toast.success("🔓 Perintah Buka Laci Kasir (Cash Drawer Kick) dikirim!");
                  } else {
                    toast.info("💡 Laci Kasir: Sambungkan printer USB/Serial untuk pemicu laci otomatis.");
                  }
                }}
              >
                <Unlock className="w-3.5 h-3.5 mr-1" />
                Buka Laci Kasir
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"
                disabled={isGeneratingPdf}
                onClick={handleDownloadPDF}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1 text-blue-600" />
                )}
                Simpan PDF
              </Button>
            </div>

            {/* 🖨️ PRIMARY BUTTON: Direct Thermal / Bluetooth Print */}
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold h-11 text-sm gap-2"
              disabled={isPrintingThermal}
              onClick={handleDirectPrint}
            >
              {isPrintingThermal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isBluetoothActive ? (
                <Bluetooth className="w-4 h-4 text-blue-200" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {isPrintingThermal
                ? 'Mengirim Struk ke Printer...'
                : isBluetoothActive
                ? `Cetak Langsung (${paperWidth}mm - ${btPrinterName || 'Bluetooth'})`
                : `Cetak Langsung ke Printer (${paperWidth}mm)`}
            </Button>

            {/* 📄 SECONDARY BUTTON: Browser Print Dialog Fallback */}
            <Button 
              variant="outline"
              size="sm"
              className="w-full text-xs text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-100"
              onClick={handleBrowserPrint}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Cetak via Dialog Browser / Windows
            </Button>

            <Button 
              variant="secondary" 
              className="w-full text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-1.5" />
              Selesai / Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
