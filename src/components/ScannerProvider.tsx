import { useContext, useEffect } from 'react';
import { ScannerContext } from '@/context/ScannerContext';
import { useHardwareScanner } from '@/hooks/useHardwareScanner';

/**
 * ScannerProvider registers the global hardware scanner (USB/Bluetooth/Wireless)
 * keyboard listener passively in the background.
 * The camera UI is only shown on demand when the user clicks the scan button.
 */
export const ScannerProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { scannerMode, onScan } = useContext(ScannerContext);

  // Always listen for hardware scanner keystrokes (USB/BT/Wireless HID scanners)
  const { start: startHardware, stop: stopHardware } = useHardwareScanner({ onScan });

  useEffect(() => {
    startHardware();
    return () => {
      stopHardware();
    };
  }, [scannerMode, startHardware, stopHardware]);

  // Camera is no longer auto-rendered here - it is opened on demand via dialog in each page
  return <>{children}</>;
};
