import { Languages } from 'lucide-react';
import { LANGS, useI18n } from '../lib/i18n.jsx';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <label className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-sm font-bold text-ink sm:flex">
      <Languages className="h-4 w-4 text-brand-600" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-transparent outline-none">
        {Object.entries(LANGS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
    </label>
  );
}
