import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, Stethoscope, HeartHandshake, Home, ShieldCheck } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const ROLES = [
  { key: 'owner', label: 'Pet Owner', icon: Home, desc: 'Manage your pet and get care reminders.' },
  { key: 'volunteer', label: 'Volunteer', icon: HeartHandshake, desc: 'Help rescue and support animals nearby.' },
  { key: 'adopter', label: 'Adopter', icon: Stethoscope, desc: 'Looking to adopt a rescued animal.' },
  { key: 'admin', label: 'Administrator', icon: ShieldCheck, desc: 'Manage centers, alerts and reports.' }
];

const rules = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'Contains a letter' },
  { test: (p) => /\d/.test(p), label: 'Contains a number' }
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'owner' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rules.every((r) => r.test(form.password))) { setError('Please meet all password requirements.'); return; }
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast(form.role === 'admin'
        ? 'Account created. Ask an existing admin to grant admin access for full admin tools.'
        : `Welcome to ResQPaws, ${form.name.split(' ')[0]}!`, 'success');
      nav('/home', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-2xl place-items-center px-4 py-10">
      <div className="w-full rounded-[32px] border border-line bg-white p-8 shadow-card sm:p-10">
        <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Already have one? <Link to="/login" className="font-bold text-brand-700 hover:underline">Log in</Link></p>

        <form onSubmit={submit} className="mt-6 grid gap-5" noValidate>
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-ink">I am joining as a…</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ROLES.map(({ key, label, icon: Icon, desc }) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, role: key })} aria-pressed={form.role === key} title={desc}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center text-xs font-bold transition-colors ${form.role === key ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-muted hover:bg-canvas'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">Administrator access is reviewed by the ResQPaws team after sign-up.</p>
          </fieldset>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-ink">Full name</span>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-canvas px-4 focus-within:border-brand-500">
              <User className="h-4 w-4 text-muted" aria-hidden="true" />
              <input required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="min-h-[46px] flex-1 bg-transparent outline-none" />
            </div>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-ink">Email</span>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-canvas px-4 focus-within:border-brand-500">
              <Mail className="h-4 w-4 text-muted" aria-hidden="true" />
              <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="min-h-[46px] flex-1 bg-transparent outline-none" />
            </div>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-ink">Password</span>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-canvas px-4 focus-within:border-brand-500">
              <Lock className="h-4 w-4 text-muted" aria-hidden="true" />
              <input type={showPw ? 'text' : 'password'} required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="min-h-[46px] flex-1 bg-transparent outline-none" />
              <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} className="text-muted">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <ul className="mt-1 grid gap-0.5 text-xs">
              {rules.map((r) => (
                <li key={r.label} className={r.test(form.password) ? 'text-leaf-700' : 'text-muted'}>{r.test(form.password) ? '✓' : '•'} {r.label}</li>
              ))}
            </ul>
          </label>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-leaf-600 font-bold text-white hover:bg-leaf-700 disabled:opacity-60">
            {busy ? <Spinner className="h-5 w-5 text-white" label="Creating account" /> : <><UserPlus className="h-4 w-4" /> Create account</>}
          </button>
        </form>
      </div>
    </div>
  );
}
