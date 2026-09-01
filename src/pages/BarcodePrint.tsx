import React from 'react';
import { BarcodeConfigView } from '@/components/BarcodeConfigView';
import { ScanBarcode } from 'lucide-react';

export default function BarcodePrint() {
  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ScanBarcode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Cetak kode batang
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Konfigurasi tata letak barcode, ukuran kertas stiker, dan cetak langsung antrean produk.
          </p>
        </div>
      </div>

      {/* Main Barcode Config View */}
      <BarcodeConfigView isDialog={false} />
    </div>
  );
}
