import { useState } from 'react';
import { Heart, Syringe, Scale, Shield, Ambulance, HandHeart, Siren, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { icon: Heart, title: 'Responsible Pet Care', tip: 'Feed on a regular schedule, give fresh water daily, and schedule an annual vet check-up even if your pet looks healthy.',
    body: 'Responsible pet care means meeting your pet\'s physical and emotional needs every day: balanced food, clean water, regular exercise, grooming, and love. Spaying or neutering prevents unwanted litters and reduces some health risks.' },
  { icon: Syringe, title: 'Vaccination Awareness', tip: 'Puppies and kittens need a series of core vaccines starting around 6–8 weeks, with boosters every 3–4 weeks until 16 weeks.',
    body: 'Vaccines protect pets from serious, sometimes fatal diseases like rabies, distemper and parvovirus. Keep a written vaccination record and set reminders for boosters — this app can do that for you under My Dog.' },
  { icon: Scale, title: 'Animal Rights', tip: 'Animals deserve freedom from hunger, discomfort, pain, fear and the ability to express normal behaviour.',
    body: 'Animal welfare laws exist to prevent cruelty and neglect. If you witness abuse, document it safely and report it to local authorities or an animal welfare organization.' },
  { icon: Shield, title: 'Street Animal Safety', tip: 'Approach street animals slowly, avoid sudden movements, and never corner a frightened animal.',
    body: 'Street animals may be wary of people. Offer food from a distance first, avoid direct eye contact which can seem threatening, and never chase an injured animal — this can cause more harm.' },
  { icon: Ambulance, title: 'Rescue Guidelines', tip: 'Keep your distance from an injured or aggressive animal and call a professional rescue team.',
    body: 'When rescuing an animal, prioritise your own safety first. Use a blanket or box for small animals, avoid direct contact with an animal in pain, and transport gently to the nearest vet or shelter.' },
  { icon: HandHeart, title: 'Adoption Awareness', tip: 'Adopting saves a life and reduces shelter overcrowding — consider adoption before buying from a breeder.',
    body: 'Before adopting, think about your living space, time commitment, and budget for food and healthcare. Meet the animal a few times before finalising, and prepare your home in advance.' },
  { icon: Siren, title: 'Emergency Animal Care', tip: 'Keep a pet first-aid kit at home: gauze, saline solution, a muzzle, and your vet\'s number.',
    body: 'In an emergency — poisoning, choking, heavy bleeding, or hit by a vehicle — stay calm, keep the animal still and warm, and get to a vet immediately. Never give human medication to animals.' }
];

const STORIES = [
  { name: 'Raja', text: 'Found abandoned on a highway with a broken leg, Raja was treated and adopted within two months by a loving family in Chennai.' },
  { name: 'Meena', text: 'Rescued from a flooded drain during monsoon season, Meena the kitten now lives happily with three other cats in Bengaluru.' },
  { name: 'Tommy', text: 'A volunteer noticed Tommy limping near a market. After surgery and months of care, he was adopted by the volunteer himself.' }
];

export default function Awareness() {
  const [open, setOpen] = useState(null);
  const dayTip = CATEGORIES[new Date().getDate() % CATEGORIES.length].tip;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Animal Awareness</h1>
      <p className="mt-1 text-muted">Learn about responsible pet care, rescue and adoption.</p>

      <div className="mt-6 rounded-[28px] bg-leaf-50 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-leaf-700">Today's tip</p>
        <p className="mt-1 text-lg font-semibold text-ink">{dayTip}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((c, i) => {
          const Icon = c.icon;
          const isOpen = open === i;
          return (
            <div key={c.title} className="rounded-[24px] border border-line bg-white p-5 shadow-card">
              <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center gap-3 text-left" aria-expanded={isOpen}>
                <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-brand-100 text-brand-700"><Icon className="h-5 w-5" /></span>
                <span className="flex-1 font-display text-lg font-semibold text-ink">{c.title}</span>
                <ChevronDown className={`h-5 w-5 flex-none text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <p className="mt-3 text-sm text-muted">{c.body}</p>}
            </div>
          );
        })}
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">Featured rescue stories</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        {STORIES.map((s) => (
          <div key={s.name} className="rounded-[24px] border border-line bg-white p-5 shadow-card">
            <p className="font-display text-lg font-semibold text-ink">{s.name}</p>
            <p className="mt-2 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
