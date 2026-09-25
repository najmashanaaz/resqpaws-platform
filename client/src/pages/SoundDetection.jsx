import { useEffect, useState } from 'react';
import {
  CheckCircle2, HelpCircle, History, Dog, Cat, Bird,
  Lightbulb, AlertCircle, Sparkles, MapPin, MapPinOff,
  ChevronDown, ChevronUp, Clock, Info
} from 'lucide-react';
import Recorder from '../components/Recorder.jsx';
import AudioPlayer from '../components/AudioPlayer.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { api } from '../lib/api.js';
import { preloadModel, classifyAudio, ModelError } from '../lib/yamnet.js';
import { fmtDate, pct } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { useI18n, LANGS } from '../lib/i18n.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ICON = { dog: Dog, cat: Cat, bird: Bird };

/* ── Indian states ── */
const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim',
  'Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Jammu & Kashmir','Puducherry',
];

/* ── Confidence colour ── */
function confColour(pct) {
  if (pct >= 80) return 'bg-leaf-600';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

/* ── Sound Meaning Panel ── */
function MeaningPanel({ meaning }) {
  if (!meaning) return null;
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-amber-800">
        <Lightbulb className="h-4 w-4" /> Sound Analysis: {meaning.type}
      </h3>
      <ul className="mb-3 grid gap-1 text-sm text-amber-900">
        {meaning.meanings.map((m, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
            <span><em>Possibly:</em> {m}</span>
          </li>
        ))}
      </ul>
      {meaning.action && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
          💡 Suggested action: {meaning.action}
        </p>
      )}
      <p className="mt-2 text-xs text-amber-700 italic">
        Note: Sound interpretation is indicative only. Use "possibly", "may indicate" language when sharing — never claim certainty.
      </p>
    </div>
  );
}

/* ── Ask Gemini Panel ── */
function AskGeminiPanel({ result, lang, location }) {
  const [open,   setOpen]   = useState(false);
  const [busy,   setBusy]   = useState(false);
  const [reply,  setReply]  = useState('');
  const [error,  setError]  = useState('');

  const ask = async () => {
    setBusy(true); setError(''); setReply('');
    try {
      const d = await api.post('/chat/sound', {
        animal:     result.animalName,
        soundType:  result.soundMeaning?.type || '',
        confidence: result.confidencePercent,
        language:   lang,
        location:   location || null,
      });
      setReply(d.reply);
    } catch (e) {
      setError(e.message || 'Could not reach Gemini. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => { setOpen((o) => !o); if (!open && !reply) ask(); }}
        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-700 active:scale-95 transition-all"
      >
        <Sparkles className="h-4 w-4" />
        Ask Gemini About This Sound
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-brand-700">
              Asking Gemini in {LANGS[lang] || 'English'}
              {location && (
                <span className="ml-2 font-normal text-brand-600">
                  · {[location.city, location.district, location.state].filter(Boolean).join(', ')}
                </span>
              )}
            </p>
            {reply && (
              <button onClick={ask} disabled={busy}
                className="text-xs font-bold text-brand-600 hover:underline disabled:opacity-50">
                Refresh
              </button>
            )}
          </div>

          {busy && (
            <div className="flex items-center gap-2 py-3">
              <Spinner label="Gemini is thinking" />
              <span className="text-sm text-muted">Gemini is analysing the sound…</span>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          {reply && !busy && (
            <div className="whitespace-pre-wrap text-sm text-brand-900 leading-relaxed">
              {reply}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Location mini-bar ── */
function LocationBar({ location, onSet, onClear }) {
  const [open, setOpen] = useState(false);
  const [state, setState]       = useState(location?.state    || '');
  const [district, setDistrict] = useState(location?.district || '');
  const [city, setCity]         = useState(location?.city     || '');

  const apply = () => { onSet({ state, district, city }); setOpen(false); };
  const gps = () => {
    if (!navigator.geolocation) { setOpen(true); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const d = await r.json();
        const addr = d.address || {};
        onSet({ city: addr.city || addr.town || addr.village || '', district: addr.county || addr.state_district || '', state: addr.state || '' });
      } catch { setOpen(true); }
    }, () => setOpen(true));
  };

  const label = location ? [location.city, location.district, location.state].filter(Boolean).join(', ') : null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted">Location for Gemini:</span>
        <button onClick={gps}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50">
          <MapPin className="h-3 w-3" /> Use GPS
        </button>
        <button onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${label ? 'border-leaf-300 bg-leaf-50 text-leaf-700' : 'border-line bg-white text-muted hover:bg-canvas'}`}>
          {label ? <><MapPin className="h-3 w-3" />{label}</> : <><MapPinOff className="h-3 w-3" />Set manually</>}
        </button>
        {location && (
          <button onClick={() => { onClear(); setState(''); setDistrict(''); setCity(''); }}
            className="text-xs font-bold text-rose-500 hover:underline">Clear</button>
        )}
      </div>
      {open && (
        <div className="mt-2 grid gap-2 rounded-2xl border border-line bg-canvas p-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-bold text-muted">
            State
            <select value={state} onChange={(e) => setState(e.target.value)}
              className="min-h-[36px] rounded-xl border border-line bg-white px-2 text-xs text-ink outline-none">
              <option value="">Select</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted">
            District
            <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Chennai"
              className="min-h-[36px] rounded-xl border border-line bg-white px-2 text-xs outline-none" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted">
            City/Area
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. T. Nagar"
              className="min-h-[36px] rounded-xl border border-line bg-white px-2 text-xs outline-none" />
          </label>
          <div className="col-span-full flex gap-2">
            <button onClick={apply} className="rounded-full bg-leaf-600 px-4 py-1 text-xs font-bold text-white hover:bg-leaf-700">Apply</button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-line bg-white px-4 py-1 text-xs font-bold text-muted hover:bg-canvas">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function SoundDetection() {
  const toast = useToast();
  const { lang } = useI18n();
  const { user } = useAuth();
  const isGuest = user?.isGuest || !user;
  const [clip,    setClip]    = useState(null);
  const [status,  setStatus]  = useState('idle');
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState(null);
  const [history, setHistory] = useState({ items: [], loading: true, error: null });
  const [location, setLocation] = useState(null);

  useEffect(() => { preloadModel(); loadHistory(); }, []);

  async function loadHistory() {
    if (isGuest) { setHistory({ items: [], loading: false, error: null }); return; }
    setHistory((h) => ({ ...h, loading: true, error: null }));
    try {
      const d = await api.get('/sounds/history?limit=8');
      setHistory({ items: d.items, loading: false, error: null });
    } catch (e) {
      setHistory({ items: [], loading: false, error: null });
    }
  }

  const onClip = (c) => { setClip(c); setResult(null); setError(''); };
  const onRecError = (msg) => setError(msg);

  async function analyze() {
    if (!clip) return;
    setError(''); setResult(null);
    try {
      const predictions = await classifyAudio(clip.samples, setStatus);

      // ── Guest mode: run locally, skip server upload ──
      if (isGuest) {
        const LOCAL_ANIMALS = {
          dog:     { name:'Dog',     scientific:'Canis lupus familiaris', labels:['dog','bark','bow-wow','yip','howl','growling','whimper (dog)'], description:'Dogs communicate with barks, howls, growls and whimpers.' },
          cat:     { name:'Cat',     scientific:'Felis catus',            labels:['cat','meow','purr','hiss','caterwaul'],                       description:'Cats use meows mainly to communicate with people.' },
          cow:     { name:'Cow',     scientific:'Bos taurus',             labels:['cattle, bovinae','moo'],                                     description:'Cows moo to keep in contact with the herd.' },
          goat:    { name:'Goat',    scientific:'Capra hircus',           labels:['goat','bleat'],                                              description:'Goats bleat to call each other.' },
          horse:   { name:'Horse',   scientific:'Equus ferus caballus',   labels:['horse','neigh, whinny','whinny'],                           description:'Horses use neighs and whinnies to communicate.' },
          bird:    { name:'Bird',    scientific:'Class Aves',             labels:['bird vocalization, bird call, bird song','chirp, tweet','squawk','coo','caw','hoot'], description:'Birds sing to defend territory.' },
          chicken: { name:'Chicken', scientific:'Gallus gallus domesticus',labels:['chicken, rooster','cluck','crowing, cock-a-doodle-doo','fowl'], description:'Chickens cluck, cackle and crow.' },
        };
        const THRESHOLD = 0.35;
        let best = null;
        for (const [key, animal] of Object.entries(LOCAL_ANIMALS)) {
          for (const pred of predictions) {
            if (animal.labels.includes(pred.label.toLowerCase()) && (!best || pred.score > best.score)) {
              best = { key, ...animal, score: pred.score };
            }
          }
        }
        const recognized = !!(best && best.score >= THRESHOLD);
        setResult(recognized ? {
          animalKey: best.key, animalName: best.name, recognized: true,
          confidence: best.score, confidencePercent: Math.round(best.score * 100),
          scientific: best.scientific, description: best.description,
          model: 'YAMNet (browser)', timestamp: new Date().toISOString(), ranked: [], isLocal: true,
        } : {
          recognized: false, animalName: 'Animal Not Recognized',
          suggestion: 'Try a clearer recording closer to the animal with less background noise.',
          ranked: predictions.slice(0, 4).map((p) => ({ name: p.label, score: p.score })), isLocal: true,
        });
        toast(recognized ? `Detected: ${best.name}` : 'Animal not recognized', recognized ? 'success' : 'info');
        setStatus('idle');
        return;
      }

      // ── Full-account mode: save to server ──
      setStatus('saving');
      const form = new FormData();
      form.append('audio',        clip.blob, clip.fileName);
      form.append('scores',       JSON.stringify(predictions));
      form.append('source',       clip.source);
      form.append('originalName', clip.originalName);
      form.append('originalMime', clip.originalMime);
      form.append('originalSize', String(clip.originalSize));
      form.append('durationSec',  String(clip.durationSec));
      const d = await api.upload('/sounds/analyze', form);
      setResult(d.detection);
      loadHistory();
      toast(d.detection.recognized ? `Detected: ${d.detection.animalName}` : 'Animal not recognized', d.detection.recognized ? 'success' : 'info');
    } catch (e) {
      setError(e instanceof ModelError ? e.message : e.message || 'Something went wrong while analysing the sound.');
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Animal Sound Detection</h1>
      <p className="mt-1 text-muted">
        Record or upload a sound. The AI model identifies the animal and analyses what the sound may mean.
      </p>

      {/* Location bar for Gemini integration */}
      <div className="mt-4">
        <LocationBar location={location} onSet={setLocation} onClear={() => setLocation(null)} />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* ── Record / upload ── */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Record or Upload</h2>
          <Recorder onClip={onClip} onError={onRecError} />
          {clip && (
            <div className="mt-6 grid gap-4">
              <AudioPlayer blob={clip.blob} peaks={clip.peaks} />
              {clip.trimmed && (
                <p className="text-xs text-amber-700">The clip was trimmed to 30 seconds for analysis.</p>
              )}
              <button onClick={analyze} disabled={busy}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-brand-600 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? <Spinner className="h-5 w-5 text-white" label={status} /> : '🔍 Analyse sound'}
              </button>
              {busy && (
                <p className="text-center text-xs text-muted">
                  {status === 'loading-model' ? 'Loading the AI model (first time only)…' :
                   status === 'analyzing'     ? 'Listening for animal sounds…' :
                                               'Saving your result…'}
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>
          )}
        </div>

        {/* ── Result ── */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Detection Result</h2>

          {!result && (
            <p className="text-muted">Your result will appear here after you analyse a sound.</p>
          )}

          {result && !result.recognized && (
            <div>
              <div className="rounded-2xl bg-amber-50 p-5 text-center">
                <HelpCircle className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                <p className="font-bold text-amber-800">Animal Not Recognized</p>
                <p className="mt-1 text-sm text-amber-700">
                  {result.suggestion || 'Try uploading a clearer recording, closer to the animal, with less background noise.'}
                </p>
              </div>
              {/* Ranked predictions for transparency */}
              {result.ranked?.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-muted uppercase tracking-wide">Top predictions (below threshold)</p>
                  <ul className="grid gap-1.5">
                    {result.ranked.slice(0, 4).map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-24 truncate font-semibold text-ink">{r.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
                          <div className={`h-full rounded-full ${confColour(Math.round(r.score * 100))}`}
                            style={{ width: `${Math.round(r.score * 100)}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs text-muted">{Math.round(r.score * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && result.recognized && (
            <div>
              {/* Animal identity */}
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
                  {(() => { const Icon = ICON[result.animalKey] || CheckCircle2; return <Icon className="h-7 w-7" />; })()}
                </span>
                <div>
                  <p className="font-display text-2xl font-semibold text-ink">{result.animalName}</p>
                  <p className="text-sm italic text-muted">{result.scientific}</p>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm font-bold text-ink">
                  <span>Confidence</span>
                  <span>{result.confidencePercent}%</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-canvas">
                  <div className={`h-full rounded-full ${confColour(result.confidencePercent)}`}
                    style={{ width: `${result.confidencePercent}%` }} />
                </div>
              </div>

              {/* Species info */}
              <p className="mt-4 text-sm text-ink">{result.description}</p>
              {result.funFact && (
                <p className="mt-2 text-sm text-muted">🐾 Fun fact: {result.funFact}</p>
              )}

              {/* Detection meta */}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                Detected {fmtDate(result.timestamp)} · Model: {result.model}
              </p>

              {/* Sound Meaning Analysis */}
              <MeaningPanel meaning={result.soundMeaning} />

              {/* Ask Gemini button */}
              <AskGeminiPanel result={result} lang={lang} location={location} />
            </div>
          )}
        </div>
      </div>

      {/* ── History ── */}
      <div className="mt-10 rounded-[28px] border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <History className="h-5 w-5 text-brand-600" /> Recent detections
        </h2>
        {history.loading && <Spinner label="Loading history" />}
        {history.error   && <ErrorState error={history.error} onRetry={loadHistory} />}
        {!history.loading && !history.error && history.items.length === 0 && (
          <p className="text-muted">No detections yet.</p>
        )}
        {!history.loading && !history.error && history.items.length > 0 && (
          <ul className="grid gap-2">
            {history.items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${d.recognized ? 'bg-leaf-100 text-leaf-700' : 'bg-amber-100 text-amber-700'}`}>
                  {d.animalName}
                </span>
                <span className="text-sm text-muted">{pct(d.confidence)} confidence</span>
                {d.soundMeaning?.type && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {d.soundMeaning.type}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted">{fmtDate(d.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
        Sound analysis is AI-assisted and indicative only. For injured or distressed animals, contact a vet or animal rescue organisation immediately.
      </p>
    </div>
  );
}
