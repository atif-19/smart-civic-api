const mongoose = require('mongoose');

// We need to ensure the Comment model is known to Mongoose before the Report model uses it.
require('./Comment');

const reportSchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  imageUrl: { type: String, required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'submitted' },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
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