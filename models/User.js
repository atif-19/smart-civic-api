const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  points: { type: Number, default: 0 },
  name: { type: String, required: true, default: 'Anonymous' },
  
  // --- NEW FIELDS FOR GAMIFICATION ---
  lastContributionDate: { type: Date }, // <-- To calculate streak
  contributionStreak: { type: Number, default: 0 }, // <-- Current streak
  previousRank: { type: Number, default: null }, // <-- Rank from last period
  weeklyPoints: { type: Number, default: 0 }, // <-- Points gained this week
});

// Middleware to hash password before saving a new user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', userSchema);