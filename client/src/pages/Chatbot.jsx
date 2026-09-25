import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Mic, Image as ImageIcon, X, Wifi, WifiOff, MapPin, MapPinOff, Globe } from 'lucide-react';
import Paw from '../components/Paw.jsx';
import Spinner from '../components/Spinner.jsx';
import { api } from '../lib/api.js';
import { useI18n, LANGS } from '../lib/i18n.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/* ── Script detector ── */
const SCRIPT_RE = { ta: /[\u0B80-\u0BFF]/, hi: /[\u0900-\u097F]/, te: /[\u0C00-\u0C7F]/, kn: /[\u0C80-\u0CFF]/ };
function detectScript(text) {
  for (const [code, re] of Object.entries(SCRIPT_RE)) if (re.test(text)) return code;
  return null;
}

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry',
];

function LocationPanel({ location, onUpdate, onClose }) {
  const [state,    setState]    = useState(location?.state    || '');
  const [district, setDistrict] = useState(location?.district || '');
  const [city,     setCity]     = useState(location?.city     || '');
  const apply = () => { onUpdate({ state, district, city }); onClose(); };
  const clear = () => { onUpdate(null); setState(''); setDistrict(''); setCity(''); onClose(); };
  return (
    <div className="rounded-2xl border border-line bg-canvas p-4 text-sm">
      <p className="mb-3 font-bold text-ink">Your location (for nearby resource suggestions)</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-bold text-muted">State
          <select value={state} onChange={(e) => setState(e.target.value)}
            className="min-h-[38px] rounded-xl border-2 border-line bg-white px-2 text-ink outline-none focus:border-brand-500">
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-muted">District
          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Chennai"
            className="min-h-[38px] rounded-xl border-2 border-line bg-white px-3 text-ink outline-none focus:border-brand-500" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-muted">City / Area
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. T. Nagar"
            className="min-h-[38px] rounded-xl border-2 border-line bg-white px-3 text-ink outline-none focus:border-brand-500" />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={apply} className="rounded-full bg-leaf-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-leaf-700">Apply</button>
        <button onClick={clear} className="rounded-full border border-line bg-white px-4 py-1.5 text-xs font-bold text-muted hover:bg-canvas">Clear</button>
        <button onClick={onClose} className="ml-auto rounded-full px-4 py-1.5 text-xs font-bold text-muted hover:bg-canvas">Cancel</button>
      </div>
    </div>
  );
}

function LangBar({ lang, setLang }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Globe className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
      {Object.entries(LANGS).map(([code, label]) => (
        <button key={code} onClick={() => setLang(code)}
          className={`rounded-full px-2.5 py-1 font-bold transition-colors ${lang === code ? 'bg-brand-600 text-white' : 'border border-line bg-white text-muted hover:bg-brand-50 hover:text-brand-700'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Guest banner — shown when server chat is unavailable ── */
function GuestBanner() {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      💬 You're using the chatbot as a guest. All features work — your chat history is local only.
      For full features, <a href="/login" className="font-bold underline">log in with a full account</a>.
    </div>
  );
}

export default function Chatbot() {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();

  const [online,       setOnline]       = useState('checking');
  const [messages,     setMessages]     = useState([{
    role: 'model',
    text: "Hi! I'm the ResQPaws assistant 🐾\n\nAsk me anything about animal care, feeding, vaccines, health, or rescue.\n\nYou can type in English, தமிழ், हिन्दी, తెలుగు or ಕನ್ನಡ — I'll reply in the same language!"
  }]);
  const [input,        setInput]        = useState('');
  const [busy,         setBusy]         = useState(false);
  const [image,        setImage]        = useState(null);
  const [listening,    setListening]    = useState(false);
  const [location,     setLocation]     = useState(null);
  const [showLocPanel, setShowLocPanel] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const logRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    api.get('/config', { auth: false })
      .then((c) => setOnline(c.chatEnabled ? 'online' : 'offline'))
      .catch(() => setOnline('offline'));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  /* GPS */
  const useGPS = useCallback(() => {
    if (!navigator.geolocation) { setShowLocPanel(true); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const d = await r.json();
        const addr = d.address || {};
        const loc = { city: addr.city || addr.town || addr.village || '', district: addr.county || addr.state_district || '', state: addr.state || '' };
        setLocation(loc);
        setMessages((m) => [...m, { role: 'model', text: `📍 Location set: ${[loc.city, loc.district, loc.state].filter(Boolean).join(', ')}. I'll suggest nearby resources!` }]);
      } catch { setShowLocPanel(true); }
    }, () => setShowLocPanel(true));
  }, []);

  const send = async (text) => {
    const q = (text ?? input).trim() || (image ? 'Please look at this animal photo and tell me if anything looks wrong.' : '');
    if (!q || busy) return;

    const scriptLang = detectScript(q);
    const effectiveLang = scriptLang || lang;
    setDetectedLang(scriptLang && scriptLang !== lang ? scriptLang : null);

    const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));

    setMessages((m) => [...m, { role: 'user', text: q, imageName: image?.name }]);
    const attached = image;
    setInput(''); setImage(null); setBusy(true);

    try {
      let d;
      if (attached) {
        const fd = new FormData();
        fd.append('image', attached);
        fd.append('message', q);
        fd.append('language', effectiveLang);
        fd.append('history', JSON.stringify(history));
        fd.append('location', JSON.stringify(location || null));
        d = await api.upload('/chat/image', fd);
      } else {
        d = await api.post('/chat', { message: q, language: effectiveLang, history, location: location || null });
      }
      setMessages((m) => [...m, { role: 'model', text: d.reply }]);
      setOnline('online');
    } catch (e) {
      // Guest or server not configured — show helpful message instead of crashing
      if (e.code === 'CHAT_NOT_CONFIGURED' || e.status === 401 || e.status === 503) {
        setOnline('offline');
        setMessages((m) => [...m, {
          role: 'model',
          text: online === 'offline'
            ? 'The AI chatbot needs a GEMINI_API_KEY configured on the server. Please ask the admin to add it in server/.env'
            : 'Sorry, I could not reach the assistant right now. Please try again in a moment.',
          isError: true
        }]);
      } else {
        setMessages((m) => [...m, { role: 'model', text: e.message || 'Sorry, something went wrong.', isError: true }]);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMessages((m) => [...m, { role: 'model', text: 'Voice input is not supported in this browser.' }]); return; }
    if (recRef.current) { recRef.current.stop(); return; }
    const rec = new SR();
    rec.lang = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN' }[lang] || 'en-IN';
    rec.onstart  = () => setListening(true);
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.onend    = () => { setListening(false); recRef.current = null; };
    rec.onerror  = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    rec.start();
  };

  const locationLabel = location ? [location.city, location.district, location.state].filter(Boolean).join(', ') : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">ResQPaws Assistant</h1>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
          online === 'online'  ? 'bg-leaf-100 text-leaf-700' :
          online === 'offline' ? 'bg-amber-100 text-amber-700' :
                                 'bg-brand-100 text-brand-700'}`}>
          {online === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online === 'checking' ? 'Checking…' : online === 'online' ? 'Online' : 'Offline – no Gemini key'}
        </span>
      </div>

      {user?.isGuest && <GuestBanner />}

      {online === 'offline' && (
        <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          Add a <code className="font-mono">GEMINI_API_KEY</code> in <code className="font-mono">server/.env</code> to enable live AI answers.
        </p>
      )}

      {/* Language bar */}
      <div className="mb-3">
        <LangBar lang={lang} setLang={(l) => { setLang(l); setDetectedLang(null); }} />
        {detectedLang && (
          <p className="mt-1.5 text-xs font-semibold text-brand-700">
            Auto-detected: replying in {LANGS[detectedLang]}
          </p>
        )}
      </div>

      {/* Location bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={useGPS}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
          <MapPin className="h-3.5 w-3.5" /> Use my location
        </button>
        <button onClick={() => setShowLocPanel((s) => !s)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${locationLabel ? 'border-leaf-300 bg-leaf-50 text-leaf-700' : 'border-line bg-white text-muted hover:bg-canvas'}`}>
          {locationLabel ? <><MapPin className="h-3.5 w-3.5" />{locationLabel}</> : <><MapPinOff className="h-3.5 w-3.5" />Set location</>}
        </button>
        {location && <button onClick={() => setLocation(null)} className="text-xs font-bold text-rose-600 hover:underline">Clear</button>}
      </div>
      {showLocPanel && <div className="mb-3"><LocationPanel location={location} onUpdate={setLocation} onClose={() => setShowLocPanel(false)} /></div>}

      {/* Chat window */}
      <div className="rounded-[28px] border border-line bg-white shadow-card">
        <div ref={logRef} className="grid max-h-[55vh] gap-3 overflow-y-auto p-5" role="log" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`flex max-w-[85%] gap-2 ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              {m.role === 'model' && (
                <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-leaf-600 text-white">
                  <Paw className="h-4 w-4" />
                </span>
              )}
              <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-brand-600 text-white' :
                m.isError        ? 'bg-rose-50 text-rose-700' :
                                   'bg-canvas text-ink'}`}>
                {m.imageName && <p className="mb-1 text-xs opacity-80">📎 {m.imageName}</p>}
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-600 text-white"><Paw className="h-4 w-4" /></span>
              <div className="rounded-2xl bg-canvas px-4 py-3"><Spinner label="Assistant is typing" /></div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-line p-3">
          {image && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
              {image.name}<button type="button" onClick={() => setImage(null)}><X className="h-3 w-3" /></button>
            </span>
          )}
          <label className="grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-full border border-line text-muted hover:bg-canvas" aria-label="Attach image">
            <ImageIcon className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value=''; if(f) setImage(f); }} />
          </label>
          <button type="button" onClick={toggleMic} aria-pressed={listening} aria-label="Voice input"
            className={`grid h-11 w-11 flex-none place-items-center rounded-full ${listening ? 'animate-ring bg-rose-600 text-white' : 'border border-line text-muted hover:bg-canvas'}`}>
            <Mic className="h-4 w-4" />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Type in any language…"
            className="min-h-[44px] flex-1 rounded-full border-2 border-line bg-canvas px-4 outline-none focus:border-brand-500" />
          <button type="submit" disabled={busy || (!input.trim() && !image)} aria-label="Send"
            className="grid h-11 w-11 flex-none place-items-center rounded-full bg-leaf-600 text-white hover:bg-leaf-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <p className="mt-3 text-xs text-muted">
        General guidance only — not a replacement for a vet. In an emergency, contact a veterinarian immediately.
      </p>
    </div>
  );
}
