import multer from 'multer';
import path from 'node:path';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_EXT = new Set(['.wav', '.mp3']);
const ALLOWED_MIME = new Set(['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/mpeg', 'audio/mp3', 'application/octet-stream']);

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError(415, 'Unsupported file type. Please upload a .wav or .mp3 recording.', 'UNSUPPORTED_TYPE'));
    }
    cb(null, true);
  }
});
