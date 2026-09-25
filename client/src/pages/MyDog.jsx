import { useEffect, useState } from 'react';
import { Droplet, Footprints, Syringe, Bell, Plus, Trash2, CheckCircle2, AlertTriangle, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

/* ── localStorage helpers ── */
const store = {
  get: (k, d) => { try { const v = localStorage.getItem('rp_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('rp_' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dayName = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return DAYS[d.getDay()]; };
const fmt = (iso) => { if (!iso) return '—'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
const daysUntil = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 864e5);
const addMonths = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0,10); };
const addDaysToToday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };

/* ── Default vaccinations ── */
const DEFAULT_VAX = [
  { id: 1, name: 'Rabies',                  date: addDaysToToday(-180), intervalMonths: 12, done: true  },
  { id: 2, name: 'DHPP (Distemper & Parvo)', date: addDaysToToday(-5),  intervalMonths: 12, done: false },
  { id: 3, name: 'Deworming',                date: addDaysToToday(9),   intervalMonths:  3, done: false },
  { id: 4, name: 'Leptospirosis',            date: addDaysToToday(20),  intervalMonths: 12, done: false },
];

/* ─────────────────────────────────── MyDog page ─────────────────────────── */
export default function MyDog() {
  const [pet, setPet] = useState(() => store.get('pet', { name: 'Bruno', breed: 'Indie mix', age: '3', weight: '18' }));
  const [day, setDay] = useState(() => {
    const d = store.get('day', { date: todayISO(), water: 0, walk: 0 });
    return d.date === todayISO() ? d : { date: todayISO(), water: 0, walk: 0 };
  });

  useEffect(() => store.set('pet', pet), [pet]);
  useEffect(() => store.set('day', day), [day]);

  const waterGoal = Math.max(250, Math.round(((parseFloat(pet.weight) || 10) * 55) / 50) * 50);
  const walkGoal  = 45;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">My Dog</h1>
      <p className="mt-1 text-muted">Manage {pet.name || 'your dog'}'s profile, vaccinations, food, water and walk reminders.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Profile</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['Name','name','text'],['Breed','breed','text'],['Age (years)','age','number'],['Weight (kg)','weight','number']].map(([lbl,key,type]) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-ink">
                {lbl}
                <input type={type} min="0" max={key==='age'?30:100} value={pet[key]}
                  onChange={(e) => setPet({ ...pet, [key]: e.target.value })}
                  className="min-h-[44px] rounded-xl border-2 border-line bg-canvas px-3 font-normal outline-none focus:border-brand-500" />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Saved on this device only.</p>
        </div>

        {/* Today trackers */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Today</h2>
          <Meter icon={Droplet}    label="Water" value={day.water} goal={waterGoal} unit="ml"
            onAdd={(n) => setDay({ ...day, water: day.water + n })} steps={[250, 500]} />
          <Meter icon={Footprints} label="Walk"  value={day.walk}  goal={walkGoal}  unit="min" className="mt-6"
            onAdd={(n) => setDay({ ...day, walk: day.walk + n })}   steps={[10, 20]} />
        </div>

        {/* Vaccination module — full width */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card md:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Syringe className="h-5 w-5 text-brand-600" /> Vaccinations
          </h2>
          <p className="mb-5 text-sm text-muted">Track vaccination dates, auto-calculated due dates, and set reminders.</p>
          <VaxModule petName={pet.name} />
        </div>

        {/* Reminders */}
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card md:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Bell className="h-5 w-5 text-brand-600" /> Reminders
          </h2>
          <Reminders petName={pet.name} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Meter ──────────────────────────────────── */
function Meter({ icon: Icon, label, value, goal, unit, onAdd, steps, className = '' }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between font-bold text-ink">
        <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" /> {label}</span>
        <span>{value} / {goal} {unit}</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full border border-line bg-canvas">
        <div className="h-full rounded-full bg-leaf-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex gap-2">
        {steps.map((s) => (
          <button key={s} onClick={() => onAdd(s)}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
            +{s} {unit}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── VaxModule (enhanced) ───────────────────────── */
function VaxModule({ petName }) {
  const [items, setItems] = useState(() => store.get('vax2', DEFAULT_VAX));
  const [showAdd, setShowAdd] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [newVax, setNewVax] = useState({ name: '', date: todayISO(), intervalMonths: 12 });
  const [formErr, setFormErr] = useState('');

  useEffect(() => store.set('vax2', items), [items]);

  /* derived per-item fields */
  const enriched = items.map((v) => {
    const dueDate = v.date ? addMonths(v.date, Number(v.intervalMonths) || 12) : '';
    const n       = dueDate ? daysUntil(dueDate) : null;
    const overdue = !v.done && n !== null && n < 0;
    const urgent  = !v.done && n !== null && n >= 0 && n <= 14;
    const upcoming= !v.done && n !== null && n > 14;
    return { ...v, dueDate, daysLeft: n, overdue, urgent, upcoming };
  });

  /* sort: overdue → urgent → upcoming → done */
  const sorted = [...enriched].sort((a, b) => {
    const rank = (x) => x.overdue ? 0 : x.urgent ? 1 : x.upcoming ? 2 : 3;
    return rank(a) - rank(b) || (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  const toggle = (id) => setItems((xs) => xs.map((v) => v.id === id ? { ...v, done: !v.done } : v));
  const remove = (id) => setItems((xs) => xs.filter((v) => v.id !== id));

  const addVax = (e) => {
    e.preventDefault();
    if (!newVax.name.trim()) { setFormErr('Vaccination name is required.'); return; }
    if (!newVax.date)        { setFormErr('Please pick a vaccination date.'); return; }
    setFormErr('');
    setItems((xs) => [...xs, { id: Date.now(), name: newVax.name.trim(), date: newVax.date, intervalMonths: Number(newVax.intervalMonths) || 12, done: false }]);
    setNewVax({ name: '', date: todayISO(), intervalMonths: 12 });
    setShowAdd(false);
  };

  /* summary counts */
  const overdueCount  = enriched.filter((v) => v.overdue).length;
  const upcomingCount = enriched.filter((v) => v.urgent || v.upcoming).length;

  return (
    <div>
      {/* ── Summary banner ── */}
      {(overdueCount > 0 || upcomingCount > 0) && (
        <div className={`mb-4 flex flex-wrap gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${overdueCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> {overdueCount} vaccination{overdueCount > 1 ? 's' : ''} overdue!
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {upcomingCount} vaccination{upcomingCount > 1 ? 's' : ''} due soon.
            </span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-muted">
              <th className="pb-2 pr-4">Vaccination</th>
              <th className="pb-2 pr-4">Date Given</th>
              <th className="pb-2 pr-4">Day</th>
              <th className="pb-2 pr-4">Next Due</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Reminder</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => {
              const statusLabel = v.done
                ? 'Completed'
                : v.overdue  ? `Overdue by ${-v.daysLeft}d`
                : v.daysLeft === 0 ? 'Due today'
                : v.urgent   ? `Due in ${v.daysLeft}d`
                : v.daysLeft !== null ? `Due in ${v.daysLeft}d`
                : '—';
              const tone = v.done
                ? 'bg-leaf-100 text-leaf-700'
                : v.overdue ? 'bg-rose-100 text-rose-700'
                : v.urgent  ? 'bg-amber-100 text-amber-700'
                : 'bg-brand-100 text-brand-700';
              const reminderTone = (!v.done && v.daysLeft !== null && v.daysLeft <= 30)
                ? 'text-leaf-700 font-bold' : 'text-muted';
              return (
                <tr key={v.id} className="border-b border-line/50 last:border-0">
                  <td className="py-3 pr-4 font-semibold text-ink">{v.name}</td>
                  <td className="py-3 pr-4 text-muted">{fmt(v.date)}</td>
                  <td className="py-3 pr-4 text-muted">{dayName(v.date)}</td>
                  <td className="py-3 pr-4">
                    {v.dueDate ? (
                      <span className="flex flex-col">
                        <span className="font-semibold text-ink">{fmt(v.dueDate)}</span>
                        <span className="text-xs text-muted">{dayName(v.dueDate)}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{statusLabel}</span>
                  </td>
                  <td className={`py-3 pr-4 text-xs ${reminderTone}`}>
                    {!v.done && v.daysLeft !== null && v.daysLeft <= 30 ? 'Active 🔔' : v.done ? '—' : 'Inactive'}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggle(v.id)}
                        title={v.done ? 'Mark pending' : 'Mark done'}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${v.done ? 'bg-canvas text-muted hover:bg-line' : 'bg-leaf-600 text-white hover:bg-leaf-700'}`}>
                        {v.done ? 'Undo' : '✓ Done'}
                      </button>
                      <button onClick={() => remove(v.id)} title="Remove"
                        className="rounded-full p-1 text-muted hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add new vaccination ── */}
      <div className="mt-5">
        <button onClick={() => setShowAdd((s) => !s)}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
          <Plus className="h-4 w-4" /> Add vaccination
        </button>

        {showAdd && (
          <form onSubmit={addVax} className="mt-4 grid gap-4 rounded-2xl border border-line bg-canvas p-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs font-bold text-ink col-span-2 sm:col-span-1 lg:col-span-1">
              Vaccination Name *
              <input value={newVax.name} onChange={(e) => setNewVax({ ...newVax, name: e.target.value })}
                placeholder="e.g. Bordetella"
                className="min-h-[40px] rounded-xl border-2 border-line bg-white px-3 font-normal text-sm outline-none focus:border-brand-500" />
            </label>
            <label className="grid gap-1 text-xs font-bold text-ink">
              Date Given *
              <input type="date" value={newVax.date} onChange={(e) => setNewVax({ ...newVax, date: e.target.value })}
                className="min-h-[40px] rounded-xl border-2 border-line bg-white px-3 font-normal text-sm outline-none focus:border-brand-500" />
              {newVax.date && <span className="text-xs text-muted">{dayName(newVax.date)}</span>}
            </label>
            <label className="grid gap-1 text-xs font-bold text-ink">
              Repeat every (months)
              <select value={newVax.intervalMonths} onChange={(e) => setNewVax({ ...newVax, intervalMonths: e.target.value })}
                className="min-h-[40px] rounded-xl border-2 border-line bg-white px-3 font-normal text-sm outline-none focus:border-brand-500">
                {[1,3,6,12,24,36].map((m) => <option key={m} value={m}>{m} month{m>1?'s':''}</option>)}
              </select>
            </label>
            <div className="grid gap-1 text-xs font-bold text-ink">
              Next Due (auto)
              <div className="min-h-[40px] rounded-xl border-2 border-line bg-white/60 px-3 flex items-center text-sm text-muted">
                {newVax.date ? `${fmt(addMonths(newVax.date, Number(newVax.intervalMonths)))} · ${dayName(addMonths(newVax.date, Number(newVax.intervalMonths)))}` : '—'}
              </div>
            </div>
            {formErr && <p role="alert" className="col-span-full text-xs font-semibold text-rose-600">{formErr}</p>}
            <div className="col-span-full flex gap-2">
              <button type="submit" className="rounded-full bg-leaf-600 px-5 py-2 text-sm font-bold text-white hover:bg-leaf-700">Save</button>
              <button type="button" onClick={() => { setShowAdd(false); setFormErr(''); }}
                className="rounded-full border border-line bg-white px-5 py-2 text-sm font-bold text-muted hover:bg-canvas">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="mt-6">
        <button onClick={() => setShowTimeline((s) => !s)}
          className="flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline">
          {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Vaccination timeline
        </button>

        {showTimeline && (
          <div className="mt-4 relative pl-6 before:absolute before:left-2 before:top-0 before:h-full before:w-0.5 before:bg-line">
            {sorted.map((v, i) => {
              const dot = v.done ? 'bg-leaf-600' : v.overdue ? 'bg-rose-500' : v.urgent ? 'bg-amber-500' : 'bg-brand-400';
              return (
                <div key={v.id} className="relative mb-5 last:mb-0">
                  <span className={`absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-white ${dot}`} />
                  <div className="rounded-2xl border border-line bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-ink">{v.name}</span>
                      {v.done
                        ? <span className="flex items-center gap-1 text-xs font-bold text-leaf-700"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>
                        : v.overdue
                          ? <span className="flex items-center gap-1 text-xs font-bold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" /> Overdue</span>
                          : <span className="text-xs font-bold text-amber-700">Pending</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                      <span>Given: <strong className="text-ink">{fmt(v.date)}</strong> ({dayName(v.date)})</span>
                      {v.dueDate && <span>Due: <strong className="text-ink">{fmt(v.dueDate)}</strong> ({dayName(v.dueDate)})</span>}
                      {!v.done && v.daysLeft !== null && (
                        <span className={v.overdue ? 'text-rose-600 font-bold' : v.urgent ? 'text-amber-600 font-bold' : ''}>
                          {v.daysLeft < 0 ? `${-v.daysLeft} day(s) overdue` : v.daysLeft === 0 ? 'Due today!' : `${v.daysLeft} day(s) remaining`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Reminders ──────────────────────────────── */
function Reminders({ petName }) {
  const [items, setItems] = useState(() => store.get('rems', [
    { id: 1, type: 'food', time: '08:00', on: true },
    { id: 2, type: 'walk', time: '18:30', on: true },
  ]));
  const [type, setType] = useState('food');
  const [time, setTime] = useState('09:00');
  useEffect(() => store.set('rems', items), [items]);

  const label = { food: 'Food', water: 'Water', walk: 'Walk' };
  const add = (e) => {
    e.preventDefault();
    setItems((xs) => [...xs, { id: Date.now(), type, time, on: true }]);
  };

  return (
    <div>
      <ul className="grid gap-2">
        {[...items].sort((a, b) => a.time.localeCompare(b.time)).map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
            <span className="flex-1 font-bold text-ink">{label[r.type]} for {petName || 'your dog'} · {r.time}</span>
            <input type="checkbox" checked={r.on}
              onChange={() => setItems((xs) => xs.map((x) => x.id === r.id ? { ...x, on: !x.on } : x))}
              className="h-5 w-5 accent-leaf-600" aria-label={`${label[r.type]} reminder on`} />
            <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== r.id))}
              className="text-xs font-bold text-rose-600 hover:underline">Remove</button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-bold text-ink">
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-line bg-canvas px-2 font-normal">
            <option value="food">Food</option>
            <option value="water">Water</option>
            <option value="walk">Walk</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink">
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-line bg-canvas px-2 font-normal" />
        </label>
        <button type="submit"
          className="min-h-[42px] rounded-full bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700">
          Add
        </button>
      </form>
    </div>
  );
}
