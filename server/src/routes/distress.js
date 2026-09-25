import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { audioUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { DistressReport } from '../models/DistressReport.js';
import { asyncHandler } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';
import { parsePredictions, storeAudio } from '../services/audioUpload.js';
import { analyzeDistress } from '../services/distress.js';
import { pickAnimal } from '../services/animals.js';
import { notifyHighRisk } from '../services/notify.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many reports in a short time. Please wait a minute.' } } });

const coord = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  locationText: z.string().trim().max(200).optional()
});
const pointFrom = ({ lat, lng }) => (lat !== undefined && lng !== undefined ? { type: 'Point', coordinates: [lng, lat] } : undefined);

export const shapeReport = (r) => ({
  id: r._id,
  source: r.source,
  animalGuess: r.animalGuess,
  state: r.state,
  scores: r.scores,
  riskLevel: r.riskLevel,
  confidence: r.confidence,
  confidencePercent: Math.round((r.confidence || 0) * 100),
  recommendedAction: r.recommendedAction,
  alertStatus: r.alertStatus,
  description: r.description,
  locationText: r.locationText,
  location: r.location?.coordinates ? { lat: r.location.coordinates[1], lng: r.location.coordinates[0] } : undefined,
  adminNotes: r.adminNotes,
  timestamp: r.createdAt,
  uploadId: r.upload?._id || r.upload
});

router.post('/analyze', requireAuth, limiter, audioUpload.single('audio'), asyncHandler(async (req, res) => {
  const predictions = parsePredictions(req.body.scores);
  const where = coord.parse(req.body);
  const { upload, features } = await storeAudio(req, 'distress');

  const analysis = analyzeDistress(predictions, features);
  const animal = pickAnimal(predictions, 0.15);
  const report = await DistressReport.create({
    user: req.user._id,
    upload: upload._id,
    source: 'audio',
    animalGuess: animal.top ? animal.top.name : 'Unknown',
    state: analysis.state,
    scores: analysis.scores,
    riskLevel: analysis.riskLevel,
    confidence: analysis.confidence,
    recommendedAction: analysis.recommendedAction,
    alertStatus: analysis.alertStatus,
    location: pointFrom(where),
    locationText: where.locationText,
    features: features ? { rms: features.rms, peak: features.peak, activeRatio: features.activeRatio, durationSec: features.durationSec } : undefined
  });

  await logActivity(req, 'distress.analyzed', { entity: 'DistressReport', entityId: String(report._id), meta: { risk: report.riskLevel, state: report.state } });
  let notification = 'skipped';
  if (report.riskLevel === 'High') {
    notification = await notifyHighRisk(report, req.user);
    await logActivity(req, 'alert.raised', { entity: 'DistressReport', entityId: String(report._id), meta: { notification } });
  }

  res.status(201).json({
    report: shapeReport(report),
    alert: analysis.alert ? { ...analysis.alert, notification, threshold: env.confidenceThreshold } : null,
    reasons: analysis.reasons
  });
}));

const manualSchema = coord.extend({
  animal: z.string().trim().min(2, 'Which animal?').max(60),
  description: z.string().trim().min(10, 'Please describe what you see or hear (at least 10 characters)').max(1000),
  severity: z.enum(['Low', 'Medium', 'High'])
});

router.post('/report', requireAuth, limiter, validate(manualSchema), asyncHandler(async (req, res) => {
  const b = req.valid.body;
  const map = { High: ['emergency', 'active'], Medium: ['distress', 'monitor'], Low: ['normal', 'none'] };
  const [state, alertStatus] = map[b.severity];
  const report = await DistressReport.create({
    user: req.user._id, source: 'manual', animalGuess: b.animal, state, riskLevel: b.severity, alertStatus,
    description: b.description, locationText: b.locationText, location: pointFrom(b), confidence: 0,
    recommendedAction: b.severity === 'High'
      ? 'Reported as an emergency. A volunteer will review it. Meanwhile, keep the animal calm and contact the nearest vet.'
      : 'Your report was saved. A volunteer will review it.'
  });
  await logActivity(req, 'distress.reported', { entity: 'DistressReport', entityId: String(report._id), meta: { severity: b.severity } });
  const notification = b.severity === 'High' ? await notifyHighRisk(report, req.user) : 'skipped';
  res.status(201).json({ report: shapeReport(report), notification });
}));

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
  const items = await DistressReport.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ items: items.map(shapeReport) });
}));

export default router;
