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
} from 'lucide-react';
import { toast } from 'sonner';
import { useHardware } from '@/contexts/HardwareContext';
import { useApp } from '@/contexts/AppContext';
import { api } from '@/lib/api';
import {
  LABEL_PRESETS,
  DEFAULT_LABEL_OPTIONS,
  DEFAULT_LABEL_ELEMENT_ORDER,
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
};

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

  // 📂 Collapsible Accordion Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    paper: true,
    elements: true,
    positions: true,
    queue: true,
  });

  // 📌 Floating Dock (PiP) Mode
  const [isFloatingDock, setIsFloatingDock] = useState<boolean>(false);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const expandAllSections = useCallback(() => {
    setOpenSections({ paper: true, elements: true, positions: true, queue: true });
  }, []);

  const collapseAllSections = useCallback(() => {
    setOpenSections({ paper: false, elements: false, positions: false, queue: false });
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
    return count;
  }, [
    options.showStoreName,
    options.showName,
    options.showBarcode,
    options.showBarcodeText,
    options.showPrice,
    options.showSku,
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
        default:
          return true;
      }
    },
    [options]
  );

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
          category: prod.category,
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
      category: 'Umum',
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
        category: p.category,
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
      {/* 🚀 1. STATUS PRINTER NYATA & DETEKSI OTOMATIS */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-purple-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 px-2.5 py-0.5 text-xs font-semibold gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Auto-Detect &amp; Auto-Fix Hardware</span>
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-2.5 py-0.5 text-xs font-semibold gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>{saveStatus === 'saving' ? 'Menyimpan...' : 'Tersimpan Otomatis'}</span>
              </Badge>
              {printerInfo.connected ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-2 py-0.5 text-xs font-semibold gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{printerInfo.type.toUpperCase()} Terhubung</span>
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 px-2 py-0.5 text-xs font-semibold gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Printer Belum Terhubung</span>
                </Badge>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <Printer className="w-5 h-5 text-purple-400" />
              <span>{printerInfo.name}</span>
            </h2>

            <p className="text-xs text-purple-200/80">
              {printerInfo.connected
                ? 'Printer terdeteksi aktif. Dimensi stiker, kolom, dan area print terkunci (FIX) otomatis.'
                : 'Klik tombol di samping untuk memindai dan menghubungkan printer Bluetooth / USB Anda.'}
            </p>
          </div>

          {/* ACTION BUTTONS: SCAN REAL BLUETOOTH / USB / SERIAL */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {printerInfo.connected ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnect}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/40 font-semibold h-9 text-xs px-3 rounded-xl gap-1.5"
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-9 text-xs px-4 rounded-xl shadow-md gap-2 transition-all active:scale-95"
                >
                  {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                  <span>Pindai Bluetooth</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnectUsb}
                  disabled={isScanning}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-semibold h-9 text-xs px-3 rounded-xl gap-1.5"
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>USB</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConnectSerial}
                  disabled={isScanning}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-semibold h-9 text-xs px-3 rounded-xl gap-1.5"
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
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-semibold h-9 text-xs px-3 rounded-xl gap-1.5"
              title="Kunci ulang dimensi dan skala print agar simetris"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fix Ulang</span>
            </Button>

            <Button
              type="button"
              onClick={handleSaveDefaults}
              disabled={isSavingDb}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs px-3.5 rounded-xl shadow-md gap-1.5 transition-all active:scale-95"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] text-purple-200/70 uppercase font-semibold">Lebar Kolom (Fix):</span>
            <span className="text-sm font-mono font-black text-white mt-0.5">
              {syncMetrics.w} mm <span className="text-[11px] font-normal text-purple-200/60">× {syncMetrics.h} mm</span>
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] text-purple-200/70 uppercase font-semibold">Total Lebar Roll (Fix):</span>
            <span className="text-sm font-mono font-black text-purple-300 mt-0.5">
              {syncMetrics.totalRollW} mm <span className="text-[11px] font-normal text-purple-200/60">({syncMetrics.cols} Kolom)</span>
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] text-purple-200/70 uppercase font-semibold">Area Cetak Aman (Fix):</span>
            <span className="text-sm font-mono font-black text-emerald-300 mt-0.5">
              {syncMetrics.printableW} mm <span className="text-[11px] font-normal text-emerald-200/60">({syncMetrics.barcodeAreaPct}%)</span>
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col justify-center">
            <span className="text-[10px] text-purple-200/70 uppercase font-semibold">Tinggi Barcode (Fix):</span>
            <span className="text-sm font-mono font-black text-white mt-0.5">
              {syncMetrics.barcodeH} mm <span className="text-[11px] font-normal text-purple-200/60">(44% tinggi)</span>
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
                <ChevronsUpDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
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
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
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
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
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
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-foreground ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-foreground'}`}>
                        {preset.name}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
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
                  className="h-6 text-xs text-purple-600 dark:text-purple-400 font-bold px-2 hover:bg-purple-50 dark:hover:bg-purple-950"
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
                            ? 'bg-purple-600 text-white shadow-xs'
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

          {/* B. ELEMEN ISI STIKER */}
          <div className="bg-card text-card-foreground rounded-2xl border shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('elements')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                  <ScanBarcode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    B. Elemen Isi Stiker
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Centang bagian yang ingin dicetak pada stiker label Anda.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  {activeElementsCount} Elemen Aktif
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <Checkbox
                  checked={options.showStoreName}
                  onCheckedChange={(c) => setOptions((prev) => ({ ...prev, showStoreName: !!c }))}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Nama Toko</span>
                  <span className="text-[10px] text-muted-foreground">{defaultBusinessName}</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <Checkbox
                  checked={options.showName}
                  onCheckedChange={(c) => setOptions((prev) => ({ ...prev, showName: !!c }))}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Nama Produk</span>
                  <span className="text-[10px] text-muted-foreground">Judul artikel</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <Checkbox
                  checked={options.showBarcode}
                  onCheckedChange={(c) => setOptions((prev) => ({ ...prev, showBarcode: !!c }))}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Garis Barcode</span>
                  <span className="text-[10px] text-muted-foreground">Batang 1D</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <Checkbox
                  checked={options.showBarcodeText}
                  onCheckedChange={(c) => setOptions((prev) => ({ ...prev, showBarcodeText: !!c }))}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Nomor Barcode</span>
                  <span className="text-[10px] text-muted-foreground">Angka digit</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <Checkbox
                  checked={options.showPrice}
                  onCheckedChange={(c) => setOptions((prev) => ({ ...prev, showPrice: !!c }))}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Harga Jual</span>
                  <span className="text-[10px] text-muted-foreground">Nominal Rp</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                <Checkbox
                  checked={options.showSku}
                  onCheckedChange={(c) => setOptions((prev) => ({ ...prev, showSku: !!c }))}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">Kode SKU</span>
                  <span className="text-[10px] text-muted-foreground">Kode stok</span>
                </div>
              </label>
            </div>

            {/* Input Nama Toko Kustom jika dicentang */}
            {options.showStoreName && (
              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>Nama Toko pada Stiker Label:</span>
                  </Label>
                  <span className="text-[10.5px] text-muted-foreground font-medium">
                    Profil: <strong className="text-foreground">{defaultBusinessName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={options.customStoreName !== undefined ? options.customStoreName : defaultBusinessName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptions((prev) => ({ ...prev, customStoreName: val }));
                    }}
                    placeholder={`Contoh: ${defaultBusinessName}`}
                    className="h-8 text-xs font-semibold bg-background rounded-xl"
                  />
                  {options.customStoreName && options.customStoreName !== defaultBusinessName && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOptions((prev) => ({ ...prev, customStoreName: defaultBusinessName }))}
                      className="h-8 text-xs px-2.5 rounded-xl shrink-0"
                      title="Gunakan nama toko dari Pengaturan Akun"
                    >
                      Pakai Nama Toko
                    </Button>
                  )}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Teks ini akan dicetak di bagian paling atas label stiker produk.
                </p>
              </div>
            )}

            {/* Opsi Format Baris Nama & Perataan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Baris Nama Produk:</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, productNameTwoLines: false }))}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      !options.productNameTwoLines
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    1 Baris
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, productNameTwoLines: true }))}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      options.productNameTwoLines
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    2 Baris (Bungkus)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Perataan Posisi Teks:</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, textAlign: 'center' }))}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      options.textAlign === 'center'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>Rata Tengah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, textAlign: 'left' }))}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      options.textAlign === 'left'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>Rata Kiri</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 📏 PENGATURAN TINGGI & LEBAR GARIS BARCODE */}
            {options.showBarcode && (
              <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ScanBarcode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Ukuran Garis Barcode (Tinggi & Lebar)</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 bg-background border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
                    Tinggi: {options.barcodeHeightMm || 10}mm | Lebar: {options.barcodeAreaWidthPercent || 90}%
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Kontrol Tinggi Garis Barcode */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-muted-foreground font-semibold">Tinggi Garis Barcode:</Label>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {options.barcodeHeightMm || 10} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={3}
                        max={35}
                        step={0.5}
                        value={options.barcodeHeightMm || 10}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOptions((prev) => ({ ...prev, barcodeHeightMm: val }));
                        }}
                        className="w-full accent-purple-600 cursor-pointer h-1.5 bg-muted rounded-lg"
                      />
                      <input
                        type="number"
                        min={3}
                        max={35}
                        step={0.5}
                        value={options.barcodeHeightMm || 10}
                        onChange={(e) => {
                          const val = Math.max(3, Math.min(35, Number(e.target.value) || 3));
                          setOptions((prev) => ({ ...prev, barcodeHeightMm: val }));
                        }}
                        className="w-14 h-7 text-xs font-mono font-bold bg-background text-center rounded-lg border"
                      />
                    </div>
                    {/* Presets Cepat Tinggi */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {[
                        { label: '6mm', val: 6 },
                        { label: '8mm', val: 8 },
                        { label: '10mm', val: 10 },
                        { label: '12mm', val: 12 },
                        { label: '15mm', val: 15 },
                        { label: '18mm', val: 18 },
                      ].map((p) => (
                        <button
                          key={`bh-${p.val}`}
                          type="button"
                          onClick={() => setOptions((prev) => ({ ...prev, barcodeHeightMm: p.val }))}
                          className={`flex-1 text-[10px] py-0.5 rounded font-mono transition-all ${
                            (options.barcodeHeightMm || 10) === p.val
                              ? 'bg-purple-600 text-white font-bold shadow-2xs'
                              : 'bg-background hover:bg-muted text-muted-foreground border'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kontrol Lebar Garis Barcode */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-muted-foreground font-semibold">Lebar Garis Barcode:</Label>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {options.barcodeAreaWidthPercent || 90} %
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={50}
                        max={100}
                        step={1}
                        value={options.barcodeAreaWidthPercent || 90}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOptions((prev) => ({ ...prev, barcodeAreaWidthPercent: val }));
                        }}
                        className="w-full accent-purple-600 cursor-pointer h-1.5 bg-muted rounded-lg"
                      />
                      <input
                        type="number"
                        min={50}
                        max={100}
                        step={1}
                        value={options.barcodeAreaWidthPercent || 90}
                        onChange={(e) => {
                          const val = Math.max(50, Math.min(100, Number(e.target.value) || 50));
                          setOptions((prev) => ({ ...prev, barcodeAreaWidthPercent: val }));
                        }}
                        className="w-14 h-7 text-xs font-mono font-bold bg-background text-center rounded-lg border"
                      />
                    </div>
                    {/* Presets Cepat Lebar */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {[
                        { label: '75%', val: 75 },
                        { label: '82%', val: 82 },
                        { label: '88%', val: 88 },
                        { label: '92%', val: 92 },
                        { label: '96%', val: 96 },
                        { label: '100%', val: 100 },
                      ].map((p) => (
                        <button
                          key={`bw-${p.val}`}
                          type="button"
                          onClick={() => setOptions((prev) => ({ ...prev, barcodeAreaWidthPercent: p.val }))}
                          className={`flex-1 text-[10px] py-0.5 rounded font-mono transition-all ${
                            (options.barcodeAreaWidthPercent || 90) === p.val
                              ? 'bg-purple-600 text-white font-bold shadow-2xs'
                              : 'bg-background hover:bg-muted text-muted-foreground border'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ketebalan Batang Barcode */}
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-foreground">Ketebalan Garis (Rasio Batang):</Label>
                    <p className="text-[10.5px] text-muted-foreground">Kerapatan & tebal garis hitam agar mudah terbaca scanner</p>
                  </div>
                  <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border shrink-0">
                    {[
                      { label: '0.8x (Tipis)', val: 0.8 },
                      { label: '1.0x (Normal)', val: 1.0 },
                      { label: '1.2x (Sedang)', val: 1.2 },
                      { label: '1.5x (Tebal)', val: 1.5 },
                      { label: '2.0x (Ekstra)', val: 2.0 },
                    ].map((item) => (
                      <button
                        key={`ratio-${item.val}`}
                        type="button"
                        onClick={() => setOptions((prev) => ({ ...prev, barcodeWidthRatio: item.val }))}
                        className={`px-2 py-1 text-[10.5px] font-semibold rounded-md transition-all ${
                          (options.barcodeWidthRatio || 1.0) === item.val
                            ? 'bg-purple-600 text-white shadow-2xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
            )}
          </div>

          {/* C. ATUR POSISI & TATA LETAK ELEMEN (GESER BEBAS / DRAG & DROP) */}
          <div className="bg-card text-card-foreground rounded-2xl border shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('positions')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                  <Move className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    C. Atur Posisi &amp; Tata Letak Elemen (Geser Bebas)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Geser posisi nama toko, produk, barcode, harga dll dengan tombol arah atau drag stiker.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {customPositionsCount > 0 ? (
                  <Badge className="text-[10px] font-mono px-2 py-0.5 bg-amber-500 text-white border-none">
                    {customPositionsCount} Elemen Digeser
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                    Default (0, 0)
                  </Badge>
                )}
                {openSections.positions ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {openSections.positions && (
              <div className="p-4 sm:p-5 pt-0 space-y-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-2">
                      <span>Area Kontrol Presisi &amp; Urutan Elemen</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Bisa geser langsung di stiker preview atau gunakan tombol arah presisi di bawah.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAllPositions}
                    className="h-7 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 self-start sm:self-auto rounded-lg"
                    title="Kembalikan semua elemen ke posisi standar awal (0, 0)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Semua Posisi</span>
                  </Button>
                </div>

            {/* 1. Tombol Pilihan Elemen */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Pilih Elemen yang Ingin Digeser:</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Offset Saat Ini: ({((options.elementPositions?.[selectedElement]?.x || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.x}` : (options.elementPositions?.[selectedElement]?.x || 0))} mm, {((options.elementPositions?.[selectedElement]?.y || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.y}` : (options.elementPositions?.[selectedElement]?.y || 0))} mm)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(DEFAULT_LABEL_ELEMENT_ORDER.concat(['sku']) as LabelElementKey[]).map((key) => {
                  const conf = ELEMENT_CONFIG[key];
                  if (!conf) return null;
                  const isSelected = selectedElement === key;
                  const pos = options.elementPositions?.[key] || { x: 0, y: 0 };
                  const hasOffset = pos.x !== 0 || pos.y !== 0;
                  const isEnabled = isElementEnabled(key);
                  const IconComp = conf.icon;

                  return (
                    <button
                      key={`elem-selector-${key}`}
                      type="button"
                      onClick={() => setSelectedElement(key)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-500/20'
                          : 'bg-background hover:bg-muted/60 text-foreground border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                        <div className="truncate">
                          <p className="text-xs font-bold truncate leading-tight">{conf.label}</p>
                          <p className={`text-[9.5px] truncate ${isSelected ? 'text-purple-100' : 'text-muted-foreground'}`}>
                            {!isEnabled
                              ? '(Nonaktif)'
                              : hasOffset
                              ? `${pos.x > 0 ? `+${pos.x}` : pos.x}, ${pos.y > 0 ? `+${pos.y}` : pos.y} mm`
                              : 'Default (0,0)'}
                          </p>
                        </div>
                      </div>
                      {hasOffset && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-amber-300' : 'bg-purple-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. D-PAD CONTROLLER & PRECISION NUDGE */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3.5">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">
                    Kontrol Geser: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{ELEMENT_CONFIG[selectedElement]?.label}</span>
                  </span>
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
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-background hover:bg-muted text-muted-foreground border'
                      }`}
                    >
                      ±{step}mm
                    </button>
                  ))}
                </div>
              </div>

              {/* D-Pad & Sliders Layout */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Visual Directional Pad */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 py-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleNudge(selectedElement, 0, -stepSize)}
                    className="h-8 w-24 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950"
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
                      className="h-8 w-20 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950"
                      title={`Geser ke Kiri ${stepSize} mm`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kiri</span>
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCenterElement(selectedElement)}
                      className="h-8 w-18 text-[11px] font-bold gap-1 rounded-xl shadow-2xs"
                      title="Ratakan Horisontal ke Tengah (X: 0)"
                    >
                      <Target className="w-3 h-3 text-purple-600" />
                      <span>Tengah</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleNudge(selectedElement, stepSize, 0)}
                      className="h-8 w-20 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950"
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
                    className="h-8 w-24 text-xs font-bold gap-1 rounded-xl bg-background shadow-2xs hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950"
                    title={`Geser ke Bawah ${stepSize} mm`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Bawah</span>
                  </Button>
                </div>

                {/* Sliders & Numeric Fine-Tuning */}
                <div className="flex-1 w-full space-y-3 pl-0 sm:pl-2">
                  {/* Posisi X */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3 text-purple-600" />
                        <span>Geser Horisontal (X mm):</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border">
                        {(options.elementPositions?.[selectedElement]?.x || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.x || 0}` : (options.elementPositions?.[selectedElement]?.x || 0)} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleNudge(selectedElement, -0.5, 0)}
                        title="-0.5 mm"
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
                        title="+0.5 mm"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Posisi Y */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3 text-purple-600" />
                        <span>Geser Vertikal (Y mm):</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border">
                        {(options.elementPositions?.[selectedElement]?.y || 0) > 0 ? `+${options.elementPositions?.[selectedElement]?.y || 0}` : (options.elementPositions?.[selectedElement]?.y || 0)} mm
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

                  {/* Action Row for Selected Element */}
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetElement(selectedElement)}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset {ELEMENT_CONFIG[selectedElement]?.label}</span>
                    </Button>

                    {/* Stacking Order Buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] text-muted-foreground">Urutan:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveElementOrder(selectedElement, 'up')}
                        className="h-7 px-2 text-xs font-bold gap-1 rounded-lg"
                        title="Pindahkan elemen ke atas dalam susunan stiker"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Naik</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveElementOrder(selectedElement, 'down')}
                        className="h-7 px-2 text-xs font-bold gap-1 rounded-lg"
                        title="Pindahkan elemen ke bawah dalam susunan stiker"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Turun</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* JIKA ELEMEN BARCODE TERPILIH, TAMPILKAN KONTROL TINGGI & LEBAR LANGSUNG */}
                {selectedElement === 'barcode' && (
                  <div className="pt-3 border-t border-dashed space-y-3 bg-purple-50/70 dark:bg-purple-950/30 -mx-3.5 -mb-3.5 p-3.5 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Atur Ukuran Garis Barcode Terpilih</span>
                      </span>
                      <span className="text-[10.5px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                        Tinggi: {options.barcodeHeightMm || 10}mm | Lebar: {options.barcodeAreaWidthPercent || 90}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-muted-foreground">Tinggi Garis:</span>
                          <span className="font-mono font-bold text-foreground">{options.barcodeHeightMm || 10} mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={3}
                            max={35}
                            step={0.5}
                            value={options.barcodeHeightMm || 10}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setOptions((prev) => ({ ...prev, barcodeHeightMm: val }));
                            }}
                            className="w-full accent-purple-600 cursor-pointer h-1.5 bg-muted rounded-lg"
                          />
                          <input
                            type="number"
                            min={3}
                            max={35}
                            step={0.5}
                            value={options.barcodeHeightMm || 10}
                            onChange={(e) => {
                              const val = Math.max(3, Math.min(35, Number(e.target.value) || 3));
                              setOptions((prev) => ({ ...prev, barcodeHeightMm: val }));
                            }}
                            className="w-14 h-6 text-xs font-mono font-bold bg-background text-center rounded border"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-muted-foreground">Lebar Garis (% Area):</span>
                          <span className="font-mono font-bold text-foreground">{options.barcodeAreaWidthPercent || 90} %</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={50}
                            max={100}
                            step={1}
                            value={options.barcodeAreaWidthPercent || 90}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setOptions((prev) => ({ ...prev, barcodeAreaWidthPercent: val }));
                            }}
                            className="w-full accent-purple-600 cursor-pointer h-1.5 bg-muted rounded-lg"
                          />
                          <input
                            type="number"
                            min={50}
                            max={100}
                            step={1}
                            value={options.barcodeAreaWidthPercent || 90}
                            onChange={(e) => {
                              const val = Math.max(50, Math.min(100, Number(e.target.value) || 50));
                              setOptions((prev) => ({ ...prev, barcodeAreaWidthPercent: val }));
                            }}
                            className="w-14 h-6 text-xs font-mono font-bold bg-background text-center rounded border"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Daftar Susunan Urutan Elemen Stiker */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Susunan Urutan Vertikal Elemen:</Label>
                <span className="text-[10.5px] text-purple-600 dark:text-purple-400 font-medium">Klik chip untuk memilih elemen</span>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {(options.elementOrder || DEFAULT_LABEL_ELEMENT_ORDER).map((key, index) => {
                  const isSelected = selectedElement === key;
                  const pos = options.elementPositions?.[key] || { x: 0, y: 0 };
                  const conf = ELEMENT_CONFIG[key];
                  if (!conf) return null;
                  return (
                    <button
                      key={`order-chip-${key}`}
                      type="button"
                      onClick={() => setSelectedElement(key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-75">{index + 1}.</span>
                      <span>{conf.label}</span>
                      {(pos.x !== 0 || pos.y !== 0) && (
                        <span className="text-[9px] font-mono opacity-80">
                          ({pos.x > 0 ? `+${pos.x}` : pos.x},{pos.y > 0 ? `+${pos.y}` : pos.y})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>
            )}
          </div>

          {/* D. ANTREAN PRODUK DARI DATABASE NYATA */}
          <div className="bg-card text-card-foreground rounded-2xl border shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('queue')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    D. Daftar Produk yang Dicetak
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
                        <span className="text-purple-600 font-bold shrink-0">{formatRupiah(p.price)}</span>
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
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
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
                    className="h-9 text-xs font-semibold text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 gap-1.5 rounded-xl"
                  >
                    {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5 text-purple-600" />}
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-9 text-xs px-5 rounded-xl shadow-md gap-2 active:scale-95 transition-all"
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
                  <ScanBarcode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/50'
                  }`}
                  title={isFloatingDock ? 'Pasang kembali ke kolom samping' : 'Jadikan kotak mengambang bebas di sudut layar (Floating PiP)'}
                >
                  {isFloatingDock ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
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
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground border'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 ml-1 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                    {syncMetrics.w} × {syncMetrics.h} mm
                  </Badge>
                </div>
              </div>
            </div>

            {/* 🎯 KANVAS EDITOR INTERAKTIF LANGSUNG */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>Kanvas Editor (Bisa Digeser):</span>
                </span>
                <span className="font-mono text-[10px] bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  Elemen Aktif: <strong>{ELEMENT_CONFIG[selectedElement]?.label}</strong>
                </span>
              </div>

              {activePreviewProduct ? (
                <div
                  className="bg-slate-100/90 dark:bg-slate-900/80 border-2 border-dashed border-purple-300 dark:border-purple-800/80 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] overflow-hidden relative transition-all shadow-inner"
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
                      <Move className="w-3 h-3 text-purple-600" />
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
                  <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
                  <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
                    className="text-[10.5px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1"
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-9 text-xs rounded-xl shadow-md gap-1.5 active:scale-95 transition-all"
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
        <div className="fixed bottom-5 right-5 z-50 w-[360px] sm:w-[410px] max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-2 border-purple-500 shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ScanBarcode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
              className="bg-slate-100/90 dark:bg-slate-900/80 border-2 border-dashed border-purple-300 dark:border-purple-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative shadow-inner"
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
                  <Move className="w-3 h-3 text-purple-600" />
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
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-8 text-xs rounded-xl gap-1 shadow-sm"
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
