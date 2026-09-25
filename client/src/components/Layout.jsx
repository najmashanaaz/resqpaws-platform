import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, LogOut, ShieldCheck, PawPrint, UserCircle } from 'lucide-react';
import Paw from './Paw.jsx';
import ClockWidget from './ClockWidget.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../lib/i18n.jsx';

const LINK   = 'rounded-full px-3 py-2 text-sm font-bold text-muted hover:bg-brand-50 hover:text-brand-700 transition-colors';
const ACTIVE = 'bg-brand-50 text-brand-700';

export default function Layout() {
  const [open,        setOpen]        = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();

  const firstName = user?.name?.split(' ')[0] || 'User';

  const items = [
    ['/home',               t('nav.home')],
    ['/my-dog',             'My Dog'],
    ['/chatbot',            'AI Chatbot'],
    ['/adoption',           'Adoption & Rescue'],
    ['/helpline',           'Helpline'],
    ['/sound-detection',    t('nav.sound')],
    ['/distress-detection', t('nav.distress')],
    ['/support',            t('nav.support')],
    ['/awareness',          'Awareness'],
    ['/dashboard',          t('nav.dashboard')],
  ];
  if (user?.role === 'admin') items.push(['/admin', t('nav.admin')]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    setShowProfile(false);
    nav('/welcome', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-card">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">

          {/* Logo */}
          <Link to="/home" className="mr-auto flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-600 text-white">
              <Paw className="h-5 w-5" />
            </span>
            ResQPaws
          </Link>

          <ClockWidget />
          <LanguageSwitcher />

          {/* ── Desktop user area ── */}
          {user ? (
            <div className="relative hidden items-center gap-2 md:flex">
              {user.role === 'admin' && (
                <ShieldCheck className="h-4 w-4 text-leaf-600" aria-label="Administrator" />
              )}

              {/* Welcome greeting */}
              <span className="text-sm font-bold text-ink">
                Welcome, {firstName}!
              </span>

              {/* Profile button */}
              <button
                onClick={() => setShowProfile((s) => !s)}
                className="grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-brand-50"
                aria-label="Profile"
                aria-expanded={showProfile}
              >
                <UserCircle className="h-5 w-5 text-brand-600" />
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-rose-50 hover:text-rose-600"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Profile dropdown */}
              {showProfile && (
                <div className="absolute right-0 top-12 z-50 min-w-[220px] rounded-2xl border border-line bg-white p-4 shadow-card">
                  <p className="font-bold text-ink">{user.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{user.email}</p>
                  {user.userId && (
                    <p className="mt-0.5 text-xs text-muted">ID: {user.userId}</p>
                  )}
                  {user.isGuest && (
                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      Guest session
                    </span>
                  )}
                  <hr className="my-3 border-line" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Not logged in at all → send to Welcome */
            <Link
              to="/welcome"
              className="hidden rounded-full bg-leaf-600 px-4 py-2 text-sm font-bold text-white hover:bg-leaf-700 md:block"
            >
              {t('nav.login')}
            </Link>
          )}

          {/* Hamburger */}
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-line md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mnav"
            aria-label="Open menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Desktop nav links */}
        <nav className="mx-auto hidden max-w-7xl flex-wrap gap-1 px-4 pb-2 md:flex" aria-label="Primary">
          {items.map(([to, label]) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => `${LINK} ${isActive ? ACTIVE : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav */}
        {open && (
          <nav id="mnav" className="border-t border-line px-4 py-3 md:hidden" aria-label="Primary">
            {/* User info strip */}
            {user && (
              <div className="mb-3 rounded-2xl bg-canvas px-4 py-3">
                <p className="font-bold text-ink">Welcome, {firstName}! 🐾</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
            )}
            <div className="grid gap-1">
              {items.map(([to, label]) => (
                <NavLink
                  key={to} to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `${LINK} block ${isActive ? ACTIVE : ''}`}
                >
                  {label}
                </NavLink>
              ))}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-2 rounded-full px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              ) : (
                <Link
                  to="/welcome"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-full bg-leaf-600 px-3 py-2 text-center text-sm font-bold text-white"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Click-outside to close profile dropdown */}
      {showProfile && (
        <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} aria-hidden="true" />
      )}

      <main id="main"><Outlet /></main>

      <footer className="mt-16 border-t border-line bg-[#123049] py-8 text-[#C9DDEC]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <PawPrint className="h-5 w-5" /> ResQPaws
          </div>
          <p className="text-sm">Copyright © {new Date().getFullYear()} ResQPaws. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
