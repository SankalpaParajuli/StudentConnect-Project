const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  getDashboardStats,
  getUsers,
  approveUser,
  banUser,
  unbanUser,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getPendingResources,
  approvePendingResource,
  rejectPendingResource,
  getResources,
  deleteResource,
  getReports,
  resolveReport,
} = require('../controllers/adminController');

router.get('/stats', auth, adminOnly, getDashboardStats);
router.get('/users', auth, adminOnly, getUsers);
router.put('/users/:userId/approve', auth, adminOnly, approveUser);
router.put('/users/:userId/ban', auth, adminOnly, banUser);
router.put('/users/:userId/unban', auth, adminOnly, unbanUser);

router.get('/announcements', auth, getAnnouncements);  // All authenticated users can see announcements
router.post('/announcements', auth, adminOnly, createAnnouncement);
router.delete('/announcements/:id', auth, adminOnly, deleteAnnouncement);

router.get('/pending', auth, adminOnly, getPendingResources);
router.put('/pending/:id/approve', auth, adminOnly, approvePendingResource);
router.put('/pending/:id/reject', auth, adminOnly, rejectPendingResource);

router.get('/resources', auth, adminOnly, getResources);
router.delete('/resources/:id', auth, adminOnly, deleteResource);

router.get('/reports', auth, adminOnly, getReports);
router.put('/reports/:id/resolve', auth, adminOnly, resolveReport);

module.exports = router;
