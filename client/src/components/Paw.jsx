export default function Paw({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="13" cy="29" rx="6" ry="8" transform="rotate(-22 13 29)" />
      <ellipse cx="25" cy="15" rx="6.5" ry="9" />
      <ellipse cx="40" cy="15" rx="6.5" ry="9" />
      <ellipse cx="52" cy="29" rx="6" ry="8" transform="rotate(22 52 29)" />
      <path d="M32 30c-9 0-17 8-17 16 0 6 5 9 10 8 3-1 5-2 7-2s4 1 7 2c5 1 10-2 10-8 0-8-8-16-17-16z" />
    </svg>
  );
}
