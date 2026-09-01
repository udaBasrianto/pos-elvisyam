/**
 * escpos.ts
 * Industrial-Standard ESC/POS Command Suite & Raw Generator for Thermal Receipt Printers
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully compliant with:
 * - Epson (TM-T82, TM-m30, TM-T20)
 * - Star Micronics (TSP100, mPOP, TSP650)
 * - Sunmi POS Terminals (V2, T2, D2s)
 * - Xprinter (XP-58, XP-80, XP-N160, XP-365B)
 * - Panda (PRJ-58D, PRJ-80, POS-5890)
 * - Iware (IW-58, IW-80, IW-582)
 * - Eppos (EP5802AI, EP8002AI, EP-58D)
 * - Zjiang (ZJ-5802, ZJ-8250, ZJ-5890)
 * - Rongta (RP326, RPP02N, RP80)
 * - Bixolon (SRP-350, SPP-R200)
 * - Goojprt (PT-210, MTP-3, JP-58)
 * - Kassen (BT-P290, BT-P3000)
 * - Generic 58mm / 80mm ESC/POS Chinese Thermal Printers
 */

// Command bytes
export const ESC = 0x1B;
export const FS  = 0x1C;
export const GS  = 0x1D;
export const DLE = 0x10;
export const LF  = 0x0A;
export const CR  = 0x0D;
export const FF  = 0x0C;
export const NUL = 0x00;

export const ESCPOS = {
  // Initialization & Hardware Reset
  INIT: new Uint8Array([ESC, 0x40]),

  // CodePages (Character sets for Indonesian / Latin / Symbols)
  CODEPAGE_PC437: new Uint8Array([ESC, 0x74, 0x00]), // USA / Standard
  CODEPAGE_PC850: new Uint8Array([ESC, 0x74, 0x02]), // Multilingual Latin 1
  CODEPAGE_PC858: new Uint8Array([ESC, 0x74, 0x13]), // Euro & Indonesian Symbols
  CODEPAGE_UTF8:  new Uint8Array([ESC, 0x74, 0x30]), // UTF-8 (on supported printers)

  // Alignment
  ALIGN_LEFT:   new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT:  new Uint8Array([ESC, 0x61, 0x02]),

  // Font Formatting
  BOLD_ON:  new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),

  UNDERLINE_OFF: new Uint8Array([ESC, 0x2D, 0x00]),
  UNDERLINE_1:   new Uint8Array([ESC, 0x2D, 0x01]),
  UNDERLINE_2:   new Uint8Array([ESC, 0x2D, 0x02]),

  INVERT_ON:  new Uint8Array([GS, 0x42, 0x01]),
  INVERT_OFF: new Uint8Array([GS, 0x42, 0x00]),

  // Text Sizing
  SIZE_NORMAL:   new Uint8Array([GS, 0x21, 0x00]),
  SIZE_DOUBLE_H: new Uint8Array([GS, 0x21, 0x01]),
  SIZE_DOUBLE_W: new Uint8Array([GS, 0x21, 0x10]),
  SIZE_DOUBLE:   new Uint8Array([GS, 0x21, 0x11]),
  SIZE_TRIPLE:   new Uint8Array([GS, 0x21, 0x22]),

  // Line spacing
  LINE_SPACE_DEFAULT: new Uint8Array([ESC, 0x32]),
  LINE_SPACE_TIGHT:   new Uint8Array([ESC, 0x33, 0x18]),

  // Paper Feeding & Cutting
  FEED_1: new Uint8Array([ESC, 0x64, 0x01]),
  FEED_2: new Uint8Array([ESC, 0x64, 0x02]),
  FEED_3: new Uint8Array([ESC, 0x64, 0x03]),
  FEED_5: new Uint8Array([ESC, 0x64, 0x05]),

  // Auto Cutter (Full / Partial)
  CUT_FULL:    new Uint8Array([GS, 0x56, 0x00]),
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),
  CUT_FEED_FULL:    new Uint8Array([GS, 0x56, 0x41, 0x00]),
  CUT_FEED_PARTIAL: new Uint8Array([GS, 0x56, 0x42, 0x00]),

  // Cash Drawer Kick (m=0 for Pin 2, m=1 for Pin 5)
  CASH_DRAWER_PIN2: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]),
  CASH_DRAWER_PIN5: new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xFA]),

  // Hardware Audio Beep (on supported models)
  BEEP: new Uint8Array([ESC, 0x42, 0x02, 0x02]),
};

// Aliases for compatibility
export const CASH_DRAWER_KICK = ESCPOS.CASH_DRAWER_PIN2;
export const FULL_CUT = ESCPOS.CUT_FEED_FULL;

/**
 * Concat multiple Uint8Array chunks into one single array
 */
export function concatBytes(...arrays: (Uint8Array | number[])[]): Uint8Array {
  const normalized = arrays.map(a => (a instanceof Uint8Array ? a : new Uint8Array(a)));
  const totalLength = normalized.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of normalized) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Encode string to Uint8Array with standard encoding
 */
export function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Generate standard ESC/POS 2D Model-2 QR Code commands
 * Uses native hardware vector rendering of the thermal printer (GS ( k ...)
 */
export function generateEscPosQrCode(
  qrContent: string,
  size: number = 6, // 1 to 8 (default 6 for crisp 58/80mm scan)
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'
): Uint8Array {
  const contentBytes = encodeText(qrContent);
  const pL = (contentBytes.length + 3) % 256;
  const pH = Math.floor((contentBytes.length + 3) / 256);

  const ecLevelMap = { L: 48, M: 49, Q: 50, H: 51 };
  const ecByte = ecLevelMap[errorCorrection] || 49;
  const clampedSize = Math.max(1, Math.min(size, 8));

  return concatBytes(
    // 1. Set QR model: Model 2 (Function 165)
    [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
    // 2. Set QR module size (Function 167)
    [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, clampedSize],
    // 3. Set QR error correction level (Function 169)
    [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, ecByte],
    // 4. Store QR data in symbol storage area (Function 180)
    [GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30],
    contentBytes,
    // 5. Print the QR code symbol (Function 181)
    [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]
  );
}

/**
 * Generate standard ESC/POS 1D Barcode (CODE128)
 */
export function generateEscPosBarcode(
  code: string,
  height: number = 64, // 1 to 255 dots (default 64)
  width: number = 2,    // 2 to 6
  showHri: boolean = true // Human readable text below barcode
): Uint8Array {
  const contentBytes = encodeText(`{B${code}`); // CodeSet B
  const len = contentBytes.length;

  return concatBytes(
    // Barcode height
    [GS, 0x68, height],
    // Barcode width
    [GS, 0x77, Math.max(2, Math.min(width, 4))],
    // HRI character position: 2 = Below barcode, 0 = None
    [GS, 0x48, showHri ? 0x02 : 0x00],
    // HRI font: 0 = Font A, 1 = Font B
    [GS, 0x66, 0x00],
    // Print Code128: GS k 73 len data...
    [GS, 0x6B, 0x49, len],
    contentBytes
  );
}

/**
 * Trigger Cash Drawer (Buka Laci Kasir) via WebSerial, WebUSB, or WebBluetooth
 */
export async function triggerCashDrawer(pin: 0 | 1 = 0): Promise<boolean> {
  const kickCommand = pin === 1 ? ESCPOS.CASH_DRAWER_PIN5 : ESCPOS.CASH_DRAWER_PIN2;
  try {
    // 1. Try WebSerial
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      const serial = (navigator as any).serial;
      const ports = await serial.getPorts();
      if (ports && ports.length > 0) {
        const port = ports[0];
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(kickCommand);
        writer.releaseLock();
        await port.close();
        return true;
      }
    }

    // 2. Try WebUSB
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      const usb = (navigator as any).usb;
      const devices = await usb.getDevices();
      if (devices && devices.length > 0) {
        const device = devices[0];
        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        const iface = device.configuration.interfaces[0];
        await device.claimInterface(iface.interfaceNumber);
        const ep = iface.alternate.endpoints.find((e: any) => e.direction === 'out');
        if (ep) {
          await device.transferOut(ep.endpointNumber, kickCommand);
        }
        await device.close();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn("[ESC/POS] Cash drawer trigger note:", error);
    return false;
  }
}
