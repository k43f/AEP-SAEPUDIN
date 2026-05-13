/**
 * Custom hook to generate sounds using Web Audio API
 */
export function useSound() {
  const playOscillator = (frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio not supported', e);
    }
  };

  const playBeep = () => {
    playOscillator(880, 'sine', 0.1);
  };

  const playWarning = () => {
    playOscillator(440, 'square', 0.2, 0.05);
  };

  const playGong = () => {
    // A complex sound for the gong
    playOscillator(200, 'sine', 1.5, 0.2);
    playOscillator(350, 'triangle', 1.0, 0.1);
    playOscillator(100, 'sine', 2.0, 0.3);
  };

  return { playBeep, playWarning, playGong };
}
