import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Phone, Navigation2, Clock, Search } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { useI18n } from '../lib/i18n.jsx';

const TYPES = ['veterinary_hospital', 'animal_shelter', 'rescue_center', 'ngo', 'welfare_org'];
const COLORS = { veterinary_hospital: '#21689C', animal_shelter: '#267A59', rescue_center: '#C2410C', ngo: '#7C3AED', welfare_org: '#0F766E' };

const icon = (color) => L.divIcon({
  className: '', html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [26, 26], iconAnchor: [13, 13]
});
const userIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:50%;background:#DC2626;border:3px solid white;box-shadow:0 0 0 6px rgba(220,38,38,.25)"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 12, { duration: 0.8 }); }, [center, map]);
  return null;
}

export default function Support() {
  const { t } = useI18n();
  const [pos, setPos] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [regions, setRegions] = useState({ states: [] });
  const [filters, setFilters] = useState({ type: '', state: '', district: '', city: '', open24h: false, q: '' });
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const [active, setActive] = useState(null);

  useEffect(() => { api.get('/support/regions', { auth: false }).then(setRegions).catch(() => {}); }, []);

  const load = async (params) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const d = await api.get(`/support/nearby${qs(params)}`, { auth: false });
      setState({ items: d.items, loading: false, error: null });
    } catch (e) {
      setState({ items: [], loading: false, error: e });
    }
  };

  useEffect(() => {
    const params = { ...filters, open24h: filters.open24h ? 'true' : undefined };
    if (pos) { params.lat = pos.lat; params.lng = pos.lng; params.radiusKm = 60; }
    load(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pos]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return; }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoStatus('on'); },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const districts = useMemo(() => regions.states.find((s) => s.name === filters.state)?.districts || [], [regions, filters.state]);
  const cities = useMemo(() => districts.find((d) => d.name === filters.district)?.cities || [], [districts, filters.district]);
  const center = pos ? [pos.lat, pos.lng] : active ? [active.lat, active.lng] : [22.5, 79];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('support.title')}</h1>
      <p className="mt-1 text-muted">{t('support.subtitle')}</p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-[28px] border border-line bg-white p-4 shadow-card">
        <button onClick={useMyLocation} className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-leaf-600 px-4 text-sm font-bold text-white hover:bg-leaf-700">
          <MapPin className="h-4 w-4" /> {geoStatus === 'locating' ? t('support.locating') : t('support.useLocation')}
        </button>
        {geoStatus === 'denied' && <span className="text-sm text-amber-700">{t('support.locationDenied')}</span>}
        {geoStatus === 'on' && <span className="text-sm text-leaf-700">{t('support.locationOn')}</span>}

        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="min-h-[42px] rounded-xl border-2 border-line bg-canvas px-3 text-sm font-bold">
          <option value="">{t('support.allTypes')}</option>
          {TYPES.map((ty) => <option key={ty} value={ty}>{t(`type.${ty}`)}</option>)}
        </select>
        <select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value, district: '', city: '' })} className="min-h-[42px] rounded-xl border-2 border-line bg-canvas px-3 text-sm font-bold">
          <option value="">{t('support.state')}</option>
          {regions.states.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value, city: '' })} disabled={!filters.state} className="min-h-[42px] rounded-xl border-2 border-line bg-canvas px-3 text-sm font-bold disabled:opacity-50">
          <option value="">{t('support.district')}</option>
          {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} disabled={!filters.district} className="min-h-[42px] rounded-xl border-2 border-line bg-canvas px-3 text-sm font-bold disabled:opacity-50">
          <option value="">{t('support.city')}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-bold text-ink"><input type="checkbox" checked={filters.open24h} onChange={(e) => setFilters({ ...filters, open24h: e.target.checked })} className="h-4 w-4 accent-leaf-600" /> {t('support.open24h')}</label>
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border-2 border-line bg-canvas px-3">
          <Search className="h-4 w-4 text-muted" />
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder={t('support.search')} className="min-h-[42px] flex-1 bg-transparent text-sm outline-none" />
        </div>
        {(filters.type || filters.state || filters.q || filters.open24h) && (
          <button onClick={() => setFilters({ type: '', state: '', district: '', city: '', open24h: false, q: '' })} className="text-sm font-bold text-brand-700 hover:underline">{t('support.clear')}</button>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="overflow-hidden rounded-[28px] border border-line shadow-card lg:col-span-3" style={{ height: 520 }}>
          <MapContainer center={center} zoom={pos ? 12 : 5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FlyTo center={pos ? [pos.lat, pos.lng] : null} />
            {pos && <Marker position={[pos.lat, pos.lng]} icon={userIcon}><Popup>{t('support.yourLocation')}</Popup></Marker>}
            {state.items.map((c) => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={icon(COLORS[c.type])} eventHandlers={{ click: () => setActive(c) }}>
                <Popup>
                  <b>{c.name}</b><br />{c.address}<br />
                  {c.distanceKm !== undefined && <>{c.distanceKm} {t('common.km')}<br /></>}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer">{t('support.directions')}</a>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-bold text-muted">{t('support.results')} ({state.items.length})</p>
          <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1">
            {state.loading && <Spinner label={t('common.loading')} />}
            {state.error && <ErrorState error={state.error} onRetry={() => load(filters)} />}
            {!state.loading && !state.error && state.items.length === 0 && <p className="rounded-2xl border border-line bg-white p-6 text-center text-muted">{t('support.noResults')}</p>}
            {state.items.map((c) => (
              <article key={c.id} onClick={() => setActive(c)} className={`cursor-pointer rounded-[22px] border bg-white p-4 shadow-card transition-colors ${active?.id === c.id ? 'border-brand-500' : 'border-line'}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink">{c.name}</h3>
                  {c.distanceKm !== undefined && <span className="flex-none rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">{c.distanceKm} {t('common.km')}</span>}
                </div>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{t(`type.${c.type}`)}{c.isSample ? ` · ${t('support.sample')}` : ''}</p>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 flex-none" /> {c.address}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Clock className="h-4 w-4 flex-none" /> {c.open24h ? t('support.open24h') : c.openingHours}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 rounded-full bg-leaf-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-leaf-700"><Phone className="h-3.5 w-3.5" /> {t('support.call')}</a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50"><Navigation2 className="h-3.5 w-3.5" /> {t('support.directions')}</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
