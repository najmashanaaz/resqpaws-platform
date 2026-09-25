import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import Paw from '../components/Paw.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(form);
      toast('Welcome back!', 'success');
      nav(loc.state?.from || '/home', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (role) => setForm(role === 'admin'
    ? { email: 'admin@resqpaws.demo', password: 'Admin@12345' }
    : { email: 'user@resqpaws.demo', password: 'User@12345' });

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl place-items-center px-4 py-10">
      <div className="grid w-full overflow-hidden rounded-[32px] border border-line bg-white shadow-card md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-mint-50 bg-[#DDF3E8] p-10 md:flex">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-leaf-600 text-white"><Paw className="h-7 w-7" /></span>
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">Welcome back to ResQPaws</h2>
            <p className="mt-3 max-w-xs text-muted">Track your pet, get AI answers, and help animals in your neighbourhood.</p>
          </div>
          <p className="text-sm text-muted">"Every rescue starts with someone who cared."</p>
        </div>
        <div className="p-8 sm:p-10">
          <h1 className="font-display text-2xl font-semibold text-ink">Log in</h1>
          <p className="mt-1 text-sm text-muted">New here? <Link to="/register" className="font-bold text-brand-700 hover:underline">Create an account</Link></p>

          <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-ink">Email</span>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-canvas px-4 focus-within:border-brand-500">
                <Mail className="h-4 w-4 text-muted" aria-hidden="true" />
                <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="min-h-[46px] flex-1 bg-transparent outline-none" placeholder="you@example.com" />
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-ink">Password</span>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-canvas px-4 focus-within:border-brand-500">
                <Lock className="h-4 w-4 text-muted" aria-hidden="true" />
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} className="min-h-[46px] flex-1 bg-transparent outline-none" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} className="text-muted">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-bold text-brand-700 hover:underline">Forgot password?</Link></div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
            <button type="submit" disabled={busy} className="mt-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-leaf-600 font-bold text-white hover:bg-leaf-700 disabled:opacity-60">
              {busy ? <Spinner className="h-5 w-5 text-white" label="Logging in" /> : <><LogIn className="h-4 w-4" /> Log in</>}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-brand-50 p-4 text-sm">
            <p className="font-bold text-brand-800">Try a demo account</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => fillDemo('user')} className="rounded-full border border-brand-200 bg-white px-3 py-1.5 font-bold text-brand-700 hover:bg-brand-100">Demo user</button>
              <button type="button" onClick={() => fillDemo('admin')} className="rounded-full border border-brand-200 bg-white px-3 py-1.5 font-bold text-brand-700 hover:bg-brand-100">Demo admin</button>
            </div>
            <p className="mt-2 text-xs text-muted">These work after the server has been seeded (npm run seed).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
