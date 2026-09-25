import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { AudioUpload } from '../models/AudioUpload.js';
import { detectAudioType, parseWav, wavFeatures, sha256 } from './audio.js';

const metaSchema = z.object({
  source: z.enum(['record', 'upload']).default('upload'),
  originalName: z.string().max(200).optional(),
  originalMime: z.string().max(100).optional(),
  originalSize: z.coerce.number().int().nonnegative().optional(),
  durationSec: z.coerce.number().min(0).max(600).optional()
});

const predictionSchema = z
  .array(z.object({ label: z.string().min(1).max(120), score: z.number().min(0).max(1) }))
  .min(1, 'No AI scores were sent with the audio.')
  .max(100);

export function parsePredictions(raw) {
  let arr;
  try {
    arr = JSON.parse(raw ?? '');
  } catch {
    throw new ApiError(400, 'The AI scores were missing or unreadable.', 'BAD_SCORES');
  }
  return predictionSchema.parse(arr);
}

/** Validate the uploaded file, save it to disk, and record its metadata. */
export async function storeAudio(req, purpose) {
  const file = req.file;
  if (!file) throw new ApiError(400, 'No audio file was received. Please record or choose a file.', 'NO_FILE');

  const format = detectAudioType(file.buffer);
  if (!format) {
    throw new ApiError(422, 'This file is not a valid WAV or MP3 recording. It may be corrupted.', 'CORRUPTED_AUDIO');
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext !== `.${format}`) {
    throw new ApiError(415, 'The file extension does not match the audio inside. Please use a .wav or .mp3 file.', 'UNSUPPORTED_TYPE');
  }

  const meta = metaSchema.parse(req.body);
  let info = {};
  let features = null;
  if (format === 'wav') {
    info = parseWav(file.buffer);
    features = wavFeatures(file.buffer, info);
    if (features.peak < 0.004) {
      throw new ApiError(422, 'The recording is silent. Move closer to the animal and try again.', 'SILENT_AUDIO');
    }
  }

  await fs.mkdir(env.uploadDir, { recursive: true });
  const storedName = `${crypto.randomUUID()}.${format}`;
  const full = path.join(env.uploadDir, storedName);
  await fs.writeFile(full, file.buffer);

  try {
    const upload = await AudioUpload.create({
      user: req.user._id,
      purpose,
      source: meta.source,
      originalName: meta.originalName || file.originalname,
      originalMime: meta.originalMime,
      originalSize: meta.originalSize,
      storedName,
      mimeType: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      format,
      sizeBytes: file.size,
      durationSec: info.durationSec ?? meta.durationSec,
      sampleRate: info.sampleRate,
      sha256: sha256(file.buffer)
    });
    return { upload, features };
  } catch (err) {
    await fs.unlink(full).catch(() => {});
    throw err;
  }
}
