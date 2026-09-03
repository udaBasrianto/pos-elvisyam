import React from 'react';
import { BarcodeConfigView } from '@/components/BarcodeConfigView';
import { ScanBarcode } from 'lucide-react';

export default function BarcodePrint() {
  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Cetak Stiker Barcode
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Konfigurasi tata letak barcode, ukuran kertas stiker roll, dan cetak langsung antrean produk.
            </p>
          </div>
        </div>
      </div>

      {/* Main Barcode Config View */}
      <BarcodeConfigView isDialog={false} />
    </div>
  );
}
