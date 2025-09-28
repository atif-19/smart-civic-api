const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists.' });
    user = new User({ email, password, name });
    await user.save();
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    console.error('Fetch User Error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// --- 🚀 UPDATED LEADERBOARD ROUTE ---
router.get('/leaderboard', async (req, res) => {
  try {
    // 1. Fetch all users, sorted by points (for ranking) and weeklyPoints (for climber)
    const allUsers = await User.find({})
      .sort({ points: -1 })
      .select('email points name contributionStreak previousRank weeklyPoints');

    // 2. Find the weekly climber (user with the most weeklyPoints)
    let weeklyClimberId = null;
    if (allUsers.length > 0) {
      const topWeeklyPerformer = allUsers.reduce((prev, current) => 
        (prev.weeklyPoints > current.weeklyPoints) ? prev : current
      );
      // Ensure the climber has actually gained points this week
      if (topWeeklyPerformer.weeklyPoints > 0) {
        weeklyClimberId = topWeeklyPerformer._id.toString();
      }
    }

    // 3. Map users to the required frontend format and calculate rank
    const leaderboard = allUsers.map((user, index) => ({
      email: user.email,
      name: user.name,
      points: user.points,
      rank: index + 1, // Rank is the position in the sorted array
      previousRank: user.previousRank,
      contributionStreak: user.contributionStreak,
      // Check if this user is the weekly climber
      isWeeklyClimber: user._id.toString() === weeklyClimberId,
    }));

    // 4. Send the top 10 (or more, if you like)
    res.json(leaderboard.slice(0, 10));

  } catch (error) {
    console.error('Leaderboard Error:', error);
    res.status(500).json({ message: 'Server error while fetching leaderboard.' });
  }
});
// --- ✨ NEW /MY-RANK ENDPOINT ---
router.get('/my-rank', authMiddleware, async (req, res) => {
    try {
        // 1. Find the logged-in user
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 2. Calculate their rank efficiently
        // Rank = (number of users with more points than me) + 1
        const rank = await User.countDocuments({ points: { $gt: user.points } }) + 1;

        // 3. Find the weekly climber (same logic as leaderboard)
        const topWeeklyPerformer = await User.findOne({}).sort({ weeklyPoints: -1 });
        const isWeeklyClimber = topWeeklyPerformer && topWeeklyPerformer.weeklyPoints > 0 && topWeeklyPerformer._id.equals(user._id);

        // 4. Construct the response object
        const myRankData = {
            email: user.email,
            name: user.name,
            points: user.points,
            rank: rank,
            previousRank: user.previousRank,
            contributionStreak: user.contributionStreak,
            isWeeklyClimber: isWeeklyClimber,
        };

        res.json(myRankData);

    } catch (error) {
        console.error('My Rank Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


module.exports = router;