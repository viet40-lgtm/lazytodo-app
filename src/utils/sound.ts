import { Platform } from 'react-native';

let globalAudioCtx: any = null;

export function playLongBeep(duration = 1.0, freq = 880) {
  if (Platform.OS !== 'web') return;
  try {
    // @ts-ignore web audio
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx.state === 'suspended') {
      void globalAudioCtx.resume();
    }
    const oscillator = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, globalAudioCtx.currentTime);

    // Smooth envelope to avoid audio clicks
    gain.gain.setValueAtTime(0.12, globalAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(globalAudioCtx.destination);

    oscillator.start(globalAudioCtx.currentTime);
    oscillator.stop(globalAudioCtx.currentTime + duration);
  } catch {
    // Audio is best effort on web
  }
}
