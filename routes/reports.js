const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const { sendNotificationEmail } = require('../services/emailService');
const { analyzeReport } = require('../services/aiService');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('submittedBy', 'email')
      .populate('commentCount')
      .sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Fetch Reports Error:', error);
    res.status(500).json({ message: 'Server error while fetching reports.' });
  }
});

// POST /api/reports
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { description, location } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ message: 'Image file is required.' });
    }

    const aiResult = await analyzeReport(description, imageFile.buffer, imageFile.mimetype);

    const cloudinaryUpload = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "civic-reports" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(imageFile.buffer);
    });

    const newReport = new Report({
      description,
      location: JSON.parse(location),
      imageUrl: cloudinaryUpload.secure_url,
      submittedBy: req.userId,
      category: aiResult.category,
      parentCategory: aiResult.parentCategory,
      priority: aiResult.priority,
    });

    const savedReport = await newReport.save();
    await User.findByIdAndUpdate(req.userId, { $inc: { points: 10 } });

    res.status(201).json({ message: 'Report submitted and analyzed successfully!', report: savedReport });
  } catch (error) {
    console.error('Submit Report Error:', error);
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
    console.error('Upvote Error:', error);
    res.status(500).json({ message: 'Server error while upvoting.' });
  }
});

// PATCH /api/reports/:id (status update)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // --- UPDATED LOGIC ---
    // Prepare the update object
    const updateData = { status };
    // If the new status is 'resolved', set the resolvedAt timestamp
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const updatedReport = await Report.findByIdAndUpdate(id, updateData, { new: true })
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
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Server error while updating report status.' });
  }
});

module.exports = router;