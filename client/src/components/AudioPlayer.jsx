import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { fmtDuration } from '../lib/format.js';

export default function AudioPlayer({ blob, peaks }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  const toggle = () => { const a = ref.current; if (!a) return; playing ? a.pause() : a.play(); };
  const max = Math.max(...peaks, 0.01);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
      <audio ref={ref} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.target.duration)} onTimeUpdate={(e) => setT(e.target.currentTime)} />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="grid h-11 w-11 flex-none place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700">
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <svg viewBox={`0 0 ${peaks.length} 40`} preserveAspectRatio="none" className="h-10 flex-1" role="img" aria-label="Waveform">
        {[...peaks].map((p, i) => (
          <rect key={i} x={i} y={20 - (p / max) * 18} width={0.7} height={Math.max(1, (p / max) * 36)} fill={i / peaks.length <= (t / (dur || 1)) ? '#21689C' : '#BFDDF1'} />
        ))}
      </svg>
      <span className="w-12 flex-none text-right text-xs font-bold text-muted">{fmtDuration(dur || 0)}</span>
    </div>
  );
}
