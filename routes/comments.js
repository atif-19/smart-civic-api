const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:reportId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ report: req.params.reportId })
            .populate('submittedBy', 'email')
            .sort({ createdAt: 'desc' });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching comments.' });
    }
});

router.post('/:reportId/comments', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Comment text is required.' });
        }
        const newComment = new Comment({
            text,
            report: req.params.reportId,
            submittedBy: req.userId,
        });
        await newComment.save();
        const populatedComment = await Comment.findById(newComment._id).populate('submittedBy', 'email');
        res.status(201).json(populatedComment);
    } catch (error) {
        res.status(500).json({ message: 'Server error while adding comment.' });
    }
});

module.exports = router;