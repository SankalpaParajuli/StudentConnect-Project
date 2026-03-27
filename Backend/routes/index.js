const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./users');
const messageRoutes = require('./messages');
const libraryRoutes = require('./library');
const roomRoutes = require('./rooms');
const tutorRoutes = require('./tutors');
const notificationRoutes = require('./notifications');
const adminRoutes = require('./admin');
const reportRoutes = require('./reports');
const callRoutes = require('./calls');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/library', libraryRoutes);
router.use('/rooms', roomRoutes);
router.use('/tutors', tutorRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);
router.use('/calls', callRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
  });
});

module.exports = router;
