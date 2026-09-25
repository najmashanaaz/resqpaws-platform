import { useEffect, useState } from 'react';
import { MapPin, Upload, X } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';

const TYPES = ['Dog', 'Cat', 'Cow', 'Bird', 'Rabbit', 'Other'];
const ANIMAL_PHOTOS = {
  Dog: '/images/animals/dog.jpg',
  Cat: '/images/animals/cat.jpg',
  Bird: '/images/animals/bird.jpg',
  Cow: '/images/animals/cow.jpg',
  Rabbit: '/images/animals/rabbit.jpg',
  Other: '/images/animals/other.jpg'
};
const BADGE = {
  reported: 'bg-rose-100 text-rose-700 border border-rose-200',
  available: 'bg-leaf-100 text-leaf-700 border border-leaf-200',
  'adoption pending': 'bg-amber-100 text-amber-700 border border-amber-200',
  adopted: 'bg-purple-100 text-purple-700 border border-purple-200'
};
const STATUS_LABEL = {
  reported: '🚨 Rescue Needed',
  available: '🏡 Ready for Adoption',
  'adoption pending': '⏳ Adoption Pending',
  adopted: '❤️ Adopted'
};
const BASE = import.meta.env.VITE_API_URL || '/api';
const empty = { animalType: 'Dog', name: '', description: '', address: '', contactPhone: '' };

export default function Adoption() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState(null);
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: '', bad: '' });

  const load = () => api.get(`/adoption${qs({ type: filter === 'All' ? '' : filter })}`, { auth: false })
    .then((d) => { setItems(d.items); setErr(''); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [filter]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const useGps = () => {
    if (!navigator.geolocation) return setMsg({ ok: '', bad: 'GPS is not supported on this device.' });
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg({ ok: 'GPS location added.', bad: '' }); },
      () => setMsg({ ok: '', bad: 'Could not get your location. Please type the address instead.' }),
      { enableHighAccuracy: true, timeout: 10000 });
  };
  const pick = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setMsg({ ok: '', bad: 'Please choose a JPG, PNG or WEBP image.' });
    if (f.size > 3 * 1024 * 1024) return setMsg({ ok: '', bad: 'Image is too large (max 3 MB).' });
    setPhoto(f); setMsg({ ok: '', bad: '' });
  };
  const submit = async (e) => {
    e.preventDefault();
    if (form.address.trim().length < 5) return setMsg({ ok: '', bad: 'Please enter the address or a landmark.' });
    setBusy(true); setMsg({ ok: '', bad: '' });
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (coords) { fd.append('lat', coords.lat); fd.append('lng', coords.lng); }
      if (photo) fd.append('photo', photo);
      const d = await api.upload('/adoption', fd, { auth: false });
      setMsg({ ok: d.message, bad: '' }); setForm(empty); setPhoto(null); setCoords(null); setShowForm(false); load();
    } catch (e2) { setMsg({ ok: '', bad: e2.message }); } finally { setBusy(false); }
  };
  const input = 'mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2.5 outline-none focus:border-brand-500';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Adoption &amp; Rescue</h1>
          <p className="mt-1 text-muted">Adopt a rescued animal, or upload a photo and address of an animal that needs help.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">
          {showForm ? 'Close form' : '+ Report / list an animal'}
        </button>
      </div>

      {msg.ok && <p role="status" className="mt-4 rounded-2xl bg-leaf-100 p-3 text-sm font-bold text-leaf-700">{msg.ok}</p>}
      {msg.bad && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{msg.bad}</p>}

      {showForm && (
        <form onSubmit={submit} className="mt-6 grid gap-4 rounded-[28px] border border-line bg-white p-6 shadow-card sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">Animal type
            <select value={form.animalType} onChange={set('animalType')} className={input}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <label className="text-sm font-bold text-ink">Name (optional)
            <input value={form.name} onChange={set('name')} maxLength={60} className={input} />
          </label>
          <label className="text-sm font-bold text-ink sm:col-span-2">Address / landmark where the animal is
            <input value={form.address} onChange={set('address')} maxLength={300} required className={input} placeholder="Street, area, city" />
          </label>
          <label className="text-sm font-bold text-ink sm:col-span-2">Describe the animal and its condition
            <textarea value={form.description} onChange={set('description')} maxLength={800} rows={3} className={input} />
          </label>
          <label className="text-sm font-bold text-ink">Contact phone (optional)
            <input value={form.contactPhone} onChange={set('contactPhone')} inputMode="tel" className={input} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50">
              <Upload className="h-4 w-4" /> {photo ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
            </label>
            <button type="button" onClick={useGps} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50">
              <MapPin className="h-4 w-4" /> {coords ? 'GPS added ✓' : 'Use my GPS'}
            </button>
          </div>
          {photo && (
            <div className="relative sm:col-span-2">
              <img src={URL.createObjectURL(photo)} alt="Preview of the animal" className="h-40 rounded-2xl object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute left-2 top-2 rounded-full bg-white p-1 shadow"><X className="h-4 w-4" /></button>
            </div>
          )}
          <button disabled={busy} className="rounded-full bg-leaf-600 px-6 py-3 font-bold text-white hover:bg-leaf-700 disabled:opacity-50 sm:col-span-2">{busy ? 'Submitting…' : 'Submit'}</button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {['All', ...TYPES].map((t) => (
          <button key={t} onClick={() => setFilter(t)} aria-pressed={filter === t}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${filter === t ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-muted hover:bg-canvas'}`}>{t}</button>
        ))}
      </div>

      {err && <p role="alert" className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{err}</p>}
      {!items && !err && <div className="mt-8"><Spinner label="Loading animals" /></div>}
      {items && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <article key={a.id} className="overflow-hidden rounded-[28px] border border-line bg-white shadow-card">
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={a.hasPhoto ? `${BASE}/adoption/${a.id}/photo` : (ANIMAL_PHOTOS[a.animalType] || ANIMAL_PHOTOS.Other)}
                  alt={`${a.animalType} ${a.name || ''}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = ANIMAL_PHOTOS[a.animalType] || ANIMAL_PHOTOS.Other;
                  }}
                />
                <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                  {a.animalType}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl font-semibold text-ink">{a.name || a.animalType}</h3>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[a.status] || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted"><strong>{a.animalType}</strong> · {a.address}</p>
                {a.description && <p className="mt-2 text-sm text-ink/90 line-clamp-3">{a.description}</p>}
                {a.lat && a.lng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-leaf-700 hover:underline"
                  >
                    📍 View exact GPS location on map
                  </a>
                )}
                {a.contactPhone && (
                  <a
                    href={`tel:${a.contactPhone}`}
                    className="mt-3 block w-full rounded-full border border-line py-2 text-center text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors"
                  >
                    {a.status === 'reported' ? '📞 Contact Reporter / Rescuer' : '🏡 Call to Adopt'}
                  </a>
                )}
              </div>
            </article>
          ))}
          {items.length === 0 && <p className="col-span-full rounded-2xl border border-line bg-white p-8 text-center text-muted">No animals listed yet. Use “Report / list an animal” to add one.</p>}
        </div>
      )}
    </div>
  );
}
