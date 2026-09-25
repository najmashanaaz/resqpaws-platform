import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { SupportCenter, CENTER_TYPES } from '../models/SupportCenter.js';
import { ApiError, asyncHandler, escapeRegex } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';

const router = Router();

const shape = (c) => ({
  id: c._id, name: c.name, type: c.type, address: c.address, city: c.city, district: c.district, state: c.state,
  phone: c.phone, email: c.email, website: c.website, openingHours: c.openingHours, open24h: c.open24h,
  services: c.services || [], isSample: false, isActive: c.isActive,
  lat: c.location.coordinates[1], lng: c.location.coordinates[0],
  distanceKm: c.distanceM !== undefined ? Math.round(c.distanceM / 100) / 10 : undefined
});

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(2000).optional(),
  type: z.string().trim().optional(),
  helpline: z.enum(['true', 'false']).optional(),
  state: z.string().trim().max(60).optional(),
  district: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  q: z.string().trim().max(80).optional(),
  open24h: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

router.get('/nearby', validate(nearbySchema, 'query'), asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, type, helpline, state, district, city, q, open24h, limit } = req.valid.query;
  const filter = { isActive: true };

  const conditions = [];

  if (type && CENTER_TYPES.includes(type)) {
    conditions.push({ type });
  } else if (helpline === 'true') {
    conditions.push({
      $or: [
        { type: { $in: ['veterinary_hospital', 'rescue_center'] } },
        { name: new RegExp('hospital|clinic|dispensary|blue cross|rescue', 'i') }
      ]
    });
  }

  if (state) conditions.push({ state });
  if (district) conditions.push({ district });

  if (city) {
    const rx = new RegExp(escapeRegex(city), 'i');
    conditions.push({
      $or: [{ city: rx }, { district: rx }, { name: rx }, { address: rx }]
    });
  }

  if (open24h === 'true') {
    conditions.push({ open24h: true });
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    conditions.push({
      $or: [{ name: rx }, { address: rx }, { city: rx }, { district: rx }, { services: rx }]
    });
  }

  if (conditions.length === 1) {
    Object.assign(filter, conditions[0]);
  } else if (conditions.length > 1) {
    filter.$and = conditions;
  }

  let items;
  if (lat !== undefined && lng !== undefined) {
    items = await SupportCenter.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceM',
          spherical: true,
          query: filter,
          ...(radiusKm ? { maxDistance: radiusKm * 1000 } : {})
        }
      },
      { $limit: limit }
    ]);
  } else {
    items = await SupportCenter.find(filter).sort({ state: 1, city: 1, name: 1 }).limit(limit).lean();
  }
  res.json({ items: items.map(shape), count: items.length });
}));

router.get('/regions', asyncHandler(async (_req, res) => {
  const rows = await SupportCenter.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: { state: '$state', district: '$district', city: '$city' } } },
    { $sort: { '_id.state': 1, '_id.district': 1, '_id.city': 1 } }
  ]);
  const states = new Map();
  for (const { _id: r } of rows) {
    if (!states.has(r.state)) states.set(r.state, new Map());
    const d = states.get(r.state);
    if (!d.has(r.district)) d.set(r.district, []);
    d.get(r.district).push(r.city);
  }
  res.json({
    states: [...states].map(([name, districts]) => ({ name, districts: [...districts].map(([dn, cities]) => ({ name: dn, cities })) }))
  });
}));

// ---- Admin: list everything (including inactive), create, update, delete ----
router.get('/admin/all', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ name: new RegExp(escapeRegex(String(q).slice(0, 80)), 'i') }, { city: new RegExp(escapeRegex(String(q).slice(0, 80)), 'i') }] } : {};
  const items = await SupportCenter.find(filter).sort({ state: 1, city: 1, name: 1 }).limit(300).lean();
  res.json({ items: items.map(shape) });
}));

const phone = z.string().trim().regex(/^[+()\d\s-]{6,20}$/, 'Enter a valid phone number');
const centerSchema = z.object({
  name: z.string().trim().min(2).max(140),
  type: z.enum(CENTER_TYPES),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  phone,
  email: z.string().trim().email().max(120).optional().or(z.literal('')),
  website: z.string().trim().url().max(200).optional().or(z.literal('')),
  openingHours: z.string().trim().max(120).default('Mon-Sat 9:00 am - 6:00 pm'),
  open24h: z.boolean().default(false),
  services: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  isActive: z.boolean().default(true)
});
const toDoc = ({ lat, lng, ...rest }) => ({ ...rest, email: rest.email || undefined, website: rest.website || undefined, location: { type: 'Point', coordinates: [lng, lat] } });

router.post('/', requireAuth, requireAdmin, validate(centerSchema), asyncHandler(async (req, res) => {
  const c = await SupportCenter.create(toDoc(req.valid.body));
  await logActivity(req, 'support.created', { entity: 'SupportCenter', entityId: String(c._id), meta: { name: c.name } });
  res.status(201).json({ item: shape(c) });
}));

router.put('/:id', requireAuth, requireAdmin, validate(centerSchema), asyncHandler(async (req, res) => {
  const c = await SupportCenter.findByIdAndUpdate(req.params.id, { ...toDoc(req.valid.body), isSample: false }, { new: true, runValidators: true });
  if (!c) throw new ApiError(404, 'Support center not found.', 'NOT_FOUND');
  await logActivity(req, 'support.updated', { entity: 'SupportCenter', entityId: String(c._id), meta: { name: c.name } });
  res.json({ item: shape(c) });
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const c = await SupportCenter.findByIdAndDelete(req.params.id);
  if (!c) throw new ApiError(404, 'Support center not found.', 'NOT_FOUND');
  await logActivity(req, 'support.deleted', { entity: 'SupportCenter', entityId: String(c._id), meta: { name: c.name } });
  res.json({ ok: true });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const c = await SupportCenter.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!c) throw new ApiError(404, 'Support center not found.', 'NOT_FOUND');
  res.json({ item: shape(c) });
}));

export default router;
