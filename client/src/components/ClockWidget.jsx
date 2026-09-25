import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const two = (n) => String(n).padStart(2, '0');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ClockWidget({ compact = false }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h24 = now.getHours();
  const h12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const time = `${two(h12)}:${two(now.getMinutes())}:${two(now.getSeconds())} ${ampm}`;
  const date = `${two(now.getDate())}/${two(now.getMonth() + 1)}/${now.getFullYear()}`;
  const day  = DAYS[now.getDay()];

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-line bg-white/80 px-3 py-1.5 text-xs tabular-nums"
        aria-label={`${day}, ${date}, ${time}`}
      >
        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" aria-hidden="true" />
        <span className="font-mono font-bold text-ink">{time}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-line bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-sm"
      aria-label={`${day}, ${date}, ${time}`}
    >
      <Clock className="h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden="true" />
      {/* Day + date: hidden on very small screens */}
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="text-[11px] font-bold text-brand-700 leading-none">{day}</span>
        <span className="text-[11px] text-muted leading-none">{date}</span>
      </div>
      {/* Divider */}
      <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      {/* Time – always visible */}
      <span className="font-mono text-sm font-bold tabular-nums text-ink">{time}</span>
    </div>
  );
}
