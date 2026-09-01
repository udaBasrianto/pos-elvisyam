import React, { createContext, useState, useCallback, ReactNode } from 'react';

export type ScannerMode = 'auto' | 'camera' | 'hardware';

export interface ScannerContextProps {
  scannerMode: ScannerMode;
  setScannerMode: (mode: ScannerMode) => void;
  /** Called when a barcode/QR code is successfully scanned */
  onScan: (code: string) => void;
}

export const ScannerContext = createContext<ScannerContextProps>({
  scannerMode: 'auto',
  setScannerMode: () => {},
  onScan: () => {}
});

interface ProviderProps {
  children: ReactNode;
  /** Application level handler for scanned codes */
  onDetected: (code: string) => void;
}

export const ScannerProvider: React.FC<ProviderProps> = ({ children, onDetected }) => {
  const [scannerMode, setScannerMode] = useState<ScannerMode>('auto');
  const onScan = useCallback((code: string) => {
    onDetected(code);
  }, [onDetected]);

  return (
    <ScannerContext.Provider value={{ scannerMode, setScannerMode, onScan }}>
      {children}
    </ScannerContext.Provider>
  );
};
