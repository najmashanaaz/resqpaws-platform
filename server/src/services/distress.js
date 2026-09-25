import { allAnimalLabels } from './animals.js';

// Weighted label sets. Weights say how strongly a YAMNet class points to each emotional state.
const NORMAL = {
  Purr: 1, Meow: 0.7, Moo: 0.8, Cluck: 1, 'Chirp, tweet': 1, 'Bird vocalization, bird call, bird song': 1, Coo: 1,
  Oink: 0.8, 'Neigh, whinny': 0.6, 'Crowing, cock-a-doodle-doo': 0.9, 'Cattle, bovinae': 0.5, Dog: 0.4, Cat: 0.4,
  Bird: 0.6, 'Chicken, rooster': 0.5, Horse: 0.5, Goat: 0.4, Bleat: 0.4, 'Bow-wow': 0.5, Bark: 0.45, Quack: 0.8
};
const DISTRESS = {
  'Whimper (dog)': 1, Whimper: 1, Howl: 0.8, Caterwaul: 1, 'Wail, moan': 0.9, 'Crying, sobbing': 0.7, Groan: 0.7,
  Yip: 0.6, Squeal: 0.7, Screech: 0.6, Bleat: 0.35
};
const PAIN = { Squeal: 1, Screaming: 0.9, Yip: 0.8, 'Whimper (dog)': 0.7, Screech: 0.7, Groan: 0.6, Yell: 0.5 };
const AGGRESSIVE = { Growling: 1, Snarl: 1, Hiss: 0.9, Roar: 0.8, 'Roaring cats (lions, tigers)': 0.9, Bark: 0.35, Bellow: 0.6 };

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

function scoreSet(map, preds) {
  let score = 0;
  const hits = [];
  for (const p of preds) {
    const w = map[p.label];
    if (!w) continue;
    const v = w * p.score;
    if (v > score) score = v;
    if (v > 0.05) hits.push({ label: p.label, score: Number(v.toFixed(3)) });
  }
  return { score, hits };
}

const ACTIONS = {
  emergency:
    'Emergency: the animal may be in serious pain or danger. Keep a safe distance, keep it calm and quiet, and contact the nearest emergency vet or rescue team now. Do not give food, water or medicine.',
  aggressiveHigh:
    'Danger: the animal sounds very aggressive. Do not approach or touch it. Keep people and pets away and call animal control or a rescue team.',
  painMedium:
    'The animal may be in pain. Look for visible injury, limping or swelling from a safe distance. Book a vet visit today, or go now if the sounds continue.',
  distressMedium:
    'The animal seems stressed or uncomfortable. Check for heat, hunger, thirst, injury or other animals nearby. Contact a vet if the sounds continue for more than 30 minutes.',
  aggressiveMedium: 'The animal sounds defensive. Give it space, remove anything upsetting it, and avoid touching it.',
  normal: 'These sounds look normal. No action is needed. Keep listening if you are still worried.',
  unclear: 'We could not hear a clear animal sound. Record again closer to the animal, in a quieter place, for at least 5 seconds.'
};

export function analyzeDistress(predictions, features = null) {
  const sustain = features ? clamp(features.activeRatio) : 0.5;
  const loud = features ? clamp((features.peak - 0.25) / 0.6) : 0.5;

  const n = scoreSet(NORMAL, predictions);
  const d = scoreSet(DISTRESS, predictions);
  const p = scoreSet(PAIN, predictions);
  const a = scoreSet(AGGRESSIVE, predictions);

  const scores = {
    distress: clamp(d.score * (0.75 + 0.25 * sustain)),
    pain: clamp(p.score * (0.7 + 0.3 * loud)),
    aggressive: clamp(a.score * (0.7 + 0.3 * loud)),
    normal: 0
  };
  scores.normal = clamp(n.score * (1 - 0.5 * Math.max(scores.distress, scores.pain, scores.aggressive)));

  const labels = allAnimalLabels();
  let presence = 0;
  for (const pr of predictions) {
    if (labels.has(String(pr.label).toLowerCase()) || NORMAL[pr.label] || DISTRESS[pr.label] || PAIN[pr.label] || AGGRESSIVE[pr.label]) {
      presence = Math.max(presence, pr.score);
    }
  }

  const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v.toFixed(3))]));
  const reasons = [...d.hits, ...p.hits, ...a.hits, ...n.hits].sort((x, y) => y.score - x.score).slice(0, 5);

  if (presence < 0.12) {
    return {
      state: 'unclear', riskLevel: 'Low', confidence: Number(presence.toFixed(3)), scores: round(scores), emergency: false,
      recommendedAction: ACTIONS.unclear, alertStatus: 'none', alert: null, reasons
    };
  }

  const maxHarm = Math.max(scores.distress, scores.pain, scores.aggressive);
  const emergency =
    (scores.pain >= 0.55 && scores.distress >= 0.35) || (Math.max(scores.pain, scores.distress) >= 0.75 && sustain >= 0.5);

  let state;
  if (emergency) state = 'emergency';
  else if (maxHarm < 0.15) state = 'normal';
  else state = ['distress', 'pain', 'aggressive'].sort((x, y) => scores[y] - scores[x])[0];
  if (state !== 'emergency' && scores.normal > maxHarm && maxHarm < 0.3) state = 'normal';

  const riskLevel = emergency || maxHarm >= 0.6 ? 'High' : maxHarm >= 0.3 ? 'Medium' : 'Low';
  const confidence = state === 'normal' ? scores.normal : state === 'emergency' ? Math.max(scores.pain, scores.distress) : scores[state];

  let action;
  if (state === 'emergency') action = ACTIONS.emergency;
  else if (riskLevel === 'High' && state === 'aggressive') action = ACTIONS.aggressiveHigh;
  else if (riskLevel === 'High') action = ACTIONS.emergency;
  else if (state === 'pain') action = ACTIONS.painMedium;
  else if (state === 'distress') action = ACTIONS.distressMedium;
  else if (state === 'aggressive') action = ACTIONS.aggressiveMedium;
  else action = ACTIONS.normal;

  const alertStatus = riskLevel === 'High' ? 'active' : riskLevel === 'Medium' ? 'monitor' : 'none';
  const alert =
    riskLevel === 'High'
      ? {
          title: state === 'aggressive' ? 'High-risk: aggressive animal' : 'High-risk: animal in distress',
          message: action,
          steps: [
            'Stay at a safe distance and keep the animal calm and quiet.',
            'Call the nearest emergency vet or rescue centre.',
            'Share your exact location with the rescue team.',
            'Do not give food, water or medicine unless a vet tells you to.'
          ]
        }
      : null;

  return {
    state, riskLevel, confidence: Number(confidence.toFixed(3)), scores: round(scores), emergency,
    recommendedAction: action, alertStatus, alert, reasons
  };
}
