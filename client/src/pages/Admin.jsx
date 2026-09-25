import { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Activity, Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { fmtDate, actionLabel } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';

const TABS = ['Overview', 'Distress Alerts', 'Support Centers', 'Activity Log'];
const TYPES = ['veterinary_hospital', 'animal_shelter', 'rescue_center', 'ngo', 'welfare_org'];
const RISK_STYLE = { Low: 'bg-leaf-100 text-leaf-700', Medium: 'bg-amber-100 text-amber-700', High: 'bg-rose-100 text-rose-700' };

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Admin Dashboard</h1>
      <div className="mt-4 flex flex-wrap gap-2 border-b border-line pb-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === t ? 'bg-brand-600 text-white' : 'text-muted hover:bg-canvas'}`}>{t}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'Overview' && <Overview />}
        {tab === 'Distress Alerts' && <Alerts />}
        {tab === 'Support Centers' && <Centers />}
        {tab === 'Activity Log' && <ActivityLog />}
      </div>
    </div>
  );
}

function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = () => { setState((s) => ({ ...s, loading: true, error: null })); fn().then((data) => setState({ data, loading: false, error: null })).catch((error) => setState({ data: null, loading: false, error })); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, deps);
  return { ...state, reload: load };
}

function Overview() {
  const { data, loading, error, reload } = useLoad(() => api.get('/admin/stats'));
  if (loading) return <Spinner label="Loading" className="h-8 w-8" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const cards = [
    { label: 'Total reports', value: data.reports, icon: Activity, tone: 'bg-brand-100 text-brand-700' },
    { label: 'Active alerts', value: data.activeAlerts, icon: AlertTriangle, tone: 'bg-rose-100 text-rose-700' },
    { label: 'Support centers', value: data.centers, icon: MapPin, tone: 'bg-leaf-100 text-leaf-700' },
    { label: 'Registered users', value: data.users, icon: Activity, tone: 'bg-brand-100 text-brand-700' }
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="flex items-center gap-3 rounded-[24px] border border-line bg-white p-5 shadow-card">
          <span className={`grid h-11 w-11 place-items-center rounded-2xl ${c.tone}`}><c.icon className="h-5 w-5" /></span>
          <div><p className="font-display text-2xl font-semibold text-ink">{c.value}</p><p className="text-sm text-muted">{c.label}</p></div>
        </div>
      ))}
    </div>
  );
}

function Alerts() {
  const { data, loading, error, reload } = useLoad(() => api.get('/admin/alerts'));
  const toast = useToast();
  const setStatus = async (id, alertStatus) => {
    try { await api.patch(`/admin/distress/${id}`, { alertStatus }); toast('Case updated', 'success'); reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  if (loading) return <Spinner label="Loading" className="h-8 w-8" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data.items.length === 0) return <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">No active alerts right now.</p>;
  return (
    <div className="grid gap-3">
      {data.items.map((r) => (
        <div key={r.id} className="rounded-[24px] border border-line bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${RISK_STYLE[r.riskLevel]}`}>{r.riskLevel}</span>
            <span className="font-bold text-ink">{r.animalGuess} · {r.state}</span>
            <span className="text-xs text-muted">{fmtDate(r.timestamp)}</span>
            <span className="ml-auto text-xs font-bold uppercase text-muted">{r.alertStatus}</span>
          </div>
          <p className="mt-2 text-sm text-muted">{r.recommendedAction}</p>
          {r.locationText && <p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {r.locationText}</p>}
          {r.reporter && <p className="mt-1 text-xs text-muted">Reported by {r.reporter.name}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {['acknowledged', 'dispatched', 'resolved'].map((s) => (
              <button key={s} onClick={() => setStatus(r.id, s)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold capitalize text-brand-700 hover:bg-brand-50">{s}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const emptyCenter = { name: '', type: 'veterinary_hospital', address: '', city: '', district: '', state: '', phone: '', openingHours: 'Mon-Sat 9:00 am - 6:00 pm', open24h: false, lat: '', lng: '', services: '' };

function Centers() {
  const { data, loading, error, reload } = useLoad(() => api.get('/support/admin/all'));
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, lat: Number(form.lat), lng: Number(form.lng), services: form.services.split(',').map((s) => s.trim()).filter(Boolean) };
      if (form.id) await api.put(`/support/${form.id}`, payload); else await api.post('/support', payload);
      toast('Support center saved', 'success');
      setForm(null); reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!confirm('Remove this support center?')) return;
    try { await api.del(`/support/${id}`); toast('Removed', 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <Spinner label="Loading" className="h-8 w-8" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <button onClick={() => setForm({ ...emptyCenter })} className="mb-4 inline-flex items-center gap-2 rounded-full bg-leaf-600 px-4 py-2 text-sm font-bold text-white hover:bg-leaf-700"><Plus className="h-4 w-4" /> Add support center</button>
      <div className="grid gap-2">
        {data.items.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-ink">{c.name}</p>
              <p className="text-xs text-muted">{c.city}, {c.state} · {c.phone}</p>
            </div>
            <button onClick={() => setForm({ ...c, services: (c.services || []).join(', ') })} aria-label={`Edit ${c.name}`} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-brand-50"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(c.id)} aria-label={`Delete ${c.name}`} className="grid h-9 w-9 place-items-center rounded-full border border-line text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={save} className="grid max-h-[90vh] w-full max-w-lg gap-3 overflow-y-auto rounded-[28px] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">{form.id ? 'Edit' : 'Add'} support center</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <label className="grid gap-1 text-sm font-bold text-ink">Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-line bg-canvas px-3 font-normal">
                {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
            <div className="grid grid-cols-3 gap-2">
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              <Field label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} required />
              <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude" type="number" step="any" value={form.lat} onChange={(v) => setForm({ ...form, lat: v })} required />
              <Field label="Longitude" type="number" step="any" value={form.lng} onChange={(v) => setForm({ ...form, lng: v })} required />
            </div>
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
            <Field label="Opening hours" value={form.openingHours} onChange={(v) => setForm({ ...form, openingHours: v })} />
            <label className="flex items-center gap-2 text-sm font-bold text-ink"><input type="checkbox" checked={form.open24h} onChange={(e) => setForm({ ...form, open24h: e.target.checked })} className="h-4 w-4 accent-leaf-600" /> Open 24 hours</label>
            <Field label="Services (comma separated)" value={form.services} onChange={(v) => setForm({ ...form, services: v })} />
            <button type="submit" disabled={busy} className="mt-1 min-h-[46px] rounded-full bg-brand-600 font-bold text-white hover:bg-brand-700 disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, ...props }) {
  return <label className="grid gap-1 text-sm font-bold text-ink">{label}<input {...props} onChange={(e) => props.onChange(e.target.value)} className="min-h-[44px] rounded-xl border-2 border-line bg-canvas px-3 font-normal outline-none focus:border-brand-500" /></label>;
}

function ActivityLog() {
  const { data, loading, error, reload } = useLoad(() => api.get('/admin/activity?limit=100'));
  if (loading) return <Spinner label="Loading" className="h-8 w-8" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <ul className="grid gap-2">
      {data.items.map((a) => (
        <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm">
          <span className="font-bold text-ink">{actionLabel(a.action)}{a.user ? ` · ${a.user.name}` : ''}</span>
          <span className="text-muted">{fmtDate(a.at)}</span>
        </li>
      ))}
    </ul>
  );
}
