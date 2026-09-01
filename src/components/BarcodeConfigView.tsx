import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  XCircle,
  Loader2,
  ScanBarcode,
  Save,
  Plus,
  Minus,
  Trash2,
  Settings,
  Copy,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Sliders,
  Move,
  ArrowUpDown,
  Link2,
  Unlink2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHardware } from '@/contexts/HardwareContext';
import { useApp } from '@/contexts/AppContext';
import {
  LABEL_PRESETS,
  DEFAULT_LABEL_ELEMENT_ORDER,
  getProportionalLabelDimensions,
  type LabelProductData,
  type LabelPrintOptions,
  type LabelElementKey,
  type LabelElementPositions,
  formatRupiah,
  triggerBrowserLabelPrint,
  loadLabelOptions,
  saveLabelOptions,
} from '@/lib/labelPrinter';
import { LabelSticker } from '@/components/LabelSticker';
import {
  isBluetoothPrinterConnected,
  getConnectedBluetoothPrinterName,
  detectPrinterPaper,
} from '@/lib/bluetoothPrinter';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';

export interface BarcodeConfigViewProps {
  initialProduct?: LabelProductData | null;
  initialProducts?: LabelProductData[] | null;
  onClose?: () => void;
  isDialog?: boolean;
}

interface SelectedProductItem {
  product: LabelProductData;
  quantity: number;
}

// Fallback demo product if no products are selected
const DEMO_PREVIEW_PRODUCT: LabelProductData = {
  name: 'HEADPHONE BLUETOOTH NIRKABEL PRO',
  barcode: '628112345678',
  sku: 'HP-BT-001',
  price: 49990,
  brand: 'TOKO KAMI',
};

// Font family choices
const FONT_CHOICES = [
  { id: 'Arial', name: 'Arial' },
  { id: 'sans-serif', name: 'Sans-Serif (Modern Inter)' },
  { id: 'monospace', name: 'Monospace (Thermal)' },
  { id: 'Segoe UI', name: 'Segoe UI' },
  { id: 'serif', name: 'Serif (Times / Georgia)' },
  { id: 'Roboto', name: 'Roboto' },
];

// Font weight choices
const FONT_WEIGHT_CHOICES = [
  { id: 'normal', name: 'Normal' },
  { id: '500', name: 'Sedang' },
  { id: 'bold', name: 'Tebal' },
  { id: '900', name: 'Ekstra Tebal' },
];

export function BarcodeConfigView({
  initialProduct,
  initialProducts,
  onClose,
  isDialog = false,
}: BarcodeConfigViewProps) {
  const { state } = useApp();
  const { printLabel, connectPrinter } = useHardware();

  // Load saved options
  const [savedOpts, setSavedOpts] = useState<LabelPrintOptions>(() => loadLabelOptions());

  // Configuration Card States (Custom dimensions & Multi-column)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(savedOpts.presetId || '30x19-3col');
  const [customWidthMm, setCustomWidthMm] = useState<number>(savedOpts.widthMm || 30);
  const [customHeightMm, setCustomHeightMm] = useState<number>(savedOpts.heightMm || 19);
  const [customColumns, setCustomColumns] = useState<number>(savedOpts.columns || 3);
  const [customGapH, setCustomGapH] = useState<number>(savedOpts.gapHorizontalMm ?? 2);
  const [customGapV, setCustomGapV] = useState<number>(savedOpts.gapVerticalMm ?? 2);
  const [autoPrint, setAutoPrint] = useState<boolean>(true);

  const handlePresetSelect = (val: string) => {
    setSelectedPresetId(val);
    const found = LABEL_PRESETS.find((p) => p.id === val);
    if (found) {
      setCustomWidthMm(found.widthMm);
      setCustomHeightMm(found.heightMm);
      setCustomColumns(found.columns || 1);
      setCustomGapH(found.gapHorizontalMm ?? 2);
      setCustomGapV(found.gapVerticalMm ?? 2);
      setSavedOpts((prev) => ({
        ...prev,
        presetId: found.id,
        widthMm: found.widthMm,
        heightMm: found.heightMm,
        columns: found.columns || 1,
        gapHorizontalMm: found.gapHorizontalMm ?? 2,
        gapVerticalMm: found.gapVerticalMm ?? 2,
      }));
    }
  };

  // 🔗 Proportional Auto-Sync Mode State (Enabled by default)
  const [isAutoSync, setIsAutoSync] = useState<boolean>(true);

  // Universal Label Design States
  const [showStoreName, setShowStoreName] = useState<boolean>(savedOpts.showStoreName ?? false);
  const [showName, setShowName] = useState<boolean>(savedOpts.showName ?? true);
  const [showBarcode, setShowBarcode] = useState<boolean>(savedOpts.showBarcode ?? true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(savedOpts.showBarcodeText ?? true);
  const [showPrice, setShowPrice] = useState<boolean>(savedOpts.showPrice ?? true);
  const [showSku, setShowSku] = useState<boolean>(savedOpts.showSku ?? false);

  const [storeNameFontSize, setStoreNameFontSize] = useState<number>(savedOpts.storeNameFontSize || 8);
  const [barcodeHeightMm, setBarcodeHeightMm] = useState<number>(savedOpts.barcodeHeightMm || 18);
  const [productNameFontSize, setProductNameFontSize] = useState<number>(savedOpts.productNameFontSize || 9);
  const [barcodeTextFontSize, setBarcodeTextFontSize] = useState<number>(savedOpts.barcodeTextFontSize || 7.5);
  const [priceFontSize, setPriceFontSize] = useState<number>(savedOpts.priceFontSize || 12);
  const [fontWeight, setFontWeight] = useState<string>(savedOpts.fontWeight || 'bold');
  const [fontFamily, setFontFamily] = useState<string>(savedOpts.fontFamily || 'Arial');
  const [barcodeWidthRatio, setBarcodeWidthRatio] = useState<number>(savedOpts.barcodeWidthRatio || 1.0);

  // 🔄 Synchronized Dimension Change Handler
  const handleDimensionChange = (key: 'width' | 'height' | 'columns' | 'gapH' | 'gapV', val: number) => {
    let nextW = customWidthMm;
    let nextH = customHeightMm;
    let nextCols = customColumns;
    let nextGapH = customGapH;
    let nextGapV = customGapV;

    if (key === 'width') {
      nextW = Math.max(10, Math.min(200, val));
      setCustomWidthMm(nextW);
    } else if (key === 'height') {
      nextH = Math.max(10, Math.min(300, val));
      setCustomHeightMm(nextH);
    } else if (key === 'columns') {
      nextCols = Math.max(1, Math.min(10, val));
      setCustomColumns(nextCols);
    } else if (key === 'gapH') {
      nextGapH = Math.max(0, Math.min(30, val));
      setCustomGapH(nextGapH);
    } else if (key === 'gapV') {
      nextGapV = Math.max(0, Math.min(30, val));
      setCustomGapV(nextGapV);
    }

    // Auto-sync barcode height, font sizes & line ratios when paper dimensions change
    if (isAutoSync && (key === 'width' || key === 'height')) {
      const prop = getProportionalLabelDimensions({
        widthMm: nextW,
        heightMm: nextH,
      });
      setBarcodeHeightMm(prop.barcodeHeightMm);
      setProductNameFontSize(prop.productNameFontSize);
      setBarcodeTextFontSize(prop.barcodeTextFontSize);
      setPriceFontSize(prop.priceFontSize);
      setStoreNameFontSize(prop.storeNameFontSize);
      setBarcodeAreaWidthPercent(prop.barcodeAreaWidthPercent);
      setBarcodeWidthRatio(prop.barcodeWidthRatio);
    }

    const match = LABEL_PRESETS.find(
      (p) => p.widthMm === nextW && p.heightMm === nextH && p.columns === nextCols
    );
    setSelectedPresetId(match ? match.id : 'custom');
    setSavedOpts((prev) => ({
      ...prev,
      presetId: match ? match.id : 'custom',
      widthMm: nextW,
      heightMm: nextH,
      columns: nextCols,
      gapHorizontalMm: nextGapH,
      gapVerticalMm: nextGapV,
    }));
  };

  // 🔄 Synchronized Barcode Height Change Handler (Scales fonts, lines & expands stiker height if needed)
  const handleBarcodeHeightChange = (newHeight: number) => {
    const safeH = Math.max(8, Math.min(60, Number(newHeight) || 18));
    setBarcodeHeightMm(safeH);

    if (isAutoSync) {
      const prop = getProportionalLabelDimensions({
        widthMm: customWidthMm,
        heightMm: customHeightMm,
        barcodeHeightMm: safeH,
      });

      setProductNameFontSize(prop.productNameFontSize);
      setBarcodeTextFontSize(prop.barcodeTextFontSize);
      setPriceFontSize(prop.priceFontSize);
      setStoreNameFontSize(prop.storeNameFontSize);
      setBarcodeAreaWidthPercent(prop.barcodeAreaWidthPercent);
      setBarcodeWidthRatio(prop.barcodeWidthRatio);

      // If barcode height exceeds label capacity, expand label height automatically
      if (prop.suggestedHeightMm && prop.suggestedHeightMm > customHeightMm) {
        setCustomHeightMm(prop.suggestedHeightMm);
      }
    }
  };

  // 🏷️ Barcode Position, Order & Alignment States
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(savedOpts.textAlign || 'center');
  const [elementOrder, setElementOrder] = useState<LabelElementKey[]>(() => {
    if (savedOpts.elementOrder && savedOpts.elementOrder.length > 0) {
      return savedOpts.elementOrder;
    }
    return DEFAULT_LABEL_ELEMENT_ORDER;
  });
  const [elementPositions, setElementPositions] = useState<LabelElementPositions>(savedOpts.elementPositions || {});
  const [barcodeOffsetX, setBarcodeOffsetX] = useState<number>(savedOpts.elementPositions?.barcode?.x || 0);
  const [barcodeOffsetY, setBarcodeOffsetY] = useState<number>(savedOpts.elementPositions?.barcode?.y || 0);
  const [barcodeAreaWidthPercent, setBarcodeAreaWidthPercent] = useState<number>(savedOpts.barcodeAreaWidthPercent || 92);

  // Product Selection Table States
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductItem[]>(() => {
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts.map((p) => ({ product: p, quantity: 1 }));
    }
    if (initialProduct) {
      return [{ product: initialProduct, quantity: 1 }];
    }
    return [];
  });

  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Right Preview States (Multi-Column & Multi-Row Roll Simulation)
  const [zoom, setZoom] = useState<number>(100);
  const [previewRowsCount, setPreviewRowsCount] = useState<number | 'all'>(2);
  const [isPrintingDirect, setIsPrintingDirect] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<{ current: number; total: number } | null>(null);
  const [btName, setBtName] = useState<string | null>(getConnectedBluetoothPrinterName());
  const [detectedPaperBadge, setDetectedPaperBadge] = useState<string | null>(null);

  // Listen to Bluetooth printer status & Auto-detected paper dimensions
  useEffect(() => {
    setBtName(getConnectedBluetoothPrinterName());
    const handleStatus = (e: any) => {
      setBtName(e.detail?.name || getConnectedBluetoothPrinterName());
    };
    const handlePaperDetected = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      setCustomWidthMm(detail.widthMm);
      setCustomHeightMm(detail.heightMm);
      setCustomColumns(detail.columns);
      setCustomGapH(detail.gapHorizontalMm ?? 2);
      setCustomGapV(detail.gapVerticalMm ?? 2);
      setSelectedPresetId(detail.presetId || 'custom');
      setDetectedPaperBadge(`${detail.printerName}: ${detail.widthMm}×${detail.heightMm} mm (${detail.columns} Kolom)`);
      toast.success(
        `🟢 Kertas stiker terdeteksi dari ${detail.printerName}: ${detail.widthMm}×${detail.heightMm} mm (${detail.columns} Kolom)!`
      );
    };

    window.addEventListener('pos_bluetooth_status', handleStatus);
    window.addEventListener('pos_label_paper_detected', handlePaperDetected);
    return () => {
      window.removeEventListener('pos_bluetooth_status', handleStatus);
      window.removeEventListener('pos_label_paper_detected', handlePaperDetected);
    };
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected products if initialProducts / initialProduct prop changes
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setSelectedProducts(initialProducts.map((p) => ({ product: p, quantity: 1 })));
      setActivePreviewIndex(0);
    } else if (initialProduct) {
      setSelectedProducts([{ product: initialProduct, quantity: 1 }]);
      setActivePreviewIndex(0);
    }
  }, [initialProduct, initialProducts]);

  // Dynamic dimensions & multi-column calculations
  const widthMm = customWidthMm;
  const heightMm = customHeightMm;
  const columns = customColumns;
  const gapH = customGapH;
  const gapV = customGapV;
  const totalRollWidth = Math.round((customWidthMm * customColumns) + (customGapH * (customColumns - 1)) + 4);

  // Active product for preview
  const activeProduct = useMemo<LabelProductData>(() => {
    if (selectedProducts.length > 0 && selectedProducts[activePreviewIndex]) {
      return selectedProducts[activePreviewIndex].product;
    }
    return DEMO_PREVIEW_PRODUCT;
  }, [selectedProducts, activePreviewIndex]);

  // Consolidated label options object for renderer & printer
  const currentOptions = useMemo<LabelPrintOptions>(() => {
    return {
      ...savedOpts,
      presetId: selectedPresetId,
      widthMm,
      heightMm,
      columns,
      gapHorizontalMm: gapH,
      gapVerticalMm: gapV,
      showStoreName,
      showName,
      showBarcode,
      showBarcodeText,
      showPrice,
      showSku,
      storeNameFontSize,
      barcodeHeightMm,
      productNameFontSize,
      barcodeTextFontSize,
      priceFontSize,
      fontWeight: fontWeight as any,
      fontFamily,
      textAlign,
      elementOrder,
      elementPositions: {
        ...elementPositions,
        barcode: { x: barcodeOffsetX, y: barcodeOffsetY },
      },
      barcodeAreaWidthPercent,
      barcodeWidthRatio,
      copies: 1,
    };
  }, [
    savedOpts,
    selectedPresetId,
    widthMm,
    heightMm,
    columns,
    gapH,
    gapV,
    showStoreName,
    showName,
    showBarcode,
    showBarcodeText,
    showPrice,
    showSku,
    storeNameFontSize,
    barcodeHeightMm,
    productNameFontSize,
    barcodeTextFontSize,
    priceFontSize,
    fontWeight,
    fontFamily,
    textAlign,
    elementOrder,
    elementPositions,
    barcodeOffsetX,
    barcodeOffsetY,
    barcodeAreaWidthPercent,
    barcodeWidthRatio,
  ]);

  // Filtered search results from global products
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return (state.products || [])
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || sku.includes(q) || cat.includes(q);
      })
      .slice(0, 10);
  }, [searchQuery, state.products]);

  // Add a product to selected list
  const handleAddProduct = (p: any, qty: number = 1) => {
    const labelProd: LabelProductData = {
      name: p.name || 'Produk',
      barcode: p.barcode || p.sku || '8991234567890',
      sku: p.sku || '',
      price: Number(p.price) || 0,
      brand: p.brand || state.settings?.businessName || 'TOKO KAMI',
      stock: p.stock || 1,
    };

    setSelectedProducts((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.barcode === labelProd.barcode ||
          (item.product.sku && item.product.sku === labelProd.sku) ||
          item.product.name === labelProd.name
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qty,
        };
        setActivePreviewIndex(existingIdx);
        return next;
      } else {
        const next = [...prev, { product: labelProd, quantity: qty }];
        setActivePreviewIndex(next.length - 1);
        return next;
      }
    });

    setSearchQuery('');
    setIsSearchOpen(false);
    toast.success(`Ditambahkan: "${labelProd.name}"`);
  };

  // Hardware Scanner integration
  useHardwareScanner({
    onScan: (scannedCode) => {
      if (!scannedCode) return;
      const clean = scannedCode.trim().toLowerCase();
      const match = (state.products || []).find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === clean) ||
          (p.sku && p.sku.toLowerCase() === clean)
      );

      if (match) {
        handleAddProduct(match, 1);
        toast.success(`⚡ Barcode terdeteksi: ${match.name}`);
      } else {
        // Fallback create temporary label product from scanned code
        const fallbackProd: LabelProductData = {
          name: `PRODUK (${clean})`,
          barcode: clean,
          sku: clean,
          price: 0,
          brand: state.settings?.businessName || 'TOKO KAMI',
          stock: 1,
        };
        setSelectedProducts((prev) => [...prev, { product: fallbackProd, quantity: 1 }]);
        setActivePreviewIndex(selectedProducts.length);
        toast.info(`Barcode baru ditambahkan: ${clean}`);
      }
    },
  });

  // Handle Search Input KeyDown (e.g. Enter on manual input)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleAddProduct(searchResults[0]);
      } else if (searchQuery.trim()) {
        const fallback: LabelProductData = {
          name: searchQuery.trim().toUpperCase(),
          barcode: searchQuery.trim(),
          sku: searchQuery.trim(),
          price: 0,
          brand: state.settings?.businessName || 'TOKO KAMI',
          stock: 1,
        };
        setSelectedProducts((prev) => [...prev, { product: fallback, quantity: 1 }]);
        setActivePreviewIndex(selectedProducts.length);
        setSearchQuery('');
        setIsSearchOpen(false);
        toast.info(`Produk kustom ditambahkan: "${fallback.name}"`);
      }
    }
  };

  // Remove a product from selected list
  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (activePreviewIndex >= next.length) {
        setActivePreviewIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // Update quantity of a selected product
  const handleUpdateQuantity = (index: number, delta: number) => {
    setSelectedProducts((prev) => {
      const next = [...prev];
      const newQty = Math.max(1, next[index].quantity + delta);
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  // Set quantity directly
  const handleSetQuantity = (index: number, val: number) => {
    const qty = isNaN(val) || val < 1 ? 1 : val;
    setSelectedProducts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: qty };
      return next;
    });
  };

  // Reset all selected products
  const handleResetSelectedProducts = () => {
    setSelectedProducts([]);
    setActivePreviewIndex(0);
    toast.info('Daftar produk terpilih telah dikosongkan.');
  };

  // Save current configuration as default
  const handleSaveAsDefault = () => {
    const updated: LabelPrintOptions = {
      ...currentOptions,
      textAlign,
      elementOrder,
      elementPositions: {
        ...elementPositions,
        barcode: { x: barcodeOffsetX, y: barcodeOffsetY },
      },
      barcodeAreaWidthPercent,
      copies: 1,
    };
    saveLabelOptions(updated);
    setSavedOpts(updated);
    toast.success('✨ Konfigurasi barcode dan letak posisi berhasil disimpan sebagai default!');
  };

  // Total stickers count and total lines/rows needed on roll
  const totalStickersCount = useMemo(() => {
    if (selectedProducts.length === 0) return 1;
    return selectedProducts.reduce((acc, item) => acc + item.quantity, 0);
  }, [selectedProducts]);

  const totalLinesNeeded = Math.ceil(totalStickersCount / customColumns);

  // Batch quantity helpers
  const handleSetAllQuantity = (qty: number) => {
    if (selectedProducts.length === 0) return;
    setSelectedProducts((prev) => prev.map((item) => ({ ...item, quantity: Math.max(1, qty) })));
    toast.success(`Jumlah seluruh produk disetel ke ${qty} stiker/pcs`);
  };

  const handleSetAllStockQuantity = () => {
    if (selectedProducts.length === 0) return;
    setSelectedProducts((prev) =>
      prev.map((item) => ({ ...item, quantity: Math.max(1, item.product.stock || 1) }))
    );
    toast.success('Jumlah stiker disesuaikan dengan sisa stok masing-masing produk');
  };

  const handleRoundToFullLines = () => {
    if (selectedProducts.length === 0) return;
    const total = selectedProducts.reduce((acc, item) => acc + item.quantity, 0);
    const remainder = total % customColumns;
    if (remainder === 0) {
      toast.info(`Total stiker (${total} pcs) sudah genap ${total / customColumns} baris roll (${customColumns} kolom)`);
      return;
    }
    const needed = customColumns - remainder;
    setSelectedProducts((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, quantity: last.quantity + needed };
      return copy;
    });
    toast.success(`Ditambahkan +${needed} stiker pada produk terakhir agar genap ${Math.ceil((total + needed) / customColumns)} baris roll (${customColumns} kolom)`);
  };

  // Build flattened print list for browser printing
  const flattenedPrintItems = useMemo<LabelProductData[]>(() => {
    if (selectedProducts.length === 0) return [DEMO_PREVIEW_PRODUCT];
    const items: LabelProductData[] = [];
    selectedProducts.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        items.push(item.product);
      }
    });
    return items;
  }, [selectedProducts]);

  // Group printable items into rows for multi-column roll layout
  const printableRows = useMemo<LabelProductData[][]>(() => {
    const rows: LabelProductData[][] = [];
    for (let i = 0; i < flattenedPrintItems.length; i += columns) {
      rows.push(flattenedPrintItems.slice(i, i + columns));
    }
    return rows;
  }, [flattenedPrintItems, columns]);

  // Rows to display in the live preview canvas
  const previewRowsToDisplay = useMemo(() => {
    if (selectedProducts.length === 0) {
      const rowsToShow = typeof previewRowsCount === 'number' ? previewRowsCount : 2;
      return Array.from({ length: rowsToShow }).map(() =>
        Array.from({ length: customColumns }).map(() => DEMO_PREVIEW_PRODUCT)
      );
    }

    if (previewRowsCount === 'all') {
      return printableRows;
    }
    return printableRows.slice(0, previewRowsCount);
  }, [selectedProducts, printableRows, previewRowsCount, customColumns]);

  // 🖨️ Handle Browser System Print
  const handleBrowserPrint = () => {
    if (selectedProducts.length === 0) {
      toast.warning('Silakan tambahkan setidaknya 1 produk untuk dicetak.');
      return;
    }
    toast.info(`Membuka dialog cetak untuk ${totalStickersCount} stiker...`);
    triggerBrowserLabelPrint(widthMm, heightMm, columns, gapH, gapV);
  };

  // ⚡ Handle Direct Bluetooth / Hardware Thermal Print
  const handleDirectThermalPrint = async () => {
    if (selectedProducts.length === 0) {
      toast.warning('Silakan tambahkan setidaknya 1 produk untuk dicetak.');
      return;
    }

    setIsPrintingDirect(true);
    const toastId = toast.loading(
      `Menyiapkan cetak langsung (${selectedProducts.length} jenis produk, total ${totalStickersCount} stiker)...`
    );

    try {
      const isBtConnected = isBluetoothPrinterConnected();
      if (!isBtConnected) {
        toast.loading('Menyambungkan ke printer Bluetooth...', { id: toastId });
        const connected = await connectPrinter('bluetooth');
        if (!connected) {
          toast.dismiss(toastId);
          setIsPrintingDirect(false);
          return;
        }
      }

      let successCount = 0;
      for (let i = 0; i < selectedProducts.length; i++) {
        const item = selectedProducts[i];
        setPrintProgress({ current: i + 1, total: selectedProducts.length });
        toast.loading(
          `🖨️ Mencetak [${i + 1}/${selectedProducts.length}] "${item.product.name}" (${item.quantity} stiker)...`,
          { id: toastId }
        );

        const ok = await printLabel(item.product, {
          ...currentOptions,
          copies: item.quantity,
        });

        if (ok) successCount++;
        if (selectedProducts.length > 1 && i < selectedProducts.length - 1) {
          await new Promise((res) => setTimeout(res, 250));
        }
      }

      if (successCount === selectedProducts.length) {
        toast.success(`✨ Seluruh ${totalStickersCount} stiker berhasil dicetak!`, { id: toastId });
      } else {
        toast.warning(
          `Cetak selesai: ${successCount} dari ${selectedProducts.length} produk berhasil dicetak.`,
          { id: toastId }
        );
      }
    } catch (err: any) {
      console.error('Thermal print error:', err);
      toast.error('Gagal mencetak ke printer thermal: ' + (err.message || 'Unknown error'), {
        id: toastId,
      });
    } finally {
      setIsPrintingDirect(false);
      setPrintProgress(null);
    }
  };

  const isBtReady = isBluetoothPrinterConnected();

  return (
    <div className="w-full space-y-4">
      {/* 2-COLUMN MAIN GRID: LEFT (CONTROLS & PRODUCTS) | RIGHT (LIVE PREVIEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── LEFT COLUMN (7 COLS / 8 COLS) ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* 1. KARTU KONFIGURASI UKURAN & MULTI-KOLOM */}
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Ukuran Stiker &amp; Layout Kolom</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atur ukuran stiker (lebar × tinggi) &amp; jumlah kolom sejajar (Standar Xprinter XP-420B 1-3 Kolom)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* 🔗 Sinkronisasi Otomatis Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAutoSync;
                    setIsAutoSync(next);
                    if (next) {
                      const prop = getProportionalLabelDimensions({
                        widthMm: customWidthMm,
                        heightMm: customHeightMm,
                        barcodeHeightMm,
                      });
                      setProductNameFontSize(prop.productNameFontSize);
                      setBarcodeTextFontSize(prop.barcodeTextFontSize);
                      setPriceFontSize(prop.priceFontSize);
                      setStoreNameFontSize(prop.storeNameFontSize);
                      setBarcodeAreaWidthPercent(prop.barcodeAreaWidthPercent);
                      setBarcodeWidthRatio(prop.barcodeWidthRatio);
                      toast.success('🔗 Sinkronisasi otomatis proporsional diaktifkan! Pengaturan barcode, font & ukuran saling menyesuaikan.');
                    } else {
                      toast.info('🔓 Mode manual murni aktif (tanpa sinkronisasi otomatis).');
                    }
                  }}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isAutoSync
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                  title="Sinkronisasi otomatis ukuran barcode, tinggi stiker, rasio garis & ukuran font proporsional"
                >
                  {isAutoSync ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
                  <span>{isAutoSync ? 'Sinkron Proporsional' : 'Manual'}</span>
                </button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const isBt = isBluetoothPrinterConnected();
                    if (!isBt) {
                      toast.info('Menyambungkan ke printer Bluetooth untuk mendeteksi kertas...');
                      const connected = await connectPrinter('bluetooth');
                      if (!connected) return;
                    }
                    const detected = await detectPrinterPaper();
                    if (detected) {
                      toast.success(`✨ Kertas terdeteksi: ${detected.widthMm}×${detected.heightMm} mm (${detected.columns} Kolom)!`);
                    } else {
                      toast.info('Ukuran kertas stiker telah disesuaikan.');
                    }
                  }}
                  className="h-7 text-xs font-semibold gap-1.5 rounded-lg border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                  title="Deteksi otomatis ukuran kertas dari printer Bluetooth yang terhubung"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Deteksi Kertas</span>
                </Button>
                <Badge variant="outline" className="text-[11px] font-mono font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                  {customColumns} Kolom × {customWidthMm}×{customHeightMm} mm
                </Badge>
              </div>
            </div>

            {detectedPaperBadge && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kertas Terdeteksi Otomatis: <strong>{detectedPaperBadge}</strong></span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              {/* Lebar Stiker */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Lebar Stiker
                </Label>
                <div className="flex items-center h-9 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('width', customWidthMm - 1)}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={customWidthMm}
                      onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                      className="w-full h-full text-center font-bold text-sm bg-transparent border-0 focus:outline-none pr-6 pl-1"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono pointer-events-none">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('width', customWidthMm + 1)}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Tinggi Stiker */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Tinggi Stiker
                </Label>
                <div className="flex items-center h-9 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('height', customHeightMm - 1)}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={customHeightMm}
                      onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                      className="w-full h-full text-center font-bold text-sm bg-transparent border-0 focus:outline-none pr-6 pl-1"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono pointer-events-none">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('height', customHeightMm + 1)}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Jumlah Kolom */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Jumlah Kolom
                </Label>
                <div className="flex items-center h-9 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('columns', Math.max(1, customColumns - 1))}
                    disabled={customColumns <= 1}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={customColumns}
                      onChange={(e) => handleDimensionChange('columns', Number(e.target.value))}
                      className="w-full h-full text-center font-bold text-sm bg-transparent border-0 focus:outline-none pl-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('columns', Math.min(10, customColumns + 1))}
                    disabled={customColumns >= 10}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">maks. 10 kolom</p>
              </div>

              {/* Gap Horizontal */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Gap Samping
                </Label>
                <div className="flex items-center h-9 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('gapH', Math.max(0, customGapH - 0.5))}
                    disabled={customGapH <= 0}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={customGapH}
                      onChange={(e) => handleDimensionChange('gapH', Number(e.target.value))}
                      className="w-full h-full text-center font-bold text-sm bg-transparent border-0 focus:outline-none pr-6 pl-1"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono pointer-events-none">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('gapH', customGapH + 0.5)}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Gap Vertikal */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Gap Bawah
                </Label>
                <div className="flex items-center h-9 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('gapV', Math.max(0, customGapV - 0.5))}
                    disabled={customGapV <= 0}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={customGapV}
                      onChange={(e) => handleDimensionChange('gapV', Number(e.target.value))}
                      className="w-full h-full text-center font-bold text-sm bg-transparent border-0 focus:outline-none pr-6 pl-1"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono pointer-events-none">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDimensionChange('gapV', customGapV + 0.5)}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preset Pilihan Cepat */}
            <div className="space-y-1.5 pt-1 border-t">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Preset Ukuran Cepat:
              </Label>
              <Select value={selectedPresetId} onValueChange={handlePresetSelect}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background font-medium">
                  <SelectValue placeholder="Pilih Ukuran Kertas" />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <span className="font-semibold">{p.name}</span>
                      {p.description && (
                        <span className="text-[11px] text-muted-foreground ml-2">({p.description})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Info Kalkulasi Roll Kertas Xprinter */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    Lebar Roll: <strong className="text-foreground font-bold">110 mm</strong>
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span>
                  Format: <strong className="text-foreground font-bold">{customColumns} Kolom</strong> (Gap H: {customGapH}mm, V: {customGapV}mm)
                </span>
                {isAutoSync && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                    <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      Sinkronisasi Aktif
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-print-check"
                  checked={autoPrint}
                  onCheckedChange={(checked) => setAutoPrint(Boolean(checked))}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="auto-print-check" className="text-xs font-medium text-foreground cursor-pointer select-none">
                  Cetak otomatis
                </Label>
              </div>
            </div>
          </div>

          {/* 2. KARTU DESAIN LABEL UNIVERSAL */}
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Desain Label Universal</h3>
                  {isAutoSync && (
                    <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300 gap-1">
                      <Link2 className="w-2.5 h-2.5" />
                      Saling Terhubung &amp; Sinkron
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atur elemen yang ditampilkan, tinggi barcode, ukuran font, ketebalan, dan keluarga font label universal
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAsDefault}
                className="border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl text-xs font-semibold h-8 px-3 gap-1.5 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan sebagai default
              </Button>
            </div>

            {/* Checkboxes Row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-1 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-store"
                  checked={showStoreName}
                  onCheckedChange={(c) => {
                    setShowStoreName(Boolean(c));
                  }}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="chk-store" className="text-xs font-semibold cursor-pointer select-none">
                  Nama Brand / Toko
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-name"
                  checked={showName}
                  onCheckedChange={(c) => {
                    setShowName(Boolean(c));
                  }}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="chk-name" className="text-xs font-semibold cursor-pointer select-none">
                  Nama Produk
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-barcode"
                  checked={showBarcode}
                  onCheckedChange={(c) => {
                    setShowBarcode(Boolean(c));
                  }}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="chk-barcode" className="text-xs font-semibold cursor-pointer select-none">
                  Barcode Batang
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-barcodetext"
                  checked={showBarcodeText}
                  onCheckedChange={(c) => {
                    setShowBarcodeText(Boolean(c));
                  }}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="chk-barcodetext" className="text-xs font-semibold cursor-pointer select-none">
                  Nomor Barcode
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-sku"
                  checked={showSku}
                  onCheckedChange={(c) => {
                    setShowSku(Boolean(c));
                  }}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="chk-sku" className="text-xs font-semibold cursor-pointer select-none">
                  Kode SKU Model
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-price"
                  checked={showPrice}
                  onCheckedChange={(c) => {
                    setShowPrice(Boolean(c));
                  }}
                  className="rounded-md data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="chk-price" className="text-xs font-semibold cursor-pointer select-none">
                  Harga Jual (Rp)
                </Label>
              </div>
            </div>

            {/* Stepper Inputs Grid (Saling Sinkron) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
              {/* Tinggi Barcode (Pengubah Utama yang Mempengaruhi Lainnya) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Tinggi Barcode
                  </Label>
                  {isAutoSync && <span className="text-[9px] text-purple-600 dark:text-purple-400 font-mono font-bold">Sinkron</span>}
                </div>
                <div className="flex items-center h-8 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => handleBarcodeHeightChange(barcodeHeightMm - 1)}
                    disabled={barcodeHeightMm <= 8}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                    title="Kurangi tinggi barcode (-1mm)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={8}
                      max={60}
                      value={barcodeHeightMm}
                      onChange={(e) => handleBarcodeHeightChange(Number(e.target.value))}
                      className="w-full h-full text-center font-bold text-xs bg-transparent border-0 focus:outline-none pr-5 pl-1"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono pointer-events-none">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBarcodeHeightChange(barcodeHeightMm + 1)}
                    disabled={barcodeHeightMm >= 60}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l disabled:opacity-30"
                    title="Tambah tinggi barcode (+1mm)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground">Otomatis sinkron ke font &amp; proporsi</p>
              </div>

              {/* Ukuran Font Produk */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Font Produk
                </Label>
                <div className="flex items-center h-8 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => setProductNameFontSize((prev) => Math.max(6, Number((prev - 0.5).toFixed(1))))}
                    disabled={productNameFontSize <= 6}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={6}
                      max={26}
                      step={0.5}
                      value={productNameFontSize}
                      onChange={(e) => setProductNameFontSize(Number(e.target.value) || 9)}
                      className="w-full h-full text-center font-bold text-xs bg-transparent border-0 focus:outline-none pr-4 pl-1"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono pointer-events-none">px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductNameFontSize((prev) => Math.min(26, Number((prev + 0.5).toFixed(1))))}
                    disabled={productNameFontSize >= 26}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground">Judul nama produk</p>
              </div>

              {/* Ukuran Nomor Barcode */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Font No. Barcode
                </Label>
                <div className="flex items-center h-8 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => setBarcodeTextFontSize((prev) => Math.max(5, Number((prev - 0.5).toFixed(1))))}
                    disabled={barcodeTextFontSize <= 5}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={5}
                      max={20}
                      step={0.5}
                      value={barcodeTextFontSize}
                      onChange={(e) => setBarcodeTextFontSize(Number(e.target.value) || 7.5)}
                      className="w-full h-full text-center font-bold text-xs bg-transparent border-0 focus:outline-none pr-4 pl-1"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono pointer-events-none">px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBarcodeTextFontSize((prev) => Math.min(20, Number((prev + 0.5).toFixed(1))))}
                    disabled={barcodeTextFontSize >= 20}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground">Angka barcode batang</p>
              </div>

              {/* Ukuran Font Harga */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Font Harga
                </Label>
                <div className="flex items-center h-8 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => setPriceFontSize((prev) => Math.max(8, Number((prev - 0.5).toFixed(1))))}
                    disabled={priceFontSize <= 8}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={8}
                      max={30}
                      step={0.5}
                      value={priceFontSize}
                      onChange={(e) => setPriceFontSize(Number(e.target.value) || 12)}
                      className="w-full h-full text-center font-bold text-xs bg-transparent border-0 focus:outline-none pr-4 pl-1"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono pointer-events-none">px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPriceFontSize((prev) => Math.min(30, Number((prev + 0.5).toFixed(1))))}
                    disabled={priceFontSize >= 30}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground">Nominal Rp penjualan</p>
              </div>

              {/* Ukuran Nama Toko */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Font Brand / Toko
                </Label>
                <div className="flex items-center h-8 border rounded-xl overflow-hidden bg-background shadow-2xs focus-within:ring-2 focus-within:ring-purple-500/30">
                  <button
                    type="button"
                    onClick={() => setStoreNameFontSize((prev) => Math.max(5, Number((prev - 0.5).toFixed(1))))}
                    disabled={storeNameFontSize <= 5}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-r disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={5}
                      max={20}
                      step={0.5}
                      value={storeNameFontSize}
                      onChange={(e) => setStoreNameFontSize(Number(e.target.value) || 8)}
                      className="w-full h-full text-center font-bold text-xs bg-transparent border-0 focus:outline-none pr-4 pl-1"
                    />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono pointer-events-none">px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStoreNameFontSize((prev) => Math.min(20, Number((prev + 0.5).toFixed(1))))}
                    disabled={storeNameFontSize >= 20}
                    className="w-7 h-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground transition-colors border-l disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground">Header identitas toko</p>
              </div>

              {/* Ketebalan Font */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Ketebalan Font
                </Label>
                <Select
                  value={fontWeight}
                  onValueChange={(val) => {
                    setFontWeight(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl bg-background font-medium">
                    <SelectValue placeholder="Pilih Tebal Font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHT_CHOICES.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9.5px] text-muted-foreground">Ketebalan huruf cetak</p>
              </div>

              {/* Keluarga Font */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Keluarga Font (Typography)
                </Label>
                <Select
                  value={fontFamily}
                  onValueChange={(val) => {
                    setFontFamily(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl bg-background font-medium">
                    <SelectValue placeholder="Pilih Font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_CHOICES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9.5px] text-muted-foreground">Gaya tulisan label</p>
              </div>
            </div>
          </div>

          {/* 3. KARTU TATA LETAK & POSISI BARCODE */}
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Tata Letak &amp; Posisi Barcode</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atur letak urutan posisi barcode (Atas/Tengah/Bawah), perataan teks, &amp; kalibrasi offset presisi (X/Y mm)
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBarcodeOffsetX(0);
                    setBarcodeOffsetY(0);
                    setBarcodeAreaWidthPercent(92);
                    setTextAlign('center');
                    setElementOrder(['storeName', 'productName', 'barcode', 'barcodeText', 'price', 'sku']);
                    toast.info('Tata letak dan posisi barcode dikembalikan ke posisi standar.');
                  }}
                  className="h-7 text-xs font-semibold gap-1 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Reset letak dan posisi barcode ke standar"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Posisi</span>
                </Button>
              </div>
            </div>

            {/* A. PRESET CEPAT LETAK BARCODE */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <span>⚡ Preset Cepat Letak Barcode:</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setElementOrder(['storeName', 'productName', 'barcode', 'barcodeText', 'price', 'sku']);
                    toast.success('Letak barcode diatur di Tengah (Standar)');
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between ${
                    elementOrder.indexOf('barcode') === 2 || elementOrder.indexOf('barcode') === 1
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/30 text-foreground font-bold shadow-2xs'
                      : 'border-border hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Barcode di Tengah</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-background font-mono">Standar</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 opacity-80">Produk ➔ Barcode ➔ Harga</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setElementOrder(['barcode', 'barcodeText', 'storeName', 'productName', 'price', 'sku']);
                    toast.success('Letak barcode diatur di Atas (Header)');
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between ${
                    elementOrder.indexOf('barcode') === 0
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/30 text-foreground font-bold shadow-2xs'
                      : 'border-border hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Barcode di Atas</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-background font-mono">Header</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 opacity-80">Barcode ➔ Produk ➔ Harga</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setElementOrder(['storeName', 'productName', 'price', 'sku', 'barcode', 'barcodeText']);
                    toast.success('Letak barcode diatur di Bawah (Footer)');
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between ${
                    elementOrder.indexOf('barcode') >= 3
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/30 text-foreground font-bold shadow-2xs'
                      : 'border-border hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Barcode di Bawah</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-background font-mono">Footer</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 opacity-80">Produk ➔ Harga ➔ Barcode</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setElementOrder(['price', 'productName', 'barcode', 'barcodeText', 'storeName', 'sku']);
                    toast.success('Letak Harga di Atas, Barcode di Bawah (Tag Rak)');
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium text-left transition-all flex flex-col justify-between ${
                    elementOrder[0] === 'price'
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/30 text-foreground font-bold shadow-2xs'
                      : 'border-border hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Harga Paling Atas</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-background font-mono">Tag Rak</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 opacity-80">Harga ➔ Produk ➔ Barcode</span>
                </button>
              </div>
            </div>

            {/* B. PERATAAN POSISI (ALIGNMENT) */}
            <div className="space-y-1.5 pt-1 border-t">
              <Label className="text-xs font-semibold text-muted-foreground">
                Perataan Posisi Teks &amp; Barcode:
              </Label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'left', name: 'Rata Kiri', icon: AlignLeft },
                  { id: 'center', name: 'Rata Tengah', icon: AlignCenter },
                  { id: 'right', name: 'Rata Kanan', icon: AlignRight },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = textAlign === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTextAlign(item.id as any);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border-border'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C. URUTAN TATA LETAK ELEMEN (REORDER LIST) */}
            <div className="space-y-2 pt-1 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Urutan Posisi Vertikal Elemen (Atas ke Bawah):</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">Gunakan tombol ▲ / ▼ untuk memindahkan urutan</span>
              </div>

              <div className="space-y-1.5 bg-muted/20 border rounded-xl p-2">
                {elementOrder.map((key, index) => {
                  const isFirst = index === 0;
                  const isLast = index === elementOrder.length - 1;
                  const isBarcode = key === 'barcode' || key === 'barcodeText';
                  const isVisible =
                    (key === 'storeName' && showStoreName) ||
                    (key === 'productName' && showName) ||
                    (key === 'barcode' && showBarcode) ||
                    (key === 'barcodeText' && showBarcodeText) ||
                    (key === 'price' && showPrice) ||
                    (key === 'sku' && showSku);

                  const labelsMap: Record<LabelElementKey, { name: string; desc: string; icon: string }> = {
                    storeName: { name: 'Nama Brand / Toko', desc: 'Header identitas toko', icon: '🏪' },
                    productName: { name: 'Nama Produk', desc: 'Judul artikel barang', icon: '📦' },
                    barcode: { name: 'Garis Barcode (1D / QR)', desc: 'Grafik batang scanner', icon: '🏷️' },
                    barcodeText: { name: 'Nomor Digit Barcode', desc: 'Angka kode batang di bawah barcode', icon: '🔢' },
                    price: { name: 'Harga Jual (Rp)', desc: 'Nominal harga produk', icon: '💰' },
                    sku: { name: 'Kode SKU Model', desc: 'Kode internal stok barang', icon: '🔖' },
                  };

                  const currentMeta = labelsMap[key] || { name: key, desc: '', icon: '📄' };

                  return (
                    <div
                      key={`reorder-${key}`}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        isBarcode
                          ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80 shadow-2xs'
                          : 'bg-background border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] w-6 h-6 flex items-center justify-center p-0 shrink-0 ${
                            isBarcode ? 'bg-purple-600 text-white font-bold border-purple-600' : 'bg-muted'
                          }`}
                        >
                          {index + 1}
                        </Badge>
                        <span className="text-sm">{currentMeta.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold truncate ${isBarcode ? 'text-purple-700 dark:text-purple-300 font-bold' : 'text-foreground'}`}>
                              {currentMeta.name}
                            </span>
                            {!isVisible && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-normal">
                                Sembunyi
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-muted-foreground truncate">{currentMeta.desc}</span>
                        </div>
                      </div>

                      {/* Move Up/Down Controls */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isFirst}
                          onClick={() => {
                            const next = [...elementOrder];
                            const temp = next[index];
                            next[index] = next[index - 1];
                            next[index - 1] = temp;
                            setElementOrder(next);
                          }}
                          className="h-7 w-7 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-foreground disabled:opacity-20"
                          title="Pindahkan ke atas"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isLast}
                          onClick={() => {
                            const next = [...elementOrder];
                            const temp = next[index];
                            next[index] = next[index + 1];
                            next[index + 1] = temp;
                            setElementOrder(next);
                          }}
                          className="h-7 w-7 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-foreground disabled:opacity-20"
                          title="Pindahkan ke bawah"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* D. KALIBRASI OFFSET PRESISI POSISI & SKALA BARCODE */}
            <div className="space-y-3 pt-1 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Kalibrasi Presisi Posisi &amp; Skala Lebar Barcode:</span>
                </Label>
                {(barcodeOffsetX !== 0 || barcodeOffsetY !== 0 || barcodeAreaWidthPercent !== 92) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeOffsetX(0);
                      setBarcodeOffsetY(0);
                      setBarcodeAreaWidthPercent(92);
                      toast.info('Offset posisi dan lebar barcode di-reset ke standar.');
                    }}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    Reset Offset (0,0)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Offset X */}
                <div className="space-y-1 bg-muted/20 border rounded-xl p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Geser Horizontal (X):
                    </Label>
                    <span className="text-[11px] font-mono font-bold text-foreground">
                      {barcodeOffsetX > 0 ? `+${barcodeOffsetX}` : barcodeOffsetX} mm
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setBarcodeOffsetX((prev) => Math.max(-20, Number((prev - 0.5).toFixed(1))))}
                      className="h-7 w-7 rounded-lg shrink-0"
                      title="Geser 0.5mm ke kiri"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      min={-20}
                      max={20}
                      step={0.5}
                      value={barcodeOffsetX}
                      onChange={(e) => setBarcodeOffsetX(Number(e.target.value) || 0)}
                      className="h-7 text-xs font-bold text-center font-mono rounded-lg bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setBarcodeOffsetX((prev) => Math.min(20, Number((prev + 0.5).toFixed(1))))}
                      className="h-7 w-7 rounded-lg shrink-0"
                      title="Geser 0.5mm ke kanan"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">(-) Kiri • (+) Kanan</p>
                </div>

                {/* Offset Y */}
                <div className="space-y-1 bg-muted/20 border rounded-xl p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Geser Vertikal (Y):
                    </Label>
                    <span className="text-[11px] font-mono font-bold text-foreground">
                      {barcodeOffsetY > 0 ? `+${barcodeOffsetY}` : barcodeOffsetY} mm
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setBarcodeOffsetY((prev) => Math.max(-20, Number((prev - 0.5).toFixed(1))))}
                      className="h-7 w-7 rounded-lg shrink-0"
                      title="Geser 0.5mm ke atas"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      min={-20}
                      max={20}
                      step={0.5}
                      value={barcodeOffsetY}
                      onChange={(e) => setBarcodeOffsetY(Number(e.target.value) || 0)}
                      className="h-7 text-xs font-bold text-center font-mono rounded-lg bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setBarcodeOffsetY((prev) => Math.min(20, Number((prev + 0.5).toFixed(1))))}
                      className="h-7 w-7 rounded-lg shrink-0"
                      title="Geser 0.5mm ke bawah"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">(-) Atas • (+) Bawah</p>
                </div>

                {/* Barcode Area Width Percent */}
                <div className="space-y-1 bg-muted/20 border rounded-xl p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Lebar Area Barcode:
                    </Label>
                    <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                      {barcodeAreaWidthPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setBarcodeAreaWidthPercent((prev) => Math.max(50, prev - 5))}
                      className="h-7 w-7 rounded-lg shrink-0"
                      title="Kecilkan lebar barcode 5%"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      step={2}
                      value={barcodeAreaWidthPercent}
                      onChange={(e) => setBarcodeAreaWidthPercent(Math.max(50, Math.min(100, Number(e.target.value) || 92)))}
                      className="h-7 text-xs font-bold text-center font-mono rounded-lg bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setBarcodeAreaWidthPercent((prev) => Math.min(100, prev + 5))}
                      className="h-7 w-7 rounded-lg shrink-0"
                      title="Besarkan lebar barcode 5%"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Skala rentang lebar garis barcode</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. KARTU NAMA PRODUK (SEARCH / SCANNER) */}
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs space-y-2 relative" ref={searchContainerRef}>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Nama Produk</h3>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <ScanBarcode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Pindai/Cari Produk dengan Nama Kode"
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            {/* Floating Autocomplete Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y">
                {searchResults.map((p: any, pIdx: number) => (
                  <button
                    key={p.id ? `search-prod-${p.id}` : `search-prod-${pIdx}-${p.barcode || p.name}`}
                    type="button"
                    onClick={() => handleAddProduct(p)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Barcode: {p.barcode || p.sku || '-'} • Stok: {p.stock || 0}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(p.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. KARTU PRODUK YANG DIPILIH & ATURAN JUMLAH CETAK */}
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Produk yang Dipilih &amp; Jumlah Cetak</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total: <strong className="text-foreground font-bold">{totalStickersCount} stiker</strong> • Butuh <strong className="text-purple-600 dark:text-purple-400 font-bold">{totalLinesNeeded} baris/line roll</strong> ({customColumns} kolom stiker)
                </p>
              </div>
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRoundToFullLines}
                    title="Bulatkan jumlah stiker agar genap per baris roll"
                    className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 text-xs font-semibold h-7 px-2.5 rounded-lg"
                  >
                    Pas Baris ({customColumns}x)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetSelectedProducts}
                    className="border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold h-7 px-2.5 rounded-lg shadow-2xs"
                  >
                    Setel ulang
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Batch Quantity Setters Toolbar */}
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-muted/40 border text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Isi Cepat Jumlah:</span>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantity(1)}
                  className="px-2 py-0.5 rounded-md bg-background border hover:bg-muted text-[11px] font-medium transition-colors"
                >
                  1 Pcs
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantity(customColumns)}
                  className="px-2 py-0.5 rounded-md bg-background border hover:bg-muted text-[11px] font-medium transition-colors"
                >
                  1 Line ({customColumns} Pcs)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantity(customColumns * 2)}
                  className="px-2 py-0.5 rounded-md bg-background border hover:bg-muted text-[11px] font-medium transition-colors"
                >
                  2 Line ({customColumns * 2} Pcs)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantity(customColumns * 5)}
                  className="px-2 py-0.5 rounded-md bg-background border hover:bg-muted text-[11px] font-medium transition-colors"
                >
                  5 Line ({customColumns * 5} Pcs)
                </button>
                <button
                  type="button"
                  onClick={handleSetAllStockQuantity}
                  className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold transition-colors ml-auto"
                >
                  Sesuai Stok Produk
                </button>
              </div>
            )}

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-background">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Nama Produk</th>
                    <th className="px-3 py-2.5">Kode Produk</th>
                    <th className="px-3 py-2.5 text-center w-32">Kuantitas Cetak</th>
                    <th className="px-3 py-2.5 text-right w-16">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs font-medium">
                        Tidak ada produk yang dipilih — pilih produk dari pencarian di atas
                      </td>
                    </tr>
                  ) : (
                    selectedProducts.map((item, idx) => (
                      <tr
                        key={`sel-prod-${idx}`}
                        onClick={() => setActivePreviewIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          activePreviewIndex === idx
                            ? 'bg-purple-50/40 dark:bg-purple-950/20 font-medium'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold text-foreground">
                          <div className="flex items-center gap-1.5">
                            {activePreviewIndex === idx && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px] sm:max-w-xs">{item.product.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground font-mono">
                          {item.product.barcode || item.product.sku || '-'}
                        </td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center border rounded-lg overflow-hidden bg-background h-7 w-28 mx-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, -1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-full flex items-center justify-center hover:bg-muted disabled:opacity-30"
                              title="Kurang 1 stiker"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={item.quantity}
                              onChange={(e) => handleSetQuantity(idx, parseInt(e.target.value, 10))}
                              className="w-full h-full text-center font-bold text-xs bg-transparent border-0 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, 1)}
                              className="w-7 h-full flex items-center justify-center hover:bg-muted"
                              title="Tambah 1 stiker"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveProduct(idx)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Hapus dari daftar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: PRATINJAU LANGSUNG & AKSI CETAK (5 COLS / 4 COLS) ── */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          {/* ── RIGHT COLUMN: PRATINJAU LANGSUNG (MULTI-KOLOM & MULTI-BARIS) ── */}
          <div className="bg-card text-card-foreground rounded-2xl border p-4 sm:p-5 shadow-xs flex-1 flex flex-col justify-between space-y-4">
            {/* Header & Controls: Zoom + Tampilan Baris Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Pratinjau Langsung Roll</h3>
                <p className="text-[11px] text-muted-foreground">Simulasi kertas roll continuous</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Selector Baris Preview */}
                <div className="flex items-center bg-muted p-0.5 rounded-lg text-[11px] font-semibold">
                  <span className="text-[10px] text-muted-foreground px-1.5 hidden sm:inline">Tampil:</span>
                  {[
                    { label: '1 Line', val: 1 },
                    { label: '2 Line', val: 2 },
                    { label: '3 Line', val: 3 },
                    { label: 'Semua', val: 'all' },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setPreviewRowsCount(opt.val as any)}
                      className={`px-1.5 py-0.5 rounded-md transition-all ${
                        previewRowsCount === opt.val
                          ? 'bg-background text-purple-600 dark:text-purple-400 font-bold shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Zoom */}
                <div className="flex items-center bg-muted p-0.5 rounded-lg text-xs font-semibold">
                  {[80, 100, 150].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoom(z)}
                      className={`px-1.5 py-0.5 rounded-md transition-all ${
                        zoom === z
                          ? 'bg-background text-purple-600 dark:text-purple-400 font-bold shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dotted Grid Canvas Preview Box */}
            <div
              className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 min-h-[320px] max-h-[500px] flex items-start justify-center relative overflow-auto my-auto"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(148, 163, 184, 0.45) 1px, transparent 1px)',
                backgroundSize: '14px 14px',
              }}
            >
              {/* Multi-Column & Multi-Row Roll Paper Simulation */}
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="py-2 px-1 flex flex-col items-center"
              >
                {/* Continuous Roll backing */}
                <div
                  className="flex flex-col items-center p-3 rounded-xl bg-slate-200/85 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-lg backdrop-blur-xs relative"
                  style={{
                    gap: `${customGapV}mm`,
                  }}
                >
                  {previewRowsToDisplay.map((rowItems, rowIdx) => (
                    <div key={`row-${rowIdx}`} className="flex flex-col items-center">
                      {/* Row Header Line Badge */}
                      <div className="w-full flex items-center justify-between text-[8px] font-mono text-muted-foreground px-1 pb-1">
                        <span className="font-bold">Baris / Line {rowIdx + 1}</span>
                        <span className="text-[7.5px] opacity-80">Gap Bawah: {customGapV}mm</span>
                      </div>

                      {/* Columns in this row */}
                      <div
                        className="flex items-center justify-center"
                        style={{
                          gap: `${customGapH}mm`,
                        }}
                      >
                        {rowItems.map((prod, colIdx) => (
                          <div
                            key={`col-${colIdx}`}
                            className="relative rounded-md bg-white dark:bg-slate-900 shadow-xs border border-slate-300/90 dark:border-slate-700 overflow-hidden"
                          >
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-muted-foreground px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 pointer-events-none z-10 whitespace-nowrap">
                              Kolom {colIdx + 1}
                            </div>
                            <LabelSticker
                              product={prod}
                              options={currentOptions}
                              storeDisplayName={state.settings?.businessName || 'TOKO KAMI'}
                              isInteractive={false}
                            />
                          </div>
                        ))}

                        {/* If row is incomplete (e.g. 2 stickers in a 3-column row), show empty slot placeholder */}
                        {rowItems.length < customColumns &&
                          Array.from({ length: customColumns - rowItems.length }).map((_, emptyIdx) => (
                            <div
                              key={`empty-${emptyIdx}`}
                              style={{
                                width: `${widthMm}mm`,
                                height: `${heightMm}mm`,
                              }}
                              className="rounded-md border-2 border-dashed border-slate-400/60 dark:border-slate-600/60 bg-slate-100/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-[9px] font-mono text-muted-foreground"
                            >
                              <span>Slot Kosong</span>
                              <span className="text-[7.5px] opacity-75">Kolom {rowItems.length + emptyIdx + 1}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer below preview: Dimension Badge & Label Helper text */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-1">
              <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                {customColumns} Kolom × {widthMm}×{heightMm} mm (Gap H:{customGapH}mm, V:{customGapV}mm)
              </Badge>
              <span className="text-[10px] text-muted-foreground text-right truncate max-w-[220px]">
                {selectedProducts.length > 0
                  ? `Antrean: ${totalStickersCount} stiker (${totalLinesNeeded} line roll)`
                  : 'Pratinjau simulasi roll kertas'}
              </span>
            </div>

            {/* Print Action Buttons & Dedicated Quantity Widget */}
            <div className="pt-3 border-t space-y-3">
              {/* Dedicated Quantity Controls Box in Print Action Footer */}
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Jumlah Cetak (Salinan):
                    </span>
                    <span className="text-[10.5px] text-muted-foreground font-mono">
                      Total: <strong className="text-purple-700 dark:text-purple-300 font-bold">{totalStickersCount} stiker</strong> ({totalLinesNeeded} baris roll)
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-purple-300 dark:border-purple-700 rounded-lg overflow-hidden bg-background h-8 w-32 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedProducts.length === 0) {
                          setSelectedProducts([{ product: DEMO_PREVIEW_PRODUCT, quantity: 1 }]);
                          return;
                        }
                        handleUpdateQuantity(activePreviewIndex, -1);
                      }}
                      disabled={(selectedProducts[activePreviewIndex]?.quantity || 1) <= 1 && selectedProducts.length > 0}
                      className="w-8 h-full flex items-center justify-center hover:bg-muted disabled:opacity-30 text-foreground font-bold"
                      title="Kurang 1 stiker"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={selectedProducts.length > 0 ? (selectedProducts[activePreviewIndex]?.quantity || 1) : 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const safeVal = isNaN(val) || val < 1 ? 1 : val;
                        if (selectedProducts.length === 0) {
                          setSelectedProducts([{ product: DEMO_PREVIEW_PRODUCT, quantity: safeVal }]);
                        } else {
                          handleSetQuantity(activePreviewIndex, safeVal);
                        }
                      }}
                      className="w-full h-full text-center font-bold text-sm bg-transparent border-0 focus:outline-hidden text-purple-700 dark:text-purple-300 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedProducts.length === 0) {
                          setSelectedProducts([{ product: DEMO_PREVIEW_PRODUCT, quantity: 2 }]);
                          return;
                        }
                        handleUpdateQuantity(activePreviewIndex, 1);
                      }}
                      className="w-8 h-full flex items-center justify-center hover:bg-muted disabled:opacity-30 text-foreground font-bold"
                      title="Tambah 1 stiker"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Presets Buttons */}
                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-purple-200/60 dark:border-purple-800/60">
                  <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">Preset:</span>
                  {[
                    { label: '1 Pcs', qty: 1 },
                    { label: `${customColumns} (1 Baris)`, qty: customColumns },
                    { label: `${customColumns * 2} (2 Baris)`, qty: customColumns * 2 },
                    { label: `${customColumns * 4} (4 Baris)`, qty: customColumns * 4 },
                    { label: '30 Pcs', qty: 30 },
                  ].map((p, pIdx) => (
                    <button
                      key={`preset-btn-${pIdx}-${p.label}`}
                      type="button"
                      onClick={() => {
                        if (selectedProducts.length === 0) {
                          setSelectedProducts([{ product: DEMO_PREVIEW_PRODUCT, quantity: p.qty }]);
                        } else {
                          handleSetQuantity(activePreviewIndex, p.qty);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-background border hover:bg-muted text-[10px] font-semibold text-foreground transition-all shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleRoundToFullLines}
                    title="Bulatkan agar genap baris roll"
                    className="px-2 py-0.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-bold transition-all shadow-2xs ml-auto"
                  >
                    Pas Baris ({customColumns}x)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Cetak Browser / Driver Sistem */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBrowserPrint}
                  disabled={isPrintingDirect}
                  className="h-10 text-xs font-bold gap-1.5 rounded-xl border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Cetak Barcode (PDF)
                </Button>

                {/* Cetak Thermal Langsung */}
                <Button
                  type="button"
                  onClick={handleDirectThermalPrint}
                  disabled={isPrintingDirect}
                  className="h-10 text-xs font-bold gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                >
                  {isPrintingDirect ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{printProgress ? `${printProgress.current}/${printProgress.total}` : 'Memproses...'}</span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4" />
                      <span>Cetak Thermal</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Status Bluetooth indicator */}
              <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                {isBtReady ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Printer siap: <strong>{btName || 'Bluetooth'}</strong>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Bluetooth offline (menggunakan driver printer sistem)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable root for Browser System Print */}
      <div id="print-label-root" style={{ display: 'none' }}>
        {printableRows.map((rowItems, rowIdx) => (
          <div key={`print-row-${rowIdx}`} className="printable-row">
            {rowItems.map((prod, colIdx) => (
              <LabelSticker
                key={`row-${rowIdx}-col-${colIdx}`}
                product={prod}
                options={currentOptions}
                storeDisplayName={state.settings?.businessName || 'TOKO KAMI'}
                isForPrint={true}
                className="printable-label-item"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BarcodeConfigView;
