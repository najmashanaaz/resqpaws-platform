export const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const fmtShort = (d) => (d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '');
export const fmtDuration = (s) => (s || s === 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '-');
export const pct = (x) => `${Math.round((x || 0) * 100)}%`;

const ACTIONS = {
  'auth.login': 'Logged in', 'auth.register': 'Created account', 'sound.detected': 'Detected an animal sound',
  'sound.not_recognized': 'Sound not recognized', 'sound.deleted': 'Deleted a detection', 'distress.analyzed': 'Analyzed a distress sound',
  'distress.reported': 'Submitted a distress report', 'distress.updated': 'Updated a distress case', 'alert.raised': 'High-risk alert raised',
  'support.created': 'Added a support center', 'support.updated': 'Edited a support center', 'support.deleted': 'Removed a support center',
  'chat.message': 'Asked the assistant'
};
export const actionLabel = (a) => ACTIONS[a] || a;
