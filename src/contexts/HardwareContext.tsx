/**
 * HardwareContext.tsx
 * React Context untuk state dan operasi perangkat keras POS secara global
 * Dilengkapi Engine Auto-Detect, Plug & Play Hotplug Listeners, dan Sinkronisasi Universal (Receipt & Label Printer).
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  HardwareState,
  PrinterConnectionType,
  PrinterStatus,
  loadHardwareConfig,
  saveHardwareConfig,
  connectUsbPrinter,
  connectSerialPrinter,
  connectBluetoothPrinter,
  autoConnectBluetoothPrinter,
  isBluetoothPrinterConnected,
  getConnectedBluetoothPrinterName,
  configureNetworkPrinter,
  sendToPrinter,
  triggerCashDrawer,
  buildTestReceipt,
  buildReceipt,
  getActivePrinterType,
  printHardwareLabel,
  type ReceiptData,
} from '@/lib/hardwareManager';
import {
  type LabelProductData,
  type LabelPrintOptions,
} from '@/lib/labelPrinter';
import {
  runFullDeviceAutoDetect,
  registerHotplugListeners,
  type AutoDetectionReport,
} from '@/lib/deviceAutoDetector';
import { toast } from 'sonner';

interface HardwareContextValue {
  // State
  config: HardwareState;
  printerStatus: PrinterStatus;
  activePrinterType: PrinterConnectionType;
  lastDetectionReport: AutoDetectionReport | null;
  isScanningDevices: boolean;
  
  // Config actions
  updateConfig: (partial: Partial<HardwareState>) => void;
  
  // Auto detect
  autoDetectDevices: (showToast?: boolean) => Promise<AutoDetectionReport>;
  
  // Printer actions
  connectPrinter: (type: PrinterConnectionType, networkIp?: string, networkPort?: number) => Promise<boolean>;
  testPrint: () => Promise<boolean>;
  printReceipt: (data: ReceiptData) => Promise<boolean>;
  printLabel: (product: LabelProductData, opts: LabelPrintOptions) => Promise<boolean>;
  
  // Cash drawer
  openCashDrawer: () => Promise<boolean>;
  
  // Customer display
  broadcastToDisplay: (payload: CustomerDisplayPayload) => void;
  clearDisplay: () => void;
}

export interface CustomerDisplayPayload {
  type: 'cart_update' | 'checkout_done' | 'clear';
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceNumber?: string;
  cashierName?: string;
  customerName?: string;
  date?: string;
  time?: string;
  items?: Array<{ name: string; qty: number; price: number; subtotal: number }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paid?: number;
  change?: number;
  paymentMethod?: string;
  receiptFooter?: string;
  earnedPoints?: number;
  accumulatedPoints?: number;
}

const HardwareContext = createContext<HardwareContextValue | null>(null);

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pos_customer_display') : null;

export function HardwareProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<HardwareState>(loadHardwareConfig);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(() => {
    return isBluetoothPrinterConnected() ? 'connected' : 'disconnected';
  });
  const [activePrinterType, setActivePrinterType] = useState<PrinterConnectionType>(getActivePrinterType());
  const [lastDetectionReport, setLastDetectionReport] = useState<AutoDetectionReport | null>(null);
  const [isScanningDevices, setIsScanningDevices] = useState(false);

  useEffect(() => {
    saveHardwareConfig(config);
  }, [config]);

  const updateConfig = useCallback((partial: Partial<HardwareState>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  // 🔄 Real-time Global Event Listener for Bluetooth status synchronization
  useEffect(() => {
    const handleBtStatus = (e: any) => {
      const { connected } = e.detail || {};
      if (connected) {
        setPrinterStatus('connected');
        setActivePrinterType('bluetooth');
      } else {
        const current = getActivePrinterType();
        setActivePrinterType(current);
        setPrinterStatus(current !== 'none' ? 'connected' : 'disconnected');
      }
    };

    window.addEventListener('pos_bluetooth_status', handleBtStatus);
    return () => window.removeEventListener('pos_bluetooth_status', handleBtStatus);
  }, []);

  // 🔍 Auto-Detect All POS Devices
  const autoDetectDevices = useCallback(async (showToast: boolean = true): Promise<AutoDetectionReport> => {
    setIsScanningDevices(true);
    try {
      const report = await runFullDeviceAutoDetect();
      setLastDetectionReport(report);

      const currentActive = getActivePrinterType();
      if (currentActive !== 'none') {
        setPrinterStatus('connected');
        setActivePrinterType(currentActive);
      } else if (report.printer.connected) {
        setPrinterStatus('connected');
        setActivePrinterType(report.printer.type);
        updateConfig({ printer: { ...config.printer, connectionType: report.printer.type } });
      }

      if (showToast) {
        if (report.printer.connected) {
          toast.success(`🖨️ Auto-Detect: ${report.printer.name || 'Printer'} terhubung & siap cetak!`);
        } else if (report.printer.devicesFound > 0) {
          toast.info(`🔍 Ditemukan ${report.printer.devicesFound} printer. Klik "Hubungkan" untuk mengaktifkan.`);
        } else {
          toast.info("🔍 Pindai selesai. Scanner fisik aktif di seluruh halaman.");
        }
      }

      return report;
    } catch (err: any) {
      console.warn("autoDetectDevices error:", err);
      return {
        printer: { type: 'none', connected: false, devicesFound: 0, details: [] },
        scanner: { hidReady: true, webHidDevices: 0, camerasCount: 0, hasCameraPermission: false, details: [] },
        timestamp: new Date(),
      };
    } finally {
      setIsScanningDevices(false);
    }
  }, [config.printer, updateConfig]);

  // ⚡ Initial Auto-Detection and Hotplug listener registration
  useEffect(() => {
    // Run initial auto-detection silently on app load
    autoDetectDevices(false);

    // Register hotplug listeners (when USB / dongle is inserted)
    const cleanupHotplug = registerHotplugListeners(() => {
      autoDetectDevices(false);
    });

    return () => {
      cleanupHotplug();
    };
  }, [autoDetectDevices]);

  const connectPrinter = useCallback(async (
    type: PrinterConnectionType,
    networkIp?: string,
    networkPort?: number,
  ): Promise<boolean> => {
    setPrinterStatus('connecting');
    let result: { success: boolean; name?: string; message: string };

    if (type === 'usb') {
      result = await connectUsbPrinter();
    } else if (type === 'serial') {
      result = await connectSerialPrinter();
    } else if (type === 'bluetooth') {
      result = await connectBluetoothPrinter();
    } else if (type === 'network') {
      result = configureNetworkPrinter(networkIp || '', networkPort);
    } else {
      result = { success: false, message: 'Tipe koneksi tidak diketahui.' };
    }

    if (result.success) {
      setPrinterStatus('connected');
      setActivePrinterType(type);
      updateConfig({ 
        printer: { ...config.printer, connectionType: type },
        labelPrinterConnected: type === 'bluetooth' ? true : config.labelPrinterConnected
      });
      toast.success(result.message);
    } else {
      setPrinterStatus('error');
      toast.error(result.message);
    }
    return result.success;
  }, [config.printer, config.labelPrinterConnected, updateConfig]);

  const testPrint = useCallback(async (): Promise<boolean> => {
    let active = getActivePrinterType();
    if (active === 'none' && config.printer.connectionType === 'bluetooth') {
      const reconnected = await autoConnectBluetoothPrinter();
      if (reconnected) {
        active = 'bluetooth';
        setPrinterStatus('connected');
        setActivePrinterType('bluetooth');
      }
    }

    if (active === 'none') {
      // Fallback: trigger browser print dialog
      window.print();
      return true;
    }
    try {
      const btName = (getConnectedBluetoothPrinterName() || '').toLowerCase();
      const isLabelPrinter =
        btName.includes('xprinter') ||
        btName.includes('xp-420') ||
        btName.includes('xp-365') ||
        btName.includes('tspl') ||
        btName.includes('label');

      if (isLabelPrinter) {
        const testProduct: LabelProductData = {
          name: 'TEST STIKER XP-420B',
          barcode: '899123456789',
          price: 25000,
          sku: 'TEST-001',
          brand: 'TOKO POS',
        };
        const ok = await printHardwareLabel(testProduct, {
          presetId: '40x30',
          widthMm: 40,
          heightMm: 30,
          columns: 1,
          copies: 1,
          showStoreName: true,
          showName: true,
          showBarcode: true,
          showBarcodeText: true,
          showPrice: true,
          showSku: false,
        }, active);
        if (ok) {
          toast.success('🏷️ Test stiker berhasil dicetak ke Xprinter XP-420B!');
        } else {
          toast.error('Gagal mengirim data ke printer. Pastikan printer masih terhubung.');
        }
        return ok;
      }

      const data = buildTestReceipt('Toko Saya — Test Print', config.printer.paperWidth);
      const ok = await sendToPrinter(data, active);
      if (ok) {
        toast.success('✅ Test print berhasil dikirim ke printer!');
      } else {
        toast.error('Gagal mengirim data ke printer. Pastikan printer masih terhubung.');
      }
      return ok;
    } catch (e) {
      toast.error('Error test print: ' + String(e));
      return false;
    }
  }, [config.printer.paperWidth, config.printer.connectionType]);

  const printReceipt = useCallback(async (data: ReceiptData): Promise<boolean> => {
    let active = getActivePrinterType();
    if (active === 'none' && config.printer.connectionType === 'bluetooth') {
      const reconnected = await autoConnectBluetoothPrinter();
      if (reconnected) {
        active = 'bluetooth';
        setPrinterStatus('connected');
        setActivePrinterType('bluetooth');
      }
    }

    if (active === 'none') return false;
    try {
      const bytes = buildReceipt({ ...data, paperWidth: config.printer.paperWidth });
      return await sendToPrinter(bytes, active);
    } catch (e) {
      console.error('printReceipt error:', e);
      return false;
    }
  }, [config.printer.paperWidth, config.printer.connectionType]);

  // 🏷️ Universal Barcode / Label Printing
  const printLabel = useCallback(async (product: LabelProductData, opts: LabelPrintOptions): Promise<boolean> => {
    let active = getActivePrinterType();
    if (active === 'none' && (config.printer.connectionType === 'bluetooth' || config.labelPrinterConnected)) {
      const reconnected = await autoConnectBluetoothPrinter();
      if (reconnected) {
        active = 'bluetooth';
        setPrinterStatus('connected');
        setActivePrinterType('bluetooth');
      }
    }

    if (active === 'none') {
      return false;
    }

    try {
      return await printHardwareLabel(product, opts, active);
    } catch (err) {
      console.error('printLabel error:', err);
      return false;
    }
  }, [config.printer.connectionType, config.labelPrinterConnected]);

  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (!config.cashDrawerEnabled) return false;
    const active = getActivePrinterType();
    const ok = await triggerCashDrawer(config.printer.cashDrawerPin ?? 0, active);
    if (ok) {
      toast.success('🔓 Laci kasir dibuka!');
    } else {
      toast.warning('Laci kasir tidak merespons. Pastikan kabel terhubung ke printer.');
    }
    return ok;
  }, [config.cashDrawerEnabled, config.printer.cashDrawerPin]);

  const broadcastToDisplay = useCallback((payload: CustomerDisplayPayload) => {
    if (channel) {
      channel.postMessage(payload);
    }
  }, []);

  const clearDisplay = useCallback(() => {
    if (channel) {
      channel.postMessage({ type: 'clear' } as CustomerDisplayPayload);
    }
  }, []);

  return (
    <HardwareContext.Provider value={{
      config,
      printerStatus,
      activePrinterType,
      lastDetectionReport,
      isScanningDevices,
      updateConfig,
      autoDetectDevices,
      connectPrinter,
      testPrint,
      printReceipt,
      printLabel,
      openCashDrawer,
      broadcastToDisplay,
      clearDisplay,
    }}>
      {children}
    </HardwareContext.Provider>
  );
}

export function useHardware() {
  const ctx = useContext(HardwareContext);
  if (!ctx) throw new Error('useHardware must be used inside HardwareProvider');
  return ctx;
}
