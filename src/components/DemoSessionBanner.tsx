import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const DEMO_DURATION_SECONDS = 600; // 10 minutes

export const DemoSessionBanner: React.FC = () => {
  const { user, signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Check if current user is demo user
  const isDemoUser = user?.email?.toLowerCase().includes('demo') || (user as any)?.store_name?.toLowerCase().includes('demo');

  useEffect(() => {
    if (!isDemoUser) return;

    // Get or initialize demo session start time
    let sessionStart = sessionStorage.getItem('demo_session_start');
    if (!sessionStart) {
      sessionStart = Date.now().toString();
      sessionStorage.setItem('demo_session_start', sessionStart);
    }

    const elapsedSeconds = Math.floor((Date.now() - parseInt(sessionStart, 10)) / 1000);
    const remaining = Math.max(0, DEMO_DURATION_SECONDS - elapsedSeconds);
    setTimeLeft(remaining);

    const interval = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - parseInt(sessionStart, 10)) / 1000);
      const curRemaining = Math.max(0, DEMO_DURATION_SECONDS - currentElapsed);
      setTimeLeft(curRemaining);

      if (curRemaining <= 0) {
        clearInterval(interval);
        handleSessionExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoUser]);

  const handleSessionExpired = async () => {
    setIsResetting(true);
    try {
      await api.post('/demo/reset');
      toast.info('Sesi demo 10 menit Anda telah habis. Data telah di-reset ke kondisi awal.');
    } catch (e) {
      console.error(e);
    } finally {
      sessionStorage.removeItem('demo_session_start');
      signOut();
    }
  };

  const handleManualReset = async () => {
    if (!confirm('Apakah Anda ingin mereset data sampel demo ke kondisi awal sekarang?')) return;
    setIsResetting(true);
    try {
      await api.post('/demo/reset');
      toast.success('Data demo berhasil di-reset!');
      sessionStorage.removeItem('demo_session_start');
      window.location.reload();
    } catch (e) {
      toast.error('Gagal mereset data demo');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isDemoUser || timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-md z-50">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 animate-spin text-amber-200 shrink-0" />
        <span>
          <strong>Mode Akun Demo Interaktif:</strong> Anda sedang mencoba aplikasi POS-INV. Data otomatis di-reset setiap 10 menit.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 font-mono font-bold text-amber-100">
          <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Sisa Waktu Sesi: {formattedTime}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={isResetting}
          onClick={handleManualReset}
          className="h-7 text-[11px] bg-white/10 hover:bg-white/20 border-white/30 text-white gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
          Reset Data Sekarang
        </Button>
      </div>
    </div>
  );
};
