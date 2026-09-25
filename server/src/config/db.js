import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);

  // Try the configured URI first (real MongoDB / Atlas)
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected:', env.mongoUri);
    return;
  } catch (err) {
    console.warn('⚠️  Could not connect to configured MongoDB URI:', err.message);
    console.warn('   Falling back to in-memory MongoDB (data resets on restart)...');
  }

  // Fallback: spin up an embedded in-memory MongoDB instance
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ In-memory MongoDB started at:', uri);
    console.log('   ℹ️  Data will NOT persist between restarts.');
    console.log('   ℹ️  To persist data, set MONGODB_URI in server/.env to a real MongoDB or Atlas URI.');

    // Clean up when process exits
    process.on('beforeExit', async () => { await mongod.stop(); });
    process.on('SIGINT',      async () => { await mongod.stop(); process.exit(0); });
  } catch (e) {
    console.error('❌ Failed to start in-memory MongoDB:', e.message);
    process.exit(1);
  }
}
