import { Link } from 'react-router-dom';
import { Dog, HeartHandshake, Stethoscope, AudioLines, AlertTriangle, ArrowUpRight, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const CARDS = [
  { to: '/my-dog', icon: Dog, title: 'My Dog', desc: 'Manage pet profile, vaccinations, food, water and walk reminders.', tone: 'bg-brand-100 text-brand-700' },
  { to: '/adoption', icon: HeartHandshake, title: 'Adoption', desc: 'Find loving homes for rescued animals.', tone: 'bg-leaf-100 text-leaf-700' },
  { to: '/helpline', icon: Stethoscope, title: 'Helpline', desc: 'Locate nearby veterinary hospitals and emergency support.', tone: 'bg-brand-100 text-brand-700' },
  { to: '/sound-detection', icon: AudioLines, title: 'Animal Sound Detection', desc: 'Identify animals from recorded sounds.', tone: 'bg-leaf-100 text-leaf-700' },
  { to: '/distress-detection', icon: AlertTriangle, title: 'Distress Detection', desc: 'Check if an animal sound signals pain, fear or danger.', tone: 'bg-amber-100 text-amber-700' },
  { to: '/support', icon: MapPin, title: 'Regional Support', desc: 'Find NGOs, shelters and rescue centres near you.', tone: 'bg-brand-100 text-brand-700' }
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-100 to-canvas">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-none text-ink sm:text-6xl">
              {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome to ResQPaws'}
            </h1>
            <p className="mt-4 max-w-md text-xl text-muted">AI-Powered Animal Rescue, Care, and Adoption Platform</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? '/my-dog' : '/register'} className="rounded-full bg-leaf-600 px-6 py-3 font-bold text-white hover:bg-leaf-700">Get Started</Link>
              <Link to="/chatbot" className="rounded-full border-2 border-brand-500 bg-white px-6 py-3 font-bold text-brand-700 hover:bg-brand-50">Talk to AI Assistant</Link>
            </div>
          </div>
          <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
            {['🐶', '🐱', '🐦'].map((e) => (
              <div key={e} className="grid aspect-square place-items-center rounded-3xl bg-white text-6xl shadow-card">{e}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl font-semibold text-ink">Everything in one place</h2>
        <p className="mt-1 text-muted">Jump straight to the tools you need.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ to, icon: Icon, title, desc, tone }) => (
            <Link key={to} to={to} className="group relative flex flex-col gap-3 rounded-[28px] border border-line bg-white p-6 shadow-card transition-transform hover:-translate-y-1">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl ${tone}`}><Icon className="h-7 w-7" /></span>
              <span className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full bg-canvas text-muted transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
              <p className="text-muted">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
