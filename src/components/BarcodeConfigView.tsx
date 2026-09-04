import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ScanBarcode,
  Save,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlignCenter,
  Layers,
  Search,
  Check,
  Zap,
  Package,
  Bluetooth,
  Usb,
  Radio,
  Unplug,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Target,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  SlidersHorizontal,
  MousePointerClick,
  Pin,
  PinOff,
  FolderOpen,
  Tag,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHardware } from '@/contexts/HardwareContext';
import { useApp } from '@/contexts/AppContext';
import { api } from '@/lib/api';
import {
  LABEL_PRESETS,
  DEFAULT_LABEL_OPTIONS,
  DEFAULT_LABEL_ELEMENT_ORDER,
  getEffectiveElementOrder,
  formatRupiah,
  triggerBrowserLabelPrint,
  loadLabelOptions,
  saveLabelOptions,
  autoFixLabelDimensions,
  type LabelProductData,
  type LabelPrintOptions,
  type LabelElementKey,
  type LabelElementPosition,
} from '@/lib/labelPrinter';
import { LabelSticker } from '@/components/LabelSticker';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  autoConnectBluetoothPrinter,
  isBluetoothPrinterConnected,
  getConnectedBluetoothPrinterName,
  detectPrinterPaper,
} from '@/lib/bluetoothPrinter';
import {
  connectUsbPrinter,
  connectSerialPrinter,
} from '@/lib/hardwareManager';

export interface BarcodeConfigViewProps {
  initialProduct?: LabelProductData | null;
  initialProducts?: LabelProductData[] | null;
  onClose?: () => void;
  isDialog?: boolean;
}

export const ELEMENT_CONFIG: Record<
  LabelElementKey,
  { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }
> = {
  storeName: { label: 'Nama Toko', icon: ScanBarcode, desc: 'Header nama toko di baris atas' },
  productName: { label: 'Nama Produk', icon: Package, desc: 'Judul artikel produk' },
  barcode: { label: 'Garis Barcode', icon: ScanBarcode, desc: 'Garis batang barcode 1D / QR' },
  barcodeText: { label: 'Nomor Barcode', icon: ScanBarcode, desc: 'Angka digit di bawah barcode' },
  price: { label: 'Harga Jual', icon: Zap, desc: 'Nominal harga jual produk' },
  sku: { label: 'Kode SKU', icon: Layers, desc: 'Kode identifikasi SKU stok' },
  category: { label: 'Kategori', icon: FolderOpen, desc: 'Kategori induk produk' },
  subCategory: { label: 'Sub-Kategori', icon: Layers, desc: 'Sub-kategori produk' },
  brand: { label: 'Merek', icon: Tag, desc: 'Merek / Brand produk' },
};

export interface TextElementFontConfig {
  key: LabelElementKey;
  label: string;
  field: keyof LabelPrintOptions;
  fallback: number;
  min: number;
  max: number;
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge: string;
  quickSizes: number[];
}

export const TEXT_ELEMENT_FONT_CONFIGS: TextElementFontConfig[] = [
  {
    key: 'productName',
    label: 'Nama Produk',
    field: 'productNameFontSize',
    fallback: 9,
    min: 5,
    max: 24,
    step: 0.5,
    icon: Package,
    description: 'Judul artikel / nama barang stiker',
    badge: 'Produk',
    quickSizes: [7, 8, 9, 10, 11, 13],
  },
  {
    key: 'price',
    label: 'Harga Jual',
    field: 'priceFontSize',
    fallback: 12,
    min: 6,
    max: 28,
    step: 0.5,
    icon: Zap,
    description: 'Nominal harga jual produk (Rp xxx)',
    badge: 'Harga',
    quickSizes: [9, 10, 12, 14, 16, 18],
  },
  {
    key: 'barcodeText',
    label: 'Nomor Barcode (Digit)',
    field: 'barcodeTextFontSize',
    fallback: 8,
    min: 5,
    max: 18,
    step: 0.5,
    icon: ScanBarcode,
    description: 'Angka barcode di bawah garis batang',
    badge: 'Digit',
    quickSizes: [6, 7, 8, 9, 10, 12],
  },
  {
    key: 'storeName',
    label: 'Nama Toko (Header)',
    field: 'storeNameFontSize',
    fallback: 8,
    min: 5,
    max: 18,
    step: 0.5,
    icon: ScanBarcode,
    description: 'Header teks identitas toko di baris atas',
    badge: 'Toko',
    quickSizes: [6, 7, 8, 9, 10, 12],
  },
  {
    key: 'sku',
    label: 'Kode SKU',
    field: 'skuFontSize',
    fallback: 7.5,
    min: 5,
    max: 16,
    step: 0.5,
    icon: Layers,
    description: 'Kode identifikasi varian / SKU produk',
    badge: 'SKU',
    quickSizes: [6, 7, 7.5, 8.5, 10, 12],
  },
  {
    key: 'category',
    label: 'Kategori Produk',
    field: 'categoryFontSize',
    fallback: 7.5,
    min: 5,
    max: 16,
    step: 0.5,
    icon: FolderOpen,
    description: 'Teks kategori induk produk',
    badge: 'Kategori',
    quickSizes: [6, 7, 7.5, 8.5, 10, 12],
  },
  {
    key: 'subCategory',
    label: 'Sub-Kategori',
    field: 'subCategoryFontSize',
    fallback: 7.5,
    min: 5,
    max: 16,
    step: 0.5,
    icon: Layers,
    description: 'Teks sub-kategori spesifik produk',
    badge: 'Sub',
    quickSizes: [6, 7, 7.5, 8.5, 10, 12],
  },
  {
    key: 'brand',
    label: 'Merek / Brand',
    field: 'brandFontSize',
    fallback: 7.5,
    min: 5,
    max: 16,
    step: 0.5,
    icon: Tag,
    description: 'Merek produsen atau brand produk',
    badge: 'Brand',
    quickSizes: [6, 7, 7.5, 8.5, 10, 12],
  },
];

export function BarcodeConfigView({
  initialProduct,
  initialProducts,
  onClose,
  isDialog = false,
}: BarcodeConfigViewProps) {
  const { state } = useApp();
  const hardware = useHardware();

  // 1. Label Printing Configuration State (Auto-Fixed with user-saved defaults preserved)
  const [options, setOptions] = useState<LabelPrintOptions>(() => {
    const savedLocal = loadLabelOptions();
    let savedBackend: Partial<LabelPrintOptions> | null = null;
    try {
      if (state.settings?.barcode_settings) {
        savedBackend = JSON.parse(state.settings.barcode_settings);
      }
    } catch (e) {}

    const saved = { ...savedBackend, ...savedLocal };
    const defaults = autoFixLabelDimensions(saved?.presetId || '33x15-3col');
    return {
      ...defaults,
      ...saved,
      showStoreName: saved?.showStoreName ?? false,
      showName: saved?.showName ?? true,
      productNameTwoLines: saved?.productNameTwoLines ?? true,
      showBarcode: saved?.showBarcode ?? true,
      showBarcodeText: saved?.showBarcodeText ?? true,
      showPrice: saved?.showPrice ?? true,
      showSku: saved?.showSku ?? false,
      customStoreName: saved?.customStoreName || '',
      textAlign: saved?.textAlign || 'center',
      elementPositions: saved?.elementPositions || {},
      elementOrder:
        Array.isArray(saved?.elementOrder) && saved.elementOrder.length > 0
          ? saved.elementOrder
          : DEFAULT_LABEL_ELEMENT_ORDER,
    };
  });

  // Save status & auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isSavingDb, setIsSavingDb] = useState<boolean>(false);
  const isInitialMount = useRef(true);

  // Custom dimensions state
  const [customWidth, setCustomWidth] = useState<number>(options.widthMm || 33);
  const [customHeight, setCustomHeight] = useState<number>(options.heightMm || 15);
  const [customCols, setCustomCols] = useState<number>(options.columns || 3);

  // 💾 Real-time Auto-Save to LocalStorage on any options change (debounced 400ms)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveLabelOptions(options);
      setSaveStatus('saved');
    }, 400);
    return () => clearTimeout(timer);
  }, [options]);

  // ☁️ Sync from backend if backend settings arrive after initial mount
  useEffect(() => {
    if (state.settings?.barcode_settings) {
      try {
        const backendOpts = JSON.parse(state.settings.barcode_settings);
        const localSavedRaw = localStorage.getItem('pos_label_options');
        if (!localSavedRaw && backendOpts && typeof backendOpts === 'object') {
          setOptions((prev) => {
            const next = { ...prev, ...backendOpts };
            saveLabelOptions(next);
            return next;
          });
          if (backendOpts.widthMm) setCustomWidth(backendOpts.widthMm);
          if (backendOpts.heightMm) setCustomHeight(backendOpts.heightMm);
          if (backendOpts.columns) setCustomCols(backendOpts.columns);
        }
      } catch (e) {
        console.warn('Gagal membaca barcode_settings dari database:', e);
      }
    }
  }, [state.settings?.barcode_settings]);

  // 🏪 Nama Toko Aktif dari Pengaturan Akun / Profil (misal: Toko Ryo)
  const defaultBusinessName = useMemo(() => {
    return (
      state.settings?.businessName ||
      state.settings?.business_name ||
      'Toko Ryo'
    );
  }, [state.settings?.businessName, state.settings?.business_name]);

  const activeStoreDisplayName = useMemo(() => {
    if (options.customStoreName && options.customStoreName.trim()) {
      return options.customStoreName.trim();
    }
    return defaultBusinessName;
  }, [options.customStoreName, defaultBusinessName]);

  // 🎯 Interactive Drag & Drop and Precision Position Control State
  const [selectedElement, setSelectedElement] = useState<LabelElementKey>('productName');
  const [zoomLevel, setZoomLevel] = useState<number>(1.5);
  const [stepSize, setStepSize] = useState<number>(0.5);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const stickerContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    elemKey: LabelElementKey;
  } | null>(null);

  // 📂 Collapsible Accordion Sections State (Kertas, Elemen Terpadu, Antrean)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    paper: true,
    elements: true,
    queue: true,
  });

  // 📌 Floating Dock (PiP) Mode
  const [isFloatingDock, setIsFloatingDock] = useState<boolean>(false);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const expandAllSections = useCallback(() => {
    setOpenSections({ paper: true, elements: true, queue: true });
  }, []);

  const collapseAllSections = useCallback(() => {
    setOpenSections({ paper: false, elements: false, queue: false });
  }, []);

  // Summary Metrics for Accordion Badges
  const activeElementsCount = useMemo(() => {
    let count = 0;
    if (options.showStoreName) count++;
    if (options.showName) count++;
    if (options.showBarcode) count++;
    if (options.showBarcodeText) count++;
    if (options.showPrice) count++;
    if (options.showSku) count++;
    if (options.showCategory) count++;
    if (options.showSubCategory) count++;
    if (options.showBrand) count++;
    return count;
  }, [
    options.showStoreName,
    options.showName,
    options.showBarcode,
    options.showBarcodeText,
    options.showPrice,
    options.showSku,
    options.showCategory,
    options.showSubCategory,
    options.showBrand,
  ]);

  const customPositionsCount = useMemo(() => {
    if (!options.elementPositions) return 0;
    return Object.values(options.elementPositions).filter(
      (p) => p && (p.x !== 0 || p.y !== 0)
    ).length;
  }, [options.elementPositions]);

  // 2. Real Hardware Connection State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [printerInfo, setPrinterInfo] = useState<{
    name: string;
    type: 'bluetooth' | 'usb' | 'serial' | 'system';
    connected: boolean;
  }>(() => {
    const isBt = isBluetoothPrinterConnected();
    const btName = getConnectedBluetoothPrinterName();
    if (isBt && btName) {
      return { name: btName, type: 'bluetooth', connected: true };
    }
    if (hardware.printerStatus === 'connected' && hardware.activePrinterType !== 'none') {
      return {
        name: hardware.config.printerName || 'Printer Thermal Terhubung',
        type: (hardware.activePrinterType as any) || 'usb',
        connected: true,
      };
    }
    return {
      name: 'Belum Terhubung ke Printer Hardware',
      type: 'system',
      connected: false,
    };
  });

  // 3. Apply Auto-Sync & Fix Dimensions (preserving custom positions and order)
  const applyAutoSyncAndFix = useCallback((w: number, h: number, cols: number, presetId?: string) => {
    const fixed = autoFixLabelDimensions(presetId || { widthMm: w, heightMm: h, columns: cols });
    setOptions((prev) => {
      const next: LabelPrintOptions = {
        ...fixed,
        ...prev,
        widthMm: w,
        heightMm: h,
        columns: cols,
        elementPositions: prev.elementPositions || {},
        elementOrder: prev.elementOrder || DEFAULT_LABEL_ELEMENT_ORDER,
      };
      saveLabelOptions(next);
      return next;
    });
    setCustomWidth(w);
    setCustomHeight(h);
    setCustomCols(cols);
  }, []);

  // ⚡ LISTEN FOR REAL-TIME PRINTER CONNECTION & PAPER DETECTION EVENTS
  useEffect(() => {
    const handleBtStatus = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setPrinterInfo({
          name: detail.name || 'Printer Bluetooth',
          type: 'bluetooth',
          connected: !!detail.connected,
        });
        if (detail.connected) {
          detectPrinterPaper();
        }
      }
    };

    const handlePaperDetected = (e: any) => {
      const paper = e.detail;
      if (paper) {
        applyAutoSyncAndFix(paper.widthMm, paper.heightMm, paper.columns, paper.presetId);
        toast.success(`⚡ Printer & Kertas Terdeteksi Otomatis: ${paper.widthMm}×${paper.heightMm}mm (${paper.columns} Kolom)`);
      }
    };

    window.addEventListener('pos_bluetooth_status', handleBtStatus);
    window.addEventListener('pos_label_paper_detected', handlePaperDetected);

    // Auto-reconnect silently if previously paired
    autoConnectBluetoothPrinter().then((reconnected) => {
      if (reconnected) {
        const name = getConnectedBluetoothPrinterName();
        setPrinterInfo({
          name: name || 'Printer Bluetooth',
          type: 'bluetooth',
          connected: true,
        });
        detectPrinterPaper();
      }
    });

    return () => {
      window.removeEventListener('pos_bluetooth_status', handleBtStatus);
      window.removeEventListener('pos_label_paper_detected', handlePaperDetected);
    };
  }, [applyAutoSyncAndFix]);

  // 🔍 1. REAL BLUETOOTH AUTODETECT & CONNECT
  const handleConnectBluetooth = async () => {
    setIsScanning(true);
    try {
      const res = await connectBluetoothPrinter();
      if (res.success) {
        setPrinterInfo({
          name: res.name || 'Printer Bluetooth',
          type: 'bluetooth',
          connected: true,
        });
        toast.success(res.message);
        // Paper auto-detection will trigger via pos_label_paper_detected event
      } else {
        toast.info(res.message);
      }
    } catch (err: any) {
      toast.error('Gagal memindai Bluetooth: ' + (err?.message || 'Pastikan Bluetooth aktif'));
    } finally {
      setIsScanning(false);
    }
  };

  // 🔌 2. REAL USB AUTODETECT & CONNECT
  const handleConnectUsb = async () => {
    setIsScanning(true);
    try {
      const res = await connectUsbPrinter();
      if (res.success) {
        setPrinterInfo({
          name: res.name || 'USB Printer',
          type: 'usb',
          connected: true,
        });
        toast.success(res.message);
      } else {
        toast.info(res.message);
      }
    } catch (err: any) {
      toast.error('Gagal memindai USB: ' + (err?.message || 'Periksa kabel USB'));
    } finally {
      setIsScanning(false);
    }
  };

  // 💻 3. REAL SERIAL / COM PORT AUTODETECT & CONNECT
  const handleConnectSerial = async () => {
    setIsScanning(true);
    try {
      const res = await connectSerialPrinter();
      if (res.success) {
        setPrinterInfo({
          name: res.name || 'Serial Printer (COM Port)',
          type: 'serial',
          connected: true,
        });
        toast.success(res.message);
      } else {
        toast.info(res.message);
      }
    } catch (err: any) {
      toast.error('Gagal membuka Port Serial: ' + (err?.message || 'Periksa Port COM'));
    } finally {
      setIsScanning(false);
    }
  };

  // ❌ DISCONNECT PRINTER
  const handleDisconnect = () => {
    disconnectBluetoothPrinter();
    setPrinterInfo({
      name: 'Belum Terhubung ke Printer Hardware',
      type: 'system',
      connected: false,
    });
    toast.info('Printer diputuskan. Mode cetak sistem / PDF aktif.');
  };

  // 4. Products Queue for Printing (NO DUMMY DATA)
  const [productsToPrint, setProductsToPrint] = useState<LabelProductData[]>(() => {
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts.map((p) => ({
        ...p,
        storeName: p.storeName || activeStoreDisplayName,
        copies: p.copies && p.copies > 0 ? p.copies : 1,
      }));
    }
    if (initialProduct) {
      return [{ ...initialProduct, storeName: initialProduct.storeName || activeStoreDisplayName, copies: 1 }];
    }
    if (state.products && state.products.length > 0) {
      return state.products.slice(0, 3).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        barcode: p.barcode || p.sku || '000000',
        sku: p.sku || '',
        category: p.category,
        storeName: activeStoreDisplayName,
        copies: 1,
      }));
    }
    return [];
  });

  // Populate queue once products load if empty
  useEffect(() => {
    if (productsToPrint.length === 0 && state.products && state.products.length > 0 && !initialProduct && !initialProducts) {
      setProductsToPrint(
        state.products.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          barcode: p.barcode || p.sku || '000000',
          sku: p.sku || '',
          category: p.category,
          storeName: activeStoreDisplayName,
          copies: 1,
        }))
      );
    }
  }, [state.products, initialProduct, initialProducts, activeStoreDisplayName]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // 🧮 LIVE MATHEMATICAL CALCULATION OF SYNCHRONIZED LAYOUT
  const syncMetrics = useMemo(() => {
    const w = Math.max(10, Math.min(150, options.widthMm || 33));
    const h = Math.max(8, Math.min(150, options.heightMm || 15));
    const cols = Math.max(1, Math.min(4, options.columns || 3));
    const gapH = cols > 1 ? 2 : 0;
    const totalRollW = cols * w + (cols - 1) * gapH;

    const padH = Math.max(0.6, Math.min(1.5, Number((w * 0.03).toFixed(1))));
    const padV = Math.max(0.5, Math.min(1.2, Number((h * 0.04).toFixed(1))));
    const printableW = Number((w - padH * 2).toFixed(1));
    const barcodeAreaPct = Math.round((printableW / w) * 100);
    const barcodeH = Math.max(1, Math.round(h * 0.44));

    return {
      w,
      h,
      cols,
      gapH,
      totalRollW,
      padH,
      padV,
      printableW,
      barcodeAreaPct,
      barcodeH,
    };
  }, [options.widthMm, options.heightMm, options.columns]);

  // 🔤 TYPOGRAPHY & FONT SIZE HANDLERS
  const updateElementFontSize = useCallback(
    (field: keyof LabelPrintOptions, val: number, min = 5, max = 28) => {
      const clamped = Math.max(min, Math.min(max, Number(val.toFixed(1))));
      setOptions((prev) => ({
        ...prev,
        [field]: clamped,
      }));
    },
    []
  );

  const handleScaleAllFontSizes = useCallback((delta: number) => {
    setOptions((prev) => {
      const next = { ...prev };
      TEXT_ELEMENT_FONT_CONFIGS.forEach((item) => {
        const current = (next[item.field] as number) ?? item.fallback;
        const clamped = Math.max(item.min, Math.min(item.max, Number((current + delta).toFixed(1))));
        (next as any)[item.field] = clamped;
      });
      return next;
    });
    toast.success(`Semua ukuran font diubah ${delta > 0 ? `+${delta}` : delta} px`);
  }, []);

  const handleResetAllFontSizes = useCallback(() => {
    const auto = autoFixLabelDimensions(options.presetId || '33x15-3col');
    setOptions((prev) => ({
      ...prev,
      storeNameFontSize: auto.storeNameFontSize ?? 8,
      productNameFontSize: auto.productNameFontSize ?? 9,
      barcodeTextFontSize: auto.barcodeTextFontSize ?? 8,
      priceFontSize: auto.priceFontSize ?? 12,
      skuFontSize: auto.skuFontSize ?? 7.5,
      categoryFontSize: auto.categoryFontSize ?? 7.5,
      subCategoryFontSize: auto.subCategoryFontSize ?? 7.5,
      brandFontSize: auto.brandFontSize ?? 7.5,
    }));
    toast.success('Ukuran font semua elemen berhasil direset ke ukuran proporsional optimal.');
  }, [options.presetId]);

  // ── 🎯 ELEMENT DRAG & DROP & PRECISION CONTROLLER HANDLERS ──
  const isElementEnabled = useCallback(
    (key: LabelElementKey): boolean => {
      switch (key) {
        case 'storeName':
          return !!options.showStoreName;
        case 'productName':
          return !!options.showName;
        case 'barcode':
          return !!options.showBarcode;
        case 'barcodeText':
          return !!options.showBarcodeText;
        case 'price':
          return !!options.showPrice;
        case 'sku':
          return !!options.showSku;
        case 'category':
          return !!options.showCategory;
        case 'subCategory':
          return !!options.showSubCategory;
        case 'brand':
          return !!options.showBrand;
        default:
          return true;
      }
    },
    [options]
  );

  const toggleElementEnabled = useCallback((key: LabelElementKey) => {
    setOptions((prev) => {
      let next = { ...prev };
      switch (key) {
        case 'storeName':
          next.showStoreName = !prev.showStoreName;
          break;
        case 'productName':
          next.showName = !prev.showName;
          break;
        case 'barcode':
          next.showBarcode = !prev.showBarcode;
          break;
        case 'barcodeText':
          next.showBarcodeText = !prev.showBarcodeText;
          break;
        case 'price':
          next.showPrice = !prev.showPrice;
          break;
        case 'sku':
          next.showSku = !prev.showSku;
          break;
        case 'category':
          next.showCategory = !prev.showCategory;
          break;
        case 'subCategory':
          next.showSubCategory = !prev.showSubCategory;
          break;
        case 'brand':
          next.showBrand = !prev.showBrand;
          break;
      }
      next.elementOrder = getEffectiveElementOrder(next.elementOrder);
      saveLabelOptions(next);
      return next;
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, key: LabelElementKey) => {
    e.stopPropagation();
    setSelectedElement(key);

    const currentPos = options.elementPositions?.[key] || { x: 0, y: 0 };
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y,
      elemKey: key,
    };
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }, [options.elementPositions]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();

    const { startX, startY, initialX, initialY, elemKey } = dragRef.current;
    const stickerEl = stickerContainerRef.current;
    if (!stickerEl) return;

    const stickerWidthPx = stickerEl.offsetWidth || 150;
    const labelWidthMm = options.widthMm || 33;
    const mmPerPx = labelWidthMm / stickerWidthPx;

    const deltaXPx = e.clientX - startX;
    const deltaYPx = e.clientY - startY;

    const deltaXMm = deltaXPx * mmPerPx;
    const deltaYMm = deltaYPx * mmPerPx;

    const rawX = initialX + deltaXMm;
    const rawY = initialY + deltaYMm;
    const snappedX = Number((Math.round(rawX * 5) / 5).toFixed(1));
    const snappedY = Number((Math.round(rawY * 5) / 5).toFixed(1));

    const clampedX = Math.max(-25, Math.min(25, snappedX));
    const clampedY = Math.max(-25, Math.min(25, snappedY));

    setOptions((prev) => ({
      ...prev,
      elementPositions: {
        ...(prev.elementPositions || {}),
        [elemKey]: { x: clampedX, y: clampedY },
      },
    }));
  }, [options.widthMm]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      dragRef.current = null;
      setIsDragging(false);
      setOptions((prev) => {
        saveLabelOptions(prev);
        return prev;
      });
    }
  }, []);

  const handleNudge = useCallback((key: LabelElementKey, dx: number, dy: number) => {
    setOptions((prev) => {
      const cur = prev.elementPositions?.[key] || { x: 0, y: 0 };
      const nextX = Number(Math.max(-25, Math.min(25, cur.x + dx)).toFixed(1));
      const nextY = Number(Math.max(-25, Math.min(25, cur.y + dy)).toFixed(1));
      const next = {
        ...prev,
        elementPositions: {
          ...(prev.elementPositions || {}),
          [key]: { x: nextX, y: nextY },
        },
      };
      saveLabelOptions(next);
      return next;
    });
  }, []);

  const handleSetPos = useCallback((key: LabelElementKey, axis: 'x' | 'y', val: number) => {
    setOptions((prev) => {
      const cur = prev.elementPositions?.[key] || { x: 0, y: 0 };
      const next = {
        ...prev,
        elementPositions: {
          ...(prev.elementPositions || {}),
          [key]: {
            ...cur,
            [axis]: Number(val.toFixed(1)),
          },
        },
      };
      saveLabelOptions(next);
      return next;
    });
  }, []);

  const handleCenterElement = useCallback((key: LabelElementKey) => {
    handleSetPos(key, 'x', 0);
    toast.success(`Posisi horisontal ${ELEMENT_CONFIG[key]?.label || key} diratakan ke tengah (X: 0)`);
  }, [handleSetPos]);

  const handleResetElement = useCallback((key: LabelElementKey) => {
    setOptions((prev) => {
      const next = {
        ...prev,
        elementPositions: {
          ...(prev.elementPositions || {}),
          [key]: { x: 0, y: 0 },
        },
      };
      saveLabelOptions(next);
      return next;
    });
    toast.success(`Posisi ${ELEMENT_CONFIG[key]?.label || key} dikembalikan ke (0, 0)`);
  }, []);

  const handleResetAllPositions = useCallback(() => {
    setOptions((prev) => {
      const next = {
        ...prev,
        elementPositions: {},
        elementOrder: DEFAULT_LABEL_ELEMENT_ORDER,
      };
      saveLabelOptions(next);
      return next;
    });
    toast.success('Semua posisi elemen label berhasil dikembalikan ke standar awal!');
  }, []);

  const handleMoveElementOrder = useCallback((key: LabelElementKey, direction: 'up' | 'down') => {
    setOptions((prev) => {
      const order = [...(prev.elementOrder || DEFAULT_LABEL_ELEMENT_ORDER)];
      const idx = order.indexOf(key);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= order.length) return prev;
      [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];
      const next = {
        ...prev,
        elementOrder: order,
      };
      saveLabelOptions(next);
      return next;
    });
  }, []);

  const handleResetElementOrder = useCallback(() => {
    setOptions((prev) => {
      const next = {
        ...prev,
        elementOrder: [...DEFAULT_LABEL_ELEMENT_ORDER],
      };
      saveLabelOptions(next);
      return next;
    });
    toast.success('Urutan elemen berhasil dikembalikan ke standar awal!');
  }, []);
  const handleSelectPreset = (presetId: string) => {
    const found = LABEL_PRESETS.find((p) => p.id === presetId);
    if (found) {
      applyAutoSyncAndFix(found.widthMm, found.heightMm, found.columns, found.id);
      toast.success(`Format roll: ${found.name} (Lebar kolom & area print berhasil di-FIX otomatis)`);
    }
  };

  // 💾 Save as Default (LocalStorage + Cloud Backend Sync)
  const handleSaveDefaults = async () => {
    setIsSavingDb(true);
    setSaveStatus('saving');
    try {
      // 1. Simpan ke LocalStorage langsung (instant)
      saveLabelOptions(options);

      // 2. Simpan ke Database Server (Cloud Sync) jika terhubung ke akun
      if (state.settings) {
        await api.put('/settings', {
          ...state.settings,
          barcode_settings: JSON.stringify(options),
        });
      }

      setSaveStatus('saved');
      toast.success('Pengaturan barcode berhasil disimpan!', {
        description: 'Ukuran kertas stiker, layout, posisi, dan format cetak akan otomatis aktif setiap kali aplikasi dibuka.',
      });
    } catch (err: any) {
      console.warn('Gagal menyimpan ke server, tersimpan di lokal:', err);
      saveLabelOptions(options);
      setSaveStatus('saved');
      toast.success('Pengaturan barcode tersimpan di browser lokal!');
    } finally {
      setIsSavingDb(false);
    }
  };

  // 🔄 Reset ke Standar Pabrik (33x15 mm, 3 Kolom)
  const handleResetToDefaults = () => {
    if (window.confirm('Kembalikan pengaturan stiker label barcode ke standar pabrik (33x15 mm, 3 kolom)?')) {
      const standard = autoFixLabelDimensions('33x15-3col');
      setOptions(standard);
      setCustomWidth(standard.widthMm);
      setCustomHeight(standard.heightMm);
      setCustomCols(standard.columns);
      saveLabelOptions(standard);
      if (state.settings) {
        api.put('/settings', {
          ...state.settings,
          barcode_settings: JSON.stringify(standard),
        }).catch(() => {});
      }
      toast.info('Pengaturan stiker dikembalikan ke standar pabrik (33x15 mm)');
    }
  };

  // ⚡ Handle Direct Bluetooth / Hardware Thermal Print
  const handlePrintBluetooth = async () => {
    const list = productsToPrint.length > 0 ? productsToPrint : (activePreviewProduct ? [activePreviewProduct] : []);
    if (list.length === 0) {
      toast.error('Pilih minimal satu produk untuk dicetak!');
      return;
    }

    setIsPrinting(true);
    const toastId = toast.loading('Menyiapkan cetak Bluetooth...');

    try {
      const isBt = isBluetoothPrinterConnected();
      if (!isBt) {
        toast.loading('Menyambungkan ke printer Bluetooth...', { id: toastId });
        const res = await connectBluetoothPrinter();
        if (res && res.success) {
          setPrinterInfo({
            name: res.name || 'Printer Bluetooth',
            type: 'bluetooth',
            connected: true,
          });
          toast.success(res.message, { id: toastId });
        } else {
          toast.error((res && res.message) || 'Printer Bluetooth belum terhubung. Silakan pilih printer Bluetooth Anda.', { id: toastId });
          setIsPrinting(false);
          return;
        }
      }

      let successCount = 0;
      const printOptions: LabelPrintOptions = {
        ...options,
        customStoreName: activeStoreDisplayName,
      };
      const preparedList = list.map((p) => ({
        ...p,
        storeName: p.storeName || activeStoreDisplayName,
      }));

      for (let i = 0; i < preparedList.length; i++) {
        const prod = preparedList[i];
        toast.loading(`🖨️ Mencetak [${i + 1}/${preparedList.length}] "${prod.name}" (${prod.copies || 1} stiker)...`, { id: toastId });
        const ok = await hardware.printLabel(prod, printOptions);
        if (ok) successCount++;
        if (preparedList.length > 1 && i < preparedList.length - 1) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }

      if (successCount > 0) {
        toast.success(`✨ Berhasil mencetak ${successCount} produk ke printer Bluetooth!`, { id: toastId });
      } else {
        toast.warning('Printer Bluetooth belum merespons. Beralih ke dialog cetak browser (PDF)...', { id: toastId });
        triggerBrowserLabelPrint(preparedList, printOptions);
      }
    } catch (err: any) {
      console.error('Print Bluetooth error:', err);
      toast.error('Gagal cetak Bluetooth: ' + (err?.message || 'Beralih ke browser'), { id: toastId });
      const printOptions: LabelPrintOptions = {
        ...options,
        customStoreName: activeStoreDisplayName,
      };
      const preparedList = list.map((p) => ({
        ...p,
        storeName: p.storeName || activeStoreDisplayName,
      }));
      triggerBrowserLabelPrint(preparedList, printOptions);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintHardware = handlePrintBluetooth;

  const handlePrintBrowser = () => {
    const list = productsToPrint.length > 0 ? productsToPrint : (activePreviewProduct ? [activePreviewProduct] : []);
    if (list.length === 0) {
      toast.error('Pilih minimal satu produk untuk dicetak!');
      return;
    }
    const printOptions: LabelPrintOptions = {
      ...options,
      customStoreName: activeStoreDisplayName,
    };
    const preparedList = list.map((p) => ({
      ...p,
      storeName: p.storeName || activeStoreDisplayName,
    }));
    triggerBrowserLabelPrint(preparedList, printOptions);
  };

  // Add product from search
  const handleAddProduct = (prod: any) => {
    setProductsToPrint((prev) => {
      const existing = prev.find((p) => p.id === prod.id);
      if (existing) {
        return prev.map((p) => (p.id === prod.id ? { ...p, copies: (p.copies || 1) + 1 } : p));
      }
      return [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          barcode: prod.barcode || prod.sku || '000000',
          sku: prod.sku || '',
          category: prod.category || '',
          subCategory: (prod as any).subCategory || (prod as any).sub_category || '',
          brand: prod.brand || '',
          storeName: activeStoreDisplayName,
          copies: 1,
        },
      ];
    });
    toast.success(`Produk "${prod.name}" ditambahkan ke antrean.`);
  };

  const handleUpdateCopies = (id: string, delta: number) => {
    setProductsToPrint((prev) =>
      prev
        .map((p) => {
          if (p.id === id) {
            const nextCopies = Math.max(1, (p.copies || 1) + delta);
            return { ...p, copies: nextCopies };
          }
          return p;
        })
        .filter((p) => (p.copies || 1) > 0)
    );
  };

  const handleRemoveProduct = (id: string) => {
    setProductsToPrint((prev) => prev.filter((p) => p.id !== id));
  };

  const totalStickersToPrint = useMemo(() => {
    return productsToPrint.reduce((acc, p) => acc + (p.copies || 1), 0);
  }, [productsToPrint]);

  const totalRowsEstimate = useMemo(() => {
    const cols = options.columns || 3;
    return Math.ceil(totalStickersToPrint / cols);
  }, [totalStickersToPrint, options.columns]);

  // Real filtered search results from store inventory
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return (state.products || [])
      .filter((p) => (p.name || '').toLowerCase().includes(q) || (p.barcode || '').includes(q) || (p.sku || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, state.products]);

  const sampleFallbackProduct: LabelProductData = useMemo(
    () => ({
      id: 'sample-preview',
      name: 'LABEL STIKER PRODUK',
      price: 15000,
      barcode: '899123456789',
      sku: 'SKU-001',
      category: 'Herbal Alami',
      subCategory: 'Kapsul Herbal',
      brand: 'Ryo Store',
      storeName: activeStoreDisplayName,
      copies: 1,
    }),
    [activeStoreDisplayName]
  );

  // Real preview product (takes first item from real queue, or first from store products, or sample)
  const activePreviewProduct: LabelProductData = useMemo(() => {
    if (productsToPrint.length > 0) {
      return {
        ...productsToPrint[0],
        storeName: productsToPrint[0].storeName || activeStoreDisplayName,
      };
    }
    if (state.products && state.products.length > 0) {
      const p = state.products[0];
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        barcode: p.barcode || p.sku || '000000',
        sku: p.sku || '',
        category: p.category || 'Herbal Alami',
        subCategory: (p as any).subCategory || (p as any).sub_category || 'Kapsul Herbal',
        brand: p.brand || 'Ryo Store',
        storeName: activeStoreDisplayName,
        copies: 1,
      };
    }
    return sampleFallbackProduct;
  }, [productsToPrint, state.products, activeStoreDisplayName, sampleFallbackProduct]);

  // Flatten products queue based on `copies` for print output
  const flattenedStickers = useMemo(() => {
    const list: LabelProductData[] = [];
    const source = productsToPrint.length > 0 ? productsToPrint : (activePreviewProduct ? [activePreviewProduct] : []);
    source.forEach((p) => {
      const count = p.copies && p.copies > 0 ? p.copies : 1;
      for (let i = 0; i < count; i++) {
        list.push(p);
      }
    });
    return list;
  }, [productsToPrint, activePreviewProduct]);

  // Group flattened stickers into rows matching options.columns (e.g. 1, 2, or 3 columns per row)
  const stickerRows = useMemo(() => {
    const cols = options.columns || 3;
    const rows: LabelProductData[][] = [];
    for (let i = 0; i < flattenedStickers.length; i += cols) {
      rows.push(flattenedStickers.slice(i, i + cols));
    }
    return rows;
  }, [flattenedStickers, options.columns]);

  return (
    <div className="space-y-6">
      {/* 🚀 1. STATUS PRINTER & DETEKSI HARDWARE (TEMA BAWAAN APP) */}
      <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-xs border border-border space-y-4 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5 text-xs font-semibold gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Detect &amp; Auto-Fix Hardware</span>
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold gap-1">
                <Check className="w-3 h-3" />
                <span>{saveStatus === 'saving' ? 'Menyimpan...' : 'Tersimpan Otomatis'}</span>
              </Badge>
              {printerInfo.connected ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{printerInfo.type.toUpperCase()} Terhubung</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Printer Belum Terhubung</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>{printerInfo.name}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {printerInfo.connected
                    ? 'Printer terdeteksi aktif. Dimensi stiker, kolom, dan area print terkunci (FIX) otomatis.'
                    : 'Sambungkan printer Bluetooth atau USB untuk cetak stiker thermal langsung.'}
                </p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: SCAN REAL BLUETOOTH / USB / SERIAL */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {printerInfo.connected ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnect}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 font-semibold h-9 text-xs px-3 rounded-xl gap-1.5"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>Putuskan</span>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleConnectBluetooth}
                  disabled={isScanning}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs px-4 rounded-xl shadow-xs gap-2 transition-all active:scale-95"
                >
                  {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                  <span>Pindai Bluetooth</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnectUsb}
                  disabled={isScanning}
                  className="h-9 text-xs px-3 rounded-xl border-border hover:bg-muted text-foreground font-medium gap-1.5"
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>USB</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnectSerial}
                  disabled={isScanning}
                  className="h-9 text-xs px-3 rounded-xl border-border hover:bg-muted text-foreground font-medium gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Port COM</span>
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => applyAutoSyncAndFix(customWidth, customHeight, customCols, options.presetId)}
              className="h-9 text-xs px-3 rounded-xl border-border hover:bg-muted text-foreground font-medium gap-1.5"
              title="Kunci ulang dimensi dan skala print agar simetris"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fix Ulang</span>
            </Button>

            <Button
              type="button"
              onClick={handleSaveDefaults}
              disabled={isSavingDb}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-9 text-xs px-3.5 rounded-xl shadow-xs gap-1.5 transition-all active:scale-95"
              title="Simpan pengaturan ini permanen agar tidak perlu setting ulang saat membuka aplikasi"
            >
              {isSavingDb ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Simpan Pengaturan</span>
            </Button>
          </div>
        </div>

        {/* METRIK DIMENSI TERKUNCI (FIX) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t text-xs">
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/80 flex flex-col justify-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Lebar Kolom (Fix):</span>
            <span className="text-sm font-mono font-bold text-foreground mt-0.5">
              {syncMetrics.w} mm <span className="text-[11px] font-normal text-muted-foreground">× {syncMetrics.h} mm</span>
            </span>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/80 flex flex-col justify-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Lebar Roll (Fix):</span>
            <span className="text-sm font-mono font-bold text-primary mt-0.5">
              {syncMetrics.totalRollW} mm <span className="text-[11px] font-normal text-muted-foreground">({syncMetrics.cols} Kolom)</span>
            </span>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/80 flex flex-col justify-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Area Cetak Aman (Fix):</span>
            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {syncMetrics.printableW} mm <span className="text-[11px] font-normal text-muted-foreground">({syncMetrics.barcodeAreaPct}%)</span>
            </span>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3 border border-border/80 flex flex-col justify-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Tinggi Barcode (Fix):</span>
            <span className="text-sm font-mono font-bold text-foreground mt-0.5">
              {syncMetrics.barcodeH} mm <span className="text-[11px] font-normal text-muted-foreground">(44% stiker)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 🧩 2. GRID UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: FORMAT ROLL & ELEMEN (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Accordion Controls Bar */}
          <div className="flex items-center justify-between px-1 py-0.5 text-xs text-muted-foreground flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ChevronsUpDown className="w-3.5 h-3.5 text-primary" />
                <span>Panel Pengaturan Stiker</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Save Aktif
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveDefaults}
                disabled={isSavingDb}
                className="h-7 text-xs font-semibold gap-1.5 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
              >
                <Save className="w-3 h-3" />
                <span>Simpan Default</span>
              </Button>
              <span>•</span>
              <button
                type="button"
                onClick={expandAllSections}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Buka Semua
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAllSections}
                className="text-[11px] text-muted-foreground hover:text-foreground font-semibold"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* A. PILIHAN ROLL KERTAS STIKER */}
          <div className="bg-card text-card-foreground rounded-2xl border shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('paper')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    A. Ukuran Kertas &amp; Dimensi Roll Stiker
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Pilih format stiker roll Xprinter atau tentukan dimensi kustom.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 border-primary/20 text-primary">
                  {syncMetrics.w} × {syncMetrics.h} mm ({syncMetrics.cols} Kolom)
                </Badge>
                {openSections.paper ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {openSections.paper && (
              <div className="p-4 sm:p-5 pt-0 space-y-3.5 border-t">
                {/* Tombol Pilihan Roll Standar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3.5">
              {[
                {
                  id: '50x30',
                  w: 50,
                  h: 30,
                  cols: 1,
                  name: '1 Kolom (50 × 30 mm)',
                  desc: 'Standar Niimbot B1, B21, Gudang & Ekspedisi (Roll 55mm)',
                  badge: 'Niimbot / B1',
                },
                {
                  id: '33x15-3col',
                  w: 33,
                  h: 15,
                  cols: 3,
                  name: '3 Kolom (33 × 15 mm)',
                  desc: 'Standar Xprinter XP-420B, Toko Baju, Distro & Ritel (Roll 103mm)',
                  badge: 'Paling Populer',
                },
                {
                  id: '30x19-3col',
                  w: 30,
                  h: 19,
                  cols: 3,
                  name: '3 Kolom (30 × 19 mm)',
                  desc: 'Standar Supermarket & Minimarket (Roll 98mm)',
                  badge: 'Retail',
                },
                {
                  id: '40x30-2col',
                  w: 40,
                  h: 30,
                  cols: 2,
                  name: '2 Kolom (40 × 30 mm)',
                  desc: 'Standar Dus Produk, Label Box & Fashion (Roll 85mm)',
                  badge: '2 Kolom',
                },
                {
                  id: '40x30',
                  w: 40,
                  h: 30,
                  cols: 1,
                  name: '1 Kolom (40 × 30 mm)',
                  desc: 'Standar Label Harga Rak & Display Toko',
                  badge: 'Label Rak',
                },
              ].map((preset) => {
                const isSelected = options.widthMm === preset.w && options.heightMm === preset.h && options.columns === preset.cols;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/20 shadow-xs'
                        : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {preset.name}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                          {preset.badge}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10.5px] text-muted-foreground mt-1.5 line-clamp-2">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Input Dimensi Manual Jika Kertas Berbeda */}
            <div className="pt-2 border-t mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Atau Masukkan Dimensi Kustom:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyAutoSyncAndFix(customWidth, customHeight, customCols)}
                  className="h-6 text-xs text-primary font-bold px-2 hover:bg-primary/10"
                >
                  ⚡ Hitung &amp; Kunci Otomatis
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[10.5px] text-muted-foreground font-semibold">Lebar 1 Stiker (mm):</Label>
                  <Input
                    type="number"
                    min={10}
                    max={150}
                    value={customWidth}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 33;
                      setCustomWidth(v);
                      applyAutoSyncAndFix(v, customHeight, customCols);
                    }}
                    className="h-8 text-xs font-mono font-bold bg-background text-center rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] text-muted-foreground font-semibold">Tinggi Stiker (mm):</Label>
                  <Input
                    type="number"
                    min={8}
                    max={150}
                    value={customHeight}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 15;
                      setCustomHeight(v);
                      applyAutoSyncAndFix(customWidth, v, customCols);
                    }}
                    className="h-8 text-xs font-mono font-bold bg-background text-center rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] text-muted-foreground font-semibold">Jumlah Kolom:</Label>
                  <div className="flex items-center h-8 border rounded-xl overflow-hidden bg-background">
                    {[1, 2, 3].map((col) => (
                      <button
                        key={`col-choice-${col}`}
                        type="button"
                        onClick={() => {
                          setCustomCols(col);
                          applyAutoSyncAndFix(customWidth, customHeight, col);
                        }}
                        className={`flex-1 h-full text-xs font-bold transition-all ${
                          customCols === col
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* B. PENGATURAN LENGKAP ELEMEN BARCODE (VISIBILITAS, FONT, POSISI & URUTAN) */}
          <div className="bg-card text-card-foreground rounded-2xl border shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('elements')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    B. Pengaturan Lengkap Elemen Barcode
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Atur visibilitas, urutan vertikal, ukuran huruf, dan posisi presisi semua elemen stiker dalam satu tabel terpadu.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  {activeElementsCount} / 9 Elemen Aktif
                </Badge>
                {openSections.elements ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {openSections.elements && (
              <div className="p-4 sm:p-5 pt-0 space-y-4 border-t">
                {/* TOOLBAR AKSI CEPAT TABEL ELEMEN */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3.5 pb-1 border-b">
                  <div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
                      <span>Daftar &amp; Tata Letak Semua Elemen Stiker</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Semua kontrol (tampil, urutan, ukuran huruf, dan posisi geser) dapat diatur langsung di baris setiap elemen.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleScaleAllFontSizes(-0.5)}
                      className="h-7 text-xs px-2.5 gap-1 rounded-lg hover:bg-muted"
                      title="Kecilkan semua ukuran font sebesar 0.5px"
                    >
                      <Minus className="w-3 h-3" />
                      <span>Font -0.5px</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleScaleAllFontSizes(0.5)}
                      className="h-7 text-xs px-2.5 gap-1 rounded-lg hover:bg-muted"
                      title="Perbesar semua ukuran font sebesar 0.5px"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Font +0.5px</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetAllPositions}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                      title="Kembalikan semua pergeseran posisi ke default (0,0)"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Posisi</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetElementOrder}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                      title="Kembalikan urutan susunan elemen ke standar"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Reset Urutan</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetAllFontSizes}
                      className="h-7 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 rounded-lg"
                      title="Kembalikan semua ukuran font ke rasio proporsional bawaan stiker"
                    >
                      <Type className="w-3 h-3" />
                      <span>Reset Font</span>
                    </Button>
                  </div>
                </div>

                {/* TABEL TERPADU DAFTAR ELEMEN */}
                <div className="space-y-2.5">
                  {getEffectiveElementOrder(options.elementOrder).map((elemKey, orderIdx, arr) => {
                    const conf = ELEMENT_CONFIG[elemKey];
                    if (!conf) return null;
                    const isEnabled = isElementEnabled(elemKey);
                    const isSelected = selectedElement === elemKey;
                    const pos = options.elementPositions?.[elemKey] || { x: 0, y: 0 };
                    const hasOffset = pos.x !== 0 || pos.y !== 0;
                    const fontCfg = TEXT_ELEMENT_FONT_CONFIGS.find((c) => c.key === elemKey);
                    const currentFontSize = fontCfg ? ((options[fontCfg.field] as number) ?? fontCfg.fallback) : 0;
                    const IconComp = conf.icon;

                    return (
                      <div
                        key={`unified-row-${elemKey}`}
                        onClick={() => setSelectedElement(elemKey)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none space-y-2.5 ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30'
                            : isEnabled
                            ? 'bg-background border-border hover:border-primary/40 hover:bg-muted/20'
                            : 'bg-muted/30 border-dashed border-border/70 opacity-75'
                        }`}
                      >
                        {/* Baris Utama: Urutan, Identitas, Status Tampil, Ringkasan Nilai */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          {/* Sisi Kiri: Tombol Urutan & Identitas Elemen */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Tombol Reorder Up / Down */}
                            <div className="flex items-center gap-0.5 shrink-0 bg-muted/40 rounded-lg p-0.5 border" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={orderIdx === 0}
                                onClick={() => handleMoveElementOrder(elemKey, 'up')}
                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-30"
                                title="Pindahkan ke atas"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono text-[10.5px] font-bold w-4 text-center text-foreground">
                                {orderIdx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={orderIdx === arr.length - 1}
                                onClick={() => handleMoveElementOrder(elemKey, 'down')}
                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-30"
                                title="Pindahkan ke bawah"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Icon & Nama Elemen */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-primary text-primary-foreground' : isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              <IconComp className="w-4 h-4" />
                            </div>

                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary font-black' : 'text-foreground'}`}>
                                  {conf.label}
                                </span>
                                {hasOffset && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300">
                                    Geser ({pos.x > 0 ? `+${pos.x}` : pos.x}, {pos.y > 0 ? `+${pos.y}` : pos.y})
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{conf.desc}</p>
                            </div>
                          </div>

                          {/* Sisi Kanan: Switch Status Tampil & Posisi */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                            {/* Tombol Toggle Aktif / Nonaktif */}
                            <button
                              type="button"
                              onClick={() => toggleElementEnabled(elemKey)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase transition-all border ${
                                isEnabled
                                  ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 shadow-2xs'
                                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                              }`}
                              title={isEnabled ? `Sembunyikan ${conf.label}` : `Tampilkan ${conf.label}`}
                            >
                              {isEnabled ? '✓ TAMPIL' : 'OFF'}
                            </button>

                            {/* Tombol Pilih & Fokus Geser */}
                            <Button
                              type="button"
                              size="sm"
                              variant={isSelected ? 'default' : 'outline'}
                              onClick={() => setSelectedElement(elemKey)}
                              className="h-7 text-xs px-2.5 rounded-lg gap-1"
                            >
                              <Move className="w-3 h-3" />
                              <span>{isSelected ? 'Terpilih' : 'Geser Posisi'}</span>
                            </Button>
                          </div>
                        </div>

                        {/* Baris Sekunder: Pengaturan Ukuran Huruf / Dimensi Barcode (Hanya jika Elemen Aktif) */}
                        {isEnabled && (
                          <div
                            className="pt-2 border-t border-dashed flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* JIKA ELEMEN TEKS: KONTROL UKURAN FONT */}
                            {fontCfg && (
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Type className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-[11px] font-semibold text-muted-foreground">Ukuran Font:</span>
                                  <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                                    {currentFontSize.toFixed(1)} px
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={currentFontSize <= fontCfg.min}
                                    onClick={() => updateElementFontSize(fontCfg.field, currentFontSize - fontCfg.step, fontCfg.min, fontCfg.max)}
                                    className="h-6 w-6 rounded"
                                    title="-0.5px"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <input
                                    type="range"
                                    min={fontCfg.min}
                                    max={fontCfg.max}
                                    step={fontCfg.step}
                                    value={currentFontSize}
                                    onChange={(e) => updateElementFontSize(fontCfg.field, parseFloat(e.target.value), fontCfg.min, fontCfg.max)}
                                    className="w-full accent-primary h-1 bg-muted rounded appearance-none cursor-pointer"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={currentFontSize >= fontCfg.max}
                                    onClick={() => updateElementFontSize(fontCfg.field, currentFontSize + fontCfg.step, fontCfg.min, fontCfg.max)}
                                    className="h-6 w-6 rounded"
                                    title="+0.5px"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>

                                {/* Preset Cepat Ukuran */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  {fontCfg.quickSizes.map((qs) => (
                                    <button
                                      key={`qs-${elemKey}-${qs}`}
                                      type="button"
                                      onClick={() => updateElementFontSize(fontCfg.field, qs, fontCfg.min, fontCfg.max)}
                                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono font-medium transition-all ${
                                        Math.abs(currentFontSize - qs) < 0.1
                                          ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                                          : 'bg-muted text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      {qs}px
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* JIKA ELEMEN BARCODE: KONTROL TINGGI & LEBAR BATANG */}
                            {elemKey === 'barcode' && (
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <ScanBarcode className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-[11px] font-semibold text-muted-foreground">Tinggi Barcode:</span>
                                  <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                                    {options.barcodeHeightMm || 10} mm
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={(options.barcodeHeightMm || 10) <= 3}
                                    onClick={() => setOptions((prev) => ({ ...prev, barcodeHeightMm: Math.max(3, (prev.barcodeHeightMm || 10) - 1) }))}
                                    className="h-6 w-6 rounded"
                                    title="-1mm"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <input
                                    type="range"
                                    min={3}
                                    max={35}
                                    step={0.5}
                                    value={options.barcodeHeightMm || 10}
                                    onChange={(e) => setOptions((prev) => ({ ...prev, barcodeHeightMm: Number(e.target.value) }))}
                                    className="w-full accent-primary h-1 bg-muted rounded appearance-none cursor-pointer"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    disabled={(options.barcodeHeightMm || 10) >= 35}
                                    onClick={() => setOptions((prev) => ({ ...prev, barcodeHeightMm: Math.min(35, (prev.barcodeHeightMm || 10) + 1) }))}
                                    className="h-6 w-6 rounded"
                                    title="+1mm"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] text-muted-foreground">Lebar Area:</span>
                                  <span className="font-mono text-xs font-bold">{options.barcodeAreaWidthPercent || 90}%</span>
                                  <input
                                    type="range"
                                    min={50}
                                    max={100}
                                    step={1}
                                    value={options.barcodeAreaWidthPercent || 90}
                                    onChange={(e) => setOptions((prev) => ({ ...prev, barcodeAreaWidthPercent: Number(e.target.value) }))}
                                    className="w-16 accent-primary h-1 bg-muted rounded cursor-pointer"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Opsi Ekstra Spesifik per Elemen */}
                            {elemKey === 'productName' && (
                              <div className="flex items-center gap-1 shrink-0 pt-1 sm:pt-0">
                                <span className="text-[10.5px] text-muted-foreground mr-1">Baris:</span>
                                <button
                                  type="button"
                                  onClick={() => setOptions((prev) => ({ ...prev, productNameTwoLines: false }))}
                                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                                    !options.productNameTwoLines ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  1 Baris
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOptions((prev) => ({ ...prev, productNameTwoLines: true }))}
                                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                                    options.productNameTwoLines ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  2 Baris (Wrap)
                                </button>
                              </div>
                            )}

                            {elemKey === 'storeName' && (
                              <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                                <span className="text-[10.5px] text-muted-foreground">Teks:</span>
                                <input
                                  type="text"
                                  value={options.customStoreName !== undefined ? options.customStoreName : defaultBusinessName}
                                  onChange={(e) => setOptions((prev) => ({ ...prev, customStoreName: e.target.value }))}
                                  placeholder={defaultBusinessName}
                                  className="h-6 text-[11px] font-semibold px-2 rounded border bg-background w-32"
                                />
                              </div>
                            )}

                            {elemKey === 'barcode' && (
                              <div className="flex items-center gap-1 shrink-0 pt-1 sm:pt-0">
                                <span className="text-[10.5px] text-muted-foreground">Format:</span>
                                <select
                                  value={options.barcodeType || 'CODE128'}
                                  onChange={(e) => setOptions((prev) => ({ ...prev, barcodeType: e.target.value as any }))}
                                  className="h-6 text-[10.5px] rounded border bg-background px-1 font-mono font-bold"
                                >
                                  <option value="CODE128">CODE128</option>
                                  <option value="EAN13">EAN-13</option>
                                  <option value="EAN8">EAN-8</option>
                                  <option value="UPC">UPC-A</option>
                                  <option value="CODE39">CODE39</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* D-PAD & KONTROL GESER PRESISI ELEMEN TERPILIH */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3 pt-4 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Move className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Kontrol Posisi Geser Presisi: <span className="text-primary font-black">{ELEMENT_CONFIG[selectedElement]?.label}</span>
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Offset: ({((options.elementPositions?.[selectedElement]?.x || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.x}` : (options.elementPositions?.[selectedElement]?.x || 0))} mm, {((options.elementPositions?.[selectedElement]?.y || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.y}` : (options.elementPositions?.[selectedElement]?.y || 0))} mm)
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10.5px] text-muted-foreground mr-1">Langkah:</span>
                      {[0.2, 0.5, 1.0].map((step) => (
                        <button
                          key={`step-${step}`}
                          type="button"
                          onClick={() => setStepSize(step)}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition-all ${
                            stepSize === step
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : 'bg-background hover:bg-muted text-muted-foreground border'
                          }`}
                        >
                          ±{step}mm
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Visual Directional Pad */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0 py-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleNudge(selectedElement, 0, -stepSize)}
                        className="h-8 w-24 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-primary dark:hover:bg-purple-950"
                        title={`Geser ke Atas ${stepSize} mm`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>Atas</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleNudge(selectedElement, -stepSize, 0)}
                          className="h-8 w-20 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-primary dark:hover:bg-purple-950"
                          title={`Geser ke Kiri ${stepSize} mm`}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Kiri</span>
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResetElement(selectedElement)}
                          className="h-8 w-14 text-[10px] font-mono font-bold rounded-xl bg-muted hover:bg-muted/80 shadow-2xs"
                          title="Kembalikan ke titik awal (0,0)"
                        >
                          0, 0
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleNudge(selectedElement, stepSize, 0)}
                          className="h-8 w-20 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-primary dark:hover:bg-purple-950"
                          title={`Geser ke Kanan ${stepSize} mm`}
                        >
                          <span>Kanan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleNudge(selectedElement, 0, stepSize)}
                        className="h-8 w-24 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-primary dark:hover:bg-purple-950"
                        title={`Geser ke Bawah ${stepSize} mm`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Bawah</span>
                      </Button>
                    </div>

                    {/* Numeric Sliders for X & Y */}
                    <div className="w-full space-y-2.5 flex-1 max-w-md">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-semibold">Geser Horizontal (Sumbu X):</span>
                          <span className="font-mono font-bold text-foreground">
                            {((options.elementPositions?.[selectedElement]?.x || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.x}` : (options.elementPositions?.[selectedElement]?.x || 0))} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleNudge(selectedElement, -0.5, 0)}
                            title="-0.5 mm (Kiri)"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Slider
                            value={[options.elementPositions?.[selectedElement]?.x || 0]}
                            min={-20}
                            max={20}
                            step={0.2}
                            onValueChange={([val]) => handleSetPos(selectedElement, 'x', val)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleNudge(selectedElement, 0.5, 0)}
                            title="+0.5 mm (Kanan)"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-semibold">Geser Vertikal (Sumbu Y):</span>
                          <span className="font-mono font-bold text-foreground">
                            {((options.elementPositions?.[selectedElement]?.y || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.y}` : (options.elementPositions?.[selectedElement]?.y || 0))} mm
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleNudge(selectedElement, 0, -0.5)}
                            title="-0.5 mm (Atas)"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Slider
                            value={[options.elementPositions?.[selectedElement]?.y || 0]}
                            min={-20}
                            max={20}
                            step={0.2}
                            onValueChange={([val]) => handleSetPos(selectedElement, 'y', val)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleNudge(selectedElement, 0, 0.5)}
                            title="+0.5 mm (Bawah)"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetElement(selectedElement)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Posisi {ELEMENT_CONFIG[selectedElement]?.label}</span>
                        </Button>

                        <span className="text-[10.5px] text-muted-foreground">
                          Gunakan drag langsung pada preview stiker untuk geser bebas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KARTU PENGATURAN TIPOGRAFI & GAYA GLOBAL */}
                <div className="p-3.5 sm:p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground">Pengaturan Gaya Tipografi &amp; Batang Barcode Global</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Jenis Huruf (Font Family) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Keluarga Font:</Label>
                      <select
                        value={options.fontFamily || 'sans-serif'}
                        onChange={(e) => setOptions((prev) => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full h-8 text-xs rounded-lg border bg-background px-2.5 font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      >
                        <option value="sans-serif">Sans-Serif (Standar)</option>
                        <option value="monospace">Monospace (Rapi/Kasir)</option>
                        <option value="Arial">Arial (Universal)</option>
                        <option value="Segoe UI">Segoe UI (Modern)</option>
                        <option value="Roboto">Roboto (Google Font)</option>
                        <option value="serif">Serif (Klasik)</option>
                      </select>
                    </div>

                    {/* Ketebalan Huruf (Font Weight) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Ketebalan Huruf:</Label>
                      <select
                        value={options.fontWeight || '800'}
                        onChange={(e) => setOptions((prev) => ({ ...prev, fontWeight: e.target.value as any }))}
                        className="w-full h-8 text-xs rounded-lg border bg-background px-2.5 font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      >
                        <option value="normal">Normal (400)</option>
                        <option value="500">Sedang (500)</option>
                        <option value="600">Semi Tebal (600)</option>
                        <option value="bold">Tebal (700)</option>
                        <option value="800">Ekstra Tebal (800)</option>
                        <option value="900">Maksimal (900)</option>
                      </select>
                    </div>

                    {/* Perataan Teks (Alignment) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Perataan Teks:</Label>
                      <div className="grid grid-cols-3 gap-1 bg-background p-0.5 rounded-lg border h-8 items-center">
                        <button
                          type="button"
                          onClick={() => setOptions((prev) => ({ ...prev, textAlign: 'left' }))}
                          className={`h-full text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                            options.textAlign === 'left'
                              ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span>Kiri</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOptions((prev) => ({ ...prev, textAlign: 'center' }))}
                          className={`h-full text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                            (!options.textAlign || options.textAlign === 'center')
                              ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span>Tengah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOptions((prev) => ({ ...prev, textAlign: 'right' }))}
                          className={`h-full text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all ${
                            options.textAlign === 'right'
                              ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5 rotate-180" />
                          <span>Kanan</span>
                        </button>
                      </div>
                    </div>

                    {/* Ketebalan Batang Barcode (Ratio) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Ketebalan Garis Batang:</Label>
                      <select
                        value={options.barcodeWidthRatio || 1.0}
                        onChange={(e) => setOptions((prev) => ({ ...prev, barcodeWidthRatio: Number(e.target.value) }))}
                        className="w-full h-8 text-xs rounded-lg border bg-background px-2.5 font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      >
                        <option value="0.8">0.8x (Tipis / Rapat)</option>
                        <option value="1.0">1.0x (Normal Standar)</option>
                        <option value="1.2">1.2x (Sedang / Jelas)</option>
                        <option value="1.5">1.5x (Tebal)</option>
                        <option value="2.0">2.0x (Ekstra Tebal)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* C. DAFTAR PRODUK YANG DICETAK */}
          <div className="bg-card text-card-foreground rounded-2xl border shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('queue')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    C. Daftar Produk yang Dicetak
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Pilih produk dari inventori dan tentukan jumlah lembar stiker.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                  {totalStickersToPrint} Stiker ({productsToPrint.length} Produk)
                </Badge>
                {openSections.queue ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {openSections.queue && (
              <div className="p-4 sm:p-5 pt-0 space-y-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight">Antrean Cetak Produk Toko</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Total: <strong className="text-foreground">{totalStickersToPrint} stiker</strong> (~{totalRowsEstimate} baris roll)
                    </p>
                  </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama / barcode produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-xl bg-background"
                />

                {/* Dropdown Pencarian Produk Nyata */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-lg z-20 overflow-hidden divide-y">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleAddProduct(p);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-2.5 text-xs hover:bg-muted flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate text-foreground">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.barcode || p.sku || '-'}</p>
                        </div>
                        <span className="text-primary font-bold shrink-0">{formatRupiah(p.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* List Antrean Produk */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {productsToPrint.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl bg-muted/10 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold">Antrean cetak kosong.</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Gunakan kolom pencarian di atas untuk menambahkan produk dari inventori toko.
                  </p>
                </div>
              ) : (
                productsToPrint.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-2.5 rounded-xl border bg-background flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{prod.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-primary font-bold">
                          {formatRupiah(prod.price || 0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          • {prod.barcode || prod.sku || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center h-7 border rounded-lg overflow-hidden bg-muted/20">
                        <button
                          type="button"
                          onClick={() => handleUpdateCopies(prod.id, -1)}
                          className="w-6 h-full flex items-center justify-center hover:bg-muted text-muted-foreground border-r"
                          title="Kurangi jumlah stiker"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold">{prod.copies || 1}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCopies(prod.id, 1)}
                          className="w-6 h-full flex items-center justify-center hover:bg-muted text-muted-foreground border-l"
                          title="Tambah jumlah stiker"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(prod.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ACTION BUTTONS BAR */}
            <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDefaults}
                  className="h-9 text-xs font-semibold rounded-xl gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </Button>

                {/* Bluetooth Status / Quick Connect Pill */}
                {printerInfo.connected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{printerInfo.name}</span>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleConnectBluetooth}
                    disabled={isScanning}
                    className="h-9 text-xs font-semibold text-primary border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 gap-1.5 rounded-xl"
                  >
                    {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5 text-primary" />}
                    <span>Sambung Bluetooth</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintBrowser}
                  className="h-9 text-xs font-semibold rounded-xl gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF</span>
                </Button>

                <Button
                  type="button"
                  onClick={handlePrintBluetooth}
                  disabled={isPrinting || productsToPrint.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs px-5 rounded-xl shadow-md gap-2 active:scale-95 transition-all"
                  title="Cetak langsung ke printer Bluetooth"
                >
                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
                  <span>Cetak Bluetooth ({totalStickersToPrint})</span>
                </Button>
              </div>
            </div>
            </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: PRATINJAU & EDITOR LIVE INTERAKTIF (STICKY FLOATING) */}
        <div className="lg:col-span-5 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-4 pr-1 pb-4 scrollbar-thin">
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <ScanBarcode className="w-4 h-4 text-primary" />
                  <span>Editor &amp; Pratinjau Interaktif</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Klik &amp; geser elemen langsung pada stiker di bawah
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant={isFloatingDock ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const next = !isFloatingDock;
                    setIsFloatingDock(next);
                    if (next) {
                      toast.success('Mode Mengambang Aktif! Stiker preview kini melayang bebas di sudut layar.');
                    } else {
                      toast.info('Pratinjau dikembalikan ke posisi kolom samping.');
                    }
                  }}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 transition-all ${
                    isFloatingDock
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                  title={isFloatingDock ? 'Pasang kembali ke kolom samping' : 'Jadikan kotak mengambang bebas di sudut layar (Floating PiP)'}
                >
                  {isFloatingDock ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 text-primary" />}
                  <span>{isFloatingDock ? 'Lepas Mengambang' : 'Mode Mengambang'}</span>
                </Button>

                <div className="flex items-center gap-1.5 pl-1 border-l">
                  <span className="text-[10.5px] text-muted-foreground">Zoom:</span>
                  {[
                    { label: '1x', val: 1.0 },
                    { label: '1.5x', val: 1.5 },
                    { label: '2x', val: 2.0 },
                  ].map((z) => (
                    <button
                      key={`zoom-${z.val}`}
                      type="button"
                      onClick={() => setZoomLevel(z.val)}
                      className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md transition-all ${
                        zoomLevel === z.val
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground border'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 ml-1 bg-primary/10 border-primary/20 text-primary">
                    {syncMetrics.w} × {syncMetrics.h} mm
                  </Badge>
                </div>
              </div>
            </div>

            {/* 🎯 KANVAS EDITOR INTERAKTIF LANGSUNG */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-primary font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>Kanvas Editor (Bisa Digeser):</span>
                </span>
                <span className="font-mono text-[10px] bg-primary/10 px-2 py-0.5 rounded border border-primary/20 text-primary">
                  Elemen Aktif: <strong>{ELEMENT_CONFIG[selectedElement]?.label}</strong>
                </span>
              </div>

              {activePreviewProduct ? (
                <div
                  className="bg-slate-100/90 dark:bg-slate-900/80 border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] overflow-hidden relative transition-all shadow-inner"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div
                    ref={stickerContainerRef}
                    className="relative transition-transform duration-100 origin-center"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      cursor: isDragging ? 'grabbing' : 'default',
                    }}
                  >
                    <LabelSticker
                      product={activePreviewProduct}
                      options={options}
                      storeDisplayName={activeStoreDisplayName}
                      isInteractive={true}
                      selectedElement={selectedElement}
                      onSelectElement={setSelectedElement}
                      onPointerDownElement={handlePointerDown}
                    />
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-[10.5px] text-muted-foreground flex items-center justify-center gap-1">
                      <Move className="w-3 h-3 text-primary" />
                      <span>Klik &amp; tahan elemen pada stiker untuk menggeser posisinya secara visual.</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold">Belum ada produk untuk dipratinjau.</p>
                </div>
              )}
            </div>

            {/* 📜 PRATINJAU ROLL KERTAS FISIK (SEMUA KOLOM) */}
            <div className="pt-3 border-t space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Simulasi Kertas Roll ({syncMetrics.cols} Kolom Sejajar)</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                  Lebar Roll: {syncMetrics.totalRollW} mm
                </Badge>
              </div>

              {activePreviewProduct && (
                <div className="p-3 bg-muted/30 border rounded-xl flex items-center justify-center overflow-x-auto">
                  <div
                    className="flex items-center justify-center bg-white/70 dark:bg-slate-950/70 p-2.5 rounded-lg border border-dashed shadow-2xs max-w-full"
                    style={{
                      gap: `${syncMetrics.gapH}mm`,
                    }}
                  >
                    {Array.from({ length: syncMetrics.cols }).map((_, colIndex) => (
                      <div key={`roll-sim-col-${colIndex}`} className="shrink-0 flex flex-col items-center">
                        <LabelSticker
                          product={activePreviewProduct}
                          options={options}
                          storeDisplayName={activeStoreDisplayName}
                          isInteractive={false}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground mt-1 opacity-70">
                          Kolom {colIndex + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-[10px] text-muted-foreground pt-1">
                ✅ Posisi yang Anda geser <strong>100% langsung diterapkan</strong> pada Cetak Browser (PDF) maupun Printer Thermal Hardware (Xprinter XP-420B, XP-365B, TSPL).
              </div>
            </div>

            {/* ⚡ AKSI CEPAT CETAK DI BAWAH PREVIEW MENGAMBANG */}
            <div className="pt-3 border-t flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-0.5">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span>Aksi Cetak Cepat:</span>
                </span>
                {printerInfo.connected ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{printerInfo.name}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectBluetooth}
                    disabled={isScanning}
                    className="text-[10.5px] text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <Bluetooth className="w-3 h-3" />
                    <span>Sambung Bluetooth</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintBrowser}
                  className="h-9 text-xs font-semibold rounded-xl gap-1.5"
                  title="Cetak lewat dialog cetak browser / simpan ke PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF</span>
                </Button>

                <Button
                  type="button"
                  onClick={handlePrintBluetooth}
                  disabled={isPrinting || productsToPrint.length === 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs rounded-xl shadow-md gap-1.5 active:scale-95 transition-all"
                  title="Kirim perintah cetak langsung ke printer Bluetooth"
                >
                  {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                  <span>Cetak Bluetooth</span>
                </Button>
              </div>

              <Button
                type="button"
                onClick={handleSaveDefaults}
                disabled={isSavingDb}
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 w-full rounded-xl shadow-xs transition-all active:scale-95"
              >
                {isSavingDb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Pengaturan Default</span>
              </Button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-[11px] text-muted-foreground hover:text-red-500 underline text-center w-full transition-colors pt-1 block"
              >
                Kembalikan ke Standar Pabrik (33x15 mm)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📌 FLOATING DOCK (PIP WINDOW) KETIKA MODE MENGAMBANG AKTIF */}
      {isFloatingDock && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] sm:w-[410px] max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-2 border-primary shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ScanBarcode className="w-3.5 h-3.5 text-primary" />
                <span>Pratinjau Mengambang (Floating PiP)</span>
              </h4>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFloatingDock(false)}
              className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1 rounded-md"
              title="Kembalikan ke kolom samping"
            >
              <PinOff className="w-3 h-3" />
              <span>Kembalikan</span>
            </Button>
          </div>

          {/* Interactive Canvas in Floating Window */}
          {activePreviewProduct && (
            <div
              className="bg-slate-100/90 dark:bg-slate-900/80 border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center relative shadow-inner"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="relative transition-transform duration-100 origin-center"
                style={{
                  transform: `scale(${zoomLevel})`,
                  cursor: isDragging ? 'grabbing' : 'default',
                }}
              >
                <LabelSticker
                  product={activePreviewProduct}
                  options={options}
                  storeDisplayName={activeStoreDisplayName}
                  isInteractive={true}
                  selectedElement={selectedElement}
                  onSelectElement={setSelectedElement}
                  onPointerDownElement={handlePointerDown}
                />
              </div>

              <div className="mt-3 text-center">
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Move className="w-3 h-3 text-primary" />
                  <span>Bisa geser langsung elemen pada stiker</span>
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions in Floating Window */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintBrowser}
              className="h-8 text-xs font-semibold rounded-xl gap-1"
            >
              <Printer className="w-3 h-3" />
              <span>Cetak PDF</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrintBluetooth}
              disabled={isPrinting || productsToPrint.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-xs rounded-xl gap-1 shadow-sm"
              title="Cetak langsung ke printer Bluetooth"
            >
              {isPrinting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bluetooth className="w-3 h-3" />}
              <span>Cetak Bluetooth ({totalStickersToPrint})</span>
            </Button>
          </div>
        </div>
      )}

      {/* 🖨️ DEDICATED PRINT CONTAINER (PORTALED DIRECTLY TO DOCUMENT.BODY) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="print-label-root" style={{ display: 'none' }}>
            {stickerRows.map((row, rowIdx) => (
              <div key={`print-row-${rowIdx}`} className="printable-row">
                {row.map((item, itemIdx) => (
                  <div key={`print-item-${rowIdx}-${itemIdx}`} className="printable-label-item">
                    <LabelSticker
                      product={item}
                      options={options}
                      storeDisplayName={activeStoreDisplayName}
                      isInteractive={false}
                      isForPrint={true}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export default BarcodeConfigView;
