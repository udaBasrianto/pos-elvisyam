import { forwardRef } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface ReceiptItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptData {
  id?: string;
  storeName: string;
  storeAddress: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
  createdAt: Date;
  receiptFooter?: string;
  earnedPoints?: number;
  accumulatedPoints?: number;
}

interface ReceiptProps {
  data: ReceiptData;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ data }, ref) => {
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

  const formattedInvoiceNum = data.id
    ? (data.id.length > 16 && data.id.includes('-') ? data.id.slice(0, 8).toUpperCase() : data.id.toUpperCase())
    : '-';

  return (
    <div 
      ref={ref} 
      className="bg-white text-slate-900 p-5 w-[310px] font-mono text-xs rounded-2xl shadow-sm border border-slate-200"
      style={{ fontFamily: 'Consolas, "Courier New", Courier, monospace' }}
    >
      {/* Header Store Info */}
      <div className="text-center pb-3">
        <h2 className="font-bold text-base text-slate-900 tracking-wide mb-1 leading-snug">{data.storeName}</h2>
        <p className="text-[11px] text-slate-500 leading-relaxed font-normal px-2">
          {data.storeAddress}
        </p>
      </div>

      <div className="border-b border-dashed border-slate-300 mb-3"></div>

      {/* Transaction Metadata */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-700">No. Transaksi:</span>
          <span className="font-medium text-slate-900">{formattedInvoiceNum}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700">Tanggal:</span>
          <span className="text-slate-900">{format(data.createdAt, 'dd/MM/yyyy', { locale: id })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700">Waktu:</span>
          <span className="text-slate-900">{format(data.createdAt, 'HH:mm:ss', { locale: id })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700">Pelanggan:</span>
          <span className="text-slate-900 font-medium">{data.customerName || 'Umum'}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-slate-300 my-3"></div>

      {/* Item Pembelian */}
      <div>
        <div className="font-bold text-xs text-slate-900 mb-2 uppercase tracking-wide">ITEM PEMBELIAN</div>
        <div className="space-y-2.5">
          {data.items.map((item, index) => (
            <div key={index} className="text-xs">
              <div className="font-semibold text-slate-900">{item.productName}</div>
              <div className="flex justify-between text-slate-600 text-[11px] mt-0.5">
                <span>{item.quantity} x {formatCurrency(item.price)}</span>
                <span className="font-medium text-slate-800">{formatCurrency(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-dashed border-slate-300 my-3"></div>

      {/* Totals */}
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between text-slate-700">
          <span>Subtotal:</span>
          <span className="font-medium text-slate-900">{formatCurrency(data.subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Diskon:</span>
            <span>-{formatCurrency(data.discount)}</span>
          </div>
        )}
        {data.tax > 0 && (
          <div className="flex justify-between text-slate-700">
            <span>Pajak:</span>
            <span>{formatCurrency(data.tax)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200 mt-1">
          <span>TOTAL:</span>
          <span className="text-base">{formatCurrency(data.total)}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-slate-300 my-3"></div>

      {/* Payment Info */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between text-slate-700">
          <span>Metode Bayar:</span>
          <span className="font-medium text-slate-900">{getPaymentMethodLabel(data.paymentMethod)}</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Jumlah Bayar:</span>
          <span className="font-medium text-slate-900">{formatCurrency(data.paymentAmount)}</span>
        </div>
        {data.changeAmount > 0 && (
          <div className="flex justify-between font-semibold text-slate-900 pt-0.5">
            <span>Kembalian:</span>
            <span>{formatCurrency(data.changeAmount)}</span>
          </div>
        )}
      </div>

      {/* Loyalty Points Section */}
      {(data.earnedPoints !== undefined || data.accumulatedPoints !== undefined) && data.customerName && data.customerName !== 'Umum' && (
        <div className="space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 my-3">
          <div className="font-bold text-[10px] text-slate-700 uppercase tracking-wider mb-1">POIN PELANGGAN</div>
          {data.earnedPoints !== undefined && data.earnedPoints > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Poin Transaksi Ini:</span>
              <span>+{data.earnedPoints.toLocaleString('id-ID')} Poin</span>
            </div>
          )}
          {data.accumulatedPoints !== undefined && (
            <div className="flex justify-between text-slate-900 font-bold pt-0.5 border-t border-slate-200/60 mt-1">
              <span>Total Akumulasi Poin:</span>
              <span>{data.accumulatedPoints.toLocaleString('id-ID')} Poin</span>
            </div>
          )}
        </div>
      )}

      <div className="border-b border-dashed border-slate-300 my-3"></div>

      {/* Footer Notes */}
      <div className="text-center text-[10px] text-slate-500 space-y-1 leading-relaxed font-mono">
        <p className="text-slate-400">=================================</p>
        {data.receiptFooter !== undefined && data.receiptFooter !== "" ? (
          <p className="whitespace-pre-line text-slate-600">{data.receiptFooter}</p>
        ) : (
          <>
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat</p>
            <p>dikembalikan atau ditukar.</p>
          </>
        )}
        <p className="text-slate-400">=================================</p>
      </div>
    </div>
  );
});

Receipt.displayName = "Receipt";

export default Receipt;
