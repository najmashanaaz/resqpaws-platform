import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { AudioLines, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { fmtDate, actionLabel, fmtShort } from '../lib/format.js';

const RISK_COLOR = { Low: '#33A073', Medium: '#D97706', High: '#DC2626' };

export default function Dashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get('/dashboard/summary').then((data) => setState({ data, loading: false, error: null })).catch((error) => setState({ data: null, loading: false, error }));
  };
  useEffect(load, []);

  if (state.loading) return <div className="grid min-h-[50vh] place-items-center"><Spinner label="Loading dashboard" className="h-8 w-8" /></div>;
  if (state.error) return <div className="mx-auto max-w-2xl px-4 py-16"><ErrorState error={state.error} onRetry={load} /></div>;

  const d = state.data;
  const riskData = ['Low', 'Medium', 'High'].map((r) => ({ name: r, value: d.distress.byRisk[r] || 0 }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Your Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={AudioLines} label="Total detections" value={d.totals.detections} tone="bg-brand-100 text-brand-700" />
        <Stat icon={CheckCircle2} label="Recognized" value={d.totals.recognized} tone="bg-leaf-100 text-leaf-700" />
        <Stat icon={AlertTriangle} label="High-risk reports" value={d.distress.byRisk.High || 0} tone="bg-rose-100 text-rose-700" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Confidence over time</h2>
          {d.timeline.length === 0 ? <p className="text-muted">No detections yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.timeline.map((x) => ({ name: fmtShort(x.at), confidence: x.confidence }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D5E5EF" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="confidence" fill="#21689C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Distress reports by risk</h2>
          {riskData.every((r) => r.value === 0) ? <p className="text-muted">No distress reports yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {riskData.map((r) => <Cell key={r.name} fill={RISK_COLOR[r.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Recent activity</h2>
        {d.activity.length === 0 ? <p className="text-muted">No activity yet.</p> : (
          <ul className="grid gap-2">
            {d.activity.map((a) => (
              <li key={a.id} className="flex justify-between rounded-2xl bg-canvas px-4 py-2.5 text-sm">
                <span className="font-bold text-ink">{actionLabel(a.action)}</span>
                <span className="text-muted">{fmtDate(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-4 rounded-[24px] border border-line bg-white p-5 shadow-card">
      <span className={`grid h-12 w-12 flex-none place-items-center rounded-2xl ${tone}`}><Icon className="h-6 w-6" /></span>
      <div><p className="font-display text-2xl font-semibold text-ink">{value}</p><p className="text-sm text-muted">{label}</p></div>
    </div>
  );
}
