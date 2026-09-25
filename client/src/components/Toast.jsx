import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const Ctx = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES = { success: 'bg-leaf-600', error: 'bg-rose-600', info: 'bg-brand-600' };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const remove = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'info', ms = 4500) => {
    const id = ++idRef.current;
    setItems((xs) => [...xs, { id, message, type }]);
    setTimeout(() => remove(id), ms);
  }, [remove]);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((it) => {
          const Icon = ICONS[it.type];
          return (
            <div key={it.id} className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg animate-rise ${STYLES[it.type]}`}>
              <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span>{it.message}</span>
              <button onClick={() => remove(it.id)} aria-label="Dismiss" className="ml-1 opacity-80 hover:opacity-100"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
