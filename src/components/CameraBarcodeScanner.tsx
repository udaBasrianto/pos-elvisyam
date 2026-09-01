import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Camera, Zap, RefreshCw, AlertCircle, SwitchCamera, ZoomIn, Check, Volume2, Sparkles, Layers } from 'lucide-react';
import { playScanBeep as playBeep } from "@/lib/sound";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CameraBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  continuous?: boolean;
}

interface CameraDeviceOption {
  deviceId: string;
  label: string;
  isBackCamera: boolean;
}

// Global flag to check Native BarcodeDetector support
const hasNativeBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({ 
  onScan, 
  onClose,
  continuous: defaultContinuous = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const containerId = useRef(`barcode-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState<CameraDeviceOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [continuousMode, setContinuousMode] = useState<boolean>(defaultContinuous);
  const [lastScannedBadge, setLastScannedBadge] = useState<string>('');
  const [engineName, setEngineName] = useState<string>('Native Barcode Engine');

  // Trigger sound + haptic feedback
  const triggerFeedback = useCallback((code: string) => {
    try {
      playBeep();
    } catch (_) {}

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([70]);
      }
    } catch (_) {}

    setLastScannedBadge(code);
    setTimeout(() => {
      if (isMountedRef.current) {
        setLastScannedBadge('');
      }
    }, 2000);
  }, []);

  // Safe handler when a barcode is detected
  const handleBarcodeDetected = useCallback((rawCode: string) => {
    if (!rawCode || !isMountedRef.current) return;
    const clean = rawCode.trim();
    if (!clean) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds
    if (clean === lastScannedCodeRef.current && now - lastScanTimeRef.current < 1500) {
      return;
    }

    lastScannedCodeRef.current = clean;
    lastScanTimeRef.current = now;

    triggerFeedback(clean);
    onScan(clean);

    // If not continuous mode, close scanner after successful detection
    if (!continuousMode) {
      setTimeout(() => {
        if (isMountedRef.current) {
          handleClose();
        }
      }, 350);
    }
  }, [triggerFeedback, onScan, continuousMode]);

  // Clean stop all camera streams and scanners
  const stopAllScanners = useCallback(async () => {
    isScanningRef.current = false;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (_) {}
      zxingReaderRef.current = null;
    }

    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (_) {}
      html5QrCodeRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (_) {}
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(async () => {
    isMountedRef.current = false;
    await stopAllScanners();
    onClose();
  }, [stopAllScanners, onClose]);

  // Start Scanner Engine
  const startCameraStream = useCallback(async (preferredCameraId?: string) => {
    try {
      setStatus('loading');
      await stopAllScanners();

      if (!isMountedRef.current) return;

      // 1. Setup Camera Video Constraints
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
        frameRate: { ideal: 30, min: 15 },
      };

      if (preferredCameraId) {
        videoConstraints.deviceId = { exact: preferredCameraId };
      } else {
        videoConstraints.facingMode = { ideal: 'environment' };
      }

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch (err: any) {
        console.warn("Primary constraint failed, trying basic fallback...", err);
        // Fallback to generic video constraint (crucial for webcams without environment mode)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream || !isMountedRef.current) return;
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];

      // Check Torch & Zoom capabilities
      if (track && track.getCapabilities) {
        try {
          const caps = track.getCapabilities() as any;
          setHasTorch(!!caps.torch);
          if (caps.zoom) {
            setMaxZoom(caps.zoom.max || 1);
            setZoomLevel(caps.zoom.min || 1);
          }
        } catch (_) {}
      }

      // 2. Attach Stream to Video Element
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.setAttribute('playsinline', 'true'); // Required for iOS/iPad
      video.muted = true;
      await video.play();

      if (!isMountedRef.current) return;
      setStatus('scanning');
      isScanningRef.current = true;

      // 3. Select Decoding Engine: Native BarcodeDetector -> ZXing -> Html5Qrcode
      if (hasNativeBarcodeDetector) {
        setEngineName('⚡ Native Hardware Barcode (High-Speed)');
        startNativeBarcodeDetector(video);
      } else {
        setEngineName('🔍 ZXing Industrial 1D/2D Engine');
        startZXingEngine(video);
      }

    } catch (err: any) {
      if (isMountedRef.current) {
        console.error("Camera startup failed:", err);
        setStatus('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMsg('Izin kamera ditolak. Harap klik tombol izin kamera pada browser Anda.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMsg('Kamera / Webcam tidak ditemukan pada perangkat ini.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMsg('Kamera sedang digunakan oleh aplikasi lain (Zoom/Meet/Kamera OS).');
        } else {
          setErrorMsg(err.message || 'Gagal menyalakan kamera scanner.');
        }
      }
    }
  }, [stopAllScanners]);

  // ENGINE 1: Native Chromium BarcodeDetector Loop (60 FPS, Zero CPU Overhead)
  const startNativeBarcodeDetector = (video: HTMLVideoElement) => {
    try {
      const formats = [
        'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 
        'upc_a', 'upc_e', 'qr_code', 'data_matrix', 'itf', 'codabar'
      ];
      
      const barcodeDetector = new (window as any).BarcodeDetector({ formats });

      const scanLoop = async () => {
        if (!isScanningRef.current || !isMountedRef.current) return;

        if (video.readyState >= 2 && !video.paused && !video.ended) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              if (detected) {
                handleBarcodeDetected(detected);
              }
            }
          } catch (e) {
            // Frame detection error, ignore and continue next frame
          }
        }

        if (isScanningRef.current && isMountedRef.current) {
          animFrameIdRef.current = requestAnimationFrame(scanLoop);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      console.warn("Native BarcodeDetector initialization failed, fallback to ZXing...", err);
      startZXingEngine(video);
    }
  };

  // ENGINE 2: ZXing MultiFormat Reader Engine (Universal Standard Fallback)
  const startZXingEngine = (video: HTMLVideoElement) => {
    try {
      const hints = new Map();
      const formats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, 250);
      zxingReaderRef.current = reader;

      reader.decodeFromVideoElement(video, (result, error) => {
        if (!isScanningRef.current || !isMountedRef.current) return;
        if (result) {
          handleBarcodeDetected(result.getText());
        }
      });
    } catch (err) {
      console.warn("ZXing Engine failed, fallback to Html5Qrcode...", err);
      startHtml5QrcodeFallback();
    }
  };

  // ENGINE 3: Html5Qrcode Fallback
  const startHtml5QrcodeFallback = async () => {
    try {
      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        selectedCameraId || { facingMode: "environment" },
        { fps: 25, qrbox: { width: 300, height: 160 }, aspectRatio: 1.333333 },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("All scanner engines failed:", err);
    }
  };

  // Initial enumeration of camera devices
  useEffect(() => {
    isMountedRef.current = true;
    lastScannedCodeRef.current = '';

    async function enumerateAndStart() {
      try {
        // Request initial permission to get proper device labels
        try {
          const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          initialStream.getTracks().forEach(t => t.stop());
        } catch (_) {}

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');

        const formattedCameras: CameraDeviceOption[] = videoDevices.map((d, index) => {
          const label = d.label.toLowerCase();
          const isBack = label.includes('back') || label.includes('rear') || label.includes('belakang') || label.includes('environment');
          return {
            deviceId: d.deviceId,
            label: d.label || `Kamera ${index + 1} (${isBack ? 'Belakang' : 'Depan/Webcam'})`,
            isBackCamera: isBack,
          };
        });

        if (isMountedRef.current) {
          setCameras(formattedCameras);

          // Select back camera by default, or first camera (webcam)
          const backCam = formattedCameras.find(c => c.isBackCamera);
          const initialCamId = backCam ? backCam.deviceId : (formattedCameras[0]?.deviceId || '');
          
          setSelectedCameraId(initialCamId);
          await startCameraStream(initialCamId);
        }
      } catch (err) {
        if (isMountedRef.current) {
          await startCameraStream();
        }
      }
    }

    enumerateAndStart();

    return () => {
      isMountedRef.current = false;
      stopAllScanners();
    };
  }, [startCameraStream, stopAllScanners]);

  // Switch Camera / Flip
  const handleToggleCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    if (nextCam) {
      setSelectedCameraId(nextCam.deviceId);
      await startCameraStream(nextCam.deviceId);
    }
  };

  // Torch Toggle
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        await (track as any).applyConstraints({
          advanced: [{ torch: !isTorchOn }]
        });
        setIsTorchOn(!isTorchOn);
      }
    } catch (err) {
      console.warn("Flashlight toggle error:", err);
    }
  };

  // Zoom slider change
  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        await (track as any).applyConstraints({
          advanced: [{ zoom: newZoom }]
        });
      }
    } catch (err) {
      console.warn("Zoom error:", err);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black text-white shadow-2xl flex flex-col items-center select-none">
      
      {/* 1. Header Toolbar */}
      <div className="w-full flex items-center justify-between p-3 bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-800 gap-2">
        
        {/* Camera Selector or Label */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
          {cameras.length > 1 ? (
            <Select value={selectedCameraId} onValueChange={(val) => { setSelectedCameraId(val); startCameraStream(val); }}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white max-w-[190px] truncate">
                <SelectValue placeholder="Pilih Kamera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map(cam => (
                  <SelectItem key={cam.deviceId} value={cam.deviceId} className="text-xs">
                    {cam.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs font-semibold text-slate-200 truncate">Scanner Barcode Aktif</span>
          )}
        </div>

        {/* Action Controls: Flip, Torch, Continuous, Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Quick Flip Camera Button */}
          {cameras.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={handleToggleCamera}
              title="Ganti Kamera Depan / Belakang"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
          )}

          {/* Flashlight Torch */}
          {hasTorch && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full transition-all ${isTorchOn ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50' : 'text-slate-300 hover:bg-slate-800'}`}
              onClick={toggleTorch}
              title="Senter / Flashlight"
            >
              <Zap className="w-4 h-4" />
            </Button>
          )}

          {/* Continuous Scanning Mode Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setContinuousMode(!continuousMode)}
            className={`h-8 px-2 text-[11px] font-bold rounded-lg transition-all ${
              continuousMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Mode Kasir Non-stop (Scan berulang kali tanpa modal tertutup)"
          >
            {continuousMode ? '⚡ Mode Cepat: ON' : '1x Scan'}
          </Button>

          {/* Close Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleClose}
            title="Tutup Scanner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. Main Live Video Viewport */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-black flex items-center justify-center overflow-hidden">
        
        {/* Direct HTML5 Video Stream */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />

        {/* Fallback container for Html5Qrcode if needed */}
        <div id={containerId} className="hidden" />

        {/* Loading Spinner State */}
        {status === 'loading' && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-10">
            <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300 font-medium tracking-wide">Menghubungkan ke sensor kamera...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
            <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
            <p className="text-sm text-red-400 font-semibold max-w-[280px]">{errorMsg}</p>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 text-white hover:bg-slate-800"
                onClick={() => startCameraStream(selectedCameraId)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Coba Lagi
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white"
                onClick={handleClose}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}

        {/* Industrial Scanning Laser Reticle Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 p-4">
            
            {/* Viewfinder Target Frame */}
            <div className="relative w-[86%] max-w-[320px] h-[150px] sm:h-[180px] border-2 border-emerald-400/80 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(52,211,153,0.35)]">
              
              {/* Corner Framing Brackets */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Red Laser Sweeping Scan Line */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-[pulse_1.2s_ease-in-out_infinite]" style={{ top: '50%' }} />
            </div>

            {/* Target Instructions & Engine Badge */}
            <div className="flex flex-col items-center gap-1.5 mt-4">
              <span className="text-[11px] text-emerald-300 font-semibold bg-black/70 px-3.5 py-1 rounded-full backdrop-blur-md border border-emerald-500/30 shadow-lg">
                🎯 Arahkan Barcode atau QR Code ke dalam kotak
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                {engineName}
              </span>
            </div>

            {/* Success Detected Floating Toast */}
            {lastScannedBadge && (
              <div className="absolute top-4 bg-emerald-500 text-black font-mono font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
                <Check className="w-4 h-4 text-black stroke-[3]" />
                <span>Terdeteksi: {lastScannedBadge}</span>
              </div>
            )}

          </div>
        )}

        {/* Zoom Slider Control (if camera supports optical/digital zoom) */}
        {maxZoom > 1 && status === 'scanning' && (
          <div className="absolute bottom-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2 shadow-xl">
            <ZoomIn className="w-3.5 h-3.5 text-slate-300" />
            <input
              type="range"
              min={1}
              max={maxZoom}
              step={0.1}
              value={zoomLevel}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[10px] font-mono text-slate-300">{zoomLevel.toFixed(1)}x</span>
          </div>
        )}

      </div>

      {/* 3. Bottom Supported Standards Footer */}
      <div className="w-full px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>⚡ 1D/2D: <strong>EAN-13, Code 128, UPC, QR Code, Code 39</strong></span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Auto-Focus Active
        </span>
      </div>

    </div>
  );
};

export default CameraBarcodeScanner;
