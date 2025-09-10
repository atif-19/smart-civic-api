require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const analyticsRoutes = require('./routes/analytics');
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => console.error('MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/analytics', analyticsRoutes);

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const commentRoutes = require('./routes/comments');

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports', commentRoutes); // Handles nested routes like /api/reports/:id/comments

app.listen(PORT, () => {
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER?.slice(0,15) + '...');
console.log('SMTP_PASS exists?', !!process.env.SMTP_PASS);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});