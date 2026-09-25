import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { logActivity } from '../utils/logActivity.js';
import { env } from '../config/env.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } } });

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(100)
    .regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  language: z.enum(['en', 'ta', 'hi', 'te', 'kn']).optional()
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, language: u.language });

router.post('/register', limiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password, language } = req.valid.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
  const user = await User.create({ name, email, language, passwordHash: await bcrypt.hash(password, 11) });
  req.user = user;
  await logActivity(req, 'auth.register');
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', limiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, 'Email or password is incorrect.', 'BAD_CREDENTIALS');
  req.user = user;
  await logActivity(req, 'auth.login');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

const quickSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  userId: z.string().trim().max(80).optional()
});

router.post('/quick', limiter, validate(quickSchema), asyncHandler(async (req, res) => {
  const { name, email } = req.valid.body;
  let user = await User.findOne({ email });
  if (!user) {
    const dummyHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    user = await User.create({ name, email, passwordHash: dummyHash, role: 'user' });
  }
  req.user = user;
  await logActivity(req, 'auth.quick');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch('/me', requireAuth, validate(z.object({ language: z.enum(['en', 'ta', 'hi', 'te', 'kn']) })), asyncHandler(async (req, res) => {
  req.user.language = req.valid.body.language;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));

export default router;
