/**
 * Welcome / Quick-Login Page
 * Collects Name, User ID, Email – stores locally – then redirects to /home.
 * No backend call required; this is a profile-setup step, not auth.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Hash, Mail, ArrowRight, RotateCcw, Heart, Shield, Zap } from 'lucide-react';

/* ── Paw print mini SVG ── */
function Paw({ className = '', style }) {
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

/* ── Animated walking dog (same as Splash) ── */
function DogIllustration() {
  return (
    <>
      <style>{`
        @keyframes welcomeWalkLeg {
          0%,100%{ transform-origin:top center; transform:rotate(-22deg); }
          50%    { transform-origin:top center; transform:rotate(22deg);  }
        }
        @keyframes bodyBob {
          0%,100%{ transform:translateY(0);   }
          50%    { transform:translateY(-4px); }
        }
        @keyframes tailWag {
          0%,100%{ transform-origin:30px 38px; transform:rotate(0deg);   }
          50%    { transform-origin:30px 38px; transform:rotate(-30deg);  }
        }
        .wdog-body { animation: bodyBob 1.1s ease-in-out infinite; }
        .wdog-fl   { animation: welcomeWalkLeg 0.55s ease-in-out infinite; }
        .wdog-fr   { animation: welcomeWalkLeg 0.55s ease-in-out infinite 0.275s; }
        .wdog-rl   { animation: welcomeWalkLeg 0.55s ease-in-out infinite 0.138s; }
        .wdog-rr   { animation: welcomeWalkLeg 0.55s ease-in-out infinite 0.413s; }
        .wdog-tail { animation: tailWag 0.7s ease-in-out infinite; }
        @keyframes pawBounce {
          0%,100%{ opacity:0; transform:translateY(8px) scale(0.7); }
          40%    { opacity:1; transform:translateY(0)   scale(1);   }
          70%    { opacity:0.6; }
        }
        .paw-bounce-1{ animation: pawBounce 2s ease-in-out 0.0s infinite; }
        .paw-bounce-2{ animation: pawBounce 2s ease-in-out 0.4s infinite; }
        .paw-bounce-3{ animation: pawBounce 2s ease-in-out 0.8s infinite; }
        .paw-bounce-4{ animation: pawBounce 2s ease-in-out 1.2s infinite; }
      `}</style>

      <div className="relative flex flex-col items-center">
        {/* Dog SVG */}
        <svg viewBox="0 0 140 90" className="h-32 w-44 drop-shadow-lg" fill="none" aria-hidden="true">
          <g className="wdog-body">
            {/* tail */}
            <path className="wdog-tail" d="M30 40 Q12 22 18 10" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
            {/* body */}
            <ellipse cx="60" cy="50" rx="32" ry="18" fill="#f59e0b" />
            {/* neck */}
            <ellipse cx="88" cy="38" rx="10" ry="12" fill="#f59e0b" />
            {/* head */}
            <ellipse cx="100" cy="26" rx="16" ry="14" fill="#f59e0b" />
            {/* snout */}
            <ellipse cx="114" cy="31" rx="8" ry="6" fill="#fbbf24" />
            {/* ear */}
            <ellipse cx="93" cy="14" rx="8" ry="11" fill="#d97706" transform="rotate(-10 93 14)" />
            {/* eye */}
            <circle cx="106" cy="22" r="3" fill="#1a1a1a" />
            <circle cx="107.5" cy="21" r="1" fill="white" />
            {/* nose */}
            <ellipse cx="119" cy="29" rx="3" ry="2.5" fill="#1a1a1a" />
            {/* collar */}
            <path d="M82 42 Q88 46 94 42" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
            {/* legs */}
            <line className="wdog-fl" x1="48" y1="65" x2="44" y2="82" stroke="#d97706" strokeWidth="6" strokeLinecap="round" />
            <line className="wdog-fr" x1="62" y1="67" x2="66" y2="82" stroke="#d97706" strokeWidth="6" strokeLinecap="round" />
            <line className="wdog-rl" x1="75" y1="65" x2="71" y2="82" stroke="#d97706" strokeWidth="6" strokeLinecap="round" />
            <line className="wdog-rr" x1="89" y1="63" x2="93" y2="82" stroke="#d97706" strokeWidth="6" strokeLinecap="round" />
          </g>
        </svg>

        {/* Paw prints below the dog */}
        <div className="mt-1 flex gap-3" aria-hidden="true">
          <Paw className="paw-bounce-1 h-5 w-5 text-amber-400/70" />
          <Paw className="paw-bounce-2 h-5 w-5 text-amber-400/70" />
          <Paw className="paw-bounce-3 h-5 w-5 text-amber-400/70" />
          <Paw className="paw-bounce-4 h-5 w-5 text-amber-400/70" />
        </div>
      </div>
    </>
  );
}

/* ── Feature badge ── */
function Badge({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-amber-300 flex-shrink-0" />
      <span className="text-xs font-semibold text-white/90">{label}</span>
    </div>
  );
}

/* ── Floating ambient paws ── */
const FLOAT_PAWS = Array.from({ length: 10 }, (_, i) => ({
  left: `${4 + i * 9}%`,
  top:  `${10 + (i % 4) * 20}%`,
  size: i % 3 === 0 ? 'h-8 w-8' : 'h-5 w-5',
  delay: `${i * 0.4}s`,
  dur:   `${3 + (i % 3) * 0.8}s`,
  rot:   `${(i % 5 - 2) * 18}deg`,
}));

/* ── Email regex ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Store helpers ── */
const store = {
  get: (k, d) => { try { const v = localStorage.getItem('rp_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('rp_' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

export default function Welcome() {
  const nav = useNavigate();
  const { user, login, setGuestUser } = useAuth();

  const [form, setForm] = useState({ name: '', userId: '', email: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  /* If already logged in (guest or real), skip straight to /home */
  useEffect(() => {
    if (user) nav('/home', { replace: true });
  }, [user, nav]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())               e.name   = 'Name is required.';
    if (!form.userId.trim())             e.userId  = 'User ID is required.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const userObj = { name: form.name.trim(), userId: form.userId.trim(), email: form.email.trim().toLowerCase() };
    store.set('welcome_user', userObj);
    setSubmitted(true);
    await setGuestUser(userObj);
    setTimeout(() => nav('/home', { replace: true }), 1400);
  };

  const handleDemo = async () => {
    const demo = { name: 'Demo User', userId: 'demo_user', email: 'user@resqpaws.demo' };
    setForm(demo);
    store.set('welcome_user', demo);
    setSubmitted(true);
    try {
      await login({ email: 'user@resqpaws.demo', password: 'User@12345' });
    } catch {
      await setGuestUser(demo);
    }
    setTimeout(() => nav('/home', { replace: true }), 1400);
  };

  const handleClear = () => { setForm({ name: '', userId: '', email: '' }); setErrors({}); };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{ background: 'linear-gradient(145deg, #0e4166 0%, #1a6e9f 45%, #166534 100%)' }}
    >
      {/* ── Floating BG paws ── */}
      <style>{`
        @keyframes floatPaw {
          0%,100%{ opacity:0;    transform:translateY(14px) rotate(var(--pr)); }
          40%    { opacity:0.14; transform:translateY(0)     rotate(var(--pr)); }
        }
        @keyframes successPop {
          0%  { transform:scale(0.6); opacity:0; }
          70% { transform:scale(1.1); opacity:1; }
          100%{ transform:scale(1);   opacity:1; }
        }
        .success-pop { animation: successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {FLOAT_PAWS.map((p, i) => (
          <Paw key={i} className={`absolute text-white ${p.size}`}
            style={{ left: p.left, top: p.top, '--pr': p.rot,
              animation: `floatPaw ${p.dur} ease-in-out ${p.delay} infinite` }} />
        ))}
      </div>

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-5xl">
        {submitted ? (
          /* ── Success state ── */
          <div className="success-pop mx-auto max-w-md rounded-[32px] bg-white p-10 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-leaf-100">
              <Paw className="h-10 w-10 text-leaf-600" />
            </div>
            <h2 className="font-display text-3xl font-bold text-ink">
              Welcome, {form.name.split(' ')[0]}! 🐾
            </h2>
            <p className="mt-2 text-muted">Taking you to ResQPaws…</p>
            <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-canvas">
              <div className="h-full animate-[progress_1.4s_linear_both] rounded-full bg-leaf-600"
                style={{ animation: 'progress 1.4s linear forwards' }} />
            </div>
            <style>{`@keyframes progress{ from{width:0} to{width:100%} }`}</style>
          </div>
        ) : (
          /* ── Main two-column card ── */
          <div className="grid overflow-hidden rounded-[32px] bg-white shadow-2xl lg:grid-cols-[1fr_1.1fr]">

            {/* ── Left panel ── */}
            <div
              className="flex flex-col justify-between p-8 lg:p-10"
              style={{ background: 'linear-gradient(160deg, #0e4166 0%, #1a6e9f 60%, #1d8348 100%)' }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Paw className="h-6 w-6 text-white" />
                </div>
                <span className="font-display text-2xl font-bold text-white">ResQPaws</span>
              </div>

              {/* Dog illustration */}
              <div className="my-6 flex justify-center">
                <DogIllustration />
              </div>

              {/* Tag line */}
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight text-white">
                  Every paw print<br />tells a story.
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  AI-powered rescue, care &amp; awareness for every animal in India.
                </p>

                {/* Feature badges */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge icon={Shield} label="Distress detection" />
                  <Badge icon={Zap}    label="Instant AI answers" />
                  <Badge icon={Heart}  label="Adoption & rescue" />
                </div>
              </div>
            </div>

            {/* ── Right panel – form ── */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              {/* Paw accent row */}
              <div className="mb-2 flex gap-2" aria-hidden="true">
                {[...Array(4)].map((_, i) => (
                  <Paw key={i} className="h-4 w-4 text-amber-400" style={{ opacity: 1 - i * 0.2 }} />
                ))}
              </div>

              <h1 className="font-display text-3xl font-bold text-ink">Enter ResQPaws</h1>
              <p className="mt-1 text-sm text-muted">Tell us a bit about yourself to get started.</p>

              <form onSubmit={handleSubmit} noValidate className="mt-7 grid gap-5">
                {/* Name */}
                <Field
                  icon={User} label="Your Name" id="rp-name" type="text"
                  placeholder="e.g. Sonali"
                  value={form.name} error={errors.name}
                  onChange={(v) => set('name', v)}
                />

                {/* User ID */}
                <Field
                  icon={Hash} label="User ID" id="rp-uid" type="text"
                  placeholder="e.g. sonali_2026"
                  value={form.userId} error={errors.userId}
                  onChange={(v) => set('userId', v)}
                />

                {/* Email */}
                <Field
                  icon={Mail} label="Email Address" id="rp-email" type="email"
                  placeholder="you@example.com"
                  value={form.email} error={errors.email}
                  onChange={(v) => set('email', v)}
                />

                {/* Buttons */}
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <button
                    type="submit"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-leaf-600 font-bold text-white shadow-md transition-all hover:bg-leaf-700 hover:shadow-lg active:scale-95"
                  >
                    Enter ResQPaws <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-line bg-white font-bold text-muted transition-all hover:bg-canvas hover:text-ink active:scale-95"
                  >
                    <RotateCcw className="h-4 w-4" /> Clear Form
                  </button>
                </div>

                {/* Instant Demo Option */}
                <button
                  type="button"
                  onClick={handleDemo}
                  className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 font-bold text-sm transition-all hover:bg-amber-500/25 active:scale-98"
                >
                  <Paw className="h-4 w-4 text-amber-600" />
                  Quick Explore with Demo Account (Preloaded Data)
                </button>

                {/* Already have account */}
                <p className="text-center text-xs text-muted">
                  Have a full account?{' '}
                  <a href="/login" className="font-bold text-brand-700 hover:underline">Log in instead</a>
                </p>
              </form>

              {/* Paw decorative bottom */}
              <div className="mt-8 flex justify-end gap-2 opacity-20" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <Paw key={i} className="h-5 w-5 text-brand-600" style={{ opacity: (i + 1) * 0.18 }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable field component ── */
function Field({ icon: Icon, label, id, type, placeholder, value, error, onChange }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-ink">{label}</label>
      <div className={`flex items-center gap-2.5 rounded-2xl border-2 bg-canvas px-4 transition-colors focus-within:border-brand-500 ${error ? 'border-rose-400' : 'border-line'}`}>
        <Icon className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
        <input
          id={id} type={type} required autoComplete="off"
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[48px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
          aria-describedby={error ? `${id}-err` : undefined}
          aria-invalid={!!error}
        />
      </div>
      {error && <p id={`${id}-err`} role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
