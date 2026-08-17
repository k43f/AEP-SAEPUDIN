/**
 * Custom hook to generate sound effects using Web Audio API
 */
export function useSound() {
  const getAudioContext = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const playOscillator = (
    frequency: number,
    type: OscillatorType,
    duration: number,
    volume: number = 0.1,
    ctx?: AudioContext | null
  ) => {
    try {
      const audioCtx = ctx || getAudioContext();
      if (!audioCtx) return;

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  };

  const playBeep = () => {
    playOscillator(880, 'sine', 0.15, 0.2);
  };

  const playWarning = () => {
    playOscillator(440, 'square', 0.25, 0.15);
  };

  const playGong = () => {
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.85, now); // Loud master volume
      masterGain.connect(audioCtx.destination);

      // 1. Initial Mallet Impact (Lowpass filtered noise thud)
      const bufferSize = audioCtx.sampleRate * 0.08;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(350, now);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);

      // 2. Rich Gong Resonance Frequencies (Fundamental + Metallic Partials)
      const partials = [
        { freq: 85, type: 'sine' as OscillatorType, vol: 0.8, dur: 4.0 },   // Deep fundamental pitch
        { freq: 118, type: 'triangle' as OscillatorType, vol: 0.6, dur: 3.5 }, // Low warm body
        { freq: 173, type: 'sine' as OscillatorType, vol: 0.5, dur: 3.0 },   // Metallic lower partial
        { freq: 247, type: 'triangle' as OscillatorType, vol: 0.4, dur: 2.5 }, // Mid resonance
        { freq: 362, type: 'sine' as OscillatorType, vol: 0.35, dur: 2.0 },  // High metallic sheen
        { freq: 520, type: 'sine' as OscillatorType, vol: 0.25, dur: 1.5 },  // Shimmer
        { freq: 760, type: 'sine' as OscillatorType, vol: 0.15, dur: 1.0 },  // Initial high pitch ring
      ];

      partials.forEach(p => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = p.type;
        // Pitch bend slightly down at start for authentic gong vibration physics
        osc.frequency.setValueAtTime(p.freq * 1.02, now);
        osc.frequency.exponentialRampToValueAtTime(p.freq, now + 0.1);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(p.vol, now + 0.02); // quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + p.dur);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + p.dur);
      });
    } catch (e) {
      console.warn('Gong sound error', e);
    }
  };

  return { playBeep, playWarning, playGong };
}

