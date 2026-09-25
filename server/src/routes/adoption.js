import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AnimalListing, LISTING_STATUS } from '../models/AnimalListing.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';

const router = Router();
const IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, f, cb) => IMG_TYPES.has(f.mimetype) ? cb(null, true)
    : cb(new ApiError(415, 'Please upload a JPG, PNG or WEBP image.', 'UNSUPPORTED_TYPE'))
});
const postLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many reports. Please try again later.' } } });

const shape = (a) => ({
  id: a._id, animalType: a.animalType, name: a.name, description: a.description, address: a.address,
  contactPhone: a.contactPhone, status: a.status, hasPhoto: a.hasPhoto, createdAt: a.createdAt,
  lat: a.location?.coordinates?.[1], lng: a.location?.coordinates?.[0]
});

const createSchema = z.object({
  animalType: z.string().trim().min(2, 'Tell us what animal it is').max(40),
  name: z.string().trim().max(60).optional().default(''),
  description: z.string().trim().max(800).optional().default(''),
  address: z.string().trim().min(5, 'Please enter the address or landmark').max(300),
  contactPhone: z.string().trim().regex(/^[0-9+\-\s]{0,20}$/, 'Enter a valid phone number').optional().default(''),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional()
});

// Public list (shows available, adoption pending, and newly reported rescue animals)
router.get('/', asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['available', 'adoption pending', 'reported'] } };
  if (req.query.type) filter.animalType = new RegExp(`^${String(req.query.type).replace(/[^\w ]/g, '')}$`, 'i');
  if (req.query.status) filter.status = req.query.status;
  const items = await AnimalListing.find(filter).sort({ createdAt: -1 }).limit(60).lean();
  res.json({ items: items.map(shape) });
}));

// Anyone (guest or logged in) can report / list an animal with a photo + address.
router.post('/', postLimiter, upload.single('photo'), validate(createSchema), asyncHandler(async (req, res) => {
  const b = req.valid.body;
  const doc = await AnimalListing.create({
    animalType: b.animalType, name: b.name, description: b.description, address: b.address, contactPhone: b.contactPhone,
    status: 'reported',
    ...(b.lat !== undefined && b.lng !== undefined ? { location: { type: 'Point', coordinates: [b.lng, b.lat] } } : {}),
    ...(req.file ? { photo: { data: req.file.buffer, contentType: req.file.mimetype }, hasPhoto: true } : {})
  });
  res.status(201).json({ item: shape(doc), message: 'Thank you! Your animal report has been listed in Adoption & Rescue.' });
}));

router.get('/:id/photo', asyncHandler(async (req, res) => {
  const a = await AnimalListing.findById(req.params.id).select('+photo.data photo.contentType').lean();
  if (!a?.photo?.data) throw new ApiError(404, 'No photo found.', 'NOT_FOUND');
  res.set('Content-Type', a.photo.contentType).set('Cache-Control', 'public, max-age=86400').send(a.photo.data.buffer ? Buffer.from(a.photo.data.buffer) : a.photo.data);
}));

// Admin: review queue and status changes
router.get('/admin/all', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const items = await AnimalListing.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items: items.map(shape) });
}));

router.patch('/:id/status', requireAuth, requireAdmin, validate(z.object({ status: z.enum(LISTING_STATUS) })), asyncHandler(async (req, res) => {
  const a = await AnimalListing.findByIdAndUpdate(req.params.id, { status: req.valid.body.status }, { new: true });
  if (!a) throw new ApiError(404, 'Listing not found.', 'NOT_FOUND');
  await logActivity(req, 'adoption.status');
  res.json({ item: shape(a) });
}));

export default router;
