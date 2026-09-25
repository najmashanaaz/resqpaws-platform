import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = 'SERVER_ERROR';
  let message = 'Something went wrong on our side. Please try again.';
  let details;

  if (err instanceof ApiError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Please check the highlighted fields.';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err?.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large. Please upload a shorter recording.' : 'The upload could not be read.';
  } else if (err?.name === 'CastError') {
    status = 400; code = 'BAD_ID'; message = 'That identifier is not valid.';
  } else if (err?.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = 'That value is already in use.';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400; code = 'BAD_JSON'; message = 'The request body is not valid JSON.';
  } else if (err?.name === 'ValidationError') {
    status = 400; code = 'VALIDATION_ERROR'; message = err.message;
  }

  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json({ error: { code, message, details } });
}
