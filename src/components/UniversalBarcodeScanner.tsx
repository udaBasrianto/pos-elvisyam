import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X, Camera, Usb, Keyboard, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { playScanBeep as playBeep } from "@/lib/sound";

interface UniversalBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

type ScanMode = 'auto' | 'camera' | 'manual';

// --------------- Hardware / USB Scanner Panel ---------------
const HardwarePanel: React.FC<{ onDetected: (code: string) => void }> = ({ onDetected }) => {
  const [buffer, setBuffer] = useState('');
  const [lastScan, setLastScan] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = buffer.trim();
      if (code.length >= 2) {
        playBeep();
        setLastScan(code);
        onDetected(code);
        setBuffer('');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <Usb className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Scanner USB / Bluetooth / Wireless</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Tembakkan scanner barcode fisik ke kotak di bawah. Scanner akan otomatis mengirim <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Enter</code> setelah barcode terbaca.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Field Scanner (Klik dulu lalu tembak scanner ke sini):</label>
        <input
          ref={inputRef}
          value={buffer}
          onChange={e => setBuffer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="🔫 Arahkan scanner barcode ke sini..."
          className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-600 text-foreground text-sm px-4 py-3 rounded-xl font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <p className="text-[11px] text-muted-foreground">
          💡 Tips: Scanner USB/Bluetooth berjalan di <strong>seluruh halaman POS</strong> secara otomatis.
        </p>
      </div>

      {lastScan && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">Terdeteksi: {lastScan}</span>
        </div>
      )}
    </div>
  );
};

// --------------- Manual Input Panel ---------------
const ManualPanel: React.FC<{ onDetected: (code: string) => void }> = ({ onDetected }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (code.length >= 1) {
      playBeep();
      onDetected(code);
      setValue('');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
        <Keyboard className="w-6 h-6 text-violet-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-violet-700 dark:text-violet-300">Input Barcode Manual</p>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
            Ketik nomor barcode, SKU, atau nama produk secara manual lalu tekan Enter atau klik tombol Cari.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ketik barcode / SKU / nama produk..."
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-input text-foreground text-sm px-3 py-2.5 rounded-lg font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          autoFocus
        />
        <Button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4">
          <Zap className="w-4 h-4 mr-1" /> Cari
        </Button>
      </form>
    </div>
  );
};

// --------------- Main Universal Scanner ---------------
export const UniversalBarcodeScanner: React.FC<UniversalBarcodeScannerProps> = ({ onScan, onClose }) => {
  const [mode, setMode] = useState<ScanMode>('auto');

  const handleDetected = useCallback((code: string) => {
    toast.success(`⚡ Barcode: ${code}`);
    onScan(code);
    onClose();
  }, [onScan, onClose]);

  const tabs: { key: ScanMode; label: string; icon: React.ReactNode }[] = [
    { key: 'auto',   label: 'Kamera HP/Webcam', icon: <Camera className="w-4 h-4" /> },
    { key: 'camera', label: 'Scanner USB',      icon: <Usb className="w-4 h-4" /> },
    { key: 'manual', label: 'Manual',           icon: <Keyboard className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl mb-3">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
              mode === t.key
                ? 'bg-background shadow text-primary border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Panel Content */}
      {mode === 'auto' && (
        <CameraBarcodeScanner onScan={handleDetected} onClose={onClose} />
      )}
      {mode === 'camera' && <HardwarePanel onDetected={handleDetected} />}
      {mode === 'manual' && <ManualPanel onDetected={handleDetected} />}
    </div>
  );
};

export default UniversalBarcodeScanner;
