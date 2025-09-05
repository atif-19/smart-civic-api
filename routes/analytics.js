const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    
    const statusBreakdown = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const categoryBreakdown = await Report.aggregate([
      { $group: { _id: '$parentCategory', count: { $sum: 1 } } }
    ]);
    
    const avgResolutionTime = await Report.aggregate([
        { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
        { $project: { resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } }
    ]);
    
    const reportsLast7Days = await Report.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
    ]);

    // Convert milliseconds to hours for readability
    let avgHours = 0;
    if (avgResolutionTime.length > 0 && avgResolutionTime[0].avgTime) {
        avgHours = (avgResolutionTime[0].avgTime / (1000 * 60 * 60)).toFixed(2);
    }

    res.json({
        totalReports,
        statusBreakdown,
        categoryBreakdown,
        avgResolutionTimeHours: avgHours,
        reportsLast7Days
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Server error fetching analytics.' });
  }
});

module.exports = router;