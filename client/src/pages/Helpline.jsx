import { useState } from 'react';
import { Phone, MapPin, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';
import { HELPLINES } from '../config/helplines.js';

const FAQ = [
  { q: 'Heavy bleeding', a: 'Press a clean cloth firmly on the wound. If it soaks through, add more cloth on top instead of removing it, and get to a vet quickly.' },
  { q: 'Heatstroke', a: 'Move the animal to shade, offer small sips of cool water, and wet the body with cool (not ice-cold) water. Go to a vet right away.' },
  { q: 'Suspected poisoning', a: "Don't try to make the animal vomit unless a vet tells you to. Keep the packaging or a sample, and call a vet immediately." }
];

export default function Helpline() {
  const [vets, setVets] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [city, setCity] = useState('');
  const [userCoords, setUserCoords] = useState(null);

  const fetchVets = async (params) => {
    setBusy(true); setErr('');
    try {
      const d = await api.get(`/support/nearby${qs({ helpline: 'true', limit: 8, ...params })}`, { auth: false });
      setVets(d.items);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const locate = () => {
    if (!navigator.geolocation) return setErr('GPS is not supported here. Enter your city below.');
    setBusy(true); setErr('');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserCoords(coords);
        fetchVets({ ...coords, radiusKm: 100 });
      },
      () => { setBusy(false); setErr('Location permission denied. Enter your city below instead.'); },
      { enableHighAccuracy: true, timeout: 10000 });
  };

  const googleMapsUrl = userCoords
    ? `https://www.google.com/maps/search/veterinary+hospitals+and+blue+cross+centres/@${userCoords.lat},${userCoords.lng},13z`
    : city.trim()
      ? `https://www.google.com/maps/search/veterinary+hospitals+and+blue+cross+centres+in+${encodeURIComponent(city.trim())}`
      : 'https://www.google.com/maps/search/veterinary+hospitals+and+blue+cross+centres';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Helpline</h1>
      <p className="mt-1 text-muted">Call for help, find nearby veterinary hospitals and get first-aid guidance on the way.</p>

      <div className="mt-6 rounded-[28px] border border-line bg-white p-6 shadow-card">
        <h2 className="mb-3 font-display text-xl font-semibold text-ink">General helplines</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {HELPLINES.map((h) => (
            <li key={h.name} className="rounded-2xl border border-line bg-canvas p-4">
              <p className="font-bold text-ink">{h.name}</p>
              {h.phone
                ? <a href={`tel:${h.phone}`} className="mt-1 inline-flex items-center gap-1 font-bold text-brand-700"><Phone className="h-4 w-4" />{h.phone}</a>
                : <p className="mt-1 text-xs text-muted">{h.note}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-[28px] bg-amber-50 p-6">
        <h2 className="font-display text-xl font-semibold text-amber-800">Nearby vet hospitals</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={locate} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 font-bold text-white hover:bg-rose-700 disabled:opacity-50"><MapPin className="h-4 w-4" /> Use my location</button>
          <form onSubmit={(e) => { e.preventDefault(); if (city.trim()) fetchVets({ city: city.trim() }); }} className="flex gap-2">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Or type your city" className="min-h-[42px] rounded-full border-2 border-line bg-white px-4 text-sm outline-none focus:border-brand-500" />
            <button className="rounded-full border border-amber-300 px-4 text-sm font-bold text-amber-800">Search</button>
          </form>
          <a target="_blank" rel="noreferrer" href={googleMapsUrl} className="ml-auto self-center text-sm font-bold text-amber-800 underline">Open full map</a>
        </div>
        {err && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{err}</p>}
        {busy && <div className="mt-3"><Spinner label="Finding vets" /></div>}
        {vets && !busy && (
          <ul className="mt-4 grid gap-3">
            {vets.length === 0 && <li className="rounded-2xl bg-white p-4 text-sm text-muted">No vet hospitals found. Try a bigger city or open the full map.</li>}
            {vets.map((v) => (
              <li key={v.id} className="rounded-2xl bg-white p-4">
                <p className="font-bold text-ink">{v.name}{v.distanceKm !== undefined && <span className="ml-2 text-xs font-bold text-muted">{v.distanceKm} km</span>}</p>
                <p className="text-sm text-muted">{v.address}{v.open24h ? ' · Open 24h' : ''}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {v.phone && <a href={`tel:${v.phone}`} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm font-bold text-brand-700"><Phone className="h-3.5 w-3.5" />Call</a>}
                  <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm font-bold text-brand-700"><Navigation className="h-3.5 w-3.5" />Directions</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-[28px] border border-line bg-white p-6 shadow-card">
        <h2 className="mb-3 font-display text-xl font-semibold text-ink">First aid on the way</h2>
        <div className="grid gap-2">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl border border-line bg-canvas p-4">
              <summary className="cursor-pointer font-bold text-ink">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
