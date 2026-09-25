import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['sound', 'distress'], required: true },
    source: { type: String, enum: ['record', 'upload'], default: 'upload' },
    originalName: { type: String, maxlength: 200 },
    originalMime: { type: String, maxlength: 100 },
    originalSize: Number,
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    format: { type: String, enum: ['wav', 'mp3'], required: true },
    sizeBytes: { type: Number, required: true },
    durationSec: Number,
    sampleRate: Number,
    sha256: String
  },
  { timestamps: true }
);

export const AudioUpload = mongoose.model('AudioUpload', schema);
