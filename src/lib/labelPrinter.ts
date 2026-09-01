/**
 * labelPrinter.ts
 * Driver & Generator Universal untuk Cetak Stiker Label Barcode & Harga POS
 * ─────────────────────────────────────────────────────────────────────────────
 * Mendukung Multi-Kolom Horizontal (1 Line, 2 Line, 3 Line, dsb.):
 * - 3 Line / 3 Kolom (33x15mm, 30x15mm, 32x18mm - Sangat populer di OpenLabel, Xprinter, Postek, Kassen)
 * - 2 Line / 2 Kolom (30x20mm, 35x25mm, 40x20mm)
 * - 1 Line / 1 Kolom (40x30mm, 50x30mm, 50x25mm, 60x40mm)
 * - Kustom Kolom & Ukuran
 * 
 * Kompatibel dengan:
 * - TSPL / TSC (Xprinter, OpenLabel, Steprint, Gprinter, Panda, Kassen, Postek, Argox)
 * - Niimbot (D11, D110, B21, B1, B3S)
 * - ESC/POS Label & Thermal (58mm, 80mm, RPP02N, Eppos)
 * - Browser System Print (Pixel-perfect @page CSS grid layout)
 */

import { CODE128_PATTERNS, getCode128Pattern } from '@/components/BarcodeGraphic';

export { CODE128_PATTERNS, getCode128Pattern };

export interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  columns: number; // 1, 2, 3, 4
  gapHorizontalMm?: number;
  gapVerticalMm?: number;
  description: string;
  recommendedFor: string;
}

export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: '30x19-3col',
    name: '30 x 19 mm (3 Kolom / 3 Line) — Xprinter XP-420B',
    widthMm: 30,
    heightMm: 19,
    columns: 3,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    description: '3 Stiker Sejajar Horizontal (Roll ~96mm - 100mm)',
    recommendedFor: 'Standar Xprinter XP-420B / XP-365B Ritel 3 Kolom'
  },
  {
    id: '33x15-3col',
    name: '33 x 15 mm (3 Kolom / 3 Line) — Xprinter XP-420B',
    widthMm: 33,
    heightMm: 15,
    columns: 3,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    description: '3 Stiker Sejajar Horizontal (Roll 103mm)',
    recommendedFor: 'Standar Ritel / Toko Baju, Apotek, Minimarket XP-420B'
  },
  {
    id: '40x30-2col',
    name: '40 x 30 mm (2 Kolom / 2 Line) — Xprinter XP-420B',
    widthMm: 40,
    heightMm: 30,
    columns: 2,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    description: '2 Stiker Sejajar Horizontal (Roll 82mm - 85mm)',
    recommendedFor: 'Label Harga & Barcode Fashion, Aksesoris XP-420B'
  },
  {
    id: '35x25-2col',
    name: '35 x 25 mm (2 Kolom / 2 Line) — Xprinter XP-420B',
    widthMm: 35,
    heightMm: 25,
    columns: 2,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    description: '2 Stiker Sejajar Horizontal (Roll 72mm - 75mm)',
    recommendedFor: 'Label Barcode & Harga 2 Kolom XP-420B'
  },
  {
    id: '40x30',
    name: '40 x 30 mm (1 Kolom / 1 Line) — Xprinter XP-420B',
    widthMm: 40,
    heightMm: 30,
    columns: 1,
    gapHorizontalMm: 0,
    gapVerticalMm: 2,
    description: '1 Stiker per Baris (Standar Minimarket)',
    recommendedFor: 'Label Harga Produk, Rak, Barcode XP-420B'
  },
  {
    id: '50x30',
    name: '50 x 30 mm (1 Kolom / 1 Line) — Xprinter XP-420B',
    widthMm: 50,
    heightMm: 30,
    columns: 1,
    gapHorizontalMm: 0,
    gapVerticalMm: 2,
    description: 'Standar Sedang 1 Kolom (Roll 52mm - 55mm)',
    recommendedFor: 'Label Produk dengan Nama Panjang & Harga XP-420B'
  },
  {
    id: '50x25',
    name: '50 x 25 mm (1 Kolom / 1 Line) — Xprinter XP-420B',
    widthMm: 50,
    heightMm: 25,
    columns: 1,
    gapHorizontalMm: 0,
    gapVerticalMm: 2,
    description: 'Label Rak Toko / Shelf Tag 1 Kolom',
    recommendedFor: 'Barcode & Harga Rak Gondola XP-420B'
  },
  {
    id: '60x40',
    name: '60 x 40 mm (1 Kolom / 1 Line) — Xprinter XP-420B',
    widthMm: 60,
    heightMm: 40,
    columns: 1,
    gapHorizontalMm: 0,
    gapVerticalMm: 2,
    description: 'Label Box & Ekspedisi Kecil (Roll 64mm)',
    recommendedFor: 'Dus Barang, Paket, Tag Gudang XP-420B'
  },
  {
    id: '100x150',
    name: '100 x 150 mm (1 Kolom Resi / Ekspedisi) — Xprinter XP-420B',
    widthMm: 100,
    heightMm: 150,
    columns: 1,
    gapHorizontalMm: 0,
    gapVerticalMm: 3,
    description: 'Label Resi Pengiriman Marketplace & Ekspedisi (4 Inci)',
    recommendedFor: 'Cetak Resi Marketplace & Logistik Standar XP-420B'
  },
  {
    id: 'custom',
    name: 'Kustom Kolom & Ukuran XP-420B (mm)',
    widthMm: 40,
    heightMm: 30,
    columns: 1,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
    description: 'Atur Bebas Jumlah Kolom (1-5), Lebar & Tinggi (Maks 108mm)',
    recommendedFor: 'Kertas stiker kustom roll Xprinter XP-420B'
  }
];


export interface LabelProductData {
  id?: string;
  name: string;
  barcode?: string;
  sku?: string;
  price?: number;
  stock?: number;
  brand?: string;
  storeName?: string;
  unit?: string;
  expiryDate?: string;
}

export interface LabelPrintOptions {
  presetId: string;
  widthMm: number;
  heightMm: number;
  columns: number; // 1, 2, 3, 4, 5 (Horizontal columns per row)
  gapHorizontalMm?: number; // Gap horizontal antar kolom stiker (default 2mm)
  gapVerticalMm?: number; // Gap vertikal antar baris stiker (default 2mm)
  marginOuterMm?: number; // Margin tepi luar kertas kiri/kanan (default 1.5mm)
  paddingHorizontalMm?: number; // Padding dalam stiker kiri & kanan (default 1.0mm)
  paddingVerticalMm?: number; // Padding dalam stiker atas & bawah (default 0.8mm)
  copies: number;
  showStoreName: boolean;
  showName: boolean;
  showBarcode: boolean;
  showBarcodeText: boolean;
  showPrice: boolean;
  showSku: boolean;
  customStoreName?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  printerProtocol?: 'auto' | 'tspl' | 'escpos' | 'raster';

  // 🔤 Custom Typography & Sizing
  fontFamily?: 'sans-serif' | 'monospace' | 'serif' | 'Arial' | 'Segoe UI' | 'Roboto' | string;
  storeNameFontSize?: number; // in px (e.g. 8)
  productNameFontSize?: number; // in px (e.g. 9)
  barcodeTextFontSize?: number; // in px (e.g. 8)
  priceFontSize?: number; // in px (e.g. 12)
  fontWeight?: 'normal' | '500' | '600' | 'bold' | '800' | '900';
  textAlign?: 'left' | 'center' | 'right';

  // 🏷️ Barcode Format & Dimensions
  barcodeType?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF' | 'QR' | 'CODABAR';
  barcodeHeightMm?: number; // Barcode height in mm (e.g. 18)
  barcodeWidthRatio?: number; // Barcode line width ratio multiplier (e.g. 1.0 - 2.5)
  barcodeAreaWidthPercent?: number; // Lebar area barcode sebagai % dari lebar label (e.g. 50-100)

  // 🎯 Freeform Drag & Drop Visual Layout Offsets (in mm)
  elementPositions?: LabelElementPositions;
  elementOrder?: LabelElementKey[];
}

export type LabelElementKey = 'storeName' | 'productName' | 'barcode' | 'barcodeText' | 'price' | 'sku';

export interface LabelElementPosition {
  x: number; // Horizontal offset in mm (-30 to +30)
  y: number; // Vertical offset in mm (-30 to +30)
}

export type LabelElementPositions = Partial<Record<LabelElementKey, LabelElementPosition>>;

export const DEFAULT_LABEL_ELEMENT_ORDER: LabelElementKey[] = [
  'storeName',
  'productName',
  'barcode',
  'barcodeText',
  'price',
];

export const LABEL_OPTIONS_UPDATED_EVENT = 'pos_label_options_updated';

export const DEFAULT_LABEL_OPTIONS: LabelPrintOptions = {
  presetId: '33x15-3col',
  widthMm: 33,
  heightMm: 15,
  columns: 3,
  gapHorizontalMm: 2,
  gapVerticalMm: 2,
  marginOuterMm: 1.5,
  paddingHorizontalMm: 1.0,
  paddingVerticalMm: 0.8,
  copies: 3,
  showStoreName: true,
  showName: true,
  showBarcode: true,
  showBarcodeText: true,
  showPrice: true,
  showSku: false,
  fontSize: 'md',
  printerProtocol: 'auto',

  // Default Typography & Barcode format
  fontFamily: 'sans-serif',
  storeNameFontSize: 8,
  productNameFontSize: 9,
  barcodeTextFontSize: 8,
  priceFontSize: 12,
  fontWeight: '800',
  textAlign: 'center',

  barcodeType: 'CODE128',
  barcodeHeightMm: 18,
  barcodeWidthRatio: 1.0,
  barcodeAreaWidthPercent: 88,

  elementPositions: {},
  elementOrder: DEFAULT_LABEL_ELEMENT_ORDER,
};

/**
 * Menghitung ukuran proporsional yang saling tersinkronisasi otomatis
 * (Tinggi Barcode, Lebar/Tinggi Stiker, Ukuran Font, dan Rasio Garis Barcode)
 */
export function getProportionalLabelDimensions(
  base: {
    widthMm?: number;
    heightMm?: number;
    barcodeHeightMm?: number;
  }
): {
  barcodeHeightMm: number;
  productNameFontSize: number;
  barcodeTextFontSize: number;
  priceFontSize: number;
  storeNameFontSize: number;
  barcodeAreaWidthPercent: number;
  barcodeWidthRatio: number;
  suggestedHeightMm?: number;
} {
  const w = Math.max(10, base.widthMm || 33);
  const h = Math.max(10, base.heightMm || 15);

  // Baseline scale relative to standard 33x15mm stiker
  const scale = Math.max(0.7, Math.min(2.8, Math.sqrt((w * h) / (33 * 15))));

  // If specific barcodeHeightMm is given:
  // Usually barcode takes ~45% of total label height (with minimum 10mm, maximum 60mm)
  let barcodeHeightMm = base.barcodeHeightMm !== undefined
    ? Math.max(10, Math.min(60, base.barcodeHeightMm))
    : Math.max(10, Math.min(50, Math.round(h * 0.46)));

  // Relative ratio of barcode height to base (18mm)
  const barcodeRatio = Math.max(0.65, Math.min(2.5, barcodeHeightMm / 18));

  // Harmonized font sizes scaling with both label dimensions and barcode height
  const storeNameFontSize = Number(
    (Math.max(6, Math.min(18, 7.5 * Math.pow(scale, 0.6) * Math.pow(barcodeRatio, 0.4)))).toFixed(1)
  );
  const productNameFontSize = Number(
    (Math.max(7, Math.min(22, 8.8 * Math.pow(scale, 0.6) * Math.pow(barcodeRatio, 0.4)))).toFixed(1)
  );
  const barcodeTextFontSize = Number(
    (Math.max(5.5, Math.min(18, 7.2 * Math.pow(scale, 0.6) * Math.pow(barcodeRatio, 0.35)))).toFixed(1)
  );
  const priceFontSize = Number(
    (Math.max(9, Math.min(28, 12.0 * Math.pow(scale, 0.6) * Math.pow(barcodeRatio, 0.4)))).toFixed(1)
  );

  // Barcode area width & width ratio multiplier
  const barcodeAreaWidthPercent = Math.max(
    70,
    Math.min(96, Math.round(86 + (w > 35 ? 4 : 0) + (barcodeHeightMm > 20 ? 2 : 0)))
  );
  const barcodeWidthRatio = Number(
    (Math.max(0.8, Math.min(2.4, 0.9 + (w / 33 - 1) * 0.4 + (barcodeHeightMm / 18 - 1) * 0.2))).toFixed(1)
  );

  // Minimum suggested stiker height if barcode height is changed to something larger
  const minRequiredH = Math.ceil(barcodeHeightMm / 0.65) + 2;
  const suggestedHeightMm = h < minRequiredH ? minRequiredH : h;

  return {
    barcodeHeightMm,
    storeNameFontSize,
    productNameFontSize,
    barcodeTextFontSize,
    priceFontSize,
    barcodeAreaWidthPercent,
    barcodeWidthRatio,
    suggestedHeightMm,
  };
}

/**
 * Loads label printing configuration from localStorage, safely merged with defaults
 */
export function loadLabelOptions(): LabelPrintOptions {
  try {
    const saved = localStorage.getItem('pos_label_options');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_LABEL_OPTIONS,
        ...parsed,
        elementOrder:
          Array.isArray(parsed.elementOrder) && parsed.elementOrder.length > 0
            ? parsed.elementOrder
            : DEFAULT_LABEL_ELEMENT_ORDER,
        elementPositions: parsed.elementPositions || {},
      };
    }
  } catch (err) {
    console.warn('Failed to load label options from localStorage:', err);
  }
  return DEFAULT_LABEL_OPTIONS;
}

/**
 * Saves label printing configuration to localStorage and broadcasts update event
 */
export function saveLabelOptions(opts: LabelPrintOptions): void {
  try {
    localStorage.setItem('pos_label_options', JSON.stringify(opts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LABEL_OPTIONS_UPDATED_EVENT, { detail: opts }));
    }
  } catch (err) {
    console.error('Failed to save label options to localStorage:', err);
  }
}

// ── FORMAT CURRENCY UTILITY ────────────────────────────────────────────────
export function formatRupiah(num?: number): string {
  if (num === undefined || num === null) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function escapeTspl(str: string): string {
  return str.replace(/"/g, '\'').replace(/[\r\n]/g, ' ');
}

// ── SPLIT PRODUCT NAME HELPER ──────────────────────────────────────────────
/**
 * Splits product name gracefully into 2 lines so long names fit small label width
 */
export function splitProductNameToTwoLines(name: string, maxCharsPerLine: number = 18): [string, string] {
  const clean = (name || '').trim().toUpperCase();
  if (!clean) return ['', ''];
  if (clean.length <= maxCharsPerLine) {
    return [clean, ''];
  }

  const words = clean.split(/\s+/);
  let line1 = '';
  let line2 = '';

  for (const word of words) {
    if (!line1) {
      line1 = word.slice(0, maxCharsPerLine);
    } else if ((line1 + ' ' + word).length <= maxCharsPerLine && !line2) {
      line1 += ' ' + word;
    } else if (!line2) {
      line2 = word.slice(0, maxCharsPerLine);
    } else if ((line2 + ' ' + word).length <= maxCharsPerLine) {
      line2 += ' ' + word;
    } else {
      break;
    }
  }

  if (!line2 && clean.length > maxCharsPerLine) {
    line1 = clean.slice(0, maxCharsPerLine);
    line2 = clean.slice(maxCharsPerLine, maxCharsPerLine * 2);
  }

  return [line1.trim(), line2.trim()];
}

// ── TSPL (TSC / Xprinter / OpenLabel / Panda / Postek) GENERATOR ────────────
/**
 * Generates TSPL vector commands with accurate multi-column horizontal layout
 */
export function generateTsplLabel(
  productInput: LabelProductData | LabelProductData[],
  opts: LabelPrintOptions
): Uint8Array {
  const w = opts.widthMm || 33;
  const h = opts.heightMm || 15;
  const cols = Math.max(1, opts.columns || 1);
  const gapH = opts.gapHorizontalMm ?? 2;
  const gapV = opts.gapVerticalMm ?? 2;

  // Flatten products with their copies into a single queue of label items
  const labelQueue: LabelProductData[] = [];
  const rawProducts = Array.isArray(productInput) ? productInput : [productInput];

  for (const prod of rawProducts) {
    const copies = Math.max(1, opts.copies || 1);
    for (let i = 0; i < copies; i++) {
      labelQueue.push(prod);
    }
  }

  const dotsPerMm = 8; // 203 DPI standard
  const singleLabelW = w * dotsPerMm;
  const singleLabelH = h * dotsPerMm;
  const gapHDots = Math.floor(gapH * dotsPerMm);
  const leftMarginMm = opts.marginOuterMm ?? (cols > 1 ? 1.5 : 0);
  const leftMarginDots = Math.floor(leftMarginMm * dotsPerMm);

  // Total roll print width = (w * cols) + gapH * (cols - 1) + (leftMarginMm * 2)
  const totalRollWidthMm = (w * cols) + (gapH * (cols - 1)) + (leftMarginMm * 2);

  let tspl = '';
  tspl += `SIZE ${totalRollWidthMm} mm, ${h} mm\r\n`;
  tspl += `GAP ${gapV} mm, 0 mm\r\n`;
  tspl += `DIRECTION 1\r\n`;
  tspl += `CLS\r\n`;

  // Process label queue row by row (each row has `cols` labels horizontally)
  let queueIndex = 0;
  while (queueIndex < labelQueue.length) {
    tspl += `CLS\r\n`;

    const itemsInThisRow = Math.min(cols, labelQueue.length - queueIndex);

    for (let c = 0; c < itemsInThisRow; c++) {
      const product = labelQueue[queueIndex + c];
      const colOffsetX = leftMarginDots + Math.floor(c * (singleLabelW + gapHDots));
      const colCenterX = Math.floor(colOffsetX + (singleLabelW / 2));
      const offStore = opts.elementPositions?.storeName || { x: 0, y: 0 };
      const offName = opts.elementPositions?.productName || { x: 0, y: 0 };
      const offBc = opts.elementPositions?.barcode || { x: 0, y: 0 };
      const offBct = opts.elementPositions?.barcodeText || { x: 0, y: 0 };
      const offPrice = opts.elementPositions?.price || { x: 0, y: 0 };

      const isCompact = h <= 20;
      const padV = opts.paddingVerticalMm ?? (isCompact ? 0.4 : 0.8);
      let currentY = Math.max(2, Math.floor(padV * dotsPerMm));
      const store = (opts.customStoreName || product.storeName || product.brand || 'TOKO').toUpperCase();
      const name = (product.name || 'PRODUK').toUpperCase();
      const code = (product.barcode || product.sku || '000000').trim();
      const price = opts.showPrice && product.price !== undefined ? formatRupiah(product.price) : '';
      const sku = (product.sku || '').trim();

      // Render elements in user-configured order
      const order = opts.elementOrder || DEFAULT_LABEL_ELEMENT_ORDER;
      const tsplAlign = opts.textAlign === 'left' ? 1 : opts.textAlign === 'right' ? 3 : 2;
      const getBaseX = (offX: number = 0) => {
        if (opts.textAlign === 'left') {
          return colOffsetX + Math.floor((opts.paddingHorizontalMm ?? (isCompact ? 0.6 : 1.0)) * dotsPerMm) + Math.floor(offX * dotsPerMm);
        } else if (opts.textAlign === 'right') {
          return colOffsetX + singleLabelW - Math.floor((opts.paddingHorizontalMm ?? (isCompact ? 0.6 : 1.0)) * dotsPerMm) + Math.floor(offX * dotsPerMm);
        }
        return colCenterX + Math.floor(offX * dotsPerMm);
      };

      for (const elemKey of order) {
        if (elemKey === 'storeName' && opts.showStoreName && store) {
          const maxStoreChars = Math.max(14, Math.floor(w / 1.8));
          const cleanStore = store.slice(0, maxStoreChars);
          const posX = getBaseX(offStore.x);
          const posY = currentY + Math.floor(offStore.y * dotsPerMm);
          tspl += `TEXT ${posX},${posY},"1",0,1,1,${tsplAlign},"${escapeTspl(cleanStore)}"\r\n`;
          currentY += isCompact ? 9 : 11;
        } else if (elemKey === 'productName' && opts.showName && name) {
          const maxChars = Math.max(18, Math.floor(w / 1.1));
          const cleanName = name.slice(0, maxChars);
          const posX = getBaseX(offName.x);
          const posY = currentY + Math.floor(offName.y * dotsPerMm);
          tspl += `TEXT ${posX},${posY},"1",0,1,1,${tsplAlign},"${escapeTspl(cleanName)}"\r\n`;
          currentY += isCompact ? 10 : 12;
        } else if (elemKey === 'barcode' && opts.showBarcode && code) {
          currentY += 1; // Quiet margin before barcode
          const priceH = (opts.showPrice && price) ? (isCompact ? 13 : 16) : 0;
          const digitsH = (opts.showBarcodeText && code) ? (isCompact ? 9 : 11) : 0;
          const bottomReserved = priceH + digitsH + 2;
          const userBcDots = opts.barcodeHeightMm ? Math.floor(opts.barcodeHeightMm * dotsPerMm) : 0;
          const maxAvailableDots = Math.max(10, singleLabelH - currentY - bottomReserved);
          const barcodeHeight = userBcDots > 0 ? Math.min(userBcDots, maxAvailableDots) : Math.max(14, Math.min(isCompact ? 24 : 38, maxAvailableDots));

          if (opts.barcodeType === 'QR') {
            const qrCellSize = Math.max(2, Math.min(5, Math.floor(singleLabelH / 8)));
            let startX = colCenterX - (qrCellSize * 8) + Math.floor(offBc.x * dotsPerMm);
            if (opts.textAlign === 'left') {
              startX = colOffsetX + 4 + Math.floor(offBc.x * dotsPerMm);
            } else if (opts.textAlign === 'right') {
              startX = colOffsetX + singleLabelW - (qrCellSize * 16) - 4 + Math.floor(offBc.x * dotsPerMm);
            }
            const startY = currentY + Math.floor(offBc.y * dotsPerMm);
            tspl += `QRCODE ${startX},${startY},M,${qrCellSize},A,0,"${escapeTspl(code)}"\r\n`;
            currentY += (qrCellSize * 16) + 2;
          } else {
            let tsplType = "128";
            if (opts.barcodeType === 'EAN13') tsplType = "EAN13";
            else if (opts.barcodeType === 'EAN8') tsplType = "EAN8";
            else if (opts.barcodeType === 'UPC') tsplType = "UPCA";
            else if (opts.barcodeType === 'CODE39') tsplType = "39";
            else if (opts.barcodeType === 'ITF') tsplType = "ITF14";
            else if (opts.barcodeType === 'CODABAR') tsplType = "CODA";

            const barcodeAreaPct = (opts.barcodeAreaWidthPercent ?? 92) / 100;
            const estBarcodeWidth = Math.min(singleLabelW - 8, Math.floor(singleLabelW * barcodeAreaPct));
            let startX = colOffsetX + Math.floor((singleLabelW - estBarcodeWidth) / 2) + Math.floor(offBc.x * dotsPerMm);
            if (opts.textAlign === 'left') {
              startX = colOffsetX + 4 + Math.floor(offBc.x * dotsPerMm);
            } else if (opts.textAlign === 'right') {
              startX = colOffsetX + singleLabelW - estBarcodeWidth - 4 + Math.floor(offBc.x * dotsPerMm);
            }
            const startY = currentY + Math.floor(offBc.y * dotsPerMm);
            
            // humanReadable = 0 to prevent hardware overlapping numbers!
            tspl += `BARCODE ${startX},${startY},"${tsplType}",${barcodeHeight},0,0,1,1,"${escapeTspl(code)}"\r\n`;
            currentY += barcodeHeight + 2;
          }
        } else if (elemKey === 'barcodeText' && opts.showBarcodeText && code) {
          const posX = getBaseX(offBct.x);
          const posY = currentY + Math.floor(offBct.y * dotsPerMm);
          tspl += `TEXT ${posX},${posY},"1",0,1,1,${tsplAlign},"${escapeTspl(code)}"\r\n`;
          currentY += isCompact ? 9 : 11;
        } else if (elemKey === 'price' && opts.showPrice && price) {
          const posX = getBaseX(offPrice.x);
          const posY = currentY + Math.floor(offPrice.y * dotsPerMm);
          tspl += `TEXT ${posX},${posY},"2",0,1,1,${tsplAlign},"${escapeTspl(price)}"\r\n`;
          currentY += isCompact ? 12 : 14;
        } else if (elemKey === 'sku' && opts.showSku && sku) {
          const offSku = opts.elementPositions?.sku || { x: 0, y: 0 };
          const posX = getBaseX(offSku.x);
          const posY = currentY + Math.floor(offSku.y * dotsPerMm);
          tspl += `TEXT ${posX},${posY},"1",0,1,1,${tsplAlign},"${escapeTspl(sku)}"\r\n`;
          currentY += isCompact ? 9 : 11;
        }
      }
    }

    tspl += `PRINT 1,1\r\n`;
    queueIndex += itemsInThisRow;
  }

  return new TextEncoder().encode(tspl);
}

// ── ESC/POS LABEL / MINI THERMAL PRINTER GENERATOR ──────────────────────────
export function generateEscPosLabel(product: LabelProductData, opts: LabelPrintOptions): Uint8Array {
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;

  const parts: Uint8Array[] = [];
  const push = (...arrays: (Uint8Array | number[])[]) => {
    for (const a of arrays) {
      parts.push(a instanceof Uint8Array ? a : new Uint8Array(a));
    }
  };
  const pushText = (str: string) => push(new TextEncoder().encode(str));

  // Init
  push([ESC, 0x40]);
  push([ESC, 0x61, 0x01]); // Center align

  const cols = Math.max(1, opts.columns || 1);
  const copies = Math.max(1, opts.copies || 1);
  const totalCopies = copies * cols;

  for (let c = 0; c < totalCopies; c++) {
    const store = (opts.customStoreName || product.storeName || product.brand || 'TOKO').toUpperCase();
    const name = (product.name || 'PRODUK').toUpperCase();
    const code = (product.barcode || product.sku || '000000').trim();
    const price = opts.showPrice && product.price !== undefined ? formatRupiah(product.price) : '';

    if (opts.showStoreName && store) {
      push([ESC, 0x21, 0x00]);
      pushText(store.slice(0, 20) + '\n');
    }

    if (opts.showName && name) {
      push([ESC, 0x21, 0x01]);
      pushText(name.slice(0, 32) + '\n');
    }

    if (opts.showBarcode && code) {
      push([GS, 0x68, 48]); // Height
      push([GS, 0x77, 2]);  // Width
      push([GS, 0x48, opts.showBarcodeText ? 2 : 0]); // Text below barcode
      push([GS, 0x6B, 73, code.length]);
      pushText(code);
      push([LF]);
    }

    if (opts.showPrice && price) {
      push([ESC, 0x45, 0x01]);
      push([GS, 0x21, 0x01]);
      pushText(price + '\n');
      push([GS, 0x21, 0x00]);
      push([ESC, 0x45, 0x00]);
    }

    push([LF, LF]);
  }

  return concatBytes(...parts);
}

export function concatBytes(...arrays: (Uint8Array | number[])[]): Uint8Array {
  const byteArrays = arrays.map(a => (a instanceof Uint8Array ? a : new Uint8Array(a)));
  const totalLength = byteArrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of byteArrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ── MONOCHROME BITMAP RASTER GENERATOR (CRISP 1-BIT ANTI-BLUR ENGINE) ────────
export async function generateRasterLabelBitmap(
  product: LabelProductData,
  opts: LabelPrintOptions,
  protocol: 'tspl' | 'escpos' = 'tspl'
): Promise<Uint8Array> {
  const wMm = opts.widthMm || 33;
  const hMm = opts.heightMm || 15;
  const cols = Math.max(1, opts.columns || 1);
  const gapH = opts.gapHorizontalMm ?? 2;
  const dpmm = 8;

  const leftMarginMm = opts.marginOuterMm ?? (cols > 1 ? 1.5 : 0);
  const leftMarginDots = Math.floor(leftMarginMm * dpmm);
  const totalWidthMm = (wMm * cols) + (gapH * (cols - 1)) + (leftMarginMm * 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(totalWidthMm * dpmm);
  canvas.height = Math.floor(hMm * dpmm);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return generateTsplLabel(product, opts);

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textAlign = opts.textAlign || 'center';

  const singleLabelW = Math.floor(wMm * dpmm);
  const gapHDots = Math.floor(gapH * dpmm);

  const offStore = opts.elementPositions?.storeName || { x: 0, y: 0 };
  const offName = opts.elementPositions?.productName || { x: 0, y: 0 };
  const offBc = opts.elementPositions?.barcode || { x: 0, y: 0 };
  const offBct = opts.elementPositions?.barcodeText || { x: 0, y: 0 };
  const offPrice = opts.elementPositions?.price || { x: 0, y: 0 };

  const padV = opts.paddingVerticalMm ?? 0.8;
  const padH = opts.paddingHorizontalMm ?? 1.0;

  for (let c = 0; c < cols; c++) {
    const colOffsetX = leftMarginDots + c * (singleLabelW + gapHDots);
    const centerX = colOffsetX + singleLabelW / 2;
    let y = Math.max(2, Math.floor(padV * dpmm));

    const getBaseRasterX = (offX: number = 0) => {
      if (opts.textAlign === 'left') {
        return colOffsetX + Math.floor(padH * dpmm) + Math.floor(offX * dpmm);
      } else if (opts.textAlign === 'right') {
        return colOffsetX + singleLabelW - Math.floor(padH * dpmm) + Math.floor(offX * dpmm);
      }
      return centerX + Math.floor(offX * dpmm);
    };

    const store = (opts.customStoreName || product.storeName || product.brand || 'TOKO').toUpperCase();
    const name = (product.name || 'PRODUK').toUpperCase();
    const code = (product.barcode || product.sku || '000000').trim();
    const price = opts.showPrice && product.price !== undefined ? formatRupiah(product.price) : '';
    const sku = (product.sku || '').trim();

    // Render elements in user-configured order
    const order = opts.elementOrder || DEFAULT_LABEL_ELEMENT_ORDER;
    const fontFamilyCss = opts.fontFamily || 'sans-serif';
    const storeFontPx = opts.storeNameFontSize || 8;
    const productFontPx = opts.productNameFontSize || 9;
    const barcodeTextFontPx = opts.barcodeTextFontSize || 8;
    const priceFontPx = opts.priceFontSize || 12;
    const fw = opts.fontWeight || '800';
    for (const elemKey of order) {
      if (elemKey === 'storeName' && opts.showStoreName && store) {
        ctx.font = `bold ${storeFontPx}px ${fontFamilyCss}`;
        ctx.fillText(store.slice(0, 18), getBaseRasterX(offStore.x), y + storeFontPx * 0.8 + offStore.y * dpmm);
        y += storeFontPx + 2;
      } else if (elemKey === 'productName' && opts.showName && name) {
        const availableW = singleLabelW - Math.floor(padH * 2 * dpmm);
        let fontSize = productFontPx;
        ctx.font = `${fw} ${fontSize}px ${fontFamilyCss}`;
        let textWidth = ctx.measureText(name).width;
        while (textWidth > availableW && fontSize > 5.0) {
          fontSize -= 0.5;
          ctx.font = `${fw} ${fontSize}px ${fontFamilyCss}`;
          textWidth = ctx.measureText(name).width;
        }
        ctx.fillText(name, getBaseRasterX(offName.x), y + fontSize * 0.8 + offName.y * dpmm, availableW);
        y += fontSize + 2;
      } else if (elemKey === 'barcode' && opts.showBarcode && code) {
        y += 2; // small quiet zone
        const barcodePattern = getCode128Pattern(code);
        if (barcodePattern) {
          const digitsH = (opts.showBarcodeText && code) ? barcodeTextFontPx + 2 : 0;
          const priceH = (opts.showPrice && price) ? priceFontPx + 2 : 0;
          const barH = Math.max(16, Math.min(48, canvas.height - y - digitsH - priceH - 3));
          const barW = Math.min(singleLabelW - 12, Math.floor(singleLabelW * ((opts.barcodeAreaWidthPercent ?? 92) / 100)));
          let startX = colOffsetX + Math.floor((singleLabelW - barW) / 2) + offBc.x * dpmm;
          if (opts.textAlign === 'left') {
            startX = colOffsetX + Math.floor(padH * dpmm) + offBc.x * dpmm;
          } else if (opts.textAlign === 'right') {
            startX = colOffsetX + singleLabelW - barW - Math.floor(padH * dpmm) + offBc.x * dpmm;
          }
          const startY = y + offBc.y * dpmm;
          const moduleW = barW / barcodePattern.length;

          for (let i = 0; i < barcodePattern.length; i++) {
            if (barcodePattern[i] === '1') {
              ctx.fillRect(startX + i * moduleW, startY, Math.ceil(moduleW), barH);
            }
          }
          y += barH + 2;
        }
      } else if (elemKey === 'barcodeText' && opts.showBarcodeText && code) {
        ctx.font = `bold ${barcodeTextFontPx}px ${fontFamilyCss}`;
        ctx.fillText(code, getBaseRasterX(offBct.x), y + barcodeTextFontPx * 0.8 + offBct.y * dpmm);
        y += barcodeTextFontPx + 2;
      } else if (elemKey === 'price' && opts.showPrice && price) {
        ctx.font = `${fw} ${priceFontPx}px ${fontFamilyCss}`;
        ctx.fillText(price, getBaseRasterX(offPrice.x), y + priceFontPx * 0.85 + offPrice.y * dpmm);
        y += priceFontPx + 2;
      } else if (elemKey === 'sku' && opts.showSku && sku) {
        const offSku = opts.elementPositions?.sku || { x: 0, y: 0 };
        ctx.font = `bold ${barcodeTextFontPx}px ${fontFamilyCss}`;
        ctx.fillText(sku, getBaseRasterX(offSku.x), y + barcodeTextFontPx * 0.8 + offSku.y * dpmm);
        y += barcodeTextFontPx + 2;
      }
    }
  }

  // Convert canvas to 1-bit monochrome bitmap
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const widthBytes = Math.ceil(canvas.width / 8);
  const bitmapBytes = new Uint8Array(widthBytes * canvas.height);

  for (let row = 0; row < canvas.height; row++) {
    for (let col = 0; col < canvas.width; col++) {
      const idx = (row * canvas.width + col) * 4;
      const r = imgData.data[idx];
      const g = imgData.data[idx + 1];
      const b = imgData.data[idx + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 140) {
        const byteIdx = row * widthBytes + Math.floor(col / 8);
        const bitIdx = 7 - (col % 8);
        bitmapBytes[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  if (protocol === 'tspl') {
    const tsplHeader = `SIZE ${totalWidthMm} mm, ${hMm} mm\r\nGAP ${opts.gapVerticalMm ?? 2} mm, 0 mm\r\nCLS\r\nBITMAP 0,0,${widthBytes},${canvas.height},0,`;
    const tsplFooter = `\r\nPRINT 1,1\r\n`;
    const hBytes = new TextEncoder().encode(tsplHeader);
    const fBytes = new TextEncoder().encode(tsplFooter);

    const out = new Uint8Array(hBytes.length + bitmapBytes.length + fBytes.length);
    out.set(hBytes, 0);
    out.set(bitmapBytes, hBytes.length);
    out.set(fBytes, hBytes.length + bitmapBytes.length);
    return out;
  } else {
    const xL = widthBytes % 256;
    const xH = Math.floor(widthBytes / 256);
    const yL = canvas.height % 256;
    const yH = Math.floor(canvas.height / 256);
    const cmdHeader = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    const cmdFooter = new Uint8Array([0x0A, 0x0A]);

    const singlePrint = new Uint8Array(cmdHeader.length + bitmapBytes.length + cmdFooter.length);
    singlePrint.set(cmdHeader, 0);
    singlePrint.set(bitmapBytes, cmdHeader.length);
    singlePrint.set(cmdFooter, cmdHeader.length + bitmapBytes.length);
    return singlePrint;
  }
}

// ── XPRINTER XP-420B DIRECT TSPL PRINT DRIVER (203 DPI) ─────────────────────
// Native TSPL vector commands (SIZE, GAP, DIRECTION, CLS, TEXT, BARCODE, PRINT)
// Standard hardware driver for Xprinter XP-420B & XP-365B label printers.

// ── BROWSER SYSTEM PRINT INJECTOR WITH ACCURATE MULTI-COLUMN STICKER SIZE ──
export function triggerBrowserLabelPrint(
  widthMm: number = 30,
  heightMm: number = 19,
  columns: number = 3,
  gapHorizontalMm: number = 2,
  gapVerticalMm: number = 2
): void {
  const STYLE_ID = 'pos-dynamic-label-page-style';
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  const leftMarginMm = columns > 1 ? 1.0 : 0;
  const totalRollWidthMm = (widthMm * columns) + (gapHorizontalMm * (columns - 1)) + (leftMarginMm * 2);

  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${totalRollWidthMm}mm ${heightMm + gapVerticalMm}mm !important;
        margin: 0mm !important;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${totalRollWidthMm}mm !important;
        height: auto !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      body > *:not(#print-label-root) {
        display: none !important;
      }
      #print-label-root {
        display: block !important;
        position: relative !important;
        left: 0 !important;
        top: 0 !important;
        width: ${totalRollWidthMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .printable-row {
        display: flex !important;
        flex-direction: row !important;
        justify-content: flex-start !important;
        align-items: flex-start !important;
        width: ${totalRollWidthMm}mm !important;
        height: ${heightMm + gapVerticalMm}mm !important;
        max-height: ${heightMm + gapVerticalMm}mm !important;
        padding-left: ${leftMarginMm}mm !important;
        padding-bottom: ${gapVerticalMm}mm !important;
        gap: ${gapHorizontalMm}mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        overflow: hidden !important;
      }
      .printable-label-item {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-height: ${heightMm}mm !important;
        box-sizing: border-box !important;
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
        text-align: center !important;
        padding: 0.3mm 0.6mm !important;
      }
    }
  `;

  window.print();
}


