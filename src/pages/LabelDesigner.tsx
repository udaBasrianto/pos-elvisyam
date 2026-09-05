import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  LayoutTemplate,
  Plus,
  Printer,
  Save,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  ScanBarcode,
  Package,
  Tag,
  DollarSign,
  Info,
  ChevronDown,
  SlidersHorizontal,
  FolderOpen,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Bluetooth,
  Unplug,
  Radio,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { LabelSticker } from "@/components/LabelSticker";
import {
  loadLabelOptions,
  saveLabelOptions,
  triggerBrowserLabelPrint,
  generateTsplLabel,
  type LabelPrintOptions,
  type LabelProductData,
} from "@/lib/labelPrinter";
import {
  connectBluetoothLabelPrinter,
  disconnectBluetoothLabelPrinter,
  isBluetoothLabelPrinterConnected,
  getConnectedBluetoothLabelPrinterName,
  autoConnectBluetoothLabelPrinter,
  sendBluetoothLabelPrintData,
  isBluetoothPrinterConnected,
  getConnectedBluetoothPrinterName,
} from "@/lib/bluetoothPrinter";

// Model Template Label OpenLabel
export type LabelShape = "rectangle" | "circle" | "oval";

export interface OpenLabelTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  columns: number;
  colSpacingMm: number;
  rowSpacingMm: number;
  shape: LabelShape;
  cornerRadiusMm: number;
  showStoreName: boolean;
  showProductName: boolean;
  showBarcode: boolean;
  showBarcodeText: boolean;
  showPrice: boolean;
  showSku: boolean;
  showCategory: boolean;
  showBrand: boolean;
  notes?: string;
}

// Preset Terpopuler di Ritel & Pasar Indonesia
export const POPULAR_PRESETS: OpenLabelTemplate[] = [
  {
    id: "preset-33x15-3col",
    name: "33 x 15 mm (3 Kolom) — Standar Baju & Apotek",
    widthMm: 33,
    heightMm: 15,
    columns: 3,
    colSpacingMm: 2,
    rowSpacingMm: 2,
    shape: "rectangle",
    cornerRadiusMm: 1.5,
    showStoreName: false,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: false,
    showCategory: false,
    showBrand: false,
    notes: "Sangat populer untuk roll 3 baris Xprinter XP-420B, XP-365B, Kassen (lebar roll ~103mm).",
  },
  {
    id: "preset-30x19-3col",
    name: "30 x 19 mm (3 Kolom) — Minimarket & Ritel",
    widthMm: 30,
    heightMm: 19,
    columns: 3,
    colSpacingMm: 2,
    rowSpacingMm: 2,
    shape: "rectangle",
    cornerRadiusMm: 1.5,
    showStoreName: false,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: true,
    showCategory: false,
    showBrand: false,
    notes: "Standar ritel minimarket 3 kolom (lebar roll ~96-100mm).",
  },
  {
    id: "preset-40x30-2col",
    name: "40 x 30 mm (2 Kolom) — Sepatu & Aksesoris",
    widthMm: 40,
    heightMm: 30,
    columns: 2,
    colSpacingMm: 3,
    rowSpacingMm: 2,
    shape: "rectangle",
    cornerRadiusMm: 2,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: true,
    showCategory: false,
    showBrand: false,
    notes: "Roll 2 baris (lebar roll ~83-85mm), teks terbaca sangat jelas.",
  },
  {
    id: "preset-40x30-1col",
    name: "40 x 30 mm (1 Kolom) — Standar Label Rak",
    widthMm: 40,
    heightMm: 30,
    columns: 1,
    colSpacingMm: 0,
    rowSpacingMm: 2,
    shape: "rectangle",
    cornerRadiusMm: 2,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: true,
    showCategory: false,
    showBrand: false,
    notes: "Label tunggal per baris untuk rak toko atau produk ritel.",
  },
  {
    id: "preset-50x30-1col",
    name: "50 x 30 mm (1 Kolom) — Nama Panjang & Harga Besar",
    widthMm: 50,
    heightMm: 30,
    columns: 1,
    colSpacingMm: 0,
    rowSpacingMm: 2,
    shape: "rectangle",
    cornerRadiusMm: 2.5,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: true,
    showCategory: false,
    showBrand: false,
    notes: "Ukuran ideal untuk produk dengan nama panjang dan barcode tajam.",
  },
  {
    id: "preset-60x40-1col",
    name: "60 x 40 mm (1 Kolom) — Kemasan Dus & Box",
    widthMm: 60,
    heightMm: 40,
    columns: 1,
    colSpacingMm: 0,
    rowSpacingMm: 3,
    shape: "rectangle",
    cornerRadiusMm: 3,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: true,
    showCategory: true,
    showBrand: true,
    notes: "Stiker box berukuran besar dengan informasi produk lengkap.",
  },
  {
    id: "preset-circle-30",
    name: "Stiker Bulat 30 mm (1 Kolom) — Segel Kemasan / Toples",
    widthMm: 30,
    heightMm: 30,
    columns: 1,
    colSpacingMm: 0,
    rowSpacingMm: 3,
    shape: "circle",
    cornerRadiusMm: 15,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: false,
    showPrice: true,
    showSku: false,
    showCategory: false,
    showBrand: false,
    notes: "Stiker bulat untuk segel kemasan kuliner, toples kue, atau logo produk.",
  },
  {
    id: "preset-circle-40",
    name: "Stiker Bulat 40 mm (1 Kolom) — Logo & Brand",
    widthMm: 40,
    heightMm: 40,
    columns: 1,
    colSpacingMm: 0,
    rowSpacingMm: 3,
    shape: "circle",
    cornerRadiusMm: 20,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: false,
    showPrice: true,
    showSku: false,
    showCategory: false,
    showBrand: false,
    notes: "Stiker bulat diameter 4 cm untuk branding botol atau kemasan.",
  },
  {
    id: "preset-oval-50x30",
    name: "Stiker Oval 50 x 30 mm (1 Kolom) — Botol & Toples",
    widthMm: 50,
    heightMm: 30,
    columns: 1,
    colSpacingMm: 0,
    rowSpacingMm: 3,
    shape: "oval",
    cornerRadiusMm: 15,
    showStoreName: true,
    showProductName: true,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showSku: false,
    showCategory: false,
    showBrand: false,
    notes: "Stiker bentuk oval estetik untuk botol kosmetik atau produk homemade.",
  },
];

const STORAGE_SAVED_TEMPLATES_KEY = "pos_openlabel_saved_templates";
const STORAGE_ACTIVE_TEMPLATE_KEY = "pos_openlabel_active_template";

export default function LabelDesigner() {
  const { state } = useApp();

  // 1. Template State
  const [activeTemplate, setActiveTemplate] = useState<OpenLabelTemplate>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_TEMPLATE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return POPULAR_PRESETS[0];
  });

  // 2. Saved Templates Library
  const [savedTemplates, setSavedTemplates] = useState<OpenLabelTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SAVED_TEMPLATES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return POPULAR_PRESETS;
  });

  // 3. UI State
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [showRealContent, setShowRealContent] = useState<boolean>(true);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState<boolean>(false);

  // 4. Bluetooth Label Printer State (Khusus Printer Label / Barcode Stiker)
  const [isBtConnected, setIsBtConnected] = useState<boolean>(() => isBluetoothLabelPrinterConnected());
  const [btPrinterName, setBtPrinterName] = useState<string | null>(() => getConnectedBluetoothLabelPrinterName());
  const [isConnectingBt, setIsConnectingBt] = useState<boolean>(false);
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);
  const [testPrintRows, setTestPrintRows] = useState<number>(1);
  const [receiptPrinterName, setReceiptPrinterName] = useState<string | null>(() => getConnectedBluetoothPrinterName());

  // 5. Form State for New Template Dialog (1:1 with Open Label modal)
  const [newForm, setNewForm] = useState({
    name: "Template Baru",
    widthMm: 50,
    heightMm: 30,
    columns: 3,
    colSpacingMm: 3,
    rowSpacingMm: 2,
    shape: "rectangle" as LabelShape,
    cornerRadiusMm: 2,
  });

  // Simpan active template ke localStorage saat berubah
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_TEMPLATE_KEY, JSON.stringify(activeTemplate));
    } catch (_) {}
  }, [activeTemplate]);

  // Listener event status Bluetooth Label Printer & Receipt Printer
  useEffect(() => {
    setIsBtConnected(isBluetoothLabelPrinterConnected());
    setBtPrinterName(getConnectedBluetoothLabelPrinterName());
    setReceiptPrinterName(getConnectedBluetoothPrinterName());

    // Auto-connect ke printer label yang tersimpan
    autoConnectBluetoothLabelPrinter().then((ok) => {
      if (ok) {
        setIsBtConnected(true);
        setBtPrinterName(getConnectedBluetoothLabelPrinterName());
      }
    });

    const handleLabelStatus = (e: any) => {
      setIsBtConnected(e.detail?.connected ?? isBluetoothLabelPrinterConnected());
      setBtPrinterName(e.detail?.name ?? getConnectedBluetoothLabelPrinterName());
    };

    const handleReceiptStatus = (e: any) => {
      setReceiptPrinterName(e.detail?.name ?? getConnectedBluetoothPrinterName());
    };

    window.addEventListener("pos_bluetooth_label_status", handleLabelStatus);
    window.addEventListener("pos_bluetooth_status", handleReceiptStatus);
    return () => {
      window.removeEventListener("pos_bluetooth_label_status", handleLabelStatus);
      window.removeEventListener("pos_bluetooth_status", handleReceiptStatus);
    };
  }, []);

  // Simpan library templates ke localStorage
  const saveTemplatesToStorage = (newList: OpenLabelTemplate[]) => {
    setSavedTemplates(newList);
    try {
      localStorage.setItem(STORAGE_SAVED_TEMPLATES_KEY, JSON.stringify(newList));
    } catch (_) {}
  };

  // Kalkulasi Total Lebar Pita Roll Kertas Fisik
  const totalRollWidthMm = useMemo(() => {
    const cols = Math.max(1, activeTemplate.columns);
    const spacing = cols > 1 ? (cols - 1) * (activeTemplate.colSpacingMm || 0) : 0;
    return activeTemplate.widthMm * cols + spacing;
  }, [activeTemplate.widthMm, activeTemplate.columns, activeTemplate.colSpacingMm]);

  // Rekomendasi Printer Berdasarkan Lebar Roll
  const printerRecommendation = useMemo(() => {
    if (totalRollWidthMm <= 58) {
      return {
        label: "Printer Thermal 58mm & Barcode Mini",
        color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        desc: "Dapat dicetak di printer mini 58mm atau printer barcode label portable.",
      };
    } else if (totalRollWidthMm <= 80) {
      return {
        label: "Printer 80mm / Xprinter XP-365B",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        desc: "Sangat cocok untuk Xprinter XP-365B, Kassen BT-P3000, atau roll 80mm.",
      };
    } else if (totalRollWidthMm <= 108) {
      return {
        label: "Standar Industri Xprinter XP-420B (108mm)",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
        desc: "Standar paling laris untuk Xprinter XP-420B, Postek, TSC, Argox, Kassen E-460.",
      };
    } else {
      return {
        label: `Printer Label Lebar (> ${totalRollWidthMm}mm)`,
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        desc: `Memerlukan printer barcode dengan feed roll minimal ${Math.ceil(totalRollWidthMm + 4)}mm.`,
      };
    }
  }, [totalRollWidthMm]);

  // Dummy / Real Product Data untuk Preview
  const previewProduct: LabelProductData = useMemo(() => {
    const firstProduct = state.products?.[0];
    if (firstProduct) {
      return {
        id: firstProduct.id,
        name: firstProduct.name,
        price: firstProduct.price,
        barcode: firstProduct.barcode || firstProduct.sku || "8991234567890",
        sku: firstProduct.sku || "SKU-PROD-01",
        categoryName: "Fashion & Busana",
        brandName: "Brand Exclusive",
      };
    }
    return {
      id: "demo-1",
      name: "Kemeja Casual Katun Pria",
      price: 125000,
      barcode: "8992775312019",
      sku: "KMJ-SLM-01",
      categoryName: "Pakaian Pria",
      brandName: "Tokoryo",
    };
  }, [state.products]);

  // Helper konversi objek options untuk preview LabelSticker
  const stickerOptions: LabelPrintOptions = useMemo(() => {
    const base = loadLabelOptions();
    return {
      ...base,
      widthMm: activeTemplate.widthMm,
      heightMm: activeTemplate.heightMm,
      columns: activeTemplate.columns,
      gapHorizontalMm: activeTemplate.colSpacingMm,
      gapVerticalMm: activeTemplate.rowSpacingMm,
      showStoreName: activeTemplate.showStoreName,
      showName: activeTemplate.showProductName,
      showProductName: activeTemplate.showProductName,
      showBarcode: activeTemplate.showBarcode,
      showBarcodeText: activeTemplate.showBarcodeText,
      showPrice: activeTemplate.showPrice,
      showSku: activeTemplate.showSku,
      showCategory: activeTemplate.showCategory,
      showBrand: activeTemplate.showBrand,
      barcodeAreaWidthPercent: 100,
    };
  }, [activeTemplate]);

  // Terapkan template ke modul cetak barcode utama (pos_label_options)
  const handleApplyToMainBarcode = () => {
    const currentOptions = loadLabelOptions();
    const updatedOptions: LabelPrintOptions = {
      ...currentOptions,
      widthMm: activeTemplate.widthMm,
      heightMm: activeTemplate.heightMm,
      columns: activeTemplate.columns,
      gapHorizontalMm: activeTemplate.colSpacingMm,
      gapVerticalMm: activeTemplate.rowSpacingMm,
      showStoreName: activeTemplate.showStoreName,
      showName: activeTemplate.showProductName,
      showBarcode: activeTemplate.showBarcode,
      showBarcodeText: activeTemplate.showBarcodeText,
      showPrice: activeTemplate.showPrice,
      showSku: activeTemplate.showSku,
      showCategory: activeTemplate.showCategory,
      showBrand: activeTemplate.showBrand,
      presetId: activeTemplate.id,
    };
    saveLabelOptions(updatedOptions);
    toast.success("Berhasil diterapkan!", {
      description: `Ukuran ${activeTemplate.widthMm} x ${activeTemplate.heightMm} mm (${activeTemplate.columns} kolom) kini menjadi default di menu Cetak Barcode.`,
    });
  };

  // Simpan template saat ini ke daftar template kustom
  const handleSaveCurrentTemplate = () => {
    const isExisting = savedTemplates.some((t) => t.id === activeTemplate.id);
    let updatedList: OpenLabelTemplate[];

    if (isExisting) {
      updatedList = savedTemplates.map((t) =>
        t.id === activeTemplate.id ? { ...activeTemplate } : t
      );
      toast.success("Template berhasil diperbarui!");
    } else {
      const newCustom: OpenLabelTemplate = {
        ...activeTemplate,
        id: `custom-${Date.now()}`,
      };
      updatedList = [newCustom, ...savedTemplates];
      setActiveTemplate(newCustom);
      toast.success("Template baru berhasil disimpan!");
    }
    saveTemplatesToStorage(updatedList);
  };

  // Buat template baru dari Modal Open Label
  const handleCreateNewTemplate = () => {
    const newTpl: OpenLabelTemplate = {
      id: `custom-${Date.now()}`,
      name: newForm.name || "Template Kustom",
      widthMm: Number(newForm.widthMm) || 50,
      heightMm: Number(newForm.heightMm) || 30,
      columns: Math.max(1, Number(newForm.columns) || 1),
      colSpacingMm: Number(newForm.colSpacingMm) || 2,
      rowSpacingMm: Number(newForm.rowSpacingMm) || 2,
      shape: newForm.shape || "rectangle",
      cornerRadiusMm: Number(newForm.cornerRadiusMm) || 2,
      showStoreName: false,
      showProductName: true,
      showBarcode: true,
      showBarcodeText: true,
      showPrice: true,
      showSku: false,
      showCategory: false,
      showBrand: false,
    };

    const updated = [newTpl, ...savedTemplates];
    saveTemplatesToStorage(updated);
    setActiveTemplate(newTpl);
    setIsNewDialogOpen(false);
    toast.success(`Template "${newTpl.name}" siap digunakan!`);
  };

  // Deteksi jika perangkat yang terhubung diduga printer struk kasir
  const isSuspectedReceiptPrinter = useMemo(() => {
    const name = (btPrinterName || "").toLowerCase();
    return (
      name.includes("pos-58") ||
      name.includes("pos-80") ||
      name.includes("58mm") ||
      name.includes("80mm") ||
      name.includes("rpp02") ||
      name.includes("goojprt") ||
      name.includes("eppos") ||
      name.includes("receipt")
    );
  }, [btPrinterName]);

  // 🔌 Handler Koneksi Bluetooth Khusus Printer Label
  const handleConnectBt = async () => {
    setIsConnectingBt(true);
    try {
      const res = await connectBluetoothLabelPrinter();
      if (res.success) {
        setIsBtConnected(true);
        setBtPrinterName(res.name || "Printer Label Bluetooth");
        toast.success(`Terhubung ke Printer Label: ${res.name || "Printer Label"}`);
      } else {
        toast.info(res.message);
      }
    } catch (err: any) {
      toast.error("Gagal menghubungkan Printer Label: " + (err?.message || "Pastikan Bluetooth aktif"));
    } finally {
      setIsConnectingBt(false);
    }
  };

  // ❌ Handler Putus Bluetooth Printer Label
  const handleDisconnectBt = () => {
    disconnectBluetoothLabelPrinter();
    setIsBtConnected(false);
    setBtPrinterName(null);
    toast.info("Koneksi Printer Label Bluetooth diputuskan.");
  };

  // 🖨️ Handler Cetak Langsung ke Printer Label via Bluetooth (Format TSPL)
  const handlePrintBluetooth = async () => {
    setIsPrintingBt(true);
    try {
      let connected = isBluetoothLabelPrinterConnected();
      if (!connected) {
        toast.info("Menghubungkan ke Printer Label Bluetooth...");
        const res = await connectBluetoothLabelPrinter();
        if (!res.success) {
          toast.error(res.message || "Gagal menghubungkan Printer Label Bluetooth");
          return;
        }
        connected = true;
        setIsBtConnected(true);
        setBtPrinterName(res.name || "Printer Label Bluetooth");
      }

      // Bangun antrean keping stiker sesuai jumlah baris yang dipilih
      const printItems: LabelProductData[] = [];
      const rows = Math.max(1, testPrintRows);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < activeTemplate.columns; col++) {
          printItems.push({
            ...previewProduct,
            name: activeTemplate.columns > 1 ? `${previewProduct.name} #${col + 1}` : previewProduct.name,
          });
        }
      }

      toast.info("Mengirim perintah TSPL stiker ke Printer Label...");
      const tsplData = generateTsplLabel(printItems, stickerOptions);
      const success = await sendBluetoothLabelPrintData(tsplData);

      if (success) {
        toast.success("Stiker berhasil dicetak ke Printer Label!", {
          description: `${rows} baris (${activeTemplate.columns * rows} stiker) terkirim ke ${btPrinterName || "Printer Label"}.`,
        });
      } else {
        toast.error("Gagal mengirim data ke Printer Label. Coba hubungkan ulang.");
      }
    } catch (err: any) {
      console.error("Bluetooth print error:", err);
      toast.error("Error cetak Printer Label: " + (err?.message || "Periksa koneksi Bluetooth"));
    } finally {
      setIsPrintingBt(false);
    }
  };

  // 🖨️ Handler Tes Cetak via Browser (Sistem / PDF)
  const handleTestPrint = () => {
    const currentOptions = loadLabelOptions();
    const testOptions: LabelPrintOptions = {
      ...currentOptions,
      widthMm: activeTemplate.widthMm,
      heightMm: activeTemplate.heightMm,
      columns: activeTemplate.columns,
      gapHorizontalMm: activeTemplate.colSpacingMm,
      gapVerticalMm: activeTemplate.rowSpacingMm,
      showStoreName: activeTemplate.showStoreName,
      showName: activeTemplate.showProductName,
      showBarcode: activeTemplate.showBarcode,
      showBarcodeText: activeTemplate.showBarcodeText,
      showPrice: activeTemplate.showPrice,
      showSku: activeTemplate.showSku,
      showCategory: activeTemplate.showCategory,
      showBrand: activeTemplate.showBrand,
      customStoreName: state.settings?.businessName || state.settings?.store_name || "Toko Saya",
    };

    const testItems: { product: LabelProductData; count: number }[] = [];
    const rows = Math.max(1, testPrintRows);
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < activeTemplate.columns; i++) {
        testItems.push({
          product: {
            ...previewProduct,
            storeName: state.settings?.businessName || state.settings?.store_name || "Toko Saya",
            name: activeTemplate.columns > 1 ? `${previewProduct.name} #${i + 1}` : previewProduct.name,
          },
          count: 1,
        });
      }
    }

    triggerBrowserLabelPrint(testItems, testOptions);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Desain Label (OpenLabel Studio)
              </h1>
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                Visual Blueprint
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulasi fisik roll stiker barcode multi-kolom dengan caliper interaktif & direct print Bluetooth.
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Badge Printer Label Bluetooth */}
          {isBtConnected ? (
            <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Tag className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="max-w-[140px] truncate">Label: {btPrinterName || "Printer Label"}</span>
              <button
                type="button"
                onClick={handleDisconnectBt}
                title="Putuskan Printer Label"
                className="text-muted-foreground hover:text-destructive ml-1 p-0.5"
              >
                <Unplug className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectBt}
              disabled={isConnectingBt}
              className="gap-1.5 h-9 text-xs border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-100/70 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900"
            >
              {isConnectingBt ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Tag className="w-4 h-4 text-purple-600" />}
              <span>{isConnectingBt ? "Memindai..." : "Hubungkan Printer Label"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewDialogOpen(true)}
            className="gap-1.5 h-9"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Template Baru</span>
          </Button>

          {/* Tombol Cetak Printer Label */}
          <Button
            size="sm"
            onClick={handlePrintBluetooth}
            disabled={isPrintingBt}
            className="gap-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white shadow-xs font-semibold"
          >
            {isPrintingBt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{isPrintingBt ? "Mengirim..." : "Cetak ke Printer Label"}</span>
          </Button>

          {/* Tombol Cetak Browser */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPrint}
            className="gap-1.5 h-9"
          >
            <Printer className="w-4 h-4 text-muted-foreground" />
            <span>Cetak Sistem (PDF)</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleApplyToMainBarcode}
            className="gap-1.5 h-9 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Terapkan ke Kasir</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Studio Grid (Split 2 Sisi Persis Open Label) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* SISI KIRI: CONTROLLER / FORM SETTINGS                                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card: Pemilih Preset Cepat */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Pilih Template Populer</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveCurrentTemplate}
                  className="h-7 text-xs gap-1 text-primary hover:text-primary"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </Button>
              </div>
              <CardDescription className="text-xs">
                Pilih ukuran stiker roll standar yang banyak digunakan di Indonesia.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Select
                value={activeTemplate.id}
                onValueChange={(val) => {
                  const found = savedTemplates.find((t) => t.id === val);
                  if (found) {
                    setActiveTemplate(found);
                    toast.info(`Memuat template: ${found.name}`);
                  }
                }}
              >
                <SelectTrigger className="w-full h-10 text-xs">
                  <SelectValue placeholder="Pilih Template Ukuran..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {savedTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="font-medium">{t.name}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {t.widthMm}x{t.heightMm}mm • {t.columns} Kolom
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Nama Template Aktif */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-muted-foreground">Nama Template</Label>
                <Input
                  value={activeTemplate.name}
                  onChange={(e) =>
                    setActiveTemplate({ ...activeTemplate, name: e.target.value })
                  }
                  className="h-9 text-xs font-medium"
                  placeholder="Beri nama template..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: Template Setting (Ukuran 1 Keping Stiker) */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Template Setting</CardTitle>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  1 Keping Stiker
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Dimensi fisik per satu lembar stiker (bukan lebar seluruh roll kertas).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Lebar (Width) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Width (Lebar)</Label>
                    <span className="text-xs font-bold text-primary">{activeTemplate.widthMm} mm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          widthMm: Math.max(15, activeTemplate.widthMm - 1),
                        })
                      }
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeTemplate.widthMm}
                      onChange={(e) =>
                        setActiveTemplate({
                          ...activeTemplate,
                          widthMm: Math.max(10, Math.min(150, Number(e.target.value) || 10)),
                        })
                      }
                      className="h-9 text-center font-bold text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          widthMm: Math.min(150, activeTemplate.widthMm + 1),
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Tinggi (Height) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Height (Tinggi)</Label>
                    <span className="text-xs font-bold text-primary">{activeTemplate.heightMm} mm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          heightMm: Math.max(10, activeTemplate.heightMm - 1),
                        })
                      }
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeTemplate.heightMm}
                      onChange={(e) =>
                        setActiveTemplate({
                          ...activeTemplate,
                          heightMm: Math.max(8, Math.min(150, Number(e.target.value) || 8)),
                        })
                      }
                      className="h-9 text-center font-bold text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          heightMm: Math.min(150, activeTemplate.heightMm + 1),
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bentuk Stiker (Shape) */}
              <div className="space-y-2 pt-1 border-t">
                <Label className="text-xs font-medium text-muted-foreground">Bentuk Stiker (Shape)</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Persegi Rounded */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTemplate({ ...activeTemplate, shape: "rectangle" })
                    }
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      activeTemplate.shape === "rectangle"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="w-8 h-6 border-2 border-current rounded-md mb-1.5" />
                    <span className="text-[11px] font-medium">Persegi</span>
                  </button>

                  {/* Lingkaran / Bulat */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTemplate({
                        ...activeTemplate,
                        shape: "circle",
                        heightMm: activeTemplate.widthMm,
                      })
                    }
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      activeTemplate.shape === "circle"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="w-7 h-7 border-2 border-current rounded-full mb-1.5" />
                    <span className="text-[11px] font-medium">Lingkaran</span>
                  </button>

                  {/* Oval */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTemplate({ ...activeTemplate, shape: "oval" })
                    }
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      activeTemplate.shape === "oval"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-muted hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="w-9 h-6 border-2 border-current rounded-full mb-1.5" />
                    <span className="text-[11px] font-medium">Oval</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Column Setting (Roll Kolom Sejajar) */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Column Setting</CardTitle>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  Multi-Line Roll
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Pengaturan jumlah baris stiker yang berdampingan dalam satu gulungan pita roll.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Columns */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Columns (Kolom)</Label>
                    <span className="text-xs font-bold text-primary">{activeTemplate.columns} Baris</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          columns: Math.max(1, activeTemplate.columns - 1),
                        })
                      }
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeTemplate.columns}
                      onChange={(e) =>
                        setActiveTemplate({
                          ...activeTemplate,
                          columns: Math.max(1, Math.min(4, Number(e.target.value) || 1)),
                        })
                      }
                      className="h-9 text-center font-bold text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          columns: Math.min(4, activeTemplate.columns + 1),
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Col Spacing */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Col Spacing (Celah)</Label>
                    <span className="text-xs font-bold text-primary">{activeTemplate.colSpacingMm} mm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          colSpacingMm: Math.max(0, activeTemplate.colSpacingMm - 0.5),
                        })
                      }
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      step="0.5"
                      value={activeTemplate.colSpacingMm}
                      onChange={(e) =>
                        setActiveTemplate({
                          ...activeTemplate,
                          colSpacingMm: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                        })
                      }
                      className="h-9 text-center font-bold text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-xs"
                      onClick={() =>
                        setActiveTemplate({
                          ...activeTemplate,
                          colSpacingMm: Math.min(10, activeTemplate.colSpacingMm + 0.5),
                        })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Kalkulator Total Lebar Roll Info Box */}
              <div className={`p-3 rounded-xl border ${printerRecommendation.color} space-y-1`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Total Lebar Pita Kertas Roll:</span>
                  <span className="text-sm font-black">{totalRollWidthMm} mm</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {printerRecommendation.desc}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Direct Bluetooth Printing Panel Khusus Printer Label */}
          <Card className="rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/40 via-background to-background dark:from-purple-950/20 shadow-xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <Tag className="w-4 h-4" />
                  <CardTitle className="text-sm font-semibold">Cetak ke Printer Label (Bluetooth)</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  Khusus Stiker TSPL
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Khusus untuk <strong>Printer Label Barcode Roll</strong> (Xprinter XP-420B, XP-365B, Niimbot, Kassen, Panda Label). Jalur terpisah dari printer struk kasir.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3.5">
              {/* Status Device */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isBtConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-foreground">
                      {isBtConnected ? btPrinterName || "Printer Label Bluetooth" : "Printer Label Belum Terhubung"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {isBtConnected ? "Siap cetak stiker format TSPL (203 DPI)" : "Nyalakan Bluetooth pada printer label Anda"}
                    </div>
                  </div>
                </div>

                {isBtConnected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectBt}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Putuskan
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectBt}
                    disabled={isConnectingBt}
                    className="h-8 px-3 text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                  >
                    {isConnectingBt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                    <span>{isConnectingBt ? "Memindai..." : "Hubungkan"}</span>
                  </Button>
                )}
              </div>

              {/* Warning jika perangkat yang terhubung diduga printer struk kasir */}
              {isBtConnected && isSuspectedReceiptPrinter && (
                <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Perhatian:</strong> Perangkat <code>{btPrinterName}</code> terdeteksi sebagai printer struk kasir. Pastikan Anda memilih <strong>Printer Label Stiker Roll</strong> (seperti Xprinter XP-420B, XP-365B, Kassen, Niimbot) agar stiker tercetak pas pada batas kertas roll dan tidak melompat.
                  </div>
                </div>
              )}

              {/* Info jika printer struk kasir terhubung di kasir tapi printer label belum */}
              {!isBtConnected && receiptPrinterName && (
                <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    Di kasir saat ini terhubung <strong>{receiptPrinterName}</strong> (Printer Struk Kasir). Silakan klik <strong>"Hubungkan"</strong> di atas untuk memasangkan Printer Label stiker Anda secara mandiri.
                  </div>
                </div>
              )}

              {/* Selector Jumlah Baris Cetak */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Jumlah Baris Cetak:</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Total: {activeTemplate.columns * testPrintRows} stiker ({activeTemplate.columns} kolom x {testPrintRows} baris)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setTestPrintRows((prev) => Math.max(1, prev - 1))}
                  >
                    -
                  </Button>
                  <span className="w-10 text-center font-bold text-xs font-mono">
                    {testPrintRows} baris
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setTestPrintRows((prev) => Math.min(50, prev + 1))}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Tombol Cetak Bluetooth Besar */}
              <Button
                onClick={handlePrintBluetooth}
                disabled={isPrintingBt}
                className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs gap-2 shadow-xs"
              >
                {isPrintingBt ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Tag className="w-4 h-4" />
                )}
                <span>
                  {isPrintingBt ? "Mengirim Data ke Printer Label..." : "Cetak Stiker ke Printer Label"}
                </span>
              </Button>
            </CardContent>
          </Card>

          {/* Card: Elemen Konten Label */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-semibold">Elemen yang Ditampilkan</CardTitle>
              <CardDescription className="text-xs">
                Pilih teks dan informasi yang akan dicetak di atas stiker.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={activeTemplate.showStoreName}
                    onChange={(e) =>
                      setActiveTemplate({ ...activeTemplate, showStoreName: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Nama Toko</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={activeTemplate.showProductName}
                    onChange={(e) =>
                      setActiveTemplate({ ...activeTemplate, showProductName: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-foreground">Nama Produk</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={activeTemplate.showBarcode}
                    onChange={(e) =>
                      setActiveTemplate({ ...activeTemplate, showBarcode: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-foreground">Garis Barcode</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={activeTemplate.showBarcodeText}
                    onChange={(e) =>
                      setActiveTemplate({ ...activeTemplate, showBarcodeText: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Nomor Barcode</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={activeTemplate.showPrice}
                    onChange={(e) =>
                      setActiveTemplate({ ...activeTemplate, showPrice: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-foreground">Harga Jual</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border hover:bg-muted/30 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={activeTemplate.showSku}
                    onChange={(e) =>
                      setActiveTemplate({ ...activeTemplate, showSku: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Kode SKU</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SISI KANAN: LIVE INTERACTIVE ROLL PAPER CANVAS (PERSIS OPEN LABEL)         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card Preview Kanvas */}
          <Card className="rounded-2xl border shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span>Simulasi Pita Roll Stiker Fisik</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Live Visualizer
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Diagram skala 1:1 proporsi kertas stiker dengan penggaris caliper interaktif.
                  </CardDescription>
                </div>

                {/* Toolbar Preview */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRealContent(!showRealContent)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {showRealContent ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{showRealContent ? "Desain Nyata" : "Blueprint Kosong"}</span>
                  </Button>

                  <div className="flex items-center rounded-lg border bg-background p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] font-mono px-1.5 font-bold">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Kanvas Biru Muda Terbuka (Persis Open Label Background Liner) */}
            <CardContent className="p-8 flex items-center justify-center min-h-[460px] bg-slate-50/80 dark:bg-slate-950/40 overflow-auto">
              <div
                className="transition-transform duration-200 ease-out origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Roll Backing Paper Liner (Warna Biru Langit Lembut seperti Open Label) */}
                <div
                  className="relative p-6 rounded-xl border border-sky-200 dark:border-sky-800 shadow-md flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(224, 242, 254, 0.75)",
                    minWidth: "320px",
                  }}
                >
                  {/* Caliper: Dimensi Tinggi (Height) di Sisi Kiri Vertikal */}
                  <div
                    className="absolute left-1 flex items-center justify-center"
                    style={{
                      height: `${activeTemplate.heightMm * 3.78}px`,
                      top: "24px",
                    }}
                  >
                    <div className="relative flex items-center">
                      <div className="absolute -left-1 w-2.5 h-[1px] bg-slate-600 dark:bg-slate-300" />
                      <div
                        className="w-[1.5px] bg-slate-600 dark:bg-slate-300"
                        style={{ height: `${activeTemplate.heightMm * 3.78}px` }}
                      />
                      <div
                        className="absolute -left-1 w-2.5 h-[1px] bg-slate-600 dark:bg-slate-300"
                        style={{ top: `${activeTemplate.heightMm * 3.78}px` }}
                      />
                      <div className="absolute -left-16 text-[11px] font-bold font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap rotate-[-90deg]">
                        {activeTemplate.heightMm} mm
                      </div>
                    </div>
                  </div>

                  {/* Wrapper Kepingan Stiker Horizontal */}
                  <div className="flex flex-col items-center">
                    {/* Caliper: Dimensi Lebar (Width) di Atas Stiker Pertama */}
                    <div className="w-full flex items-center justify-start pb-2.5 relative">
                      <div
                        className="relative flex flex-col items-center"
                        style={{ width: `${activeTemplate.widthMm * 3.78}px` }}
                      >
                        <span className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-200 mb-1">
                          {activeTemplate.widthMm} mm
                        </span>
                        <div className="w-full relative flex items-center">
                          <div className="absolute left-0 -top-1 w-[1px] h-2.5 bg-slate-600 dark:bg-slate-300" />
                          <div className="w-full h-[1.5px] bg-slate-600 dark:bg-slate-300" />
                          <div className="absolute right-0 -top-1 w-[1px] h-2.5 bg-slate-600 dark:bg-slate-300" />
                        </div>
                      </div>

                      {/* Caliper Celah (Col Spacing) jika lebih dari 1 kolom */}
                      {activeTemplate.columns > 1 && (
                        <div
                          className="flex flex-col items-center justify-center relative"
                          style={{ width: `${activeTemplate.colSpacingMm * 3.78}px` }}
                        >
                          <span className="text-[9px] font-bold font-mono text-slate-500 absolute -top-4 whitespace-nowrap">
                            {activeTemplate.colSpacingMm}mm
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Baris Kepingan Stiker Putih */}
                    <div
                      className="flex items-center"
                      style={{ gap: `${activeTemplate.colSpacingMm * 3.78}px` }}
                    >
                      {Array.from({ length: activeTemplate.columns }).map((_, index) => {
                        const isCircle = activeTemplate.shape === "circle";
                        const isOval = activeTemplate.shape === "oval";
                        const radiusPx = isCircle
                          ? "9999px"
                          : isOval
                          ? "9999px"
                          : `${activeTemplate.cornerRadiusMm * 3.78}px`;

                        return (
                          <div
                            key={index}
                            className="bg-white text-black shadow-lg border border-slate-300/80 relative flex items-center justify-center overflow-hidden transition-all select-none"
                            style={{
                              width: `${activeTemplate.widthMm * 3.78}px`,
                              height: `${activeTemplate.heightMm * 3.78}px`,
                              borderRadius: radiusPx,
                            }}
                          >
                            {/* Jika Mode Tampilkan Konten Nyata */}
                            {showRealContent ? (
                              <div className="w-full h-full p-1 flex flex-col items-center justify-between text-center overflow-hidden leading-tight">
                                {activeTemplate.showStoreName && (
                                  <div className="text-[9px] font-bold text-slate-800 tracking-wider uppercase truncate w-full">
                                    {state.settings?.businessName || state.settings?.store_name || "TOKORYO POS"}
                                  </div>
                                )}

                                {activeTemplate.showProductName && (
                                  <div className="text-[10px] font-semibold text-slate-900 line-clamp-1 w-full px-0.5">
                                    {previewProduct.name}
                                  </div>
                                )}

                                {/* Barcode 1D Preview */}
                                {activeTemplate.showBarcode && (
                                  <div className="w-full px-1 flex flex-col items-center my-auto">
                                    <svg
                                      className="w-full h-5 max-h-7"
                                      preserveAspectRatio="none"
                                      viewBox="0 0 100 24"
                                    >
                                      <rect x="2" y="0" width="3" height="24" fill="#000" />
                                      <rect x="7" y="0" width="2" height="24" fill="#000" />
                                      <rect x="12" y="0" width="4" height="24" fill="#000" />
                                      <rect x="18" y="0" width="1" height="24" fill="#000" />
                                      <rect x="22" y="0" width="3" height="24" fill="#000" />
                                      <rect x="27" y="0" width="2" height="24" fill="#000" />
                                      <rect x="31" y="0" width="4" height="24" fill="#000" />
                                      <rect x="38" y="0" width="2" height="24" fill="#000" />
                                      <rect x="42" y="0" width="3" height="24" fill="#000" />
                                      <rect x="48" y="0" width="1" height="24" fill="#000" />
                                      <rect x="52" y="0" width="4" height="24" fill="#000" />
                                      <rect x="58" y="0" width="2" height="24" fill="#000" />
                                      <rect x="63" y="0" width="3" height="24" fill="#000" />
                                      <rect x="68" y="0" width="2" height="24" fill="#000" />
                                      <rect x="73" y="0" width="4" height="24" fill="#000" />
                                      <rect x="80" y="0" width="2" height="24" fill="#000" />
                                      <rect x="85" y="0" width="3" height="24" fill="#000" />
                                      <rect x="91" y="0" width="2" height="24" fill="#000" />
                                      <rect x="95" y="0" width="3" height="24" fill="#000" />
                                    </svg>

                                    {activeTemplate.showBarcodeText && (
                                      <span className="text-[8px] font-mono tracking-widest text-slate-800 -mt-0.5">
                                        {previewProduct.barcode}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Harga & SKU */}
                                <div className="w-full flex items-center justify-between px-1 text-[9px] mt-auto">
                                  {activeTemplate.showSku && (
                                    <span className="text-[8px] font-mono text-slate-500 truncate max-w-[45%]">
                                      {previewProduct.sku}
                                    </span>
                                  )}
                                  {activeTemplate.showPrice && (
                                    <span className="font-extrabold text-[11px] text-black ml-auto">
                                      Rp {previewProduct.price?.toLocaleString("id-ID")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Mode Blueprint Kosong Persis Open Label */
                              <div className="flex flex-col items-center justify-center text-slate-400 font-mono text-[10px]">
                                <ScanBarcode className="w-5 h-5 opacity-30 mb-1" />
                                <span>Kolom #{index + 1}</span>
                              </div>
                            )}

                            {/* Badge Nomor Kolom saat Hover */}
                            <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity bg-black/60 text-white rounded text-[8px] px-1 py-0.5">
                              #{index + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Koleksi Template Saya (My Templates Grid) */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Daftar Koleksi Template Saya</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {savedTemplates.length} Template Tersedia
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {savedTemplates.map((t) => {
                  const isActive = t.id === activeTemplate.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setActiveTemplate(t)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                        isActive
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                          : "border-muted hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="font-semibold text-xs text-foreground line-clamp-1">
                          {t.name}
                        </div>
                        {isActive && (
                          <Badge variant="default" className="text-[9px] h-4 px-1 shrink-0">
                            Aktif
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                        <span>{t.widthMm} × {t.heightMm} mm</span>
                        <span>•</span>
                        <span>{t.columns} Kolom</span>
                        <span>•</span>
                        <span className="capitalize">{t.shape}</span>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          Roll: {(t.widthMm * t.columns) + (t.columns > 1 ? (t.columns - 1) * t.colSpacingMm : 0)} mm
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTemplate(t);
                            handleApplyToMainBarcode();
                          }}
                        >
                          Pilih & Terapkan
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL DIALOG "NEW TEMPLATE" (PERSIS 1:1 SEPERTI GAMBAR OPEN LABEL)      */}
      {/* ========================================================================= */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border shadow-2xl">
          {/* Header Biru Khas Open Label */}
          <div className="bg-blue-600 text-white p-4 px-6 flex items-center justify-between">
            <DialogTitle className="text-base font-semibold tracking-wide text-white">
              New Template
            </DialogTitle>
          </div>

          {/* Body Split 2 Sisi (Kiri Form, Kanan Visual Preview) */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
            {/* Form Inputs Sisi Kiri */}
            <div className="md:col-span-6 p-6 space-y-5 border-r">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Name:</Label>
                <Input
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Template"
                  className="h-9 border-b-2 border-t-0 border-x-0 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-600 text-sm font-medium"
                />
              </div>

              {/* Template Setting */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <span>Template Setting</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Width</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={newForm.widthMm}
                        onChange={(e) =>
                          setNewForm({ ...newForm, widthMm: Number(e.target.value) || 10 })
                        }
                        className="h-9 text-xs font-semibold pr-8"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-slate-400">mm</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Height</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={newForm.heightMm}
                        onChange={(e) =>
                          setNewForm({ ...newForm, heightMm: Number(e.target.value) || 8 })
                        }
                        className="h-9 text-xs font-semibold pr-8"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-slate-400">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column Setting */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <span>Column Setting</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Columns</Label>
                    <Input
                      type="number"
                      value={newForm.columns}
                      onChange={(e) =>
                        setNewForm({
                          ...newForm,
                          columns: Math.max(1, Math.min(4, Number(e.target.value) || 1)),
                        })
                      }
                      className="h-9 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Col Spacing</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        value={newForm.colSpacingMm}
                        onChange={(e) =>
                          setNewForm({ ...newForm, colSpacingMm: Number(e.target.value) || 0 })
                        }
                        className="h-9 text-xs font-semibold pr-8"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-slate-400">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <span>Advanced Settings</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Shape</Label>
                  <div className="flex items-center gap-3">
                    {/* Rectangle */}
                    <button
                      type="button"
                      onClick={() => setNewForm({ ...newForm, shape: "rectangle" })}
                      className={`w-14 h-9 rounded-md border-2 flex items-center justify-center transition-all ${
                        newForm.shape === "rectangle"
                          ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-200"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="w-9 h-5 border-2 border-blue-500 rounded-xs bg-white" />
                    </button>

                    {/* Circle */}
                    <button
                      type="button"
                      onClick={() =>
                        setNewForm({
                          ...newForm,
                          shape: "circle",
                          heightMm: newForm.widthMm,
                        })
                      }
                      className={`w-14 h-9 rounded-md border-2 flex items-center justify-center transition-all ${
                        newForm.shape === "circle"
                          ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-200"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-cyan-100 border border-cyan-300" />
                    </button>

                    {/* Oval */}
                    <button
                      type="button"
                      onClick={() => setNewForm({ ...newForm, shape: "oval" })}
                      className={`w-14 h-9 rounded-md border-2 flex items-center justify-center transition-all ${
                        newForm.shape === "oval"
                          ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-200"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="w-8 h-5 rounded-full bg-cyan-100 border border-cyan-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tombol Create Biru Open Label */}
              <div className="pt-4">
                <Button
                  onClick={handleCreateNewTemplate}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Create
                </Button>
              </div>
            </div>

            {/* Visual Preview Sisi Kanan (Persis Screenshot Open Label) */}
            <div className="md:col-span-6 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
              <div className="relative flex flex-col items-center">
                {/* Backing paper biru transparan */}
                <div
                  className="relative p-6 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: "#e0f2fe", minWidth: "260px" }}
                >
                  {/* Caliper Height vertikal di sisi kiri */}
                  <div
                    className="absolute left-1 flex items-center"
                    style={{
                      height: `${newForm.heightMm * 2.8}px`,
                      top: "24px",
                    }}
                  >
                    <div className="relative flex items-center">
                      <div className="w-[1.5px] bg-slate-600" style={{ height: `${newForm.heightMm * 2.8}px` }} />
                      <div className="absolute -left-16 text-[10px] font-bold font-mono text-slate-700 whitespace-nowrap rotate-[-90deg]">
                        {newForm.heightMm} mm
                      </div>
                    </div>
                  </div>

                  {/* Kepingan Stiker Putih */}
                  <div className="flex flex-col items-center">
                    {/* Caliper Width horizontal di atas stiker pertama */}
                    <div className="w-full flex items-center justify-start pb-2">
                      <div
                        className="flex flex-col items-center"
                        style={{ width: `${newForm.widthMm * 2.8}px` }}
                      >
                        <span className="text-[10px] font-bold font-mono text-slate-700 mb-0.5">
                          {newForm.widthMm} mm
                        </span>
                        <div className="w-full h-[1.5px] bg-slate-600 relative">
                          <div className="absolute left-0 -top-1 w-[1px] h-2 bg-slate-600" />
                          <div className="absolute right-0 -top-1 w-[1px] h-2 bg-slate-600" />
                        </div>
                      </div>
                    </div>

                    {/* Stiker sejajar */}
                    <div className="flex items-center" style={{ gap: `${newForm.colSpacingMm * 2.8}px` }}>
                      {Array.from({ length: newForm.columns }).map((_, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-300 shadow-sm"
                          style={{
                            width: `${newForm.widthMm * 2.8}px`,
                            height: `${newForm.heightMm * 2.8}px`,
                            borderRadius:
                              newForm.shape === "circle"
                                ? "9999px"
                                : newForm.shape === "oval"
                                ? "9999px"
                                : "6px",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-center mt-4 text-[11px] font-medium text-slate-500">
                  Total Lebar Roll: {newForm.widthMm * newForm.columns + (newForm.columns > 1 ? (newForm.columns - 1) * newForm.colSpacingMm : 0)} mm
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
