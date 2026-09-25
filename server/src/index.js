import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

/* Auto-seed when DB is empty (covers in-memory MongoDB restarts) */
async function autoSeed() {
  try {
    const { SupportCenter } = await import('./models/SupportCenter.js');
    const count = await SupportCenter.countDocuments({ isSample: true });
    if (count > 0) return; // already seeded

    console.log('📦 Database is empty — running auto-seed...');
    const { seedAll } = await import('./seed/seed.js');
    await seedAll();
    console.log('✅ Auto-seed complete. Support centres, sample records, admin and demo user created.');
  } catch (e) {
    console.warn('⚠️  Auto-seed failed (non-fatal):', e.message);
  }
}

async function main() {
  await connectDb();
  await autoSeed();
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`ResQPaws API running on http://localhost:${env.port}`));
  const stop = async (sig) => {
    console.log(`${sig} received, shutting down`);
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason?.message || reason);
});

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
