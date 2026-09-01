import { useEffect, useRef, useCallback, useContext } from 'react';
import { ScannerContext } from '@/contexts/ScannerContext';
import { playScanBeep } from '@/lib/sound';

interface HardwareScannerConfig {
  /** Buffer timeout in ms between keystrokes for HID scanners. (Default 150ms) */
  bufferTimeout?: number;
  /** Minimum length of barcode string to consider valid. */
  minLength?: number;
  /** Whether to treat Tab as a suffix in addition to Enter. */
  acceptTab?: boolean;
  /** Whether to play auditory beep feedback on scan. (Default true) */
  enableSound?: boolean;
  /** Custom onScan callback */
  onScan?: (barcode: string) => void;
}

/**
 * 🏷️ Strip Industrial AIM Symbology Identifiers
 * e.g., "]C1" (Code 128), "]E0" (EAN-13), "]e0" (GS1 DataBar), "]Q1" (QR Code), "]d2" (Data Matrix)
 */
export function cleanAimIdentifier(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip AIM prefix "]xx" (e.g. ]C1, ]E0, ]Q1, ]d2)
  if (cleaned.length >= 4 && cleaned.startsWith(']')) {
    cleaned = cleaned.slice(3).trim();
  }
  // Strip non-printable control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '').trim();
  return cleaned;
}

/**
 * Universal Hardware Barcode & QR Scanner Hook (Industrial Standard)
 * ─────────────────────────────────────────────────────────────────────────────
 * Compatible with ALL:
 * - USB HID Scanners (Honeywell, Zebra/Symbol, Datalogic, Sunlux, Eyoyo)
 * - Bluetooth Wireless Scanners (Netum, Inateck, Tera, Panda, Iware)
 * - 2.4GHz Wireless USB Dongle Scanners
 * - Android Smart POS Terminal built-in laser engines (Sunmi V2/T2, iMin, Telpo)
 * - Continuous & Presentation Mode Scanners
 */
export const useHardwareScanner = ({
  bufferTimeout = 150,
  minLength = 2,
  acceptTab = true,
  enableSound = true,
  onScan: customOnScan,
}: HardwareScannerConfig = {}) => {
  const contextScanner = useContext(ScannerContext);
  const onScan = customOnScan || contextScanner?.onScan;
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());
  const timerRef = useRef<any>(null);
  const keyTimestamps = useRef<number[]>([]);

  const triggerScan = useCallback((rawCode: string) => {
    if (!rawCode) return;
    const cleanCode = cleanAimIdentifier(rawCode);
    if (cleanCode.length < minLength) return;

    if (enableSound) {
      playScanBeep(0.35);
    }

    if (onScan) {
      onScan(cleanCode);
    }
  }, [onScan, minLength, enableSound]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore lone modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock'].includes(e.key)) {
        return;
      }

      const activeEl = document.activeElement;
      const isInputOrTextarea = activeEl && (
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).id !== 'pos-search-input')
      );

      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // If gap between keystrokes is too long for a barcode scanner burst, reset buffer
      if (timeDiff > bufferTimeout) {
        barcodeBuffer.current = '';
        keyTimestamps.current = [];
      }

      keyTimestamps.current.push(now);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const isEnter = e.key === 'Enter' || e.key === 'NumpadEnter' || e.code === 'Enter' || e.code === 'NumpadEnter';
      const isTab = acceptTab && (e.key === 'Tab' || e.code === 'Tab');

      if (isEnter || isTab) {
        if (barcodeBuffer.current.length >= minLength) {
          // Check if this burst looks like a fast scanner (average keystroke speed < 60ms)
          const timestamps = keyTimestamps.current;
          let isScannerBurst = true;
          if (timestamps.length >= 3) {
            const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
            const avgInterval = totalDuration / (timestamps.length - 1);
            isScannerBurst = avgInterval < 75; // Scanners send keys within 5-40ms
          }

          if (isScannerBurst || !isInputOrTextarea) {
            e.preventDefault();
            triggerScan(barcodeBuffer.current);
          }
        }
        barcodeBuffer.current = '';
        keyTimestamps.current = [];
      } else if (e.key && e.key.length === 1) {
        barcodeBuffer.current += e.key;

        // Smart Fallback Timer for scanners configured without Enter/Tab suffix
        timerRef.current = setTimeout(() => {
          if (barcodeBuffer.current.length >= 4) {
            triggerScan(barcodeBuffer.current);
          }
          barcodeBuffer.current = '';
          keyTimestamps.current = [];
        }, 120);
      }
    },
    [triggerScan, bufferTimeout, minLength, acceptTab]
  );

  const start = useCallback(() => {
    window.addEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  const stop = useCallback(() => {
    window.removeEventListener('keydown', handleKeyDown, true);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [handleKeyDown]);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  return { start, stop };
};
