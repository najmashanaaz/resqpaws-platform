const BASE = import.meta.env.VITE_API_URL || '/api';
export const TOKEN_KEY = 'rp_token';

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.status = status;
    this.code   = code;
    this.details = details;
  }
  get isNetwork() { return this.code === 'NETWORK'; }
}

export const getToken  = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken  = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

/* ── Is the current session a guest (no JWT)? ─────────────────────────────
   Guest users have no token. We never send an Authorization header for them
   and we NEVER fire rp:unauthorized (which would wipe their session).       */
export const isGuestSession = () => {
  try {
    const v = localStorage.getItem('rp_welcome_user');
    return !getToken() && !!v && !!JSON.parse(v)?.name;
  } catch { return false; }
};

async function request(path, { method = 'GET', body, form, auth = true, timeout = 30000, raw = false } = {}) {
  const headers = {};
  const token   = getToken();

  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const init = { method, headers };
  if (form)            init.body = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal });
  } catch (e) {
    throw new ApiError(
      e.name === 'AbortError'
        ? 'The server took too long to answer. Please try again.'
        : 'Cannot reach the server. Check your internet connection and try again.',
      { code: 'NETWORK' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch { /* not json */ }

    // Only fire the logout event for real token holders, NOT for guests.
    // Guests hitting a 401 just means the feature needs a real account —
    // we handle that gracefully in the feature component, not by wiping the session.
    if (res.status === 401 && auth && token && !isGuestSession()) {
      window.dispatchEvent(new Event('rp:unauthorized'));
    }

    throw new ApiError(
      data?.error?.message || `Something went wrong (error ${res.status}).`,
      { status: res.status, code: data?.error?.code, details: data?.error?.details }
    );
  }

  if (raw) return res;
  try { return await res.json(); } catch { return null; }
}

export const api = {
  get:    (p, o)    => request(p, o),
  post:   (p, b, o) => request(p, { ...o, method: 'POST',   body: b }),
  put:    (p, b, o) => request(p, { ...o, method: 'PUT',    body: b }),
  patch:  (p, b, o) => request(p, { ...o, method: 'PATCH',  body: b }),
  del:    (p, o)    => request(p, { ...o, method: 'DELETE' }),
  upload: (p, f, o) => request(p, { ...o, method: 'POST',   form: f, timeout: 60000 }),
  blob:   async (p) => (await request(p, { raw: true, timeout: 60000 })).blob(),
};

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
