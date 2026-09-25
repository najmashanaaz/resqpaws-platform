import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'AudioUpload' },
    source: { type: String, enum: ['audio', 'manual'], default: 'audio' },
    animalGuess: { type: String, default: 'Unknown' },
    state: { type: String, enum: ['normal', 'distress', 'pain', 'aggressive', 'emergency', 'unclear'], required: true },
    scores: { normal: Number, distress: Number, pain: Number, aggressive: Number },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true, index: true },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    recommendedAction: String,
    alertStatus: {
      type: String,
      enum: ['none', 'monitor', 'active', 'acknowledged', 'dispatched', 'resolved'],
      default: 'none',
      index: true
    },
    adminNotes: { type: String, maxlength: 1000 },
    description: { type: String, maxlength: 1000 },
    locationText: { type: String, maxlength: 200 },
    location: { type: pointSchema, default: undefined },
    features: { rms: Number, peak: Number, activeRatio: Number, durationSec: Number },
    seeded: { type: Boolean, default: false }
  },
  { timestamps: true }
);
schema.index({ location: '2dsphere' }, { sparse: true });
schema.index({ createdAt: -1 });

export const DistressReport = mongoose.model('DistressReport', schema);
