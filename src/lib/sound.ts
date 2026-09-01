// Web Audio API Sound System for POS Cashier and Barcode Scanner
// Designed with a singleton AudioContext to prevent memory leaks and autoplay restrictions

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn("Web Audio API not supported or blocked:", err);
    return null;
  }
}

// Ensure audio context is ready on first user touch / click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

/**
 * ⚡ Classic Supermarket Barcode Scanner Beep
 * High-pitched crisp tone (1700Hz, 80ms) for item addition / scanning.
 */
export function playScanBeep(volume: number = 0.35) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1700, now);

    // Smooth envelope to avoid clicking pops
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.setValueAtTime(volume, now + 0.065);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.085);
  } catch (error) {
    console.warn("Failed to play scan beep:", error);
  }
}

// Alias for backwards compatibility
export const playBeep = playScanBeep;

/**
 * ➕ / ➖ Subtle quantity adjustment sound (880Hz, 40ms)
 */
export function playQtySound(volume: number = 0.2) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.04);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch (error) {
    console.warn("Failed to play qty sound:", error);
  }
}

/**
 * 🗑️ Item removed sound (downward pitch glide 520Hz -> 300Hz)
 */
export function playRemoveSound(volume: number = 0.25) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.07);

    osc.start(now);
    osc.stop(now + 0.075);
  } catch (error) {
    console.warn("Failed to play remove sound:", error);
  }
}

/**
 * 🎉 Checkout / Payment Success Chime (Ascending C5 -> E5 -> G5)
 */
export function playSuccessSound(volume: number = 0.3) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const startTime = now + (index * 0.08);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.16);
    });
  } catch (error) {
    console.warn("Failed to play success chime:", error);
  }
}

/**
 * ⚠️ Error / Not Found / Out of Stock sound (low buzz)
 */
export function playErrorSound(volume: number = 0.35) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch (error) {
    console.warn("Failed to play error sound:", error);
  }
}
