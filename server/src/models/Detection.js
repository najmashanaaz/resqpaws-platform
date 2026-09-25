import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'AudioUpload' },
    animalKey: { type: String, required: true },
    animalName: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    recognized: { type: Boolean, required: true },
    threshold: Number,
    ranked: [{ _id: false, key: String, name: String, score: Number, matchedLabel: String }],
    topPredictions: [{ _id: false, label: String, score: Number }],
    model: { type: String, default: 'YAMNet (TensorFlow.js)' },
    seeded: { type: Boolean, default: false }
  },
  { timestamps: true }
);
schema.index({ user: 1, createdAt: -1 });

export const Detection = mongoose.model('Detection', schema);
