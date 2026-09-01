import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type LabelProductData } from '@/lib/labelPrinter';
import { BarcodeConfigView } from '@/components/BarcodeConfigView';
import { ScanBarcode } from 'lucide-react';

export interface LabelPrintDialogProps {
  product?: LabelProductData | null;
  products?: LabelProductData[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

export function LabelPrintDialog({
  product,
  products,
  open,
  onOpenChange,
}: LabelPrintDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1350px] max-h-[94vh] p-4 sm:p-6 overflow-y-auto rounded-2xl flex flex-col border shadow-2xl">
        <DialogHeader className="pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-foreground">
            <ScanBarcode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Cetak kode batang
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          <BarcodeConfigView
            initialProduct={product}
            initialProducts={products}
            onClose={() => onOpenChange(false)}
            isDialog={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LabelPrintDialog;
