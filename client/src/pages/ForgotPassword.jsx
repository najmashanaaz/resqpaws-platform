import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    // No email provider is connected in this build. The backend route in src/routes/auth.js
    // is the place to add a real "forgot password" endpoint once you have one (e.g. SendGrid, SES).
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false);
    setSent(true);
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-md place-items-center px-4 py-10">
      <div className="w-full rounded-[32px] border border-line bg-white p-8 shadow-card text-center">
        {sent ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-leaf-600" />
            <h1 className="font-display text-xl font-semibold text-ink">Check your email</h1>
            <p className="mt-2 text-sm text-muted">If an account exists for {email}, a reset link will be sent.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold text-ink">Reset your password</h1>
            <p className="mt-2 text-sm text-muted">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={submit} className="mt-5 grid gap-4 text-left">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-ink">Email</span>
                <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-canvas px-4 focus-within:border-brand-500">
                  <Mail className="h-4 w-4 text-muted" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-[46px] flex-1 bg-transparent outline-none" />
                </div>
              </label>
              <button type="submit" disabled={busy} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-leaf-600 font-bold text-white hover:bg-leaf-700 disabled:opacity-60">
                {busy ? <Spinner className="h-5 w-5 text-white" /> : 'Send reset link'}
              </button>
            </form>
            <p className="mt-4 text-xs text-muted">Demo note: no email service is connected yet, so no email is actually sent by this build.</p>
          </>
        )}
        <Link to="/login" className="mt-5 inline-block text-sm font-bold text-brand-700 hover:underline">Back to log in</Link>
      </div>
    </div>
  );
}
