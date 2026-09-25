import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { audioUpload } from '../middleware/upload.js';
import { AudioUpload } from '../models/AudioUpload.js';
import { Detection } from '../models/Detection.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';
import { parsePredictions, storeAudio } from '../services/audioUpload.js';
import { pickAnimal, describe, publicCatalog, analyseSoundMeaning } from '../services/animals.js';

const router = Router();
const analyzeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'You are analyzing very quickly. Please wait a minute.' } } });

export const shapeDetection = (d) => {
  const info = describe(d.animalKey);
  // Sound meaning: use the best matched label from ranked results
  const bestLabel = d.ranked?.[0]?.matchedLabel || null;
  const meaning = d.recognized ? analyseSoundMeaning(d.animalKey, bestLabel) : null;
  return {
    id: d._id,
    animalKey: d.animalKey,
    animalName: d.animalName,
    recognized: d.recognized,
    confidence: d.confidence,
    confidencePercent: Math.round(d.confidence * 100),
    threshold: d.threshold,
    scientific: d.recognized ? info.scientific : undefined,
    description: d.recognized ? info.description : undefined,
    funFact: d.recognized ? info.funFact : undefined,
    // Sound meaning analysis
    soundMeaning: meaning || undefined,
    ranked: d.ranked,
    topPredictions: d.topPredictions,
    model: d.model,
    timestamp: d.createdAt,
    upload: d.upload && d.upload._id ? {
      id: d.upload._id, originalName: d.upload.originalName, durationSec: d.upload.durationSec, source: d.upload.source, format: d.upload.format
    } : undefined
  };
};

router.get('/animals', (_req, res) => res.json({ animals: publicCatalog(), threshold: env.confidenceThreshold }));

router.post('/analyze', requireAuth, analyzeLimiter, audioUpload.single('audio'), asyncHandler(async (req, res) => {
  const predictions = parsePredictions(req.body.scores);
  const { upload } = await storeAudio(req, 'sound');
  const threshold = env.confidenceThreshold;
  const { top, ranked, recognized } = pickAnimal(predictions, threshold);

  const detection = await Detection.create({
    user: req.user._id,
    upload: upload._id,
    animalKey: recognized ? top.key : 'unknown',
    animalName: recognized ? top.name : 'Animal Not Recognized',
    confidence: top ? top.score : 0,
    recognized,
    threshold,
    // Store matchedLabel so sound-meaning analysis can use it later
    ranked: ranked.map(({ key, name, score, matchedLabel }) => ({ key, name, score, matchedLabel: matchedLabel || '' })),
    topPredictions: predictions.slice(0, 10)
  });
  await logActivity(req, recognized ? 'sound.detected' : 'sound.not_recognized', {
    entity: 'Detection', entityId: String(detection._id), meta: { animal: detection.animalName, confidence: detection.confidence }
  });

  const payload = shapeDetection({ ...detection.toObject(), upload });
  if (!recognized) {
    payload.message = 'Animal Not Recognized';
    payload.suggestion = top && top.score > 0
      ? `The highest match was "${top.name}" at ${Math.round(top.score * 100)}% — below the confidence threshold. Try uploading a clearer recording: move closer to the animal, reduce background noise, and record for at least 5 seconds.`
      : 'No animal sounds were detected. Try uploading a clearer recording: move closer to the animal, reduce background noise, and record for at least 5 seconds.';
  }
  res.status(201).json({ detection: payload });
}));

router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const { page, limit } = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }).parse(req.query);
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Detection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('upload', 'originalName durationSec source format').lean(),
    Detection.countDocuments(filter)
  ]);
  res.json({ items: items.map(shapeDetection), total, page, pages: Math.ceil(total / limit) });
}));

router.get('/audio/:id', requireAuth, asyncHandler(async (req, res) => {
  const upload = await AudioUpload.findById(req.params.id);
  if (!upload) throw new ApiError(404, 'Recording not found.', 'NOT_FOUND');
  if (String(upload.user) !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'You cannot access this recording.', 'FORBIDDEN');
  res.type(upload.mimeType);
  res.sendFile(path.join(env.uploadDir, upload.storedName), (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: { code: 'FILE_MISSING', message: 'The audio file is no longer available.' } });
  });
}));

router.delete('/history/:id', requireAuth, asyncHandler(async (req, res) => {
  const d = await Detection.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!d) throw new ApiError(404, 'Detection not found.', 'NOT_FOUND');
  await logActivity(req, 'sound.deleted', { entity: 'Detection', entityId: String(d._id) });
  res.json({ ok: true });
}));

export default router;
