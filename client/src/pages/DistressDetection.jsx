import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, Siren, MapPin, Info } from 'lucide-react';
import Recorder from '../components/Recorder.jsx';
import AudioPlayer from '../components/AudioPlayer.jsx';
import Spinner from '../components/Spinner.jsx';
import { api } from '../lib/api.js';
import { classifyAudio, preloadModel, ModelError } from '../lib/yamnet.js';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const RISK_STYLE = {
  Low:    'bg-leaf-100 text-leaf-700',
  Medium: 'bg-amber-100 text-amber-700',
  High:   'bg-rose-100 text-rose-700',
};

/* ── Score helpers ── */
const DISTRESS_W   = { 'Whimper (dog)': 1, Whimper: 1, Howl: 0.8, Caterwaul: 1, 'Wail, moan': 0.9, Yip: 0.6, Squeal: 0.7, Screech: 0.6, Bleat: 0.35 };
const PAIN_W       = { Squeal: 1, Screaming: 0.9, Yip: 0.8, 'Whimper (dog)': 0.7, Screech: 0.7, Groan: 0.6 };
const AGGRESSIVE_W = { Growling: 1, Snarl: 1, Hiss: 0.9, Roar: 0.8, Bark: 0.35 };
const NORMAL_W     = { Purr: 1, Meow: 0.7, Moo: 0.8, Cluck: 1, 'Chirp, tweet': 1, Coo: 1, Bark: 0.45, Dog: 0.4, Cat: 0.4, Bird: 0.6 };

function scoreSet(map, preds) {
  let score = 0;
  for (const p of preds) {
    const w = map[p.label];
    if (w) score = Math.max(score, w * p.score);
  }
  return Math.min(1, score);
}

const ACTIONS = {
  emergency:  'Emergency: the animal may be in serious pain or danger. Keep a safe distance and contact the nearest emergency vet or rescue team immediately.',
  distress:   'The animal seems stressed. Check for heat, hunger, thirst, injury or other animals nearby. Contact a vet if sounds continue.',
  pain:       'The animal may be in pain. Look for visible injury from a safe distance. Book a vet visit today.',
  aggressive: 'The animal sounds defensive. Give it space and avoid approaching it.',
  normal:     'These sounds look normal. No immediate action needed.',
};

function analyseLocalDistress(predictions) {
  const d = scoreSet(DISTRESS_W,   predictions);
  const p = scoreSet(PAIN_W,       predictions);
  const a = scoreSet(AGGRESSIVE_W, predictions);
  const n = scoreSet(NORMAL_W,     predictions);

  const maxHarm  = Math.max(d, p, a);
  const emergency = (p >= 0.55 && d >= 0.35) || Math.max(p, d) >= 0.75;

  let state = 'normal';
  if (emergency) {
    state = 'emergency';
  } else if (maxHarm >= 0.15) {
    const ranked = [
      { key: 'distress',   val: d },
      { key: 'pain',       val: p },
      { key: 'aggressive', val: a },
    ].sort((x, y) => y.val - x.val);
    state = ranked[0].key;
  }
  if (state !== 'emergency' && n > maxHarm && maxHarm < 0.3) state = 'normal';

  const riskLevel  = (emergency || maxHarm >= 0.6) ? 'High' : maxHarm >= 0.3 ? 'Medium' : 'Low';
  const confidence = Math.round(Math.max(maxHarm, n) * 100);

  const alert = riskLevel === 'High' ? {
    title:   emergency ? 'Emergency: animal in distress' : 'High-risk animal sound',
    message: ACTIONS[state] || ACTIONS.emergency,
    steps: [
      'Stay at a safe distance.',
      'Call the nearest emergency vet or rescue centre.',
      'Share your exact location with the rescue team.',
    ],
  } : null;

  return {
    report: {
      state,
      riskLevel,
      confidencePercent: confidence,
      recommendedAction: ACTIONS[state] || ACTIONS.normal,
      animalGuess: 'Unknown',
    },
    alert,
    isLocal: true,
  };
}

export default function DistressDetection() {
  const toast    = useToast();
  const { user } = useAuth();
  const isGuest  = !!(user?.isGuest || !user);

  const [clip,   setClip]   = useState(null);
  const [status, setStatus] = useState('idle');
  const [error,  setError]  = useState('');
  const [result, setResult] = useState(null);
  const [loc,    setLoc]    = useState(null);
  const [locMsg, setLocMsg] = useState('');

  useEffect(() => { preloadModel(); }, []);

  const getLocation = () => {
    if (!navigator.geolocation) { setLocMsg('Location is not available in this browser.'); return; }
    setLocMsg('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocMsg('Location added to this report.');
      },
      () => setLocMsg('Location permission was denied. You can continue without it.'),
      { timeout: 10000 }
    );
  };

  async function analyze() {
    if (!clip) return;
    setError(''); setResult(null);
    try {
      const predictions = await classifyAudio(clip.samples, setStatus);

      if (isGuest) {
        /* Guest: run entirely in the browser */
        const localResult = analyseLocalDistress(predictions);
        setResult(localResult);
        if (localResult.report.riskLevel === 'High') {
          toast('High-risk alert! See recommended action below.', 'error');
        }
        setStatus('idle');
        return;
      }

      /* Full account: send to server */
      setStatus('saving');
      const form = new FormData();
      form.append('audio',        clip.blob, clip.fileName);
      form.append('scores',       JSON.stringify(predictions));
      form.append('source',       clip.source);
      form.append('originalName', clip.originalName);
      form.append('originalMime', clip.originalMime);
      form.append('originalSize', String(clip.originalSize));
      form.append('durationSec',  String(clip.durationSec));
      if (loc) { form.append('lat', String(loc.lat)); form.append('lng', String(loc.lng)); }
      const d = await api.upload('/distress/analyze', form);
      setResult(d);
      if (d.report.riskLevel === 'High') toast('High-risk alert raised. See the recommended action below.', 'error');
    } catch (e) {
      setError(e instanceof ModelError ? e.message : (e.message || 'Something went wrong while analysing the sound.'));
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Distress Sound Detection</h1>
      <p className="mt-1 text-muted">
        Record or upload an animal sound to check its emotional state: normal, distress, pain, aggressive, or an emergency.
      </p>

      {isGuest && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Running in guest mode — analysis runs fully in your browser. Results are not saved.{' '}
            <a href="/login" className="font-bold underline">Log in</a> to save results.
          </span>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Record / upload */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <Recorder
            onClip={(c) => { setClip(c); setResult(null); setError(''); }}
            onError={setError}
            maxSeconds={12}
          />
          {clip && (
            <div className="mt-6 grid gap-4">
              <AudioPlayer blob={clip.blob} peaks={clip.peaks} />
              <button
                type="button"
                onClick={getLocation}
                className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
              >
                <MapPin className="h-4 w-4" /> Add my location to this report
              </button>
              {locMsg && <p className="text-xs text-muted">{locMsg}</p>}
              <button
                onClick={analyze}
                disabled={busy}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-brand-600 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? <Spinner className="h-5 w-5 text-white" /> : 'Analyse for distress'}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>

        {/* Result */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Result</h2>
          {!result && <p className="text-muted">Your result will appear here after analysis.</p>}
          {result && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${RISK_STYLE[result.report.riskLevel]}`}>
                  Risk: {result.report.riskLevel}
                </span>
                <span className="text-sm text-muted">Confidence: {result.report.confidencePercent}%</span>
                <span className="text-sm capitalize text-muted">State: {result.report.state}</span>
              </div>

              {result.alert && (
                <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5" role="alert">
                  <p className="flex items-center gap-2 font-bold text-rose-800">
                    <Siren className="h-5 w-5" /> {result.alert.title}
                  </p>
                  <p className="mt-2 text-sm text-rose-700">{result.alert.message}</p>
                  <ul className="mt-3 grid gap-1 text-sm text-rose-700">
                    {result.alert.steps.map((s) => (
                      <li key={s} className="flex gap-2">
                        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!result.alert && (
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="flex items-center gap-2 font-bold text-ink">
                    <AlertTriangle className="h-4 w-4 text-brand-600" /> Recommended action
                  </p>
                  <p className="mt-1 text-sm text-muted">{result.report.recommendedAction}</p>
                </div>
              )}

              {result.isLocal && (
                <p className="text-xs italic text-muted">Analysis ran locally in your browser (guest mode).</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
