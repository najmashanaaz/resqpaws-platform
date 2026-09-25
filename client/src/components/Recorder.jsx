import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload } from 'lucide-react';
import { checkFile, buildClip, audioErrorMessage } from '../lib/audio.js';

/**
 * Records from the mic or accepts a file, decodes it, draws the waveform, and
 * hands the caller a ready-to-analyze clip: { blob, samples, peaks, durationSec, fileName, ... }
 */
export default function Recorder({ onClip, onError, maxMb = 10, maxSeconds = 15 }) {
  const [mode, setMode] = useState('idle'); // idle | recording | busy
  const [seconds, setSeconds] = useState(0);
  const canvasRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(0);
  const analyserRef = useRef(null);
  const ctxRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => stopTracks(), []);

  const stopTracks = () => {
    mediaRef.current?.stream?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    cancelAnimationFrame(rafRef.current);
    clearInterval(timerRef.current);
  };

  const drawIdle = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
  };
  useEffect(() => { drawIdle(); }, []);

  const drawLive = () => {
    const c = canvasRef.current, an = analyserRef.current;
    if (!c || !an) return;
    const buf = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(buf);
    const ctx = c.getContext('2d');
    const n = 48, bw = c.width / n;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#21689C';
    for (let i = 0; i < n; i++) {
      const v = buf[Math.floor((i / n) * buf.length)] / 255;
      const h = Math.max(4, v * c.height * 0.9);
      ctx.fillRect(i * bw + 2, (c.height - h) / 2, bw - 4, h);
    }
    rafRef.current = requestAnimationFrame(drawLive);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      src.connect(an);
      analyserRef.current = an;

      const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stopTracks();
        setMode('busy');
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
          const clip = await buildClip({ arrayBuffer: await blob.arrayBuffer(), source: 'record', originalMime: blob.type, originalSize: blob.size });
          onClip(clip);
        } catch (e) {
          onError(audioErrorMessage(e));
        } finally {
          setMode('idle'); setSeconds(0); drawIdle();
        }
      };
      rec.start();
      setMode('recording'); setSeconds(0);
      drawLive();
      timerRef.current = setInterval(() => setSeconds((s) => {
        if (s + 1 >= maxSeconds) { rec.stop(); }
        return s + 1;
      }), 1000);
    } catch (e) {
      onError(audioErrorMessage(e));
    }
  };

  const stop = () => mediaRef.current?.state === 'recording' && mediaRef.current.stop();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      checkFile(file, maxMb);
      setMode('busy');
      const clip = await buildClip({ arrayBuffer: await file.arrayBuffer(), source: 'upload', originalName: file.name, originalMime: file.type, originalSize: file.size });
      onClip(clip);
    } catch (err) {
      onError(audioErrorMessage(err));
    } finally {
      setMode('idle');
    }
  };

  return (
    <div className="grid justify-items-center gap-4 text-center">
      <button type="button" onClick={mode === 'recording' ? stop : start} disabled={mode === 'busy'}
        aria-pressed={mode === 'recording'} aria-label={mode === 'recording' ? 'Stop recording' : 'Start recording'}
        className={`grid h-28 w-28 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-60 ${mode === 'recording' ? 'animate-ring bg-rose-600' : 'bg-leaf-600'}`}>
        {mode === 'recording' ? <Square className="h-9 w-9" /> : <Mic className="h-10 w-10" />}
      </button>
      <p className="text-sm text-muted" role="status">
        {mode === 'recording' ? `Listening… ${maxSeconds - seconds}s left` : mode === 'busy' ? 'Processing…' : 'Tap to record, or upload a .wav / .mp3 file'}
      </p>
      <canvas ref={canvasRef} width={560} height={90} className="w-full max-w-lg rounded-2xl bg-canvas" role="img" aria-label="Live sound level" />
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
        <Upload className="h-4 w-4" /> Upload audio file
        <input type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" className="hidden" onChange={onFile} />
      </label>
    </div>
  );
}
