import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';
import { askGemini, askGeminiAboutSound } from '../services/gemini.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Please slow down a little and try again in a minute.' } }
});

/* ── Location schema (optional) ── */
const locationSchema = z.object({
  city:     z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  state:    z.string().max(100).optional(),
}).optional().nullable();

/* ── Main chat endpoint ── */
router.post('/', requireAuth, limiter, validate(z.object({
  message:  z.string().trim().min(1, 'Type a question').max(800),
  language: z.enum(['en', 'ta', 'hi', 'te', 'kn']).default('en'),
  history:  z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string().max(1500)
  })).max(12).default([]),
  location: locationSchema,
})), asyncHandler(async (req, res) => {
  const reply = await askGemini(req.valid.body);
  await logActivity(req, 'chat.message');
  res.json({ reply });
}));

/* ── Online/Offline status for the UI ── */
router.get('/status', (_req, res) => res.json({ online: Boolean(env.geminiKey) }));

/* ── Chat with a real photo (multipart): Gemini looks at the image ── */
const imgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_r, f, cb) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.mimetype)
    ? cb(null, true) : cb(new Error('Please attach a JPG, PNG or WEBP image.'))
});
router.post('/image', requireAuth, limiter, imgUpload.single('image'), asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 800) || 'Please look at this animal photo and tell me if anything looks wrong.';
  const language = ['en', 'ta', 'hi', 'te', 'kn'].includes(req.body.language) ? req.body.language : 'en';
  let history = []; let location = null;
  try { history = JSON.parse(req.body.history || '[]').slice(-10); } catch { /* ignore */ }
  try { location = JSON.parse(req.body.location || 'null'); } catch { /* ignore */ }
  const image = req.file ? { mimeType: req.file.mimetype, data: req.file.buffer.toString('base64') } : null;
  const reply = await askGemini({ message, history, language, location, image });
  await logActivity(req, 'chat.image');
  res.json({ reply });
}));

/* ── Sound-analysis ask endpoint ── */
router.post('/sound', requireAuth, limiter, validate(z.object({
  animal:     z.string().min(1).max(60),
  soundType:  z.string().max(100).optional(),
  confidence: z.number().min(0).max(100),
  language:   z.enum(['en', 'ta', 'hi', 'te', 'kn']).default('en'),
  location:   locationSchema,
})), asyncHandler(async (req, res) => {
  const reply = await askGeminiAboutSound(req.valid.body);
  await logActivity(req, 'chat.sound_analysis');
  res.json({ reply });
}));

export default router;
