const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const { sendNotificationEmail } = require('../services/emailService'); // Import the email service

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({}).sort({ createdAt: -1 });
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
    console.error('Submit Report Error:', error);
    res.status(500).json({ message: 'Server error while saving report.' });
  }
});

// --- THIS IS THE UPDATED ROUTE ---
// PATCH /api/reports/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Find the report, update its status, and populate the 'submittedBy' field to get user details
    const updatedReport = await Report.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    ).populate('submittedBy', 'email'); // <-- This gets the user's email

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found." });
    }

    // After successfully updating, send the notification email
    if (updatedReport.submittedBy && updatedReport.submittedBy.email) {
      console.log(`Sending status update email to ${updatedReport.submittedBy.email}...`);
      await sendNotificationEmail(
        updatedReport.submittedBy.email,
        updatedReport.category,
        updatedReport.status
      );
    }

    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Server error while updating report status.' });
  }
});

module.exports = router;