import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resqpaws',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(here, '../../uploads'),
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 10),
  confidenceThreshold: Math.min(0.95, Math.max(0.05, num(process.env.CONFIDENCE_THRESHOLD, 0.35))),
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  alertWebhook: process.env.ALERT_WEBHOOK_URL || '',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@resqpaws.demo').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  demoUserEmail: (process.env.DEMO_USER_EMAIL || 'user@resqpaws.demo').toLowerCase(),
  demoUserPassword: process.env.DEMO_USER_PASSWORD || 'User@12345'
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production. Add a long random value to your .env file.');
}
