import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Walking dog SVG (simplified side-view dog silhouette) ── */
function DogSVG({ className = '' }) {
  return (
    <svg viewBox="0 0 120 70" className={className} fill="currentColor" aria-hidden="true">
      {/* body */}
      <ellipse cx="58" cy="42" rx="30" ry="16" />
      {/* head */}
      <ellipse cx="90" cy="28" rx="14" ry="12" />
      {/* snout */}
      <ellipse cx="103" cy="32" rx="7" ry="5" />
      {/* ear */}
      <ellipse cx="84" cy="18" rx="7" ry="9" transform="rotate(-10 84 18)" />
      {/* tail */}
      <path d="M28 38 Q10 20 16 10" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* legs - animated walking via CSS */}
      <line x1="48" y1="56" x2="44" y2="70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="leg-fl" />
      <line x1="60" y1="58" x2="64" y2="70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="leg-fr" />
      <line x1="72" y1="56" x2="68" y2="70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="leg-rl" />
      <line x1="84" y1="54" x2="88" y2="70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="leg-rr" />
      {/* eye */}
      <circle cx="96" cy="25" r="2.5" fill="white" />
      {/* nose */}
      <ellipse cx="108" cy="31" rx="2.5" ry="2" fill="#1a1a1a" />
    </svg>
  );
}

/* ── Paw print SVG ── */
function PawPrint({ className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} fill="currentColor" aria-hidden="true">
      <ellipse cx="13" cy="29" rx="6" ry="8" transform="rotate(-22 13 29)" />
      <ellipse cx="25" cy="15" rx="6.5" ry="9" />
      <ellipse cx="40" cy="15" rx="6.5" ry="9" />
      <ellipse cx="52" cy="29" rx="6" ry="8" transform="rotate(22 52 29)" />
      <path d="M32 30c-9 0-17 8-17 16 0 6 5 9 10 8 3-1 5-2 7-2s4 1 7 2c5 1 10-2 10-8 0-8-8-16-17-16z" />
    </svg>
  );
}

/* ── 7 paw prints that appear at staggered delays ── */
const PAW_TRAIL = [
  { left: '5%',  bottom: '22%', delay: 0,    rotate: '-15deg' },
  { left: '13%', bottom: '18%', delay: 220,  rotate: '10deg'  },
  { left: '21%', bottom: '23%', delay: 440,  rotate: '-12deg' },
  { left: '29%', bottom: '19%', delay: 660,  rotate: '8deg'   },
  { left: '37%', bottom: '24%', delay: 880,  rotate: '-18deg' },
  { left: '45%', bottom: '20%', delay: 1100, rotate: '12deg'  },
  { left: '53%', bottom: '25%', delay: 1320, rotate: '-10deg' },
];

/* floating ambient paws in background */
const BG_PAWS = Array.from({ length: 12 }, (_, i) => ({
  left: `${5 + i * 8}%`, top: `${15 + (i % 3) * 25}%`,
  delay: i * 180, size: i % 3 === 0 ? 'h-10 w-10' : 'h-6 w-6',
  rotate: `${(i % 4 - 1) * 22}deg`
}));

export default function Splash() {
  const nav = useNavigate();
  const [pct, setPct] = useState(0);
  const [dogX, setDogX] = useState(-15); // vw units, starts off-left
  const [showLogo, setShowLogo] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const goNext = () => {
    sessionStorage.setItem('rp_splash_seen', '1');
    nav('/welcome', { replace: true });
  };

  useEffect(() => {
    if (sessionStorage.getItem('rp_splash_seen')) { nav('/welcome', { replace: true }); return; }
    if (reduced) { goNext(); return; }

    const TOTAL = 4000; // 4 seconds
    const start = performance.now();
    let raf;

    const tick = (now) => {
      const elapsed = now - start;
      const p = Math.min(100, Math.round((elapsed / TOTAL) * 100));
      setPct(p);

      // dog walks from left (−15vw) to centre-right (60vw) over first 2.5 s
      const walkFraction = Math.min(1, elapsed / 2500);
      setDogX(-15 + walkFraction * 75);

      // logo fades in after 1.2 s
      if (elapsed >= 1200) setShowLogo(true);

      if (p < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        // fade out, then navigate
        setFadeOut(true);
        setTimeout(goNext, 500);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(160deg, #0e4166 0%, #1a6e9f 40%, #2ba359 100%)' }}
    >
      {/* ── Keyframe styles injected inline ── */}
      <style>{`
        @keyframes pawAppear {
          0% { opacity: 0; transform: scale(0.3) rotate(var(--r)); }
          60% { opacity: 1; transform: scale(1.15) rotate(var(--r)); }
          100% { opacity: 0.55; transform: scale(1) rotate(var(--r)); }
        }
        @keyframes bgFloat {
          0% { opacity: 0; transform: translateY(12px) rotate(var(--r)); }
          50% { opacity: 0.12; }
          100% { opacity: 0; transform: translateY(-12px) rotate(var(--r)); }
        }
        @keyframes walkLeg {
          0%, 100% { transform-origin: top center; transform: rotate(-25deg); }
          50%       { transform-origin: top center; transform: rotate(25deg); }
        }
        @keyframes logoDrop {
          0% { opacity: 0; transform: translateY(-30px) scale(0.85); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(43,163,89,0.6); }
          50% { box-shadow: 0 0 0 14px rgba(43,163,89,0); }
        }
        .leg-fl { animation: walkLeg 0.55s ease-in-out infinite; }
        .leg-fr { animation: walkLeg 0.55s ease-in-out infinite 0.275s; }
        .leg-rl { animation: walkLeg 0.55s ease-in-out infinite 0.138s; }
        .leg-rr { animation: walkLeg 0.55s ease-in-out infinite 0.413s; }
      `}</style>

      {/* ── Background floating paws ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {BG_PAWS.map((p, i) => (
          <PawPrint
            key={i}
            className={`absolute ${p.size} text-white`}
            style={{
              left: p.left, top: p.top,
              '--r': p.rotate,
              animation: `bgFloat 3.5s ease-in-out ${p.delay}ms infinite`
            }}
          />
        ))}
      </div>

      {/* ── Paw trail (ground level) ── */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40" aria-hidden="true">
        {PAW_TRAIL.map((p, i) => (
          <PawPrint
            key={i}
            className="absolute h-8 w-8 text-white/60"
            style={{
              left: p.left, bottom: p.bottom,
              '--r': p.rotate,
              animation: `pawAppear 0.7s ease-out ${p.delay}ms both`
            }}
          />
        ))}
      </div>

      {/* ── Walking dog ── */}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: '14%',
          left: `${dogX}vw`,
          transition: 'left 0.05s linear',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))'
        }}
        aria-hidden="true"
      >
        <DogSVG className="h-28 w-40 text-amber-300" />
      </div>

      {/* ── Logo + title ── */}
      <div
        className="relative z-10 flex flex-col items-center text-center"
        style={showLogo ? { animation: 'logoDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' } : { opacity: 0 }}
      >
        {/* Icon badge */}
        <div
          className="mb-6 grid h-28 w-28 place-items-center rounded-[32px] bg-white/20 backdrop-blur-sm"
          style={{ animation: showLogo ? 'pulseGlow 2.4s ease-in-out 0.8s infinite' : 'none', border: '2px solid rgba(255,255,255,0.4)' }}
        >
          <PawPrint className="h-14 w-14 text-white" />
        </div>

        <h1
          className="font-display text-5xl font-bold text-white sm:text-6xl"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
        >
          ResQPaws
        </h1>
        <p className="mt-3 max-w-xs text-lg font-semibold text-white/85">
          AI-Powered Animal Rescue &amp; Care Platform
        </p>

        {/* Progress bar */}
        <div className="mx-auto mt-10 h-2 w-64 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-white/70" role="status">{pct}%</p>

        <button
          onClick={() => { setFadeOut(true); setTimeout(goNext, 300); }}
          className="mt-8 rounded-full border-2 border-white/40 bg-white/10 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 active:scale-95 transition-all"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
