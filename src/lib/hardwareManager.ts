/**
 * hardwareManager.ts
 * Pusat koordinasi semua perangkat keras POS (Printer Thermal, Cash Drawer, Label Printer, Scanner)
 * Standar industri POS Indonesia — mendukung USB (WebUSB), Serial (WebSerial), Bluetooth (WebBluetooth), Network/IP
 */

import {
  generateTsplLabel,
  generateEscPosLabel,
  generateRasterLabelBitmap,
  type LabelProductData,
  type LabelPrintOptions,
} from './labelPrinter';
import {
  ESCPOS,
  generateEscPosQrCode,
  generateEscPosBarcode,
  concatBytes,
  encodeText,
  triggerCashDrawer as triggerDrawerDirect,
} from './escpos';

export type PrinterConnectionType = 'none' | 'usb' | 'serial' | 'bluetooth' | 'network';
export type PrinterStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type PaperWidth = 58 | 80;

export interface PrinterBrandPreset {
  id: string;
  name: string;
  category: 'receipt' | 'label' | 'hybrid';
  defaultWidth: PaperWidth;
  protocol: 'escpos' | 'tspl' | 'raster';
  features: string[];
}

export const PRINTER_BRAND_PRESETS: PrinterBrandPreset[] = [
  { id: 'generic_58', name: 'Generic 58mm Thermal (RPP02N / MPT-II / POS-58)', category: 'receipt', defaultWidth: 58, protocol: 'escpos', features: ['Struk Kasir 58mm', 'Universal 32 Kolom', 'Bluetooth/USB'] },
  { id: 'generic_80', name: 'Generic 80mm Thermal (POS-80 / ZJ-8250)', category: 'receipt', defaultWidth: 80, protocol: 'escpos', features: ['Struk Kasir 80mm', 'Universal 48 Kolom', 'Auto-Cutter'] },
  { id: 'xprinter_receipt', name: 'Xprinter Thermal (XP-58 / XP-80 / XP-Q90EC)', category: 'receipt', defaultWidth: 58, protocol: 'escpos', features: ['Struk Kasir', 'ESC/POS Cepat', 'Bluetooth / USB'] },
  { id: 'epson', name: 'Epson (TM-T82 / TM-m30 / TM-T20)', category: 'receipt', defaultWidth: 80, protocol: 'escpos', features: ['Auto-Cutter', 'Cash Drawer', 'Native QR', 'USB/LAN/BT'] },
  { id: 'star', name: 'Star Micronics (TSP100 / mPOP)', category: 'receipt', defaultWidth: 80, protocol: 'escpos', features: ['Auto-Cutter', 'Cash Drawer', 'Native QR', 'StarPRNT BLE'] },
  { id: 'sunmi', name: 'Sunmi POS (V2 / T2 / D2s / K2)', category: 'receipt', defaultWidth: 58, protocol: 'escpos', features: ['Integrated BLE/Direct', '58mm / 80mm', 'Fast Print'] },
  { id: 'panda', name: 'Panda (PRJ-58D / PRJ-80 / POS-5890)', category: 'receipt', defaultWidth: 58, protocol: 'escpos', features: ['Indonesia Standard', '58mm/80mm', 'Low Power BLE'] },
  { id: 'iware', name: 'Iware (IW-58 / IW-80 / IW-582)', category: 'receipt', defaultWidth: 58, protocol: 'escpos', features: ['Universal USB/BT', 'Cash Drawer RJ11'] },
  { id: 'eppos', name: 'Eppos (EP5802AI / EP8002AI / EP-58D)', category: 'receipt', defaultWidth: 58, protocol: 'escpos', features: ['Portable Bluetooth', '58mm Thermal'] },
  { id: 'xprinter_label', name: 'Xprinter XP-420B / XP-365B (Label Stiker)', category: 'label', defaultWidth: 80, protocol: 'tspl', features: ['Label Barcode TSPL', 'Multi-Kolom 1-3 Line', 'Direct Thermal'] },
];

export interface PrinterConfig {
  connectionType: PrinterConnectionType;
  paperWidth: PaperWidth;
  charSet: string;
  networkIp?: string;
  networkPort?: number;
  cashDrawerPin?: 0 | 1;
  cutPaper?: boolean;
  brandPreset?: string;
}

export interface ScannerConfig {
  bufferTimeout: number;
  minLength: number;
  suffix: 'enter' | 'tab' | 'none';
  enableSound?: boolean;
}

export interface HardwareState {
  printer: PrinterConfig;
  scanner: ScannerConfig;
  cashDrawerEnabled: boolean;
  labelPrinterConnected: boolean;
  customerDisplayEnabled: boolean;
}

const STORAGE_KEY = 'pos_hardware_config';

const defaultState: HardwareState = {
  printer: {
    connectionType: 'none',
    paperWidth: 58, // Standar printer thermal bluetooth kasir Indonesia (58mm / 32 kolom)
    charSet: 'PC437',
    cashDrawerPin: 0,
    cutPaper: true,
    brandPreset: 'generic_58',
  },
  scanner: {
    bufferTimeout: 150,
    minLength: 2,
    suffix: 'enter',
    enableSound: true,
  },
  cashDrawerEnabled: false,
  labelPrinterConnected: false,
  customerDisplayEnabled: false,
};

// Aliases for compatibility
export const CMD = {
  INIT:            ESCPOS.INIT,
  CUT_FULL:        ESCPOS.CUT_FULL,
  CUT_PARTIAL:     ESCPOS.CUT_PARTIAL,
  BOLD_ON:         ESCPOS.BOLD_ON,
  BOLD_OFF:        ESCPOS.BOLD_OFF,
  ALIGN_LEFT:      ESCPOS.ALIGN_LEFT,
  ALIGN_CENTER:    ESCPOS.ALIGN_CENTER,
  ALIGN_RIGHT:     ESCPOS.ALIGN_RIGHT,
  SIZE_NORMAL:     ESCPOS.SIZE_NORMAL,
  SIZE_DOUBLE_H:   ESCPOS.SIZE_DOUBLE_H,
  SIZE_DOUBLE_W:   ESCPOS.SIZE_DOUBLE_W,
  SIZE_DOUBLE:     ESCPOS.SIZE_DOUBLE,
  CASH_DRAWER_P2:  ESCPOS.CASH_DRAWER_PIN2,
  CASH_DRAWER_P5:  ESCPOS.CASH_DRAWER_PIN5,
  FEED_3:          ESCPOS.FEED_3,
};

const LF = 0x0A;

function line(text: string): Uint8Array {
  return concatBytes(encodeText(text), [LF]);
}

function separator(width: number, char = '-'): Uint8Array {
  return line(char.repeat(width));
}

function justifyRow(left: string, right: string, width: number): string {
  const cleanLeft = left.trim();
  const cleanRight = right.trim();
  const spaceCount = width - cleanLeft.length - cleanRight.length;
  if (spaceCount >= 1) {
    return cleanLeft + ' '.repeat(spaceCount) + cleanRight;
  }
  // If text is too long for 1 line, put left on line 1, right-align right on line 2
  const rightPad = Math.max(0, width - cleanRight.length);
  return cleanLeft + '\n' + ' '.repeat(rightPad) + cleanRight;
}

// ── ESC/POS Receipt Builder ────────────────────────────────────────────────
export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceNumber: string;
  customerName?: string;
  cashierName?: string;
  date?: string;
  time?: string;
  items: Array<{ name: string; qty: number; price: number; subtotal: number }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  footer?: string;
  paperWidth?: PaperWidth;
  earnedPoints?: number;
  accumulatedPoints?: number;
  qrData?: string;
  barcodeData?: string;
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const cols = (data.paperWidth ?? 58) === 80 ? 48 : 32;
  const fmtCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

  const parts: Uint8Array[] = [];
  const push = (...u: Uint8Array[]) => parts.push(...u);

  const row = (label: string, val: string, bold = false) => {
    const parts2: Uint8Array[] = [];
    if (bold) parts2.push(CMD.BOLD_ON);
    const formatted = justifyRow(label, val, cols);
    for (const rLine of formatted.split('\n')) {
      parts2.push(line(rLine));
    }
    if (bold) parts2.push(CMD.BOLD_OFF);
    return concatBytes(...parts2);
  };

  // Header Store Info (Centered)
  push(CMD.INIT);
  push(ESCPOS.CODEPAGE_PC437);
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.SIZE_DOUBLE);
  push(line(data.storeName.slice(0, Math.floor(cols / 2))));
  push(CMD.SIZE_NORMAL, CMD.BOLD_OFF);

  if (data.storeAddress) {
    push(CMD.ALIGN_CENTER);
    for (const addrLine of data.storeAddress.split('\n')) {
      push(line(addrLine.trim().slice(0, cols)));
    }
  }
  if (data.storePhone) {
    push(CMD.ALIGN_CENTER, line(data.storePhone.trim().slice(0, cols)));
  }
  push(separator(cols, '='));

  // Transaction Metadata (Left aligned with Right-aligned values)
  push(CMD.ALIGN_LEFT);
  push(row('No. Transaksi:', data.invoiceNumber));
  if (data.date) push(row('Tanggal:', data.date));
  if (data.time) push(row('Waktu:', data.time));
  push(row('Pelanggan:', data.customerName || 'Umum'));
  if (data.cashierName && data.cashierName !== 'Kasir') {
    push(row('Kasir:', data.cashierName));
  }
  push(separator(cols, '-'));

  // Items Header
  push(CMD.BOLD_ON, line('ITEM PEMBELIAN'), CMD.BOLD_OFF);

  // Items List
  for (const item of data.items) {
    // Line 1: Product name (Bold)
    push(CMD.BOLD_ON, line(item.name.slice(0, cols)), CMD.BOLD_OFF);
    // Line 2: Qty x Price (Left) ....... Subtotal (Right)
    const qtyPrice = `${item.qty} x ${fmtCurrency(item.price)}`;
    const sub = fmtCurrency(item.subtotal);
    push(line(justifyRow(qtyPrice, sub, cols)));
  }

  push(separator(cols, '-'));

  // Totals Breakdown
  push(row('Subtotal:', fmtCurrency(data.subtotal)));
  if (data.discount && data.discount > 0) push(row('Diskon:', `-${fmtCurrency(data.discount)}`));
  if (data.tax && data.tax > 0)           push(row('Pajak:', fmtCurrency(data.tax)));
  push(separator(cols, '-'));
  push(row('TOTAL:', fmtCurrency(data.total), true));
  push(separator(cols, '-'));

  // Payment Breakdown
  push(row('Metode Bayar:', data.paymentMethod));
  push(row('Jumlah Bayar:', fmtCurrency(data.paid)));
  if (data.change > 0) {
    push(row('Kembalian:', fmtCurrency(data.change), true));
  }

  // Customer Loyalty Points Section
  if ((data.earnedPoints !== undefined && data.earnedPoints > 0) || data.accumulatedPoints !== undefined) {
    if (data.customerName && data.customerName !== 'Umum') {
      push(separator(cols, '-'));
      push(CMD.BOLD_ON, line('POIN PELANGGAN'), CMD.BOLD_OFF);
      if (data.earnedPoints && data.earnedPoints > 0) {
        push(row('Poin Transaksi Ini:', `+${data.earnedPoints.toLocaleString('id-ID')} Poin`));
      }
      if (data.accumulatedPoints !== undefined) {
        push(row('Total Akumulasi Poin:', `${data.accumulatedPoints.toLocaleString('id-ID')} Poin`, true));
      }
    }
  }

  push(separator(cols, '='));

  // Optional Vector QR Code (for QRIS or Digital Struk Link)
  if (data.qrData) {
    push(CMD.ALIGN_CENTER);
    push(generateEscPosQrCode(data.qrData, cols === 80 ? 6 : 5, 'M'));
    push(line(''));
  }

  // Optional 1D Barcode of Invoice Number
  if (data.barcodeData || data.invoiceNumber) {
    const rawBc = data.barcodeData || data.invoiceNumber;
    if (rawBc && rawBc.length <= 20) {
      push(CMD.ALIGN_CENTER);
      push(generateEscPosBarcode(rawBc, 48, 2, true));
      push(line(''));
    }
  }

  // Footer (Centered)
  push(CMD.ALIGN_CENTER);
  const defaultFooter = "Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat\ndikembalikan atau ditukar.";
  const footerText = (data.footer && data.footer.trim().length > 0 ? data.footer : defaultFooter);
  for (const fline of footerText.split('\n')) {
    if (fline.trim()) push(line(fline.trim().slice(0, cols)));
  }
  push(separator(cols, '='));

  push(CMD.FEED_3, CMD.CUT_FULL);
  return concatBytes(...parts);
}

// ── Test Print Receipt (Hardware Diagnostic Receipt) ──────────────────────
export function buildTestReceipt(storeName: string, paperWidth: PaperWidth = 58): Uint8Array {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return buildReceipt({
    storeName: `${storeName} [TEST]`,
    storeAddress: 'Jl. Uji Coba Hardware No. 10\nSistem POS & Inventaris Standar Industri',
    storePhone: '0812-3456-7890',
    invoiceNumber: 'TEST-DIAGNOSTIC-001',
    customerName: 'Pelanggan Uji Coba',
    cashierName: 'Super Admin',
    date: dateStr,
    time: timeStr,
    items: [
      { name: 'Printer Thermal 58/80mm',  qty: 1, price: 350000, subtotal: 350000 },
      { name: 'Barcode Scanner Wireless', qty: 1, price: 450000, subtotal: 450000 },
    ],
    subtotal: 800000,
    discount: 50000,
    total: 750000,
    paid: 800000,
    change: 50000,
    paymentMethod: 'Tunai (Cash)',
    footer: 'HARDWARE DIAGNOSTIC OK\nKompatibel: Epson, Star, Sunmi, Xprinter, Panda, Eppos, Generic',
    paperWidth,
    qrData: 'https://posh.web.id/test-print-ok',
  });
}

// ── Printer Connection Managers ────────────────────────────────────────────
let usbDevice: USBDevice | null = null;
let usbOutEndpointNumber: number | null = null;
let serialPort: any = null;
let networkConfig: { ip: string; port: number } | null = null;

export async function connectUsbPrinter(): Promise<{ success: boolean; name?: string; message: string }> {
  if (!('usb' in navigator)) {
    return { success: false, message: 'WebUSB tidak didukung pada browser ini. Gunakan Google Chrome atau Microsoft Edge.' };
  }
  try {
    const usb = (navigator as any).usb;
    const device: USBDevice = await usb.requestDevice({ filters: [] });
    await device.open();

    if (device.configuration === null) {
      const configVal = device.configurations?.[0]?.configurationValue || 1;
      try {
        await device.selectConfiguration(configVal);
      } catch (_) {}
    }

    let claimedInterface: any = null;
    let foundOutEndpoint: any = null;
    let lastError: any = null;

    // Search across all available interfaces for a claimable one with an OUT endpoint
    const interfaces = device.configuration?.interfaces || [];
    for (const iface of interfaces) {
      try {
        await device.claimInterface(iface.interfaceNumber);
        
        // Find OUT endpoint for printing
        const ep = iface.alternate?.endpoints?.find((e: any) => e.direction === 'out');
        if (ep) {
          claimedInterface = iface;
          foundOutEndpoint = ep;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[WebUSB] Interface ${iface.interfaceNumber} claim error:`, err);
      }
    }

    if (claimedInterface && foundOutEndpoint) {
      usbDevice = device;
      usbOutEndpointNumber = foundOutEndpoint.endpointNumber;
      return { 
        success: true, 
        name: device.productName || 'USB Printer', 
        message: `🟢 Terhubung: ${device.productName || 'USB Printer'}` 
      };
    }

    // If interface claiming failed (standard Windows OS usbprint.sys lock)
    if (lastError && (lastError.name === 'SecurityError' || lastError.message?.includes('claim') || lastError.message?.includes('claimInterface'))) {
      return {
        success: false,
        message: `⚠️ Driver Windows telah mengunci akses USB printer ini. Solusi: (1) Gunakan tombol "Cetak Driver Sistem" saat print, atau (2) Sambungkan lewat "Bluetooth" / "Serial COM".`
      };
    }

    return {
      success: false,
      message: `Tidak ditemukan jalur data transfer OUT pada printer ${device.productName || 'USB'}. Gunakan opsi Serial COM Port atau Driver Sistem.`
    };
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      return { success: false, message: 'Batal memilih perangkat USB.' };
    }
    if (e.message?.includes('claim') || e.message?.includes('claimInterface')) {
      return {
        success: false,
        message: `⚠️ Driver Windows telah mengunci akses USB printer ini. Solusi: (1) Gunakan tombol "Cetak Driver Sistem" saat print, atau (2) Sambungkan lewat "Bluetooth" / "Serial COM".`
      };
    }
    return { success: false, message: e.message || 'Gagal menghubungkan USB printer.' };
  }
}

export async function connectSerialPrinter(): Promise<{ success: boolean; name?: string; message: string }> {
  if (!('serial' in navigator)) {
    return { success: false, message: 'WebSerial tidak didukung. Gunakan Chrome / Edge desktop.' };
  }
  try {
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });
    serialPort = port;
    return { success: true, name: 'Serial Printer', message: '🟢 Terhubung: Serial Printer (COM Port)' };
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      return { success: false, message: 'Batal memilih port Serial.' };
    }
    return { success: false, message: e.message || 'Gagal menghubungkan Serial printer.' };
  }
}

import {
  connectBluetoothPrinter as btConnect,
  autoConnectBluetoothPrinter,
  isBluetoothPrinterConnected,
  getConnectedBluetoothPrinterName,
  sendBluetoothPrintData,
  sendNiimbotPackets,
  disconnectBluetoothPrinter,
} from './bluetoothPrinter';

export { autoConnectBluetoothPrinter, isBluetoothPrinterConnected, getConnectedBluetoothPrinterName, disconnectBluetoothPrinter };

export async function connectBluetoothPrinter(): Promise<{ success: boolean; name?: string; message: string }> {
  return btConnect();
}

export function configureNetworkPrinter(ip: string, port = 9100): { success: boolean; message: string } {
  if (!ip) return { success: false, message: 'Alamat IP printer wajib diisi.' };
  networkConfig = { ip, port };
  return { success: true, message: `🟢 Network Printer dikonfigurasi: ${ip}:${port} (cetak via dialog browser)` };
}

export async function sendToPrinter(data: Uint8Array, type: PrinterConnectionType): Promise<boolean> {
  try {
    if (type === 'usb' && usbDevice) {
      const epNum = usbOutEndpointNumber ?? 1;
      const CHUNK = 64;
      for (let i = 0; i < data.length; i += CHUNK) {
        await usbDevice.transferOut(epNum, data.slice(i, i + CHUNK));
      }
      return true;
    }
    if (type === 'serial' && serialPort) {
      const writer = serialPort.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return true;
    }
    if (type === 'bluetooth') {
      return await sendBluetoothPrintData(data);
    }
    return false;
  } catch (e) {
    console.error('sendToPrinter error:', e);
    return false;
  }
}

/**
 * 🏷️ Print product barcode label to physical hardware printer (Xprinter XP-420B TSPL / ESC/POS / Raster)
 */
export async function printHardwareLabel(
  product: LabelProductData,
  opts: LabelPrintOptions,
  type?: PrinterConnectionType
): Promise<boolean> {
  const targetType = type || getActivePrinterType();
  if (targetType === 'none') {
    return false;
  }

  // Determine printer protocol
  const btName = (getConnectedBluetoothPrinterName() || '').toLowerCase();
  const requestedProtocol = opts.printerProtocol || 'auto';

  let isTspl = true;
  if (requestedProtocol === 'tspl') {
    isTspl = true;
  } else if (requestedProtocol === 'escpos') {
    isTspl = false;
  } else {
    // Auto-detect based on connected device name
    const isEscPosName = 
      btName.includes('pos-58') || 
      btName.includes('pos-80') || 
      btName.includes('58mm') || 
      btName.includes('80mm') || 
      btName.includes('rpp02') || 
      btName.includes('goojprt') || 
      btName.includes('eppos') || 
      btName.includes('mpt') || 
      btName.includes('zjiang') || 
      btName.includes('receipt') || 
      btName.includes('thermal');

    const isTsplName = 
      btName.includes('xprinter') || 
      btName.includes('xp-420') || 
      btName.includes('xp-365') || 
      btName.includes('tsc') || 
      btName.includes('tspl') || 
      btName.includes('label');

    isTspl = isTsplName || !isEscPosName;
  }

  try {
    let data: Uint8Array;
    if (requestedProtocol === 'raster') {
      data = await generateRasterLabelBitmap(product, opts, isTspl ? 'tspl' : 'escpos');
    } else if (isTspl) {
      // Native TSPL vector commands for Xprinter XP-420B (203 DPI)
      data = generateTsplLabel(product, opts);
    } else {
      // Native ESC/POS commands for thermal receipt printers
      data = generateEscPosLabel(product, opts);
    }

    return await sendToPrinter(data, targetType);
  } catch (err) {
    console.warn("Primary label print error, attempting fallback raster bitmap:", err);
    try {
      const fallbackData = await generateRasterLabelBitmap(product, opts, isTspl ? 'tspl' : 'escpos');
      return await sendToPrinter(fallbackData, targetType);
    } catch (e2) {
      console.error("Label print fallback failed:", e2);
      return false;
    }
  }
}

export async function openCashDrawer(pin: 0 | 1 = 0, type: PrinterConnectionType = 'bluetooth'): Promise<boolean> {
  const kick = pin === 1 ? ESCPOS.CASH_DRAWER_PIN5 : ESCPOS.CASH_DRAWER_PIN2;
  const sent = await sendToPrinter(kick, type);
  if (!sent) {
    return await triggerDrawerDirect(pin);
  }
  return sent;
}

export { triggerDrawerDirect as triggerCashDrawer };

export function loadHardwareConfig(): HardwareState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch (_) {}
  return defaultState;
}

export function saveHardwareConfig(state: HardwareState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

export function getActivePrinterType(): PrinterConnectionType {
  if (isBluetoothPrinterConnected()) return 'bluetooth';
  if (usbDevice) return 'usb';
  if (serialPort) return 'serial';
  const cfg = loadHardwareConfig();
  return cfg.printer.connectionType;
}
