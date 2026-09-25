import { AlertTriangle, WifiOff } from 'lucide-react';

export default function ErrorState({ error, onRetry, className = '' }) {
  const isNetwork = error?.isNetwork || error?.code === 'NETWORK';
  return (
    <div className={`rounded-2xl border border-line bg-white p-6 text-center ${className}`} role="alert">
      {isNetwork ? <WifiOff className="mx-auto mb-2 h-8 w-8 text-amber-600" /> : <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-600" />}
      <p className="font-semibold text-ink">{isNetwork ? 'Connection problem' : 'Something went wrong'}</p>
      <p className="mt-1 text-sm text-muted">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700">
          Try again
        </button>
      )}
    </div>
  );
}
