/**
 * bluetoothPrinter.ts
 * Driver Web Bluetooth Universal untuk Printer Kasir & Label Stiker Indonesia
 * Kompatibel dengan semua jenis printer Bluetooth:
 * - Niimbot (D11, D110, B21, B1, B3S, dll.)
 * - TSPL / TSC (Xprinter, Gprinter, Panda, Kassen, Postek, Argox, OpenLabel/Steprint)
 * - ESC/POS (RPP02N, Panda, Eppos, Zjiang, MPT-II, POS-5802DD, POS-5890, GOOJPRT, VSC, Mini POS)
 * - Zebra, Brother, Phomemo, Rongta, Zywell
 */

let activeDevice: any = null;
let activePrinterCharacteristic: any = null;
let activeCandidates: any[] = [];
let activePrinterName: string | null = null;
let isConnecting = false;

const STORAGE_DEVICE_ID = 'pos_bt_printer_id';
const STORAGE_DEVICE_NAME = 'pos_bt_printer_name';

// Multi-Vendor Bluetooth Service UUIDs (Niimbot, Epson, Star, Sunmi, Xprinter, Panda, Eppos, Zebra, Rongta, Bixolon, Kassen, Goojprt)
export const BLUETOOTH_SERVICES = [
  '0000e0ff-0000-1000-8000-00805f9b34fb', // Niimbot (D11, D110, B21, B1, B3S) / Xprinter XP-Series
  '0000fee7-0000-1000-8000-00805f9b34fb', // Niimbot / MiniPOS / Tencent
  '0000fee0-0000-1000-8000-00805f9b34fb', // Niimbot Standard BLE
  '0000fe00-0000-1000-8000-00805f9b34fb', // Niimbot / Feasycom BLE / Bixolon
  '0000fee1-0000-1000-8000-00805f9b34fb', // Kassen / Telpo BLE
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Universal HM-10 / Sunmi / BLE Serial
  '0000ffe1-0000-1000-8000-00805f9b34fb', // Generic BLE Serial Port
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal POS (Epson, Xprinter, Generic)
  '0000ff00-0000-1000-8000-00805f9b34fb', // General Bluetooth Thermal (Panda, Eppos, RPP02, Phomemo)
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb', // Phomemo / Rongta / Goojprt
  '0000fff1-0000-1000-8000-00805f9b34fb', // StarPRNT / Rongta RX
  '0000fff2-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Serial
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC Transmit
  'e79e0001-225e-4d41-b65f-28565e3158b9', // Custom POS Service
  '0000fe59-0000-1000-8000-00805f9b34fb', // Nordic Semiconductor / Label BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service standard
  '2bbdf458-5000-4740-9742-0193bb2247e6', // Epson TM Series BLE
  '0000ffb0-0000-1000-8000-00805f9b34fb', // Star Micronics Web Bluetooth
  '0000ffe5-0000-1000-8000-00805f9b34fb', // Generic Label Printer
  '38eb4a80-c570-11e3-9507-0002a5d5c51b', // Zebra Link-OS
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000af00-0000-1000-8000-00805f9b34fb',
];

const KNOWN_PRINT_CHAR_UUIDS = [
  '49535343-6daa-4d02-abf6-19569aca69fe', // ISSC Microchip Transparent Serial Data TX (Niimbot B1, D11, Label BLE)
  '0000fff2-0000-1000-8000-00805f9b34fb', // Niimbot TX / Phomemo TX
  '0000fe02-0000-1000-8000-00805f9b34fb', // Niimbot / Feasycom TX
  '0000fee2-0000-1000-8000-00805f9b34fb', // Niimbot TX
  '0000ff02-0000-1000-8000-00805f9b34fb', // Thermal POS TX
  '0000ffe1-0000-1000-8000-00805f9b34fb', // Universal HM-10 Serial TX
  '0000ffe2-0000-1000-8000-00805f9b34fb',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART TX
  '00002af1-0000-1000-8000-00805f9b34fb', // Epson TM TX
  'e79e0002-225e-4d41-b65f-28565e3158b9', // Custom TX
  '0000e0ff-0000-1000-8000-00805f9b34fb', // Niimbot Direct TX
];

const KNOWN_PRINT_SERVICE_UUIDS = [
  '0000e0ff-0000-1000-8000-00805f9b34fb', // Niimbot (D11, D110, B21, B1, B3S)
  '0000fee7-0000-1000-8000-00805f9b34fb', // Niimbot / Tencent
  '0000fee0-0000-1000-8000-00805f9b34fb', // Niimbot
  '0000fe00-0000-1000-8000-00805f9b34fb', // Niimbot / Feasycom
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Universal HM-10 / Sunmi
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb', // Panda / Eppos
  '0000fff0-0000-1000-8000-00805f9b34fb', // Phomemo / Rongta
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal POS
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
  'e79e0001-225e-4d41-b65f-28565e3158b9',
  '0000fe59-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
];

// Explicitly blacklist standard Bluetooth SIG non-printer services
const IGNORED_SERVICE_PREFIXES = [
  '00001800', // Generic Access (Device Name, Appearance, etc.)
  '00001801', // Generic Attribute
  '0000180a', // Device Information (Model, Serial, Firmware strings)
  '0000180f', // Battery Service
  '00001812', // Human Interface Device
];

function notifyStatusChange(connected: boolean, name?: string | null) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pos_bluetooth_status', {
      detail: {
        connected,
        name: name || activePrinterName || localStorage.getItem(STORAGE_DEVICE_NAME) || null,
        timestamp: Date.now()
      }
    }));
  }
}

interface ScoredCharacteristic {
  char: any;
  score: number;
  serviceUuid: string;
  charUuid: string;
}

/**
 * Scan and extract scored candidate writable characteristics from GATT server
 * Specifically prevents picking non-printer characteristics like Device Name (0x2A00)
 */
async function discoverCandidateCharacteristics(server: any): Promise<any[]> {
  const candidates: ScoredCharacteristic[] = [];

  try {
    const services = await server.getPrimaryServices();
    console.log(`[Bluetooth] Discovered ${services.length} primary GATT services`);

    for (const service of services) {
      const sUuid = (service.uuid || '').toLowerCase();

      // Skip non-printer standard Bluetooth SIG services
      if (IGNORED_SERVICE_PREFIXES.some(prefix => sUuid.startsWith(prefix))) {
        continue;
      }

      try {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          const cUuid = (char.uuid || '').toLowerCase();
          const props = char.properties;

          // Must support write or writeWithoutResponse
          if (!props.write && !props.writeWithoutResponse) {
            continue;
          }

          let score = 0;

          // Known printer characteristic UUID
          if (KNOWN_PRINT_CHAR_UUIDS.includes(cUuid)) {
            score += 150;
          }

          // Known printer service UUID
          if (KNOWN_PRINT_SERVICE_UUIDS.includes(sUuid)) {
            score += 100;
          }

          if (props.writeWithoutResponse) {
            score += 30;
          }
          if (props.write) {
            score += 15;
          }

          candidates.push({
            char,
            score,
            serviceUuid: sUuid,
            charUuid: cUuid,
          });

          console.log(`[Bluetooth] Candidate char: ${cUuid} (Service: ${sUuid}, score: ${score}, writeNoResp: ${Boolean(props.writeWithoutResponse)}, write: ${Boolean(props.write)})`);
        }
      } catch (eChar) {
        console.warn(`[Bluetooth] Could not inspect service ${sUuid}:`, eChar);
      }
    }
  } catch (eServ) {
    console.warn("[Bluetooth] getPrimaryServices error:", eServ);
  }

  // Sort descending by highest score
  candidates.sort((a, b) => b.score - a.score);
  return candidates.map(c => c.char);
}

/**
 * Connect to a specific Bluetooth Device object.
 * Includes retry logic with exponential backoff for Niimbot B1 and similar
 * BLE label printers that frequently drop GATT connections after idle timeouts.
 */
async function connectToDevice(device: any, maxRetries = 3): Promise<boolean> {
  if (!device) return false;

  isConnecting = true;
  activeDevice = device;
  activePrinterName = device.name || localStorage.getItem(STORAGE_DEVICE_NAME) || 'Printer Bluetooth';

  // Listen to disconnect event
  device.removeEventListener('gattserverdisconnected', handleDisconnect);
  device.addEventListener('gattserverdisconnected', handleDisconnect);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // If GATT is already connected but stale, disconnect first so we get a clean session
      if (device.gatt?.connected) {
        try { device.gatt.disconnect(); } catch (_) {}
        await new Promise(r => setTimeout(r, 300));
      }

      console.log(`[Bluetooth] 🔄 Connection attempt ${attempt}/${maxRetries} to ${activePrinterName}...`);

      const server = await device.gatt.connect();

      // Small stabilization delay — Niimbot B1 needs time after GATT connect before service discovery
      await new Promise(r => setTimeout(r, attempt === 1 ? 200 : 500));

      // Verify GATT is still connected before discovering services
      if (!device.gatt?.connected) {
        console.warn(`[Bluetooth] GATT disconnected before service discovery (attempt ${attempt})`);
        continue;
      }

      const candidates = await discoverCandidateCharacteristics(server);

      if (candidates.length > 0) {
        activeCandidates = candidates;
        activePrinterCharacteristic = candidates[0];
        try {
          if (device.id) localStorage.setItem(STORAGE_DEVICE_ID, device.id);
          if (device.name) localStorage.setItem(STORAGE_DEVICE_NAME, device.name);
        } catch (_) {}
        console.log(`[Bluetooth] 🟢 Connected to ${activePrinterName} (${candidates.length} candidate write channels ready)`);
        notifyStatusChange(true, activePrinterName);
        isConnecting = false;

        // Auto-detect sticker paper size immediately upon connection
        setTimeout(() => {
          detectPrinterPaper(device);
        }, 300);

        return true;
      } else {
        console.warn(`[Bluetooth] ⚠️ No writable characteristic found (attempt ${attempt}/${maxRetries})`);
      }
    } catch (err) {
      console.warn(`[Bluetooth] Connection attempt ${attempt}/${maxRetries} error:`, err);
    }

    // Exponential backoff before next retry
    if (attempt < maxRetries) {
      const delayMs = 500 * attempt;
      console.log(`[Bluetooth] ⏳ Retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  console.error(`[Bluetooth] ❌ Failed to connect to ${activePrinterName} after ${maxRetries} attempts`);
  notifyStatusChange(false, null);
  isConnecting = false;
  return false;
}

export interface DetectedPaperInfo {
  widthMm: number;
  heightMm: number;
  columns: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  presetId?: string;
  printerName: string;
  source: 'rfid' | 'sensor' | 'model_profile';
}

/**
 * 🔍 Auto-detects paper roll size based on connected Bluetooth printer (Niimbot RFID & Xprinter Multi-column)
 */
export async function detectPrinterPaper(device?: any): Promise<DetectedPaperInfo | null> {
  const d = device || activeDevice;
  const name = (d?.name || activePrinterName || '').trim();
  if (!name) return null;

  console.log(`[Bluetooth] 🔍 Auto-detecting paper roll dimensions for ${name}...`);

  // 1. Niimbot Smart BLE Printers (B1, B21, D11, D110, B3S)
  const isNiimbot = /b1|d11|d110|b21|b3s|niimbot/i.test(name);
  if (isNiimbot) {
    const isSmall = /d11|d110/i.test(name);
    const detected: DetectedPaperInfo = {
      widthMm: isSmall ? 30 : 50,
      heightMm: isSmall ? 20 : 30,
      columns: 1,
      gapHorizontalMm: 0,
      gapVerticalMm: 2,
      presetId: isSmall ? '30x20' : '50x30',
      printerName: name,
      source: 'model_profile',
    };

    // Send RFID query command if channel ready
    try {
      if (activePrinterCharacteristic) {
        const queryPacket = new Uint8Array([0x55, 0x55, 0x1A, 0x00, 0x1A, 0xAA, 0xAA]);
        await activePrinterCharacteristic.writeValue(queryPacket).catch(() => {});
      }
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('pos_label_paper_detected', { detail: detected }));
    return detected;
  }

  // 2. Xprinter Desktop Thermal Barcode Printers (XP-420B, XP-365B, XP-DT, Panda, etc.)
  const isXprinter = /xp-|xprinter|420|365|dt108|pos|panda|postek/i.test(name);
  if (isXprinter) {
    const detected: DetectedPaperInfo = {
      widthMm: 30,
      heightMm: 19,
      columns: 3,
      gapHorizontalMm: 2,
      gapVerticalMm: 2,
      presetId: '30x19-3col',
      printerName: name,
      source: 'model_profile',
    };
    window.dispatchEvent(new CustomEvent('pos_label_paper_detected', { detail: detected }));
    return detected;
  }

  return null;
}

function handleDisconnect() {
  console.log(`[Bluetooth] 🔴 Disconnected from ${activePrinterName || 'Printer'}`);
  activePrinterCharacteristic = null;
  activeCandidates = [];
  notifyStatusChange(false, null);
}

/**
 * Ensure GATT is connected and characteristics are available.
 * Used before print operations to transparently recover from mid-session disconnects.
 */
async function ensureGattConnected(): Promise<boolean> {
  if (isBluetoothPrinterConnected()) return true;

  // We still have the device reference — try reconnecting directly
  if (activeDevice) {
    console.log('[Bluetooth] 🔄 Re-establishing GATT connection...');
    const ok = await connectToDevice(activeDevice, 2);
    if (ok) return true;
  }

  // Fall back to auto-connect (uses getDevices API)
  return await autoConnectBluetoothPrinter();
}

/**
 * ⚡ Auto-reconnect to previously paired Bluetooth printer without opening browser prompt
 */
export async function autoConnectBluetoothPrinter(): Promise<boolean> {
  if (typeof window === 'undefined' || !('bluetooth' in navigator)) return false;
  if (isBluetoothPrinterConnected()) return true;
  if (isConnecting) return false;

  try {
    const nav = navigator as any;
    if (nav.bluetooth && typeof nav.bluetooth.getDevices === 'function') {
      const devices = await nav.bluetooth.getDevices();
      if (devices && devices.length > 0) {
        const savedId = localStorage.getItem(STORAGE_DEVICE_ID);
        const target = devices.find((d: any) => d.id === savedId) || devices[0];
        if (target) {
          console.log(`[Bluetooth] 🔄 Auto-reconnecting to remembered device: ${target.name || target.id}`);
          const ok = await connectToDevice(target);
          if (ok) return true;
        }
      }
    }
  } catch (e) {
    console.warn("[Bluetooth] Auto-connect error:", e);
  }
  return false;
}

/**
 * Open browser device picker to pair and connect Bluetooth printer
 */
export async function connectBluetoothPrinter(): Promise<{ success: boolean; name?: string; message: string }> {
  if (typeof window === 'undefined' || !('bluetooth' in navigator)) {
    return {
      success: false,
      message: 'Browser Anda belum mendukung Web Bluetooth. Gunakan Chrome, Edge, atau Chrome Android.'
    };
  }

  try {
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLUETOOTH_SERVICES
    });

    if (!device) {
      return { success: false, message: 'Batal memilih perangkat Bluetooth.' };
    }

    const connected = await connectToDevice(device);
    if (connected) {
      return {
        success: true,
        name: activePrinterName || 'Printer Bluetooth',
        message: `🟢 Berhasil terhubung ke ${activePrinterName || 'Printer Bluetooth'}!`
      };
    } else {
      return {
        success: false,
        message: `Gagal mengakses jalur cetak ${device.name || 'Printer'}. Pastikan printer menyala dan baterai cukup.`
      };
    }
  } catch (error: any) {
    console.error('[Bluetooth] requestDevice error:', error);
    if (error.name === 'NotFoundError') {
      return { success: false, message: 'Batal memilih perangkat Bluetooth.' };
    }
    return {
      success: false,
      message: error.message || 'Gagal menyambungkan Bluetooth printer.'
    };
  }
}

/**
 * Disconnect current printer
 */
export function disconnectBluetoothPrinter(): void {
  try {
    if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
      activeDevice.gatt.disconnect();
    }
  } catch (_) {}
  activePrinterCharacteristic = null;
  activeCandidates = [];
  activeDevice = null;
  notifyStatusChange(false, null);
}

/**
 * Check if Bluetooth printer is actively connected
 */
export function isBluetoothPrinterConnected(): boolean {
  return (
    activePrinterCharacteristic !== null &&
    activeDevice !== null &&
    Boolean(activeDevice.gatt?.connected)
  );
}

/**
 * Get active Bluetooth printer name
 */
export function getConnectedBluetoothPrinterName(): string | null {
  return activePrinterName || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_DEVICE_NAME) : null);
}

/**
 * Helper to safely write a small chunk to characteristic with fallback methods
 */
async function writeChunkToCharacteristic(char: any, chunk: Uint8Array): Promise<boolean> {
  // 1. Try writeValueWithoutResponse if advertised (fastest for BLE printers)
  if (char.properties?.writeWithoutResponse && typeof char.writeValueWithoutResponse === 'function') {
    try {
      await char.writeValueWithoutResponse(chunk);
      return true;
    } catch (_) {}
  }

  // 2. Try writeValueWithResponse (Chrome 85+)
  if (typeof char.writeValueWithResponse === 'function') {
    try {
      await char.writeValueWithResponse(chunk);
      return true;
    } catch (_) {}
  }

  // 3. Fallback standard writeValue
  if (typeof char.writeValue === 'function') {
    try {
      await char.writeValue(chunk);
      return true;
    } catch (_) {}
  }

  // 4. Last resort writeValueWithoutResponse
  if (typeof char.writeValueWithoutResponse === 'function') {
    try {
      await char.writeValueWithoutResponse(chunk);
      return true;
    } catch (_) {}
  }

  return false;
}

/**
 * 🖨️ Send raw binary data (ESC/POS, TSPL, CPCL, Bitmap) to the Bluetooth printer with adaptive pacing
 * Uses 20-byte ATT MTU chunks for maximum reliability on Windows and Android Web Bluetooth stacks.
 */
export async function sendBluetoothPrintData(data: Uint8Array): Promise<boolean> {
  // Try to re-establish GATT connection if it was dropped (handles Niimbot B1 idle disconnect)
  if (!isBluetoothPrinterConnected()) {
    const reconnected = await ensureGattConnected();
    if (!reconnected) {
      console.warn("[Bluetooth] Cannot print: Printer not connected");
      return false;
    }
  }

  if (activeCandidates.length === 0 && activePrinterCharacteristic) {
    activeCandidates = [activePrinterCharacteristic];
  }

  if (activeCandidates.length === 0) return false;

  // Try each candidate characteristic in order of highest score
  for (let candidateIdx = 0; candidateIdx < activeCandidates.length; candidateIdx++) {
    const char = activeCandidates[candidateIdx];
    try {
      console.log(`[Bluetooth] 📤 Sending ${data.length} bytes using char ${char.uuid} (Candidate ${candidateIdx + 1}/${activeCandidates.length})...`);
      
      // Strict 20-byte chunks to fit Windows / Android BLE ATT MTU default limits
      const chunkSize = 20;
      let writeSuccess = true;

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const ok = await writeChunkToCharacteristic(char, chunk);
        if (!ok) {
          writeSuccess = false;
          break;
        }
        // Small pacing delay for BLE peripheral buffer processing
        if (i + chunkSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, 8));
        }
      }

      if (writeSuccess) {
        // Set this winning characteristic as active
        activePrinterCharacteristic = char;
        console.log(`[Bluetooth] 🟢 Print data sent successfully via ${char.uuid}`);
        return true;
      } else {
        console.warn(`[Bluetooth] Write failed on candidate ${char.uuid}, trying next candidate...`);
      }
    } catch (err: any) {
      console.warn(`[Bluetooth] Candidate ${char.uuid} error:`, err);
    }
  }

  console.error('[Bluetooth] All candidate characteristics failed to send print data.');
  // Mark as disconnected so next attempt will auto-reconnect
  activePrinterCharacteristic = null;
  notifyStatusChange(false, null);
  return false;
}

/**
 * 🏷️ Send Niimbot protocol packets individually with proper pacing.
 * Each packet is sent as a complete BLE write (not fragmented across 20-byte chunks).
 * Init commands get longer delays so the printer can process and ACK each one.
 */
export async function sendNiimbotPackets(packets: Uint8Array[]): Promise<boolean> {
  // Ensure connection
  if (!isBluetoothPrinterConnected()) {
    const reconnected = await ensureGattConnected();
    if (!reconnected) {
      console.warn("[Bluetooth] Cannot print Niimbot: Printer not connected");
      return false;
    }
  }

  const char = activePrinterCharacteristic;
  if (!char) return false;

  console.log(`[Bluetooth/Niimbot] 📤 Sending ${packets.length} individual packets...`);

  for (let i = 0; i < packets.length; i++) {
    const packet = packets[i];
    const cmdByte = packet.length >= 3 ? packet[2] : 0;

    // Determine if this is an init/control command (needs longer delay)
    // vs bitmap data (can be sent with minimal delay)
    const isInitCommand = [0x21, 0x23, 0x01, 0x03, 0x13].includes(cmdByte); // SetDensity, SetLabelType, PrintStart, PageStart, SetPageSize
    const isEndCommand = [0xE3, 0xF3].includes(cmdByte); // PageEnd, PrintEnd

    // Send each packet as a whole BLE write (up to ~512 bytes, well within BLE MTU)
    // If packet > 100 bytes, split into chunks for BLE reliability
    if (packet.length <= 100) {
      const ok = await writeChunkToCharacteristic(char, packet);
      if (!ok) {
        console.error(`[Bluetooth/Niimbot] ❌ Failed to send packet ${i} (cmd=0x${cmdByte.toString(16)})`);
        return false;
      }
    } else {
      // Large packet (bitmap row) — send in chunks but keep them bigger than 20 bytes
      const chunkSize = 100;
      for (let j = 0; j < packet.length; j += chunkSize) {
        const chunk = packet.slice(j, j + chunkSize);
        const ok = await writeChunkToCharacteristic(char, chunk);
        if (!ok) {
          console.error(`[Bluetooth/Niimbot] ❌ Failed to send chunk of packet ${i}`);
          return false;
        }
        if (j + chunkSize < packet.length) {
          await new Promise(r => setTimeout(r, 3));
        }
      }
    }

    // Pacing delays between packets
    if (isInitCommand) {
      // Init commands need time for printer to process and send ACK
      await new Promise(r => setTimeout(r, 50));
    } else if (isEndCommand) {
      // End commands need time for printer to finalize
      await new Promise(r => setTimeout(r, 100));
    } else {
      // Bitmap rows — minimal pacing
      await new Promise(r => setTimeout(r, 3));
    }
  }

  console.log(`[Bluetooth/Niimbot] 🟢 All ${packets.length} packets sent successfully`);
  return true;
}
