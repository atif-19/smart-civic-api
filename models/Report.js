const mongoose = require('mongoose');

// We need to ensure the Comment model is known to Mongoose before the Report model uses it.

const reportSchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' }, // --- NEW ---
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

  },
  // --- NEW FIELDS ---
  pincode: { type: String },
  fullAddress: { type: String },
  parentCategory: { // --- NEW ---
    type: String, 
    required: true,
    enum: ['Roads', 'Electrical', 'Sanitation', 'Environment', 'Infrastructure', 'Other']
  },
   // --- NEW: Fields for resolution details ---
  resolutionDescription: { type: String },
  resolvedImageUrl: { type: String },
    resolvedAt: { type: Date }, // --- NEW ---

  imageUrl: { type: String, required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'submitted' },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  confirmIssue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  // responsibleDepartment: { type: String }, // --- NEW ---
  responsibleDepartment: {
    type: String,
    enum: [
      'Municipal Corporation',
      'Sanitation Department',
      'Police/Public safety',
      'Road & Transportation',
      'Water Department',
      'Electricity Department',
      'Parks and Recreation', // Added to match frontend
      'Public Works',          // Added to match frontend
      'Other'
    ],
    default: 'Other'
  },
});

reportSchema.virtual('upvoteCount').get(function() {
  return this.upvotes.length;
});

reportSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'report',
  count: true
});

reportSchema.set('toObject', { virtuals: true });
reportSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Report', reportSchema);