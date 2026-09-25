// Runs Google's YAMNet audio-event classifier (TensorFlow.js) in the browser.
// YAMNet recognises 521 sound classes, including dog, cat, cow, goat, horse, bird and chicken sounds.
const LOCAL = import.meta.env.VITE_YAMNET_URL || '/models/yamnet/model.json';
const REMOTE = 'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1';
const CLASS_LOCAL = LOCAL.replace(/model\.json$/, 'yamnet_class_map.csv');
const CLASS_REMOTE = 'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv';

export class ModelError extends Error {}

let tfP; let modelP; let classP;

const getTf = () => (tfP ||= import('@tensorflow/tfjs').then(async (tf) => { await tf.ready(); return tf; }));

const getModel = () => (modelP ||= (async () => {
  const tf = await getTf();
  try {
    return await tf.loadGraphModel(LOCAL);
  } catch (e) {
    console.warn('Local model not found, trying TensorFlow Hub...', e?.message);
    return tf.loadGraphModel(REMOTE, { fromTFHub: true });
  }
})().catch((e) => {
  modelP = null;
  throw new ModelError('The AI model could not be loaded. Check your internet connection, or run "npm run setup:model" in the client folder.');
}));

function parseClassMap(text) {
  const names = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    const m = line.match(/^(\d+),([^,]*),(?:"([^"]*)"|(.*))$/);
    if (m) names[Number(m[1])] = (m[3] ?? m[4] ?? '').trim();
  }
  if (names.length < 500) throw new Error('bad class map');
  return names;
}

const getClasses = () => (classP ||= (async () => {
  for (const url of [CLASS_LOCAL, CLASS_REMOTE]) {
    try {
      const res = await fetch(url);
      if (res.ok) return parseClassMap(await res.text());
    } catch { /* try next */ }
  }
  throw new Error('class map unavailable');
})().catch(() => {
  classP = null;
  throw new ModelError('The AI class list could not be loaded. Check your internet connection, or run "npm run setup:model".');
}));

/** Warm up in the background so the first analysis feels faster. */
export const preloadModel = () => { getModel().catch(() => {}); getClasses().catch(() => {}); };

/**
 * samples: Float32Array, mono, 16 kHz.
 * Returns [{label, score}] sorted high to low. A class score is the mean of its 3 strongest frames,
 * which ignores silence but still rewards repeated calls.
 */
export async function classifyAudio(samples, onStatus = () => {}) {
  onStatus('loading-model');
  const [tf, model, classes] = await Promise.all([getTf(), getModel(), getClasses()]);
  onStatus('analyzing');
  const input = samples.length >= 16000 ? samples : Float32Array.from({ length: 16000 }, (_, i) => samples[i] || 0);
  const wave = tf.tensor1d(input);
  let outs;
  try {
    const out = model.predict(wave);
    outs = Array.isArray(out) ? out : [out];
  } finally {
    wave.dispose();
  }
  const frames = await outs[0].array();
  outs.forEach((t) => t.dispose());

  const n = classes.length;
  const k = Math.min(3, frames.length);
  const result = [];
  for (let c = 0; c < n; c++) {
    const col = frames.map((f) => f[c]).sort((a, b) => b - a);
    let s = 0;
    for (let i = 0; i < k; i++) s += col[i];
    result.push({ label: classes[c], score: s / k });
  }
  return result.sort((a, b) => b.score - a.score).slice(0, 40).map((r) => ({ label: r.label, score: Number(r.score.toFixed(4)) }));
}
