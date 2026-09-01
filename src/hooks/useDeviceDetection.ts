import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
export interface HidDevice {
  vendorId: number;
  productId: number;
  productName: string;
  type: 'scanner' | 'unknown';
}

export interface UsbDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  type: 'printer' | 'scanner' | 'unknown';
}

export type CameraPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface DeviceState {
  // Browser-enumerated HID devices (scanner USB/BT already granted)
  hidDevices: HidDevice[];
  // Browser-enumerated USB devices (already granted)
  usbDevices: UsbDevice[];
  // Camera permission state
  cameraPermission: CameraPermission;
  // Whether hardware keyboard scanner listener is active (always true)
  keyboardScannerActive: boolean;
  // WebHID supported by this browser
  webHidSupported: boolean;
  // WebUSB supported by this browser
  webUsbSupported: boolean;
  // WebSerial supported
  webSerialSupported: boolean;
  isLoading: boolean;
  lastRefreshed: Date | null;
}

// Known barcode scanner vendor IDs (HID)
const SCANNER_VENDOR_IDS = new Set([
  0x05f9, // Symbol/Zebra
  0x0c2e, // Honeywell / Metrologic
  0x04b4, // Cypress (many generic scanners)
  0x1eab, // Newland
  0x0536, // Hand Held Products
  0x0b81, // id-Technologies
  0x04f3, // ELAN
  0x067e, // Intermec
  0x0519, // Datalogic
  0x2dd6, // Cino
  0x1a86, // CH341 (cheap clones)
]);

// Known printer vendor IDs (USB)
const PRINTER_VENDOR_IDS = new Set([
  0x04b8, // Epson
  0x04f9, // Brother
  0x03f0, // HP
  0x04a9, // Canon
  0x0924, // Xerox
  0x04da, // Citizen
  0x0fe6, // ICS Advent (thermal)
  0x154f, // SNBC
  0x28e9, // Gainscha / Xprinter
  0x6868, // Xprinter
  0x0416, // Winbond
  0x1659, // Star Micronics
  0x0519, // Datalogic
]);

function classifyHidDevice(device: any): HidDevice {
  const isScanner = SCANNER_VENDOR_IDS.has(device.vendorId) ||
    (device.productName || '').toLowerCase().match(/scan|barcode|reader|gun/);
  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName || `HID Device (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
    type: isScanner ? 'scanner' : 'unknown',
  };
}

function classifyUsbDevice(device: any): UsbDevice {
  const isPrinter = PRINTER_VENDOR_IDS.has(device.vendorId) ||
    (device.productName || '').toLowerCase().match(/print|receipt|thermal|pos|struk/);
  const isScanner = SCANNER_VENDOR_IDS.has(device.vendorId) ||
    (device.productName || '').toLowerCase().match(/scan|barcode|reader/);
  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    manufacturerName: device.manufacturerName,
    type: isPrinter ? 'printer' : isScanner ? 'scanner' : 'unknown',
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useDeviceDetection() {
  const [state, setState] = useState<DeviceState>({
    hidDevices: [],
    usbDevices: [],
    cameraPermission: 'prompt',
    keyboardScannerActive: true,
    webHidSupported: 'hid' in navigator,
    webUsbSupported: 'usb' in navigator,
    webSerialSupported: 'serial' in navigator,
    isLoading: false,
    lastRefreshed: null,
  });

  const refreshDevices = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    // 1. Enumerate HID devices (already granted)
    let hidDevices: HidDevice[] = [];
    if ('hid' in navigator) {
      try {
        const devices = await (navigator as any).hid.getDevices();
        hidDevices = devices.map(classifyHidDevice);
      } catch (_) {}
    }

    // 2. Enumerate USB devices (already granted)
    let usbDevices: UsbDevice[] = [];
    if ('usb' in navigator) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        usbDevices = devices.map(classifyUsbDevice);
      } catch (_) {}
    }

    // 3. Check camera permission
    let cameraPermission: CameraPermission = 'unsupported';
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        cameraPermission = result.state as CameraPermission;
      } catch (_) {
        cameraPermission = 'prompt';
      }
    }

    setState(prev => ({
      ...prev,
      hidDevices,
      usbDevices,
      cameraPermission,
      isLoading: false,
      lastRefreshed: new Date(),
    }));
  }, []);

  // Request a new HID device (scanner) — requires user gesture
  const requestHidScanner = useCallback(async () => {
    if (!('hid' in navigator)) return;
    try {
      // Common scanner usage page (0xff00:0x0)
      const granted = await (navigator as any).hid.requestDevice({
        filters: [
          { usagePage: 0x0001 },  // Generic Desktop Controls (keyboard-like)
          { usagePage: 0xff00 },  // Vendor-specific
          ...Array.from(SCANNER_VENDOR_IDS).map(vendorId => ({ vendorId })),
        ],
      });
      if (granted && granted.length > 0) {
        await refreshDevices();
        return granted.length;
      }
      return 0;
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') throw err;
      return 0;
    }
  }, [refreshDevices]);

  // Request a new USB device (printer) — requires user gesture
  const requestUsbPrinter = useCallback(async () => {
    if (!('usb' in navigator)) return;
    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: Array.from(PRINTER_VENDOR_IDS).map(vendorId => ({ vendorId })),
      });
      if (device) {
        await refreshDevices();
        return 1;
      }
      return 0;
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') throw err;
      return 0;
    }
  }, [refreshDevices]);

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setState(prev => ({ ...prev, cameraPermission: 'granted' }));
    } catch (_) {
      setState(prev => ({ ...prev, cameraPermission: 'denied' }));
    }
  }, []);

  // Listen for HID connect/disconnect events
  useEffect(() => {
    if (!('hid' in navigator)) return;
    const hid = (navigator as any).hid;
    const onConnect = () => refreshDevices();
    const onDisconnect = () => refreshDevices();
    hid.addEventListener('connect', onConnect);
    hid.addEventListener('disconnect', onDisconnect);
    return () => {
      hid.removeEventListener('connect', onConnect);
      hid.removeEventListener('disconnect', onDisconnect);
    };
  }, [refreshDevices]);

  // Listen for USB connect/disconnect events
  useEffect(() => {
    if (!('usb' in navigator)) return;
    const usb = (navigator as any).usb;
    const onConnect = () => refreshDevices();
    const onDisconnect = () => refreshDevices();
    usb.addEventListener('connect', onConnect);
    usb.addEventListener('disconnect', onDisconnect);
    return () => {
      usb.removeEventListener('connect', onConnect);
      usb.removeEventListener('disconnect', onDisconnect);
    };
  }, [refreshDevices]);

  // Initial load
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    ...state,
    refreshDevices,
    requestHidScanner,
    requestUsbPrinter,
    requestCameraPermission,
  };
}
