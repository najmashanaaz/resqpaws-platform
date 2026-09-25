// Downloads the YAMNet audio-classification model (Google, Apache-2.0) so the app runs without depending on TF Hub at runtime.
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('public/models/yamnet');
const BASE = 'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1/';
const CLASSES = 'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv';

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

async function first(urls) {
  let last;
  for (const u of urls) {
    try { return await get(u); } catch (e) { last = e; }
  }
  throw last;
}

try {
  await fs.mkdir(OUT, { recursive: true });
  console.log('Downloading model.json ...');
  const mres = await first([`${BASE}model.json?tfjs-format=file`, `${BASE}model.json`]);
  const finalUrl = mres.url;
  const model = JSON.parse(await mres.text());
  await fs.writeFile(path.join(OUT, 'model.json'), JSON.stringify(model));

  const shards = model.weightsManifest.flatMap((g) => g.paths);
  for (const [i, p] of shards.entries()) {
    console.log(`Downloading weights ${i + 1}/${shards.length} (${p}) ...`);
    const r = await first([new URL(p, finalUrl).href, `${BASE}${p}?tfjs-format=file`, `${BASE}${p}`]);
    await fs.writeFile(path.join(OUT, p), Buffer.from(await r.arrayBuffer()));
  }

  console.log('Downloading class names ...');
  await fs.writeFile(path.join(OUT, 'yamnet_class_map.csv'), await (await get(CLASSES)).text());
  console.log(`\nDone. Model saved in ${OUT}`);
} catch (err) {
  console.error('\nCould not download the model automatically:', err.message);
  console.error('The app will still try to load YAMNet from TensorFlow Hub in the browser (needs internet).');
  console.error('To download it manually, get the "tfjs" YAMNet files from https://www.kaggle.com/models/google/yamnet and place them in public/models/yamnet/');
  process.exit(1);
}
