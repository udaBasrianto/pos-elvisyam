/**
 * deviceAutoDetector.ts
 * Engine Deteksi Otomatis Perangkat Keras POS (Printer Thermal Bluetooth/USB/Serial & Barcode Scanner)
 * Dilengkapi kemampuan Plug & Play (Hotplug Event Listener) dan Auto-Connect latar belakang.
 */

import { autoConnectBluetoothPrinter, isBluetoothPrinterConnected, getConnectedBluetoothPrinterName } from './bluetoothPrinter';
import { getActivePrinterType } from './hardwareManager';

export interface AutoDetectionReport {
  printer: {
    type: 'bluetooth' | 'usb' | 'serial' | 'network' | 'none';
    name?: string;
    connected: boolean;
    devicesFound: number;
    details: string[];
  };
  scanner: {
    hidReady: boolean;
    webHidDevices: number;
    camerasCount: number;
    hasCameraPermission: boolean;
    details: string[];
  };
  timestamp: Date;
}

// Known thermal printer vendor IDs for USB detection
const THERMAL_PRINTER_VENDORS = new Set([
  0x04b8, // Epson
  0x04f9, // Brother
  0x03f0, // HP
  0x04a9, // Canon
  0x0924, // Xerox
  0x04da, // Citizen
  0x0fe6, // ICS Advent
  0x154f, // SNBC
  0x28e9, // Gainscha / Xprinter
  0x6868, // Xprinter
  0x0416, // Winbond POS
  0x1659, // Star Micronics
  0x0519, // Datalogic
  0x1a86, // QinHeng Electronics (CH340/CH341 used in 90% cheap POS printers)
]);

// Known scanner vendor IDs
const SCANNER_VENDORS = new Set([
  0x05f9, // Symbol / Zebra
  0x0c2e, // Honeywell / Metrologic
  0x04b4, // Cypress
  0x1eab, // Newland
  0x0536, // Hand Held Products
  0x0b81, // id-Technologies
  0x04f3, // ELAN
  0x067e, // Intermec
  0x0519, // Datalogic
  0x2dd6, // Cino
  0x1a86, // CH341
]);

/**
 * 🔍 Pindai & Deteksi Otomatis Semua Perangkat POS di Browser
 */
export async function runFullDeviceAutoDetect(): Promise<AutoDetectionReport> {
  const report: AutoDetectionReport = {
    printer: {
      type: 'none',
      connected: false,
      devicesFound: 0,
      details: [],
    },
    scanner: {
      hidReady: true, // Universal Keyboard HID scanner listener is always active
      webHidDevices: 0,
      camerasCount: 0,
      hasCameraPermission: false,
      details: ['⚡ Scanner Fisik (USB / Bluetooth / Wireless HID) aktif di seluruh layar.'],
    },
    timestamp: new Date(),
  };

  // 1. Pindai Bluetooth Printer
  if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
    try {
      const nav = navigator as any;
      if (typeof nav.bluetooth.getDevices === 'function') {
        const btDevices = await nav.bluetooth.getDevices();
        if (btDevices && btDevices.length > 0) {
          report.printer.devicesFound += btDevices.length;
          const btNames = btDevices.map((d: any) => d.name || 'Bluetooth Printer').join(', ');
          report.printer.details.push(`🔵 ${btDevices.length} Printer Bluetooth tersimpan: ${btNames}`);

          // Coba auto-connect ke Bluetooth
          const btOk = await autoConnectBluetoothPrinter();
          if (btOk) {
            report.printer.connected = true;
            report.printer.type = 'bluetooth';
            report.printer.name = getConnectedBluetoothPrinterName() || btDevices[0].name || 'Printer Bluetooth';
          }
        }
      }
    } catch (e) {
      console.warn("[AutoDetect] Bluetooth scan error:", e);
    }
  }

  // 2. Pindai WebUSB Printer
  if (typeof window !== 'undefined' && 'usb' in navigator) {
    try {
      const nav = navigator as any;
      const usbDevices = await nav.usb.getDevices();
      if (usbDevices && usbDevices.length > 0) {
        report.printer.devicesFound += usbDevices.length;
        const printerList = usbDevices.filter((d: any) => 
          THERMAL_PRINTER_VENDORS.has(d.vendorId) || 
          (d.productName || '').toLowerCase().match(/print|thermal|pos|receipt|struk/)
        );

        if (printerList.length > 0) {
          const names = printerList.map((d: any) => d.productName || `USB (${d.vendorId.toString(16)})`).join(', ');
          report.printer.details.push(`🔌 ${printerList.length} Printer USB terdeteksi: ${names}`);
          if (!report.printer.connected) {
            report.printer.type = 'usb';
            report.printer.name = printerList[0].productName || 'Printer USB';
            report.printer.connected = true;
          }
        } else {
          report.printer.details.push(`🔌 ${usbDevices.length} Perangkat USB terdaftar.`);
        }
      }
    } catch (e) {
      console.warn("[AutoDetect] USB scan error:", e);
    }
  }

  // 3. Pindai WebSerial / COM Ports
  if (typeof window !== 'undefined' && 'serial' in navigator) {
    try {
      const nav = navigator as any;
      const serialPorts = await nav.serial.getPorts();
      if (serialPorts && serialPorts.length > 0) {
        report.printer.devicesFound += serialPorts.length;
        report.printer.details.push(`🔌 ${serialPorts.length} Port Serial/COM terdeteksi.`);
        if (!report.printer.connected) {
          report.printer.type = 'serial';
          report.printer.name = 'Serial/COM Port';
          report.printer.connected = true;
        }
      }
    } catch (e) {
      console.warn("[AutoDetect] Serial scan error:", e);
    }
  }

  // 4. Pindai WebHID Scanners
  if (typeof window !== 'undefined' && 'hid' in navigator) {
    try {
      const nav = navigator as any;
      const hidDevices = await nav.hid.getDevices();
      if (hidDevices && hidDevices.length > 0) {
        report.scanner.webHidDevices = hidDevices.length;
        const scanners = hidDevices.filter((d: any) => 
          SCANNER_VENDORS.has(d.vendorId) ||
          (d.productName || '').toLowerCase().match(/scan|barcode|reader|gun/)
        );
        if (scanners.length > 0) {
          const sNames = scanners.map((s: any) => s.productName || 'Scanner HID').join(', ');
          report.scanner.details.push(`🔫 ${scanners.length} Scanner USB/HID terdaftar: ${sNames}`);
        }
      }
    } catch (e) {
      console.warn("[AutoDetect] HID scan error:", e);
    }
  }

  // 5. Pindai Kamera Barcode
  if (typeof window !== 'undefined' && navigator.mediaDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      report.scanner.camerasCount = videoDevices.length;

      if (videoDevices.length > 0) {
        const hasLabel = videoDevices.some(d => Boolean(d.label));
        report.scanner.hasCameraPermission = hasLabel;
        report.scanner.details.push(`📷 ${videoDevices.length} Kamera terdeteksi (Webcam / Kamera HP siap scan).`);
      }
    } catch (e) {
      console.warn("[AutoDetect] Camera enumerate error:", e);
    }
  }

  return report;
}

/**
 * ⚡ Registrasi event listener Hotplug / Plug & Play
 * Otomatis mendeteksi saat kabel USB atau dongle scanner dicolokkan ke laptop/PC.
 */
export function registerHotplugListeners(onDeviceChanged: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanups: Array<() => void> = [];

  // 1. USB Hotplug
  if ('usb' in navigator) {
    const usb = (navigator as any).usb;
    const handleConnect = () => {
      console.log('[Hotplug] 🔌 Perangkat USB baru terhubung');
      onDeviceChanged();
    };
    const handleDisconnect = () => {
      console.log('[Hotplug] 🔌 Perangkat USB dilepas');
      onDeviceChanged();
    };
    usb.addEventListener('connect', handleConnect);
    usb.addEventListener('disconnect', handleDisconnect);
    cleanups.push(() => {
      usb.removeEventListener('connect', handleConnect);
      usb.removeEventListener('disconnect', handleDisconnect);
    });
  }

  // 2. Serial / COM Hotplug
  if ('serial' in navigator) {
    const serial = (navigator as any).serial;
    const handleConnect = () => {
      console.log('[Hotplug] 🔌 Port Serial baru terhubung');
      onDeviceChanged();
    };
    const handleDisconnect = () => {
      console.log('[Hotplug] 🔌 Port Serial dilepas');
      onDeviceChanged();
    };
    serial.addEventListener('connect', handleConnect);
    serial.addEventListener('disconnect', handleDisconnect);
    cleanups.push(() => {
      serial.removeEventListener('connect', handleConnect);
      serial.removeEventListener('disconnect', handleDisconnect);
    });
  }

  // 3. HID Scanner Hotplug
  if ('hid' in navigator) {
    const hid = (navigator as any).hid;
    const handleConnect = () => {
      console.log('[Hotplug] 🔫 Scanner HID baru terhubung');
      onDeviceChanged();
    };
    const handleDisconnect = () => {
      console.log('[Hotplug] 🔫 Scanner HID dilepas');
      onDeviceChanged();
    };
    hid.addEventListener('connect', handleConnect);
    hid.addEventListener('disconnect', handleDisconnect);
    cleanups.push(() => {
      hid.removeEventListener('connect', handleConnect);
      hid.removeEventListener('disconnect', handleDisconnect);
    });
  }

  // 4. Camera Change
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    const handleDeviceChange = () => {
      console.log('[Hotplug] 📷 Perangkat media/kamera berubah');
      onDeviceChanged();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    cleanups.push(() => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    });
  }

  return () => {
    cleanups.forEach(c => c());
  };
}
