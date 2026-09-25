import mongoose from 'mongoose';

export const LISTING_STATUS = ['reported', 'available', 'adoption pending', 'adopted'];

const schema = new mongoose.Schema({
  animalType: { type: String, required: true, trim: true, maxlength: 40 },
  name: { type: String, trim: true, maxlength: 60, default: '' },
  description: { type: String, trim: true, maxlength: 800, default: '' },
  address: { type: String, required: true, trim: true, maxlength: 300 },
  contactPhone: { type: String, trim: true, maxlength: 20, default: '' },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number] } },
  status: { type: String, enum: LISTING_STATUS, default: 'reported', index: true },
  photo: { data: { type: Buffer, select: false }, contentType: String },
  hasPhoto: { type: Boolean, default: false },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const AnimalListing = mongoose.model('AnimalListing', schema);
