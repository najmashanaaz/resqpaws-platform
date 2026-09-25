import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { DistressReport } from '../models/DistressReport.js';
import { Detection } from '../models/Detection.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { SupportCenter } from '../models/SupportCenter.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';
import { shapeReport } from './distress.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const shapeAdmin = (r) => ({ ...shapeReport(r), reporter: r.user && r.user.name ? { id: r.user._id, name: r.user.name, email: r.user.email } : undefined });

router.get('/stats', asyncHandler(async (_req, res) => {
  const [reports, activeAlerts, byRisk, users, detections, centers] = await Promise.all([
    DistressReport.countDocuments(),
    DistressReport.countDocuments({ alertStatus: { $in: ['active', 'acknowledged', 'dispatched'] } }),
    DistressReport.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
    User.countDocuments(),
    Detection.countDocuments(),
    SupportCenter.countDocuments({ isActive: true })
  ]);
  res.json({ reports, activeAlerts, byRisk: Object.fromEntries(byRisk.map((r) => [r._id, r.count])), users, detections, centers });
}));

const listSchema = z.object({
  risk: z.enum(['Low', 'Medium', 'High']).optional(),
  alertStatus: z.enum(['none', 'monitor', 'active', 'acknowledged', 'dispatched', 'resolved']).optional(),
  animal: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

router.get('/distress', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const { risk, alertStatus, animal, page, limit } = req.valid.query;
  const filter = {};
  if (risk) filter.riskLevel = risk;
  if (alertStatus) filter.alertStatus = alertStatus;
  if (animal) filter.animalGuess = animal;
  const [items, total] = await Promise.all([
    DistressReport.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email').lean(),
    DistressReport.countDocuments(filter)
  ]);
  res.json({ items: items.map(shapeAdmin), total, page, pages: Math.ceil(total / limit) });
}));

router.get('/alerts', asyncHandler(async (_req, res) => {
  const items = await DistressReport.find({ alertStatus: { $in: ['active', 'acknowledged', 'dispatched'] } })
    .sort({ createdAt: -1 }).limit(50).populate('user', 'name email').lean();
  const weight = { active: 0, acknowledged: 1, dispatched: 2 };
  items.sort((a, b) => weight[a.alertStatus] - weight[b.alertStatus] || new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ items: items.map(shapeAdmin) });
}));

router.patch('/distress/:id', validate(z.object({
  alertStatus: z.enum(['none', 'monitor', 'active', 'acknowledged', 'dispatched', 'resolved']).optional(),
  adminNotes: z.string().trim().max(1000).optional()
}).refine((v) => v.alertStatus || v.adminNotes !== undefined, 'Nothing to update')), asyncHandler(async (req, res) => {
  const r = await DistressReport.findByIdAndUpdate(req.params.id, req.valid.body, { new: true }).populate('user', 'name email').lean();
  if (!r) throw new ApiError(404, 'Report not found.', 'NOT_FOUND');
  await logActivity(req, 'distress.updated', { entity: 'DistressReport', entityId: String(r._id), meta: req.valid.body });
  res.json({ item: shapeAdmin(r) });
}));

router.get('/animals', asyncHandler(async (_req, res) => {
  const rows = await DistressReport.aggregate([
    { $group: { _id: '$animalGuess', reports: { $sum: 1 }, highRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'High'] }, 1, 0] } },
      openAlerts: { $sum: { $cond: [{ $in: ['$alertStatus', ['active', 'acknowledged', 'dispatched']] }, 1, 0] } }, lastSeen: { $max: '$createdAt' } } },
    { $sort: { reports: -1 } }
  ]);
  res.json({ items: rows.map((r) => ({ animal: r._id, reports: r.reports, highRisk: r.highRisk, openAlerts: r.openAlerts, lastSeen: r.lastSeen })) });
}));

router.get('/activity', asyncHandler(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limit);
  const items = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).populate('user', 'name email').lean();
  res.json({ items: items.map((a) => ({ id: a._id, action: a.action, at: a.createdAt, user: a.user ? { name: a.user.name, email: a.user.email } : null, entity: a.entity, meta: a.meta })) });
}));

export default router;
