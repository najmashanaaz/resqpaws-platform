import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { SupportCenter } from '../models/SupportCenter.js';
import { Detection } from '../models/Detection.js';
import { DistressReport } from '../models/DistressReport.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { AnimalListing } from '../models/AnimalListing.js';
import { buildSupportCenters, CITIES } from './supportCenters.js';

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const daysAgo = (d, hour = 10) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(hour, (d * 13) % 60, 0, 0); return x; };

async function upsertUser(name, email, password, role) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 11) });
}

export async function seedAll({ fresh = false } = {}) {
  if (fresh) {
    await Promise.all([
      Detection.deleteMany({ seeded: true }), DistressReport.deleteMany({ seeded: true }),
      SupportCenter.deleteMany({ isSample: true }), ActivityLog.deleteMany({ 'meta.seeded': true }),
      AnimalListing.deleteMany({ seeded: true })
    ]);
    console.log('Removed previous sample data');
  }

  const admin = await upsertUser('ResQPaws Admin', env.adminEmail, env.adminPassword, 'admin');
  const demo = await upsertUser('Demo User', env.demoUserEmail, env.demoUserPassword, 'user');

  // Clear any legacy fictional sample centers
  const fakeCount = await SupportCenter.countDocuments({ isSample: true });
  if (fakeCount > 0) {
    await SupportCenter.deleteMany({ isSample: true });
    console.log(`Removed ${fakeCount} legacy sample support centers`);
  }

  if ((await SupportCenter.countDocuments()) === 0) {
    await SupportCenter.insertMany(buildSupportCenters());
    console.log('Inserted verified real support centers');
  }
  await SupportCenter.syncIndexes();

  if ((await Detection.countDocuments({ seeded: true })) === 0) {
    const r = rng(7);
    const animals = [['dog', 'Dog'], ['cat', 'Cat'], ['cow', 'Cow'], ['goat', 'Goat'], ['horse', 'Horse'], ['bird', 'Bird'], ['chicken', 'Chicken']];
    const docs = [];
    for (let i = 0; i < 18; i++) {
      const [key, name] = animals[Math.floor(r() * animals.length)];
      const unrecognized = i % 9 === 4;
      const conf = unrecognized ? 0.12 + r() * 0.15 : 0.55 + r() * 0.42;
      docs.push({
        user: demo._id, seeded: true, animalKey: unrecognized ? 'unknown' : key, animalName: unrecognized ? 'Animal Not Recognized' : name,
        confidence: Number(conf.toFixed(3)), recognized: !unrecognized, threshold: env.confidenceThreshold,
        ranked: unrecognized ? [] : [{ key, name, score: Number(conf.toFixed(3)) }],
        topPredictions: [{ label: name, score: Number(conf.toFixed(3)) }], createdAt: daysAgo(Math.floor(i * 0.8), 8 + (i % 10))
      });
    }
    await Detection.insertMany(docs);
    console.log('Inserted sample detections');
  }

  if ((await DistressReport.countDocuments({ seeded: true })) === 0) {
    const at = (name) => { const c = CITIES.find((x) => x.city === name); return { type: 'Point', coordinates: [c.lng + 0.012, c.lat + 0.008] }; };
    const base = { seeded: true, user: demo._id, source: 'audio' };
    await DistressReport.insertMany([
      { ...base, animalGuess: 'Dog', state: 'emergency', riskLevel: 'High', confidence: 0.86, alertStatus: 'active', scores: { normal: 0.02, distress: 0.78, pain: 0.86, aggressive: 0.05 },
        recommendedAction: 'Emergency: the animal may be in serious pain or danger. Keep a safe distance and contact the nearest emergency vet or rescue team now.',
        location: at('Chennai'), locationText: 'Near the bus stand, Chennai', createdAt: daysAgo(0, 7) },
      { ...base, animalGuess: 'Cat', state: 'distress', riskLevel: 'High', confidence: 0.71, alertStatus: 'active', scores: { normal: 0.05, distress: 0.71, pain: 0.4, aggressive: 0.1 },
        recommendedAction: 'The animal may be in serious distress. Keep calm and contact a vet now.', location: at('Bengaluru'), locationText: 'Apartment car park, Bengaluru', createdAt: daysAgo(1, 19) },
      { ...base, animalGuess: 'Cow', state: 'pain', riskLevel: 'High', confidence: 0.66, alertStatus: 'acknowledged', scores: { normal: 0.1, distress: 0.4, pain: 0.66, aggressive: 0.05 },
        recommendedAction: 'The animal may be in pain. A volunteer has acknowledged this case.', location: at('Madurai'), locationText: 'Village road near the market, Madurai', adminNotes: 'Volunteer team contacted the owner.', createdAt: daysAgo(2, 9) },
      { ...base, animalGuess: 'Dog', state: 'aggressive', riskLevel: 'High', confidence: 0.74, alertStatus: 'resolved', scores: { normal: 0.05, distress: 0.1, pain: 0.05, aggressive: 0.74 },
        recommendedAction: 'Danger: keep your distance and call animal control.', location: at('Hyderabad'), locationText: 'Lane behind the school, Hyderabad', adminNotes: 'Animal control attended. Resolved.', createdAt: daysAgo(4, 16) },
      { ...base, animalGuess: 'Goat', state: 'distress', riskLevel: 'Medium', confidence: 0.45, alertStatus: 'monitor', scores: { normal: 0.2, distress: 0.45, pain: 0.1, aggressive: 0.02 },
        recommendedAction: 'The animal seems stressed. Check for heat, hunger or injury.', location: at('Coimbatore'), createdAt: daysAgo(3, 11) },
      { ...base, animalGuess: 'Horse', state: 'pain', riskLevel: 'Medium', confidence: 0.38, alertStatus: 'monitor', scores: { normal: 0.2, distress: 0.2, pain: 0.38, aggressive: 0.02 },
        recommendedAction: 'The animal may be in pain. Book a vet visit today.', createdAt: daysAgo(5, 14) },
      { ...base, animalGuess: 'Bird', state: 'normal', riskLevel: 'Low', confidence: 0.82, alertStatus: 'none', scores: { normal: 0.82, distress: 0.02, pain: 0.01, aggressive: 0 },
        recommendedAction: 'These sounds look normal. No action is needed.', createdAt: daysAgo(6, 8) },
      { ...base, source: 'manual', animalGuess: 'Dog', state: 'emergency', riskLevel: 'High', confidence: 0, alertStatus: 'dispatched', description: 'Puppy trapped in a storm drain, crying loudly.',
        recommendedAction: 'Reported as an emergency. A volunteer team has been dispatched.', location: at('Mumbai'), locationText: 'Storm drain near the station, Mumbai', adminNotes: 'Rescue team dispatched.', createdAt: daysAgo(1, 12) }
    ]);
    console.log('Inserted sample distress reports');
  }

  if ((await ActivityLog.countDocuments({ 'meta.seeded': true })) === 0) {
    await ActivityLog.insertMany([
      { user: demo._id, action: 'auth.login', meta: { seeded: true }, createdAt: daysAgo(0, 7) },
      { user: demo._id, action: 'sound.detected', meta: { seeded: true, animal: 'Dog' }, createdAt: daysAgo(0, 7) },
      { user: demo._id, action: 'distress.analyzed', meta: { seeded: true, risk: 'High' }, createdAt: daysAgo(0, 7) },
      { user: admin._id, action: 'auth.login', meta: { seeded: true }, createdAt: daysAgo(0, 9) }
    ]);
  }

  if ((await AnimalListing.countDocuments()) === 0) {
    const imgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/public/images/animals');
    const loadPhoto = (file) => {
      try {
        const full = path.join(imgDir, file);
        if (fs.existsSync(full)) {
          return { photo: { data: fs.readFileSync(full), contentType: 'image/jpeg' }, hasPhoto: true };
        }
      } catch { /* ignore */ }
      return { hasPhoto: false };
    };

    await AnimalListing.insertMany([
      { animalType: 'Dog', name: 'Brownie', description: 'Friendly 3-month-old indie puppy rescued from Anna Nagar. Vaccinated, dewormed, and loves playtime.', address: 'Anna Nagar, Chennai', contactPhone: '+91 98401 23456', status: 'available', ...loadPhoto('dog.jpg') },
      { animalType: 'Cat', name: 'Luna', description: 'Gentle calico kitten rescued from a warehouse. Very affectionate and litter-box trained.', address: 'Indiranagar, Bengaluru', contactPhone: '+91 98450 67890', status: 'available', ...loadPhoto('cat.jpg') },
      { animalType: 'Bird', name: 'Mithu', description: 'Rescued Indian ringneck parakeet undergoing care at sanctuary. Lively and playful.', address: 'Mylapore, Chennai', contactPhone: '+91 94440 55667', status: 'reported', ...loadPhoto('bird.jpg') },
      { animalType: 'Dog', name: 'Sheru', description: 'Adult golden indie dog found near highway, fully rehabilitated and ready for a loving farm or home.', address: 'Bandra West, Mumbai', contactPhone: '+91 98200 11223', status: 'available', ...loadPhoto('dog.jpg') },
      { animalType: 'Rabbit', name: 'Snowy', description: 'Healthy white bunny rescued from an abandoned crate. Energetic and friendly with gentle handlers.', address: 'Jubilee Hills, Hyderabad', contactPhone: '+91 98850 33445', status: 'adoption pending', ...loadPhoto('rabbit.jpg') },
      { animalType: 'Cow', name: 'Gauri', description: 'Gentle rescued young calf receiving nourishment and care at the animal gaushala.', address: 'T. Nagar, Chennai', contactPhone: '+91 98410 77889', status: 'available', ...loadPhoto('cow.jpg') },
    ]);
    console.log('Inserted sample animal listings with real photos');
  }
}

async function main() {
  await connectDb();
  await seedAll({ fresh: process.argv.includes('--fresh') });
  console.log('\nSeed complete.\n  Admin: %s / %s\n  Demo user: %s / %s\n', env.adminEmail, env.adminPassword, env.demoUserEmail, env.demoUserPassword);
  await mongoose.disconnect();
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  main().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
}
