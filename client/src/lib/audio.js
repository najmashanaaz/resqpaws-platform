export const TARGET_RATE = 16000;
export const MAX_SECONDS = 30;

export class AudioError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Quick checks before we even try to decode the file. */
export function checkFile(file, maxMb = 10) {
  const name = (file.name || '').toLowerCase();
  const okExt = name.endsWith('.wav') || name.endsWith('.mp3');
  const okMime = !file.type || ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3'].includes(file.type);
  if (!okExt || !okMime) throw new AudioError('UNSUPPORTED', 'Unsupported file type. Please choose a .wav or .mp3 recording.');
  if (file.size > maxMb * 1024 * 1024) throw new AudioError('TOO_LARGE', `That file is larger than ${maxMb} MB. Please choose a shorter recording.`);
  if (file.size < 1000) throw new AudioError('CORRUPTED', 'That file is almost empty. It may be corrupted.');
}

/** Decode any browser-supported audio into mono 16 kHz samples (what the AI model expects). */
export async function decodeToMono16k(arrayBuffer) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || !window.OfflineAudioContext) throw new AudioError('UNSUPPORTED_BROWSER', 'This browser cannot process audio. Please use a recent Chrome, Edge, Firefox or Safari.');
  const ctx = new AC();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new AudioError('CORRUPTED', 'We could not read this audio. The file may be corrupted or in an unsupported format.');
  } finally {
    ctx.close().catch(() => {});
  }
  const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
  const off = new OfflineAudioContext(1, length, TARGET_RATE);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return new Float32Array(rendered.getChannelData(0));
}

export function encodeWav(samples, rate = TARGET_RATE) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export function computePeaks(samples, buckets = 240) {
  const size = Math.max(1, Math.floor(samples.length / buckets));
  const peaks = new Float32Array(buckets);
  for (let b = 0; b < buckets; b++) {
    let max = 0;
    const start = b * size;
    for (let i = start; i < Math.min(samples.length, start + size); i++) max = Math.max(max, Math.abs(samples[i]));
    peaks[b] = max;
  }
  return peaks;
}

/** Turn raw file/recording bytes into a clip the app can play, draw and analyze. */
export async function buildClip({ arrayBuffer, source, originalName, originalMime, originalSize }) {
  let samples = await decodeToMono16k(arrayBuffer);
  if (samples.length < TARGET_RATE * 0.5) throw new AudioError('TOO_SHORT', 'The recording is too short. Please record at least one second.');
  let peak = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  if (peak < 0.004) throw new AudioError('SILENT', 'The recording is silent. Move closer to the animal and try again.');
  const trimmed = samples.length > MAX_SECONDS * TARGET_RATE;
  if (trimmed) samples = samples.slice(0, MAX_SECONDS * TARGET_RATE);
  const blob = encodeWav(samples);
  const base = (originalName || `recording-${new Date().toISOString().replace(/[:.]/g, '-')}`).replace(/\.[a-z0-9]+$/i, '');
  return {
    samples, blob, trimmed, source,
    durationSec: samples.length / TARGET_RATE,
    peaks: computePeaks(samples),
    fileName: `${base}.wav`,
    originalName: originalName || `${base}.webm`,
    originalMime: originalMime || '',
    originalSize: originalSize ?? blob.size
  };
}

export const audioErrorMessage = (e) => {
  if (e?.code && e instanceof AudioError) return e.message;
  if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') return 'Microphone access was blocked. Allow the microphone in your browser settings, or upload a file instead.';
  if (e?.name === 'NotFoundError') return 'No microphone was found on this device. You can upload a recording instead.';
  return e?.message || 'Something went wrong while processing the audio.';
};
