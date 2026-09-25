/**
 * Maps YAMNet / AudioSet class names → the animals ResQPaws supports.
 *
 * Bug-fix notes (dog detected as horse):
 *  - Removed 'Clip-clop' from horse labels — it matches footsteps/tapping, not horse sounds.
 *  - Removed 'Cowbell' from cow labels — it's a percussion instrument, not a cow sound.
 *  - Added label weights so ambiguous generic labels score lower than specific ones.
 *  - Added a minimum-score guard per animal so single weak frames don't win.
 *  - 'Animal', 'Domestic animals', 'Livestock' treated as generic only — they boost
 *    confidence in an already-winning animal but cannot win on their own.
 */

export const ANIMALS = {
  dog: {
    name: 'Dog',
    scientific: 'Canis lupus familiaris',
    description:
      'Dogs communicate with barks, howls, growls and whimpers. A steady bark often means alertness or excitement, while whimpering can signal discomfort or anxiety.',
    funFact: 'A dog can learn to recognise hundreds of distinct words.',
    // Specific labels first (weight 1.0), then more ambiguous ones (lower weight)
    labels: [
      { label: 'Dog',           weight: 1.0 },
      { label: 'Bark',          weight: 1.0 },
      { label: 'Bow-wow',       weight: 1.0 },
      { label: 'Yip',           weight: 0.9 },
      { label: 'Howl',          weight: 0.85 },
      { label: 'Growling',      weight: 0.8 },
      { label: 'Whimper (dog)', weight: 0.9 },
    ],
  },
  cat: {
    name: 'Cat',
    scientific: 'Felis catus',
    description:
      'Cats use meows mainly to communicate with people. Purring usually shows contentment, while hissing and caterwauling point to fear, stress or territorial behaviour.',
    funFact: 'Adult cats rarely meow at each other; the meow is mostly for humans.',
    labels: [
      { label: 'Cat',          weight: 1.0 },
      { label: 'Meow',         weight: 1.0 },
      { label: 'Purr',         weight: 1.0 },
      { label: 'Hiss',         weight: 0.85 },
      { label: 'Caterwaul',    weight: 0.9 },
    ],
  },
  cow: {
    name: 'Cow',
    scientific: 'Bos taurus',
    description:
      'Cows are gentle herd animals. Their low moos keep the herd in contact and can also mean hunger, calling for a calf, or discomfort.',
    funFact: 'Cows form close friendships and can become stressed when separated.',
    labels: [
      // 'Cowbell' REMOVED — it fires on percussion instruments, not cows
      { label: 'Cattle, bovinae', weight: 1.0 },
      { label: 'Moo',             weight: 1.0 },
    ],
  },
  goat: {
    name: 'Goat',
    scientific: 'Capra hircus',
    description:
      'Goats are curious, agile animals that bleat to call each other. Loud or repeated bleating can mean hunger, loneliness or distress.',
    funFact: 'Mother goats and kids recognise each other by voice.',
    labels: [
      { label: 'Goat',  weight: 1.0 },
      { label: 'Bleat', weight: 1.0 },
    ],
  },
  horse: {
    name: 'Horse',
    scientific: 'Equus ferus caballus',
    description:
      'Horses use neighs, whinnies and snorts to greet, call and warn. A sharp, repeated whinny may show separation anxiety or alarm.',
    funFact: 'A horse can sleep standing up.',
    labels: [
      // 'Clip-clop' REMOVED — it fires on footsteps/tapping, causing false positives
      { label: 'Horse',           weight: 1.0 },
      { label: 'Neigh, whinny',   weight: 1.0 },
      { label: 'Whinny',          weight: 1.0 },
    ],
  },
  bird: {
    name: 'Bird',
    scientific: 'Class Aves',
    description:
      'Birds sing and call to defend territory, attract mates and warn of danger. Sudden, harsh squawking can indicate fear or a threat nearby.',
    funFact: 'Some birds can learn and copy human speech.',
    labels: [
      { label: 'Bird vocalization, bird call, bird song', weight: 1.0 },
      { label: 'Chirp, tweet',  weight: 1.0 },
      { label: 'Squawk',        weight: 0.9 },
      { label: 'Pigeon, dove',  weight: 0.9 },
      { label: 'Coo',           weight: 0.85 },
      { label: 'Crow',          weight: 0.85 },
      { label: 'Caw',           weight: 0.85 },
      { label: 'Owl',           weight: 0.85 },
      { label: 'Hoot',          weight: 0.85 },
      // Generic 'Bird' label weighted lower to avoid matching background bird noise
      { label: 'Bird',          weight: 0.7 },
    ],
  },
  chicken: {
    name: 'Chicken',
    scientific: 'Gallus gallus domesticus',
    description:
      'Chickens cluck, cackle and crow. Soft clucking is contentment, a loud cackle often follows egg laying, and rapid alarm calls warn the flock of predators.',
    funFact: 'Hens start talking to their chicks before the eggs hatch.',
    labels: [
      { label: 'Chicken, rooster',           weight: 1.0 },
      { label: 'Cluck',                      weight: 1.0 },
      { label: 'Crowing, cock-a-doodle-doo', weight: 1.0 },
      { label: 'Fowl',                       weight: 0.8 },
    ],
  },
};

/* ── "Other" supported animals ── */
export const OTHER_LABELS = {
  'Pig': 'Pig', 'Oink': 'Pig',
  'Sheep': 'Sheep',
  'Duck': 'Duck', 'Quack': 'Duck',
  'Goose': 'Goose', 'Honk': 'Goose',
  'Turkey': 'Turkey', 'Gobble': 'Turkey',
  'Frog': 'Frog', 'Croak': 'Frog',
  'Rats, mice': 'Rodent', 'Mouse': 'Rodent',
  'Roaring cats (lions, tigers)': 'Big cat', 'Roar': 'Big cat',
  'Insect': 'Insect', 'Cricket': 'Cricket',
  'Snake': 'Snake',
  'Whale vocalization': 'Whale',
};

/* ── Generic parent classes that should NOT win on their own ── */
export const GENERIC_ANIMAL_LABELS = new Set([
  'animal', 'domestic animals, pets', 'livestock, farm animals, working animals', 'wild animals',
]);

/* ── Build lookup: lowercase label → { key, weight } ── */
const LABEL_MAP = new Map(); // label (lowercase) → { key, weight }
for (const [key, a] of Object.entries(ANIMALS)) {
  for (const { label, weight } of a.labels) {
    LABEL_MAP.set(label.toLowerCase(), { key, weight });
  }
}
for (const label of Object.keys(OTHER_LABELS)) {
  LABEL_MAP.set(label.toLowerCase(), { key: 'other', weight: 0.9 });
}

/**
 * Returns a Set of all known animal label strings (lowercase).
 * Used by distress.js to check whether a prediction belongs to any animal.
 */
export function allAnimalLabels() {
  return new Set([
    ...LABEL_MAP.keys(),
    ...GENERIC_ANIMAL_LABELS,
  ]);
}

export function publicCatalog() {
  return Object.entries(ANIMALS).map(([key, a]) => ({
    key, name: a.name, scientific: a.scientific, description: a.description, funFact: a.funFact,
  }));
}

/**
 * Pick the best animal from YAMNet predictions.
 *
 * Scoring: weighted_score = raw_score × label_weight
 *   - Uses the best weighted score per animal key across all matching labels.
 *   - Generic labels ('Animal', 'Domestic animals, pets') are ignored for ranking
 *     (they would make almost any recording match "something").
 *   - A result is only "recognized" when it clears the confidence threshold AND
 *     its weighted score is meaningfully higher than the runner-up (gap ≥ 0.05)
 *     to avoid reporting a guess when two animals score very close.
 *
 * @param {Array<{label:string, score:number}>} predictions
 * @param {number} threshold  – minimum weighted score to call it "recognized"
 * @returns {{ top, ranked, recognized }}
 */
export function pickAnimal(predictions, threshold) {
  const best = new Map(); // key → { score: weightedScore, label: string }

  for (const p of predictions) {
    const labelLow = String(p.label).toLowerCase();

    // Skip generic parent classes entirely
    if (GENERIC_ANIMAL_LABELS.has(labelLow)) continue;

    const entry = LABEL_MAP.get(labelLow);
    if (!entry) continue;

    const weightedScore = p.score * entry.weight;
    const cur = best.get(entry.key);
    if (!cur || weightedScore > cur.score) {
      best.set(entry.key, { score: weightedScore, label: p.label });
    }
  }

  const ranked = [...best.entries()]
    .map(([key, v]) => ({
      key,
      name: key === 'other'
        ? (OTHER_LABELS[v.label] || 'Other animal')
        : ANIMALS[key].name,
      score: Number(v.score.toFixed(4)),
      matchedLabel: v.label,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const top = ranked[0] || null;

  // Must clear threshold
  if (!top || top.score < threshold) {
    return { top, ranked, recognized: false };
  }

  // If runner-up exists and is very close (within 5%), don't guess
  const runnerUp = ranked[1];
  if (runnerUp && (top.score - runnerUp.score) < 0.05) {
    return { top, ranked, recognized: false };
  }

  return { top, ranked, recognized: true };
}

export const describe = (key) => ANIMALS[key] || {
  name: 'Other animal', scientific: 'Various',
  description: 'A different animal was detected. Try recording closer to the animal for a more specific result.',
  funFact: 'Many farm and wild animals use distinct calls to keep in touch.',
};

/* ── Sound meaning analysis ── */

const SOUND_MEANINGS = {
  dog: [
    { patterns: ['bark','bow-wow','yip'],       type: 'Barking',   meanings: ['Alertness or territorial warning','Excitement or seeking attention','Response to a stimulus (person, animal, noise)'], action: 'Check if something is triggering the dog. Ensure it is safe and not in distress.' },
    { patterns: ['howl'],                        type: 'Howling',   meanings: ['Loneliness or separation anxiety','Response to distant sounds (sirens, other dogs)','Communication with the pack'], action: 'Check if the dog has been alone for long. Spend time with it or provide enrichment.' },
    { patterns: ['growl','growling'],            type: 'Growling',  meanings: ['Warning sign — possible fear or aggression','Pain or discomfort','Territorial behaviour'], action: 'Do not approach the animal suddenly. Give it space and check for injuries calmly.' },
    { patterns: ['whimper','whimper (dog)'],     type: 'Whimpering',meanings: ['Possible hunger or thirst','Pain or physical discomfort','Fear or anxiety','Seeking attention'], action: 'Check food, water and for visible injuries. If whimpering persists, consult a vet.' },
  ],
  cat: [
    { patterns: ['meow'],    type: 'Meowing',  meanings: ['Seeking food or water','Requesting attention','Stress or disorientation (especially in older cats)'], action: 'Check if the cat has food and water. Rule out illness if meowing is unusual or excessive.' },
    { patterns: ['purr'],    type: 'Purring',  meanings: ['Generally contentment and relaxation','May also indicate self-soothing during illness or stress'], action: 'Monitor for other signs of illness if the cat seems unwell despite purring.' },
    { patterns: ['hiss','caterwaul'], type: 'Hissing / Caterwauling', meanings: ['Fear or feeling threatened','Territorial dispute with another animal','Pain'], action: 'Give the cat space. Check for other animals nearby. Consult a vet if repeated.' },
  ],
  cow: [
    { patterns: ['moo','cattle, bovinae'], type: 'Mooing', meanings: ['Calling for a calf or herd member','Hunger or thirst','Discomfort or distress'], action: 'Check if the animal has access to food and water. Ensure the herd is together.' },
  ],
  goat: [
    { patterns: ['bleat','goat'], type: 'Bleating', meanings: ['Hunger or thirst','Separation from herd or kid','Distress or fear'], action: 'Check if the goat has feed and water. Ensure it is not isolated from its group.' },
  ],
  horse: [
    { patterns: ['neigh, whinny','whinny','horse'], type: 'Neighing / Whinnying', meanings: ['Greeting or calling another horse','Separation anxiety','Alarm or excitement'], action: 'Check if the horse can see or reach other horses. Ensure it is not injured or trapped.' },
  ],
  bird: [
    { patterns: ['squawk','bird vocalization, bird call, bird song','chirp, tweet'],
      type: 'Bird call', meanings: ['Territory or mating call (normal)','Alarm call — possible predator nearby','Distress if repetitive and harsh'], action: 'Observe the bird from a distance. If injured or grounded, contact a local wildlife rescuer.' },
  ],
  chicken: [
    { patterns: ['cluck','crowing, cock-a-doodle-doo','chicken, rooster','fowl'],
      type: 'Chicken call', meanings: ['Contentment clucking (normal)','Alarm call — predator or threat detected','Rooster crowing (time or territory)'], action: 'Check the coop for predators or disturbances. Ensure the birds have food and water.' },
  ],
};

/**
 * Analyse what a detected sound may mean.
 * Returns { type, meanings, action } or null if no match.
 */
export function analyseSoundMeaning(animalKey, matchedLabel) {
  const entries = SOUND_MEANINGS[animalKey];
  if (!entries || !matchedLabel) return null;
  const lbl = matchedLabel.toLowerCase();
  for (const entry of entries) {
    if (entry.patterns.some((p) => lbl.includes(p) || p.includes(lbl))) {
      return { type: entry.type, meanings: entry.meanings, action: entry.action };
    }
  }
  // Fallback: return first entry for the animal
  return entries[0]
    ? { type: entries[0].type, meanings: entries[0].meanings, action: entries[0].action }
    : null;
}
