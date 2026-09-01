import React, { useEffect, useState, useRef } from 'react';
import type { CustomerDisplayPayload } from '@/contexts/HardwareContext';
import { CheckCircle2, Store, Clock, Receipt, Sparkles, Heart, ShoppingBag, ArrowRight } from 'lucide-react';

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pos_customer_display') : null;

function formatRp(n?: number) {
  if (n === undefined || n === null || isNaN(n)) return 'Rp 0';
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
}

export default function CustomerDisplay() {
  const [storeName, setStoreName] = useState('Point of Sale');
  const [storeAddress, setStoreAddress] = useState<string | undefined>();
  const [storePhone, setStorePhone] = useState<string | undefined>();
  const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>();
  const [cashierName, setCashierName] = useState<string | undefined>();
  const [customerName, setCustomerName] = useState<string | undefined>();
  const [dateStr, setDateStr] = useState<string | undefined>();
  const [timeStr, setTimeStr] = useState<string | undefined>();
  
  const [items, setItems] = useState<CustomerDisplayPayload['items']>([]);
  const [subtotal, setSubtotal] = useState<number | undefined>();
  const [discount, setDiscount] = useState<number | undefined>();
  const [tax, setTax] = useState<number | undefined>();
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState<number | undefined>(undefined);
  const [change, setChange] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
  const [receiptFooter, setReceiptFooter] = useState<string | undefined>();
  
  const [status, setStatus] = useState<'waiting' | 'cart' | 'done'>('waiting');
  const [countdown, setCountdown] = useState<number>(20);
  const doneTimer = useRef<any>(null);
  const intervalTimer = useRef<any>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!channel) return;
    const handler = (event: MessageEvent<CustomerDisplayPayload>) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'cart_update') {
        if (data.storeName) setStoreName(data.storeName);
        if (data.items && data.items.length > 0) {
          setItems(data.items);
          setTotal(data.total ?? 0);
          setPaid(undefined);
          setChange(undefined);
          setStatus('cart');
          if (doneTimer.current) clearTimeout(doneTimer.current);
          if (intervalTimer.current) clearInterval(intervalTimer.current);
        }
      } else if (data.type === 'checkout_done') {
        if (data.storeName) setStoreName(data.storeName);
        if (data.storeAddress) setStoreAddress(data.storeAddress);
        if (data.storePhone) setStorePhone(data.storePhone);
        if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
        if (data.cashierName) setCashierName(data.cashierName);
        if (data.customerName) setCustomerName(data.customerName);
        if (data.date) setDateStr(data.date);
        if (data.time) setTimeStr(data.time);
        
        setItems(data.items ?? []);
        setSubtotal(data.subtotal);
        setDiscount(data.discount);
        setTax(data.tax);
        setTotal(data.total ?? 0);
        setPaid(data.paid);
        setChange(data.change);
        setPaymentMethod(data.paymentMethod);
        setReceiptFooter(data.receiptFooter);
        setStatus('done');
        
        setCountdown(25);
        if (doneTimer.current) clearTimeout(doneTimer.current);
        if (intervalTimer.current) clearInterval(intervalTimer.current);

        intervalTimer.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(intervalTimer.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        doneTimer.current = setTimeout(() => {
          setStatus('waiting');
          setItems([]);
          setTotal(0);
          setPaid(undefined);
          setChange(undefined);
        }, 25000);
      } else if (data.type === 'clear') {
        // Protect the digital receipt from being wiped immediately after payment
        setStatus(prev => {
          if (prev === 'done') return 'done';
          return 'waiting';
        });
      }
    };

    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      if (doneTimer.current) clearTimeout(doneTimer.current);
      if (intervalTimer.current) clearInterval(intervalTimer.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* 🏪 TOP HEADER */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-bold shadow-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight uppercase">{storeName}</h1>
            <p className="text-xs text-slate-400 font-medium">Customer Facing Display · Layar Pelanggan</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono justify-end">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentTime.toLocaleTimeString('id-ID')}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      {/* 📺 MAIN DISPLAY AREA */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        
        {/* 1. STANDBY / WAITING SCREEN */}
        {status === 'waiting' && (
          <div className="text-center space-y-4 max-w-lg my-auto py-8">
            <div className="relative mx-auto w-24 h-24 mb-2">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center shadow-2xl">
                <ShoppingBag className="w-12 h-12 text-blue-400" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Selamat Datang!
            </h2>
            <p className="text-slate-400 text-base sm:text-lg font-medium">
              Terima kasih telah berbelanja di <strong className="text-white">{storeName}</strong>
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-blue-400 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Kasir siap melayani transaksi Anda
            </div>
          </div>
        )}

        {/* 2. REAL-TIME CHECKOUT CART TABLE */}
        {status === 'cart' && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start my-auto">
            {/* Cart Table (Left 7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col max-h-[72vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  Rincian Belanja
                </h2>
                <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800/60 px-2.5 py-0.5 rounded-full font-semibold">
                  {(items ?? []).reduce((acc, it) => acc + it.qty, 0)} Item
                </span>
              </div>

              <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-1.5 divide-y divide-slate-800/60">
                {(items ?? []).map((item, idx) => (
                  <div key={idx} className="pt-2 flex items-center justify-between text-xs sm:text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{formatRp(item.price)} × {item.qty}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-white text-sm sm:text-base">
                        {formatRp(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Highlight (Right 5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 text-center shadow-2xl border border-blue-400/30">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
                  TOTAL PEMBAYARAN
                </p>
                <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight py-2">
                  {formatRp(total)}
                </div>
                <p className="text-xs text-blue-100/80 font-medium">
                  Silakan serahkan uang pas atau scan QRIS
                </p>
              </div>

              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 text-center text-xs text-slate-400">
                <p>Transaksi Anda diproses secara real-time oleh kasir.</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. FULL DIGITAL THERMAL STRUK / RECEIPT DISPLAY AFTER CHECKOUT */}
        {status === 'done' && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto">
            {/* Left Column: Success Banner & Change (Kembalian) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-emerald-400">
                    Pembayaran Berhasil!
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
                    Struk belanja Anda tercetak di samping & siap dibawa.
                  </p>
                </div>

                {/* Big Kembalian Highlight Box */}
                {change !== undefined && change > 0 && (
                  <div className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-2xl p-4 text-center">
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                      UANG KEMBALIAN ANDA
                    </p>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-300">
                      {formatRp(change)}
                    </div>
                  </div>
                )}

                {/* Summary Info */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Total Belanja</span>
                    <span className="font-bold font-mono text-white text-sm">{formatRp(total)}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Metode / Bayar</span>
                    <span className="font-bold font-mono text-white text-sm">
                      {paid !== undefined ? formatRp(paid) : (paymentMethod?.toUpperCase() || 'LUNAS')}
                    </span>
                  </div>
                </div>

                {/* Countdown return */}
                <p className="text-[11px] text-slate-500 font-mono">
                  Kembali ke layar utama dalam <strong>{countdown} detik</strong>...
                </p>
              </div>
            </div>

            {/* Right Column: Physical Paper-Style Digital Struk Belanja */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[340px] bg-white text-slate-900 rounded-xl p-5 shadow-2xl text-xs font-mono space-y-3 border border-slate-200 select-text">
                {/* Store Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2.5">
                  <p className="font-black text-sm uppercase text-slate-950">{storeName}</p>
                  {storeAddress && <p className="text-[10px] text-slate-600">{storeAddress}</p>}
                  {storePhone && <p className="text-[10px] text-slate-600">Telp: {storePhone}</p>}
                </div>

                {/* Metadata */}
                <div className="text-[10px] space-y-0.5 text-slate-600 border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span>No. Struk:</span>
                    <span className="font-bold text-slate-900">{invoiceNumber || 'INV-POS'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span>{dateStr || new Date().toLocaleDateString('id-ID')} {timeStr || new Date().toLocaleTimeString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir / Cust:</span>
                    <span>{cashierName || 'Kasir'} / {customerName || 'Umum'}</span>
                  </div>
                </div>

                {/* Item List */}
                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2.5 max-h-[160px] overflow-y-auto pr-0.5">
                  {(items ?? []).map((it, idx) => (
                    <div key={idx} className="space-y-0.5 text-[11px]">
                      <div className="font-bold text-slate-950 truncate">{it.name}</div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>{it.qty} × {formatRp(it.price)}</span>
                        <span className="font-bold text-slate-900">{formatRp(it.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                  {subtotal !== undefined && subtotal !== total && (
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>Subtotal</span>
                      <span>{formatRp(subtotal)}</span>
                    </div>
                  )}
                  {discount !== undefined && discount > 0 && (
                    <div className="flex justify-between text-emerald-600 text-[10px]">
                      <span>Diskon</span>
                      <span>-{formatRp(discount)}</span>
                    </div>
                  )}
                  {tax !== undefined && tax > 0 && (
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>Pajak (PPN)</span>
                      <span>{formatRp(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-950 pt-1">
                    <span>TOTAL</span>
                    <span>{formatRp(total)}</span>
                  </div>
                  {paid !== undefined && (
                    <div className="flex justify-between text-slate-700 text-[10px]">
                      <span>Bayar ({paymentMethod?.toUpperCase() || 'TUNAI'})</span>
                      <span className="font-bold">{formatRp(paid)}</span>
                    </div>
                  )}
                  {change !== undefined && (
                    <div className="flex justify-between font-bold text-emerald-700 text-[11px]">
                      <span>Kembalian</span>
                      <span>{formatRp(change)}</span>
                    </div>
                  )}
                </div>

                {/* Receipt Footer Message */}
                <div className="text-center text-[9px] text-slate-500 pt-1 leading-tight">
                  <p className="font-semibold">{receiptFooter || 'Terima kasih atas kunjungan Anda!'}</p>
                  <p className="text-[8px] text-slate-400 mt-1">Simpan struk ini sebagai bukti pembayaran yang sah.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 🏷️ FOOTER STATUS */}
      <footer className="py-2.5 px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Layar Pelanggan Terhubung & Aktif</span>
        </div>
        <div>
          POS Multi-Tenant System
        </div>
      </footer>
    </div>
  );
}
