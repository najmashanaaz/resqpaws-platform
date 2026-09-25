import mongoose from 'mongoose';

export const CENTER_TYPES = ['veterinary_hospital', 'animal_shelter', 'rescue_center', 'ngo', 'welfare_org'];

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    type: { type: String, enum: CENTER_TYPES, required: true, index: true },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, index: true },
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    website: { type: String, trim: true, maxlength: 200 },
    openingHours: { type: String, default: 'Mon-Sat 9:00 am - 6:00 pm', maxlength: 120 },
    open24h: { type: Boolean, default: false },
    services: [String],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2 && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90,
          message: 'coordinates must be [longitude, latitude]'
        }
      }
    },
    isSample: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);
schema.index({ location: '2dsphere' });

export const SupportCenter = mongoose.model('SupportCenter', schema);
