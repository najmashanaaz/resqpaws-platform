import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Detection } from '../models/Detection.js';
import { DistressReport } from '../models/DistressReport.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/apiError.js';
import { shapeDetection } from './sounds.js';
import { shapeReport } from './distress.js';

const router = Router();

router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user._id;
  const [totals, byAnimal, timeline, recent, riskCounts, recentReports, activity] = await Promise.all([
    Detection.aggregate([
      { $match: { user } },
      { $group: { _id: null, total: { $sum: 1 }, recognized: { $sum: { $cond: ['$recognized', 1, 0] } },
        avgConfidence: { $avg: { $cond: ['$recognized', '$confidence', null] } } } }
    ]),
    Detection.aggregate([
      { $match: { user, recognized: true } },
      { $group: { _id: '$animalName', count: { $sum: 1 }, avgConfidence: { $avg: '$confidence' } } },
      { $sort: { count: -1 } }
    ]),
    Detection.find({ user }).sort({ createdAt: -1 }).limit(20).select('animalName confidence recognized createdAt').lean(),
    Detection.find({ user }).sort({ createdAt: -1 }).limit(6).populate('upload', 'originalName durationSec source format').lean(),
    DistressReport.aggregate([{ $match: { user } }, { $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
    DistressReport.find({ user }).sort({ createdAt: -1 }).limit(5).lean(),
    ActivityLog.find({ user }).sort({ createdAt: -1 }).limit(8).select('action createdAt meta').lean()
  ]);
  const t = totals[0] || { total: 0, recognized: 0, avgConfidence: 0 };
  res.json({
    totals: { detections: t.total, recognized: t.recognized, notRecognized: t.total - t.recognized, avgConfidence: t.avgConfidence || 0 },
    byAnimal: byAnimal.map((a) => ({ animal: a._id, count: a.count, avgConfidence: a.avgConfidence })),
    timeline: timeline.reverse().map((d) => ({ id: d._id, at: d.createdAt, animal: d.animalName, confidence: Math.round(d.confidence * 100), recognized: d.recognized })),
    recent: recent.map(shapeDetection),
    distress: { byRisk: Object.fromEntries(riskCounts.map((r) => [r._id, r.count])), recent: recentReports.map(shapeReport) },
    activity: activity.map((a) => ({ id: a._id, action: a.action, at: a.createdAt, meta: a.meta }))
  });
}));

export default router;
