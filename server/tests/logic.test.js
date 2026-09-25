import test from 'node:test';
import assert from 'node:assert/strict';
import { pickAnimal } from '../src/services/animals.js';
import { analyzeDistress } from '../src/services/distress.js';
import { detectAudioType, parseWav, wavFeatures } from '../src/services/audio.js';
import { buildSupportCenters } from '../src/seed/supportCenters.js';

function makeWav({ seconds = 1, rate = 16000, amp = 0.5, freq = 440, truncate = 0 } = {}) {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * amp * 32767), 44 + i * 2);
  return truncate ? buf.subarray(0, truncate) : buf;
}

test('pickAnimal recognises a dog bark', () => {
  const r = pickAnimal([{ label: 'Speech', score: 0.1 }, { label: 'Bark', score: 0.91 }, { label: 'Meow', score: 0.05 }], 0.35);
  assert.equal(r.recognized, true);
  assert.equal(r.top.key, 'dog');
});

test('pickAnimal maps goat, horse, cow and chicken labels', () => {
  assert.equal(pickAnimal([{ label: 'Bleat', score: 0.8 }], 0.35).top.key, 'goat');
  assert.equal(pickAnimal([{ label: 'Neigh, whinny', score: 0.8 }], 0.35).top.key, 'horse');
  assert.equal(pickAnimal([{ label: 'Moo', score: 0.8 }], 0.35).top.key, 'cow');
  assert.equal(pickAnimal([{ label: 'Cluck', score: 0.8 }], 0.35).top.key, 'chicken');
});

test('pickAnimal names the "other" animal', () => {
  const r = pickAnimal([{ label: 'Oink', score: 0.7 }], 0.35);
  assert.equal(r.top.key, 'other');
  assert.equal(r.top.name, 'Pig');
});

test('low confidence and non-animal sounds are not recognised', () => {
  assert.equal(pickAnimal([{ label: 'Bark', score: 0.2 }], 0.35).recognized, false);
  assert.equal(pickAnimal([{ label: 'Speech', score: 0.95 }, { label: 'Music', score: 0.5 }], 0.35).recognized, false);
});

test('distress engine flags loud pain sounds as high risk', () => {
  const r = analyzeDistress([{ label: 'Whimper (dog)', score: 0.85 }, { label: 'Squeal', score: 0.7 }, { label: 'Dog', score: 0.6 }], { peak: 0.9, activeRatio: 0.8, rms: 0.2 });
  assert.equal(r.riskLevel, 'High');
  assert.equal(r.alertStatus, 'active');
  assert.ok(r.alert && r.alert.steps.length >= 3);
});

test('distress engine treats purring as normal / low risk', () => {
  const r = analyzeDistress([{ label: 'Purr', score: 0.9 }, { label: 'Cat', score: 0.8 }], { peak: 0.3, activeRatio: 0.6, rms: 0.05 });
  assert.equal(r.riskLevel, 'Low');
  assert.equal(r.state, 'normal');
  assert.equal(r.alert, null);
});

test('distress engine reports unclear when no animal is heard', () => {
  const r = analyzeDistress([{ label: 'Speech', score: 0.9 }], null);
  assert.equal(r.state, 'unclear');
});

test('growling is aggressive', () => {
  const r = analyzeDistress([{ label: 'Growling', score: 0.9 }, { label: 'Dog', score: 0.8 }], { peak: 0.8, activeRatio: 0.7, rms: 0.1 });
  assert.equal(r.state, 'aggressive');
});

test('detectAudioType checks real bytes', () => {
  assert.equal(detectAudioType(makeWav()), 'wav');
  assert.equal(detectAudioType(Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00', 'binary')), 'mp3');
  assert.equal(detectAudioType(Buffer.from('this is definitely not audio data')), null);
});

test('parseWav reads duration and features', () => {
  const buf = makeWav({ seconds: 2, amp: 0.6 });
  const info = parseWav(buf);
  assert.equal(info.sampleRate, 16000);
  assert.ok(Math.abs(info.durationSec - 2) < 0.01);
  const f = wavFeatures(buf, info);
  assert.ok(f.peak > 0.55 && f.peak < 0.65);
  assert.ok(f.activeRatio > 0.9);
});

test('corrupted or truncated WAV is rejected', () => {
  assert.throws(() => parseWav(makeWav({ truncate: 30 })), (e) => e.code === 'CORRUPTED_AUDIO');
  assert.throws(() => parseWav(makeWav({ seconds: 0.1 })), (e) => e.code === 'TOO_SHORT');
});

test('sample support centers have valid coordinates and all types', () => {
  const list = buildSupportCenters();
  assert.ok(list.length > 60);
  const types = new Set(list.map((c) => c.type));
  assert.equal(types.size, 5);
  for (const c of list) {
    const [lng, lat] = c.location.coordinates;
    assert.ok(Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
    assert.match(c.phone, /^[+()\d\s-]{6,20}$/);
  }
});
