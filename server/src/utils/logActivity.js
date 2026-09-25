import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity(req, action, { entity, entityId, meta } = {}) {
  try {
    await ActivityLog.create({
      user: req.user?._id,
      action,
      entity,
      entityId,
      meta,
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200)
    });
  } catch (e) {
    console.error('Activity log failed:', e.message);
  }
}
