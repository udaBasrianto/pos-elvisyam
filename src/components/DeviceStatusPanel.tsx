import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  ScanBarcode,
  Camera,
  Keyboard,
  Usb,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  Link,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

// ── Helper Components ──────────────────────────────────────────────────────
const StatusBadge = ({ ok, label }: { ok: boolean | null; label: string }) => {
  if (ok === null) return <Badge variant="outline" className="text-muted-foreground text-xs">{label}</Badge>;
  return ok ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-xs gap-1">
      <CheckCircle2 className="w-3 h-3" /> {label}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
      <XCircle className="w-3 h-3" /> {label}
    </Badge>
  );
};

const SectionHeader = ({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) => (
  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm mb-3 ${color}`}>
    <Icon className="w-4 h-4" />
    {title}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
export const DeviceStatusPanel: React.FC = () => {
  const {
    hidDevices,
    usbDevices,
    cameraPermission,
    keyboardScannerActive,
    webHidSupported,
    webUsbSupported,
    webSerialSupported,
    isLoading,
    lastRefreshed,
    refreshDevices,
    requestHidScanner,
    requestUsbPrinter,
    requestCameraPermission,
  } = useDeviceDetection();

  const [connectingHid, setConnectingHid] = useState(false);
  const [connectingUsb, setConnectingUsb] = useState(false);

  const printers = usbDevices.filter(d => d.type === 'printer');
  const usbScanners = usbDevices.filter(d => d.type === 'scanner');
  const hidScanners = hidDevices.filter(d => d.type === 'scanner' || d.type === 'unknown');

  const handleConnectHid = async () => {
    setConnectingHid(true);
    try {
      const count = await requestHidScanner();
      if (count && count > 0) toast.success(`✅ ${count} scanner HID berhasil terhubung!`);
      else toast.info('Tidak ada perangkat yang dipilih.');
    } catch (e: any) {
      toast.error('Gagal menghubungkan scanner: ' + (e?.message || ''));
    } finally {
      setConnectingHid(false);
    }
  };

  const handleConnectUsb = async () => {
    setConnectingUsb(true);
    try {
      const count = await requestUsbPrinter();
      if (count && count > 0) toast.success('✅ Printer USB berhasil terhubung!');
      else toast.info('Tidak ada perangkat yang dipilih.');
    } catch (e: any) {
      toast.error('Gagal menghubungkan printer: ' + (e?.message || ''));
    } finally {
      setConnectingUsb(false);
    }
  };

  const handleTestPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Browser Support Info */}
      <div className="flex flex-wrap gap-2 items-center">
        <StatusBadge ok={webHidSupported} label="WebHID (Scanner USB/BT)" />
        <StatusBadge ok={webUsbSupported} label="WebUSB (Printer Thermal)" />
        <StatusBadge ok={webSerialSupported} label="Web Serial" />
        {!webHidSupported && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Gunakan Chrome / Edge untuk fitur lengkap
          </span>
        )}
      </div>

      {/* Last refreshed + refresh button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {lastRefreshed ? `Diperbarui: ${lastRefreshed.toLocaleTimeString('id-ID')}` : 'Belum diperbarui'}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshDevices}
          disabled={isLoading}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── PRINTER SECTION ── */}
      <div>
        <SectionHeader
          icon={Printer}
          title="Printer"
          color="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        />

        <div className="space-y-3">
          {/* USB Printers (WebUSB) */}
          {webUsbSupported && (
            <div className="bg-background rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Usb className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">Printer USB / Thermal (WebUSB)</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleConnectUsb}
                  disabled={connectingUsb}
                  className="h-7 text-xs gap-1.5 border-blue-400 text-blue-600"
                >
                  <Link className="w-3.5 h-3.5" />
                  {connectingUsb ? 'Menghubungkan...' : 'Hubungkan'}
                </Button>
              </div>

              {printers.length > 0 ? (
                <div className="space-y-2">
                  {printers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-medium">{p.productName || 'Unknown Printer'}</p>
                          {p.manufacturerName && <p className="text-xs text-muted-foreground">{p.manufacturerName}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {p.vendorId.toString(16).padStart(4,'0')}:{p.productId.toString(16).padStart(4,'0')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Belum ada printer USB yang terhubung. Klik "Hubungkan" lalu pilih printer Anda.
                </p>
              )}
            </div>
          )}

          {/* OS Print Dialog */}
          <div className="bg-background rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold">Semua Printer (Dialog Sistem OS)</p>
                  <p className="text-xs text-muted-foreground">Mencetak lewat dialog bawaan Windows/Mac/Linux — semua printer terdaftar di OS tersedia</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleTestPrint}
                className="h-7 text-xs gap-1.5 shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Test Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCANNER SECTION ── */}
      <div>
        <SectionHeader
          icon={ScanBarcode}
          title="Scanner Barcode"
          color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        />

        <div className="space-y-3">
          {/* Keyboard Scanner (always active) */}
          <div className="bg-background rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold">Scanner HID Keyboard (USB/BT/Wireless)</p>
                  <p className="text-xs text-muted-foreground">Berjalan otomatis — tembak barcode langsung di halaman POS atau Products</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 gap-1 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif
              </Badge>
            </div>
          </div>

          {/* WebHID Scanner */}
          {webHidSupported && (
            <div className="bg-background rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Usb className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-semibold">Scanner USB / Bluetooth (WebHID)</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleConnectHid}
                  disabled={connectingHid}
                  className="h-7 text-xs gap-1.5 border-violet-400 text-violet-600"
                >
                  <Link className="w-3.5 h-3.5" />
                  {connectingHid ? 'Menghubungkan...' : 'Hubungkan'}
                </Button>
              </div>

              {hidScanners.length > 0 ? (
                <div className="space-y-2">
                  {hidScanners.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="font-medium">{d.productName}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {d.vendorId.toString(16).padStart(4,'0')}:{d.productId.toString(16).padStart(4,'0')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Belum ada scanner HID yang di-grant. Klik "Hubungkan" untuk memberikan akses ke scanner Anda.
                </p>
              )}

              <div className="flex items-start gap-2 bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3">
                <Info className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                <p className="text-xs text-violet-600 dark:text-violet-400">
                  WebHID memberikan akses langsung ke scanner USB/BT tanpa driver tambahan. Hanya perlu izin sekali, kemudian otomatis terdeteksi saat colok ulang.
                </p>
              </div>
            </div>
          )}

          {!webHidSupported && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">WebHID tidak didukung browser ini</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Gunakan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong> untuk fitur deteksi scanner USB via WebHID.<br />
                  Scanner keyboard HID tetap berfungsi di semua browser.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CAMERA SECTION ── */}
      <div>
        <SectionHeader
          icon={Camera}
          title="Kamera"
          color="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
        />

        <div className="bg-background rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm font-semibold">Kamera (Scan Barcode / QR)</p>
                <p className="text-xs text-muted-foreground">Digunakan untuk scanner barcode via kamera HP/webcam</p>
              </div>
            </div>
            {cameraPermission === 'granted' ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 gap-1 text-xs">
                <CheckCircle2 className="w-3 h-3" /> Izin Diberikan
              </Badge>
            ) : cameraPermission === 'denied' ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-destructive border-destructive/40 gap-1 text-xs">
                  <XCircle className="w-3 h-3" /> Diblokir
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => window.open('chrome://settings/content/camera', '_blank')}
                >
                  Buka Pengaturan
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={requestCameraPermission}
                className="h-7 text-xs gap-1.5 border-orange-400 text-orange-600"
              >
                <Camera className="w-3.5 h-3.5" />
                Izinkan Kamera
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONNECTIVITY INFO ── */}
      <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/40 border rounded-xl p-4">
        <Wifi className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Cara Kerja Deteksi Perangkat</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Printer OS</strong>: Gunakan tombol "Test Print" — semua printer terdaftar di Windows/Mac akan muncul di dialog cetak.</li>
            <li><strong>Scanner Keyboard HID</strong>: Langsung berfungsi tanpa setup. Tembak barcode ke halaman POS kapanpun.</li>
            <li><strong>Scanner USB/BT (WebHID)</strong>: Klik "Hubungkan" sekali, lalu scanner terdeteksi otomatis setiap kali dicolok.</li>
            <li><strong>Printer Thermal (WebUSB)</strong>: Hubungkan sekali, kemudian tersedia untuk print struk langsung.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeviceStatusPanel;
