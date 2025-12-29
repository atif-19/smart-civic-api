const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const { sendNotificationEmail } = require('../services/emailService');
const { analyzeReport } = require('../services/aiService');
const cloudinary = require('cloudinary').v2;
const axios = require('axios'); // <-- 1. IMPORT AXIOS

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
  
// --- UPDATED: Main GET route now excludes resolved reports ---
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({ status: { $ne: 'resolved' } })
      .populate('submittedBy', 'email')
      .populate('commentCount')
      .sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching reports.' });
  }
});

// --- NEW: A dedicated route to fetch ONLY resolved reports ---
router.get('/resolved', async (req, res) => {
  try {
    const reports = await Report.find({ status: 'resolved' })
      .populate('submittedBy', 'email')
      .sort({ resolvedAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching resolved reports.' });
  }
});

// --- NEW: A dedicated route to resolve a report with an "after" photo and description ---
router.patch('/:id/resolve', authMiddleware, upload.single('resolvedImage'), async (req, res) => {
  try {
    const { resolutionDescription } = req.body;
    const imageFile = req.file;
    
    if (!imageFile || !resolutionDescription) {
      return res.status(400).json({ message: 'Resolution photo and description are required.' });
    }

    const cloudinaryUpload = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: "civic-reports-resolved" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      uploadStream.end(imageFile.buffer);
    });

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedImageUrl: cloudinaryUpload.secure_url,
        resolutionDescription: resolutionDescription,
      },
      { new: true }
    );

    if (!updatedReport) return res.status(404).json({ message: "Report not found." });
    
    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Resolve Report Error:', error);
    res.status(500).json({ message: 'Server error while resolving report.' });
  }
});


// POST /api/reports
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { description, location } = req.body;
    const imageFile = req.file;
    const parsedLocation = JSON.parse(location);
    if (!imageFile) {
      return res.status(400).json({ message: 'Image file is required.' });
    }

    let aiResult;
    try {
      // --- THIS IS THE SAFETY NET ---
      // We attempt to get the AI analysis inside its own try...catch block
      aiResult = await analyzeReport(description, imageFile.buffer, imageFile.mimetype);
    } catch (error) {
      console.error("AI analysis failed, using fallback.", error);
      // If the AI fails for ANY reason, we create a valid default result
      aiResult = {
        isRelevant: true,
        category: "Uncategorized",
        parentCategory: "Other",
        priority: "Medium",
        justification: "Needs manual review; AI analysis failed.",
        responsibleDepartment: "Other"
      };
    }

    if (aiResult.isRelevant === false) {
      return res.status(400).json({ message: 'Irrelevant report. Please submit a valid civic issue.' });
    }

    // --- START: UPDATED Geoapify Logic with Distance Check ---
    let pincode = 'N/A';
    let fullAddress = 'Address not found';
    try {
      const { lat, lng } = parsedLocation;
      
      const response = await axios.get('https://api.geoapify.com/v1/geocode/reverse', {
        params: {
          lat: lat,
          lon: lng,
          apiKey: process.env.GEOAPIFY_API_KEY
        }
      });

      if (response.data && response.data.features && response.data.features.length > 0) {
        const result = response.data.features[0].properties;
        const distance = result.distance; // Distance in meters

        // Set a maximum acceptable distance for an address to be considered accurate
        const MAX_DISTANCE_METERS = 100;

        // Check if the found address is close enough to be useful
        if (distance <= MAX_DISTANCE_METERS) {
          // Accurate result: Use the formatted street address
          fullAddress = result.formatted;
        } else {
          // Inaccurate result: Fall back to a more general location
          const suburb = result.suburb || '';
          const city = result.city || 'Surat';
          fullAddress = `Approx. location near ${suburb}, ${city}`;
        }
        
        pincode = result.postcode || 'N/A';
      }

    } catch (geoError) {
      console.error("Geoapify Geocoding failed:", geoError.message);
    }
    // --- END: Geoapify Logic ---

    const cloudinaryUpload = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: "civic-reports" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
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
      pincode: pincode,
      fullAddress: fullAddress,
      responsibleDepartment: aiResult.responsibleDepartment
    });

    await newReport.save();

    
     // --- START: Points, Streak, and Weekly Points Logic ---
    const pointsEarned = 10;
    const user = await User.findById(req.userId);

    if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let newStreak = user.contributionStreak || 0;
        
        if (user.lastContributionDate) {
            const lastDate = new Date(user.lastContributionDate);
            lastDate.setHours(0, 0, 0, 0);
            
            const diffDays = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                newStreak++; // Increment streak for consecutive days
            } else if (diffDays > 1) {
                newStreak = 1; // Reset streak if a day was missed
            }
        } else {
            newStreak = 1; // First-ever contribution
        }

        // Update user stats
        user.points += pointsEarned;
        user.weeklyPoints += pointsEarned;
        user.contributionStreak = newStreak;
        user.lastContributionDate = new Date();
        
        await user.save();
    }
    // --- END: Points, Streak, and Weekly Points Logic ---

    res.status(201).json({ message: 'Report submitted successfully!', report: newReport });
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
// PATCH /api/reports/:id/confirm
router.patch('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    // Find if user already confirmed
    const confirmIndex = report.confirmIssue.findIndex(userId => userId.equals(req.userId));

    if (confirmIndex > -1) {
      // Remove user (un-confirm)
      report.confirmIssue.splice(confirmIndex, 1);
    } else {
      // Add user (confirm)
      report.confirmIssue.push(req.userId);
    }

    await report.save();

    // Populate again to ensure the frontend gets the full object
    const updatedReport = await Report.findById(report._id)
      .populate('submittedBy', 'email')
      .populate('commentCount');

    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Confirm Error:', error);
    res.status(500).json({ message: 'Server error while confirming issue.' });
  }
});// PATCH /api/reports/:id (status update)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };
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

// --- NEW: GET route to fetch reports for the logged-in user ---
router.get('/my-reports', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ submittedBy: req.userId })
      .sort({ createdAt: -1 });
      
    res.json(reports);
  } catch (error) {
    console.error('Fetch My Reports Error:', error);
    res.status(500).json({ message: 'Server error while fetching your reports.' });
  }
});

module.exports = router;