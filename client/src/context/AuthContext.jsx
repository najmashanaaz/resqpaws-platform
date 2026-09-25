import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api.js';

const Ctx = createContext(null);

const GUEST_KEY = 'rp_welcome_user';   // single key used by api.js isGuestSession() too

const store = {
  get: (k, d)  => { try { const v = localStorage.getItem(k);  return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v)  => { try { localStorage.setItem(k,  JSON.stringify(v)); } catch { /* ignore */ } },
  del: (k)     => { try { localStorage.removeItem(k); }                 catch { /* ignore */ } },
};

function makeGuestUser(data) {
  return {
    _id:     'guest',
    name:    data.name,
    email:   data.email,
    userId:  data.userId,
    role:    'user',
    isGuest: true,
  };
}

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [ready, setReady] = useState(false);

  /* ── Restore session on mount ── */
  useEffect(() => {
    (async () => {
      // 1. Real JWT token → verify with server
      if (getToken()) {
        try {
          const d = await api.get('/auth/me');
          setUser(d.user);
          setReady(true);
          return;
        } catch {
          setToken(null); // token invalid/expired, fall through to guest check
        }
      }
      // 2. Guest session saved from Welcome page
      const saved = store.get(GUEST_KEY, null);
      if (saved?.name) {
        if (saved?.email) {
          try {
            const d = await api.post('/auth/quick', saved, { auth: false });
            setToken(d.token);
            setUser(d.user);
            setReady(true);
            return;
          } catch { /* fallback to guest user */ }
        }
        setUser(makeGuestUser(saved));
      }

      setReady(true);
    })();
  }, []);

  /* ── 401 handler — only fires for real JWT users, NOT guests ── */
  useEffect(() => {
    const onExpired = () => {
      // If still a guest (no token), do NOT clear their session
      if (!getToken()) return;
      setToken(null);
      setUser(null);
    };
    window.addEventListener('rp:unauthorized', onExpired);
    return () => window.removeEventListener('rp:unauthorized', onExpired);
  }, []);

  /* ── Full API login / register / quick ── */
  const authenticate = useCallback(async (mode, payload) => {
    const d = await api.post(`/auth/${mode}`, payload, { auth: false });
    setToken(d.token);
    store.del(GUEST_KEY); // promote from guest to real account
    setUser(d.user);
    return d.user;
  }, []);

  /* ── Set guest user (called by Welcome page) ── */
  const setGuestUser = useCallback(async (data) => {
    store.set(GUEST_KEY, data);
    try {
      const d = await api.post('/auth/quick', data, { auth: false });
      setToken(d.token);
      setUser(d.user);
      return d.user;
    } catch {
      const g = makeGuestUser(data);
      setUser(g);
      return g;
    }
  }, []);

  /* ── Logout ── */
  const logout = useCallback(() => {
    setToken(null);
    store.del(GUEST_KEY);
    store.del('rp_splash_seen');
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, ready,
    login:        (p) => authenticate('login',    p),
    register:     (p) => authenticate('register', p),
    quickLogin:   (p) => authenticate('quick',    p),
    logout,
    setGuestUser,
  }), [user, ready, authenticate, logout, setGuestUser]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
