import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Printer, ScanLine, CreditCard, Tag, Monitor, CheckCircle2, XCircle, Loader2, RefreshCw, Usb, Bluetooth, Wifi, Globe, Plug, PlugZap, Zap, Settings2, AlertCircle, Info, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useHardware } from '@/contexts/HardwareContext';
import {
  connectBluetoothPrinter,
  PRINTER_BRAND_PRESETS,
  type PrinterConnectionType,
  type PaperWidth,
} from '@/lib/hardwareManager';
import {
  isBluetoothPrinterConnected,
  getConnectedBluetoothPrinterName,
  disconnectBluetoothPrinter,
  connectBluetoothLabelPrinter,
  disconnectBluetoothLabelPrinter,
  isBluetoothLabelPrinterConnected,
  getConnectedBluetoothLabelPrinterName,
} from '@/lib/bluetoothPrinter';
import { LABEL_PRESETS, type LabelProductData } from '@/lib/labelPrinter';
import { playScanBeep } from '@/lib/sound';

type Tab = 'printer' | 'scanner' | 'cashdrawer' | 'label' | 'display';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'printer',    label: 'Printer Thermal', icon: <Printer className="w-4 h-4" /> },
  { key: 'scanner',    label: 'Scanner Barcode',  icon: <ScanLine className="w-4 h-4" /> },
  { key: 'cashdrawer', label: 'Cash Drawer',      icon: <CreditCard className="w-4 h-4" /> },
  { key: 'label',      label: 'Printer Label',    icon: <Tag className="w-4 h-4" /> },
  { key: 'display',    label: 'Customer Display', icon: <Monitor className="w-4 h-4" /> },
];

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <Badge className={`gap-1 text-xs font-semibold ${connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
      {connected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label ?? (connected ? 'Terhubung' : 'Tidak Terhubung')}
    </Badge>
  );
}

// ── Tab: Printer Thermal ─────────────────────────────────────────────────────
function PrinterTab() {
  const { config, printerStatus, activePrinterType, connectPrinter, testPrint, updateConfig } = useHardware();
  const [selectedType, setSelectedType] = useState<PrinterConnectionType>(config.printer.connectionType || 'none');
  const [networkIp, setNetworkIp] = useState(config.printer.networkIp || '');
  const [networkPort, setNetworkPort] = useState(config.printer.networkPort || 9100);
  const [selectedPreset, setSelectedPreset] = useState<string>(config.printer.brandPreset || 'generic_58');
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const CONN_TYPES: { key: PrinterConnectionType; label: string; icon: React.ReactNode; desc: string; supported: boolean }[] = [
    { key: 'bluetooth', label: 'Bluetooth (Thermal & Struk Kasir)', icon: <Bluetooth className="w-5 h-5" />, desc: 'Printer Thermal Struk Kasir (58mm/80mm ESC/POS: Panda, Eppos, RPP02, Xprinter, dll.)', supported: typeof navigator !== 'undefined' && 'bluetooth' in navigator },
    { key: 'serial',    label: 'Serial / COM Port',     icon: <Plug className="w-5 h-5" />,      desc: 'Port Virtual USB COM / RS-232 (Sangat stabil di Windows untuk Xprinter/POS).', supported: typeof navigator !== 'undefined' && 'serial' in navigator },
    { key: 'usb',       label: 'USB Direct (WebUSB)',   icon: <Usb className="w-5 h-5" />,       desc: 'Koneksi raw USB tanpa driver OS (jika driver Windows belum dipasang).', supported: typeof navigator !== 'undefined' && 'usb' in navigator },
    { key: 'network',   label: 'Jaringan LAN / WiFi',   icon: <Globe className="w-5 h-5" />,     desc: 'Printer Jaringan LAN/WiFi via Port 9100 (IP Printer).', supported: true },
  ];

  const handleConnect = async () => {
    setIsConnecting(true);
    await connectPrinter(selectedType, networkIp, networkPort);
    setIsConnecting(false);
  };

  const handleTest = async () => {
    setIsTesting(true);
    await testPrint();
    setIsTesting(false);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = PRINTER_BRAND_PRESETS.find(item => item.id === presetId);
    if (p) {
      updateConfig({
        printer: {
          ...config.printer,
          brandPreset: presetId,
          paperWidth: p.defaultWidth,
        }
      });
      toast.success(`Preset diterapkan: ${p.name} (${p.defaultWidth}mm)`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Printer Thermal & Struk Kasir</h3>
          <p className="text-sm text-muted-foreground">Pilih tipe koneksi printer kasir standar industri (58mm / 80mm)</p>
        </div>
        <StatusBadge connected={printerStatus === 'connected'} label={printerStatus === 'connected' ? `Terhubung (${activePrinterType.toUpperCase()})` : 'Tidak Terhubung'} />
      </div>

      {/* Brand Presets Quick Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Preset Merek & Protokol Printer:
          </Label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRINTER_BRAND_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={`p-2.5 rounded-xl border text-left transition-all text-xs ${selectedPreset === p.id ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm' : 'border-border hover:border-primary/40 bg-card'}`}
            >
              <div className="font-semibold truncate">{p.name.split(' ')[0]}</div>
              <div className="text-[10px] text-muted-foreground truncate">{p.name.slice(p.name.indexOf('('))}</div>
              <div className="mt-1 flex items-center gap-1">
                <Badge variant="outline" className="text-[9px] px-1 py-0">{p.defaultWidth}mm</Badge>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">{p.protocol}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Connection Type Cards */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Jalur Koneksi Perangkat:</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONN_TYPES.map(ct => (
            <button
              key={ct.key}
              onClick={() => setSelectedType(ct.key)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${selectedType === ct.key ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'} ${!ct.supported ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!ct.supported}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={selectedType === ct.key ? 'text-primary' : 'text-muted-foreground'}>{ct.icon}</span>
                <span className="font-semibold text-sm">{ct.label}</span>
                {!ct.supported && <Badge variant="outline" className="text-[10px]">Tidak Didukung Browser Ini</Badge>}
                {selectedType === ct.key && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">{ct.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* USB Driver Notice */}
      {selectedType === 'usb' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3.5 flex gap-3 text-xs border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Catatan Pengguna Windows:</strong> Jika printer USB Anda sudah memiliki driver Windows terpasang (misal Driver resmi Xprinter/Epson/Niimbot), sistem operasi Windows akan mengunci akses WebUSB secara eksklusif. Anda dapat langsung mencetak via <strong>"Cetak Driver Sistem"</strong> atau gunakan mode <strong>"Serial / COM Port"</strong> atau <strong>"Bluetooth"</strong>.
          </div>
        </div>
      )}

      {/* Network IP Config */}
      {selectedType === 'network' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-xs font-semibold mb-1">Alamat IP Printer</Label>
            <Input value={networkIp} onChange={e => setNetworkIp(e.target.value)} placeholder="contoh: 192.168.1.100" />
          </div>
          <div className="w-28">
            <Label className="text-xs font-semibold mb-1">Port</Label>
            <Input type="number" value={networkPort} onChange={e => setNetworkPort(Number(e.target.value))} placeholder="9100" />
          </div>
        </div>
      )}

      {/* Paper Width */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Lebar Kertas Cetak</Label>
        <div className="flex gap-2">
          {([58, 80] as PaperWidth[]).map(w => (
            <button
              key={w}
              onClick={() => updateConfig({ printer: { ...config.printer, paperWidth: w } })}
              className={`px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${config.printer.paperWidth === w ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/40'}`}
            >
              {w}mm {w === 58 ? '(Standar Kasir Portable 32 Kolom)' : '(Standar POS Supermarket 48 Kolom)'}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={handleConnect} disabled={isConnecting || selectedType === 'none'} className="gap-2">
          {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
          {printerStatus === 'connected' ? 'Hubungkan Ulang' : 'Hubungkan Printer'}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={isTesting} className="gap-2">
          {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          🧾 Uji Cetak Struk Diagnostik (ESC/POS + QR Code)
        </Button>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 flex gap-3 text-sm border border-emerald-200 dark:border-emerald-900/50">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
          <strong>Standar Industri Aktif:</strong> Driver ini sudah dilengkapi sistem transmisi adaptif (128-byte BLE chunking) untuk mencegah memori buffer overflow pada printer murah/generik, sekaligus mendukung vector ESC/POS native QR Code untuk struk QRIS digital.
        </div>
      </div>
    </div>
  );
}

// ── Tab: Scanner Barcode ─────────────────────────────────────────────────────
function ScannerTab() {
  const { config, updateConfig } = useHardware();
  const [testInput, setTestInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanSpeedMs, setScanSpeedMs] = useState<number | null>(null);

  // Live scanner test listener
  useEffect(() => {
    let buf = '';
    let timestamps: number[] = [];
    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      if (timestamps.length > 0 && now - timestamps[timestamps.length - 1] > config.scanner.bufferTimeout) {
        buf = '';
        timestamps = [];
      }
      timestamps.push(now);

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buf.length >= config.scanner.minLength) {
          const duration = timestamps.length > 1 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
          setScanSpeedMs(duration);
          setLastScanned(buf.trim());
          setTestInput(buf.trim());
          playScanBeep(0.35);
          buf = '';
          timestamps = [];
        }
      } else if (e.key.length === 1) {
        buf += e.key;
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [config.scanner]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Scanner Barcode & QR Code (Standar Industri)</h3>
        <p className="text-sm text-muted-foreground">Kompatibel dengan semua scanner USB HID, Bluetooth, 2.4GHz Dongle, dan Laser Android</p>
      </div>

      {/* Live Scan Test */}
      <div className="p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Test Scanner Live (AIM Auto-Stripper)</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => playScanBeep(0.35)} className="text-xs gap-1.5 h-7">
            <Volume2 className="w-3.5 h-3.5" /> Test Bunyi Beep
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Tembakkan scanner barcode Anda sekarang. Kode akan otomatis terdeteksi tanpa perlu klik input box.</p>
        <Input
          value={testInput}
          onChange={e => setTestInput(e.target.value)}
          placeholder="🔫 Tembak barcode di sini sekarang..."
          className="font-mono text-base font-bold bg-background"
          readOnly
        />
        {lastScanned && (
          <div className="mt-2.5 flex items-center justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-mono font-bold">Terdeteksi: {lastScanned}</span>
            </div>
            {scanSpeedMs !== null && (
              <Badge variant="secondary" className="text-[10px]">
                Kecepatan: {scanSpeedMs} ms ({scanSpeedMs < 100 ? '⚡ Hardware Scanner' : '⌨️ Input Manual'})
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Scanner Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold mb-1 block">Buffer Timeout (ms)</Label>
          <Input
            type="number"
            value={config.scanner.bufferTimeout}
            onChange={e => updateConfig({ scanner: { ...config.scanner, bufferTimeout: Number(e.target.value) } })}
            min={50} max={1000}
          />
          <p className="text-xs text-muted-foreground mt-1">Jeda antar karakter scanner. Standar: 150ms. Naikkan ke 250ms jika scanner Bluetooth lambat.</p>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1 block">Panjang Minimum Barcode</Label>
          <Input
            type="number"
            value={config.scanner.minLength}
            onChange={e => updateConfig({ scanner: { ...config.scanner, minLength: Number(e.target.value) } })}
            min={1} max={20}
          />
          <p className="text-xs text-muted-foreground mt-1">Panjang minimal karakter barcode yang valid (Default: 2).</p>
        </div>
      </div>

      {/* Suffix config */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Karakter Akhiran Scanner (Suffix)</Label>
        <div className="flex gap-2 flex-wrap">
          {(['enter', 'tab', 'none'] as const).map(s => (
            <button
              key={s}
              onClick={() => updateConfig({ scanner: { ...config.scanner, suffix: s } })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${config.scanner.suffix === s ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/40'}`}
            >
              {s === 'enter' ? 'Enter (Default Pabrik)' : s === 'tab' ? 'Tab' : 'Tanpa Suffix'}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Sebagian besar scanner pabrik (Honeywell, Zebra, Eyoyo, Sunlux) menggunakan akhiran Enter (CR/LF).</p>
      </div>

      {/* Compatibility guide */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 text-sm border border-amber-200 dark:border-amber-900/50">
        <div className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-600" /> Kompatibilitas Scanner Bermerek & Universal
        </div>
        <ul className="text-amber-700 dark:text-amber-400 space-y-1.5 text-xs list-disc pl-4">
          <li><strong>Honeywell / Zebra / Datalogic / Symbol</strong>: Dilengkapi otomatis pembersih kode identifikasi AIM (menghilangkan prefix <code>]C1</code>, <code>]E0</code>, <code>]Q1</code>).</li>
          <li><strong>Scanner Bluetooth / 2.4GHz Wireless</strong> (Netum, Inateck, Panda, Iware): Langsung colok USB Dongle atau pairing Bluetooth dalam mode HID Keyboard.</li>
          <li><strong>Terminal Android POS (Sunmi V2, iMin, Kassen)</strong>: Terintegrasi langsung dengan laser barcode scan engine.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Tab: Cash Drawer ─────────────────────────────────────────────────────────
function CashDrawerTab() {
  const { config, updateConfig, openCashDrawer } = useHardware();
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await openCashDrawer();
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Cash Drawer (Laci Kasir Otomatis)</h3>
        <p className="text-sm text-muted-foreground">Konfigurasi dan uji coba tendangan laci kasir otomatis via sinyal RJ11 ESC/POS</p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
        <div>
          <p className="font-semibold text-sm">Aktifkan Cash Drawer Otomatis</p>
          <p className="text-xs text-muted-foreground">Laci kasir akan otomatis terbuka setiap kali transaksi tunai berhasil diselesaikan.</p>
        </div>
        <Switch
          checked={config.cashDrawerEnabled}
          onCheckedChange={v => updateConfig({ cashDrawerEnabled: v })}
        />
      </div>

      <div>
        <Label className="text-xs font-semibold mb-2 block">Pin Trigger Laci (Solenoid Pin)</Label>
        <div className="flex gap-2">
          {([0, 1] as const).map(pin => (
            <button
              key={pin}
              onClick={() => updateConfig({ printer: { ...config.printer, cashDrawerPin: pin } })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${config.printer.cashDrawerPin === pin ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/40'}`}
            >
              Pin {pin === 0 ? '2 (Standar Epson/Panda/Xprinter)' : '5 (Standar Star/Alternatif)'}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleTest} disabled={testing || !config.cashDrawerEnabled} className="gap-2">
        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
        🔓 Test Buka Laci Sekarang
      </Button>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 text-sm border border-blue-200 dark:border-blue-900/50">
        <div className="font-semibold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1.5"><Info className="w-4 h-4 text-blue-600" /> Cara Menghubungkan Laci Kasir</div>
        <ul className="text-blue-700 dark:text-blue-400 space-y-1 text-xs list-disc pl-4">
          <li>Sambungkan kabel <strong>RJ11 / RJ12</strong> dari laci kasir ke port laci di belakang printer thermal kasir.</li>
          <li>Pastikan printer thermal sudah terhubung di tab <strong>Printer Thermal</strong>.</li>
          <li>Sinyal listrik 24V/12V akan dikirim melalui printer saat checkout tunai selesai.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Tab: Label Printer ───────────────────────────────────────────────────────
function LabelTab() {
  const { config, updateConfig, printLabel } = useHardware();
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isBtConnected, setIsBtConnected] = useState(isBluetoothLabelPrinterConnected());
  const [btName, setBtName] = useState<string | null>(getConnectedBluetoothLabelPrinterName());

  useEffect(() => {
    setIsBtConnected(isBluetoothLabelPrinterConnected());
    setBtName(getConnectedBluetoothLabelPrinterName());

    const handleStatus = (e: any) => {
      setIsBtConnected(Boolean(e.detail?.connected));
      setBtName(e.detail?.name || getConnectedBluetoothLabelPrinterName());
    };
    window.addEventListener('pos_bluetooth_label_status', handleStatus);
    return () => window.removeEventListener('pos_bluetooth_label_status', handleStatus);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    const result = await connectBluetoothLabelPrinter();
    setConnecting(false);
    if (result && result.success) {
      setIsBtConnected(true);
      setBtName(result.name || getConnectedBluetoothLabelPrinterName());
      updateConfig({ labelPrinterConnected: true });
      toast.success(result.message);
    } else if (result) {
      toast.error(result.message);
    }
  };

  const handleDisconnect = () => {
    disconnectBluetoothLabelPrinter();
    setIsBtConnected(false);
    setBtName(null);
    updateConfig({ labelPrinterConnected: false });
    toast.info('Printer Label Bluetooth diputuskan.');
  };

  const handleTestLabelPrint = async () => {
    setTesting(true);
    const testProduct: LabelProductData = {
      name: 'PRODUK TEST POS',
      barcode: '8992761001234',
      sku: 'TEST-001',
      price: 25000,
      brand: 'TOKO SAYA',
    };

    try {
      const ok = await printLabel(testProduct, {
        presetId: '40x30',
        widthMm: 40,
        heightMm: 30,
        copies: 1,
        showStoreName: true,
        showName: true,
        showBarcode: true,
        showBarcodeText: true,
        showPrice: true,
        showSku: false,
      });

      if (ok) {
        toast.success('🏷️ Test label stiker berhasil dikirim ke printer!');
      } else {
        toast.error('Gagal mencetak. Sambungkan Bluetooth printer terlebih dahulu.');
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Printer Label Stiker (Khusus Xprinter XP-420B)</h3>
          <p className="text-sm text-muted-foreground">Driver khusus Direct Thermal TSPL 203 DPI untuk Xprinter XP-420B / XP-365B</p>
        </div>
        <StatusBadge
          connected={isBtConnected}
          label={isBtConnected ? `Terhubung: ${btName || 'Xprinter XP-420B'}` : 'Tidak Terhubung'}
        />
      </div>

      {/* Xprinter XP-420B Feature Card */}
      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-4 border border-purple-200 dark:border-purple-900/50 space-y-3">
        <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold text-sm">
          <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Xprinter XP-420B Direct Thermal Label Engine
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-background/80 p-2.5 rounded-xl border">
            <p className="text-muted-foreground text-[10px]">Resolusi</p>
            <p className="font-bold text-foreground">203 DPI (8 dots/mm)</p>
          </div>
          <div className="bg-background/80 p-2.5 rounded-xl border">
            <p className="text-muted-foreground text-[10px]">Lebar Cetak Maks</p>
            <p className="font-bold text-foreground">108 mm (4 Inci)</p>
          </div>
          <div className="bg-background/80 p-2.5 rounded-xl border">
            <p className="text-muted-foreground text-[10px]">Bahasa Perintah</p>
            <p className="font-bold text-purple-600 dark:text-purple-400">TSPL Vector</p>
          </div>
          <div className="bg-background/80 p-2.5 rounded-xl border">
            <p className="text-muted-foreground text-[10px]">Media Stiker</p>
            <p className="font-bold text-foreground">1 - 3 Kolom & Resi</p>
          </div>
        </div>
        <p className="text-[11px] text-purple-800 dark:text-purple-400 leading-relaxed">
          💡 <strong>Catatan:</strong> Untuk cetak <strong>Struk Transaksi POS</strong> tetap menggunakan <strong>Printer Thermal Bluetooth (ESC/POS 58mm/80mm)</strong> di tab <em>Printer Thermal</em>.
        </p>
      </div>

      {/* Preset sizes supported */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Ukuran Roll Stiker XP-420B yang Didukung:</Label>
        <div className="flex flex-wrap gap-2">
          {LABEL_PRESETS.map(p => (
            <Badge key={p.id} variant="secondary" className="px-3 py-1.5 text-xs font-medium">
              🏷️ {p.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        {!isBtConnected ? (
          <Button onClick={handleConnect} disabled={connecting} className="gap-2">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
            Pasangkan Xprinter Bluetooth (Opsional)
          </Button>
        ) : (
          <>
            <Button onClick={handleTestLabelPrint} disabled={testing} className="gap-2">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Cetak Test Stiker XP-420B (TSPL)
            </Button>
            <Button variant="outline" onClick={handleDisconnect} className="gap-2 text-destructive hover:bg-destructive/10">
              Putuskan Sambungan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Customer Display ────────────────────────────────────────────────────
function DisplayTab() {
  const { config, updateConfig } = useHardware();

  const handleOpenDisplay = () => {
    window.open('/customer-display', 'CustomerDisplayWindow', 'width=800,height=600');
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-base">Customer Display (Layar Pelanggan)</h3>
        <p className="text-sm text-muted-foreground">Tampilan layar kedua untuk pelanggan melihat daftar belanja dan QRIS pembayaran</p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
        <div>
          <p className="font-semibold text-sm">Aktifkan Layar Pelanggan</p>
          <p className="text-xs text-muted-foreground">Sinkronisasi keranjang belanja kasir secara real-time ke monitor pelanggan.</p>
        </div>
        <Switch
          checked={config.customerDisplayEnabled}
          onCheckedChange={v => updateConfig({ customerDisplayEnabled: v })}
        />
      </div>

      <Button onClick={handleOpenDisplay} variant="outline" className="gap-2">
        <Monitor className="w-4 h-4" /> Buka Layar Kedua Pelanggan (Popup Monitor)
      </Button>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function HardwareSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('printer');

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Manajemen Perangkat Keras (Hardware POS)</h1>
          </div>
          <p className="text-muted-foreground text-xs">
            Konfigurasi printer thermal, scanner barcode, cash drawer, dan printer label standar industri POS Indonesia.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 p-1 bg-card border rounded-2xl overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Card */}
      <Card className="shadow-sm border rounded-2xl">
        <CardContent className="p-6">
          {activeTab === 'printer'    && <PrinterTab />}
          {activeTab === 'scanner'    && <ScannerTab />}
          {activeTab === 'cashdrawer' && <CashDrawerTab />}
          {activeTab === 'label'      && <LabelTab />}
          {activeTab === 'display'    && <DisplayTab />}
        </CardContent>
      </Card>
    </div>
  );
}
