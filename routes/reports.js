const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const { sendNotificationEmail } = require('../services/emailService');

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    // FIX: Changed sort to prioritize newest reports first
    const reports = await Report.find({})
      .populate('submittedBy', 'email')
      .populate('commentCount')
      .sort({ createdAt: -1 }); // Sort by creation date, descending
    res.status(200).json(reports);
  } catch (error) {
    console.error('Fetch Reports Error:', error);
    res.status(500).json({ message: 'Server error while fetching reports.' });
  }
});

// POST /api/reports
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { category, description, location } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image file is required.' });
    const newReport = new Report({
      category,
      description,
      location: JSON.parse(location),
      imageUrl: req.file.path,
      submittedBy: req.userId,
    });
    const savedReport = await newReport.save();
    await User.findByIdAndUpdate(req.userId, { $inc: { points: 10 } });
    res.status(201).json({ message: 'Report submitted and points awarded!', report: savedReport });
  } catch (error) {
    res.status(500).json({ message: 'Server error while saving report.' });
  }
});

// PATCH /api/reports/:id/upvote
router.patch('/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    const upvoteIndex = report.upvotes.findIndex(userId => userId.equals(req.userId));
    if (upvoteIndex > -1) {
      report.upvotes.splice(upvoteIndex, 1);
    } else {
      report.upvotes.push(req.userId);
    }
    await report.save();
    const updatedReport = await Report.findById(report._id).populate('submittedBy', 'email').populate('commentCount');
    res.status(200).json(updatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error while upvoting.' });
  }
});

// PATCH /api/reports/:id (status update)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedReport = await Report.findByIdAndUpdate(id, { status }, { new: true })
        .populate('submittedBy', 'email');
    if (!updatedReport) return res.status(404).json({ message: "Report not found." });
    if (updatedReport.submittedBy && updatedReport.submittedBy.email) {
      await sendNotificationEmail(
        updatedReport.submittedBy.email,
        updatedReport.category,
        updatedReport.status
      );
    }
    res.status(200).json(updatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating report status.' });
  }
});

module.exports = router;