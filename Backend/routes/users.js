const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  getProfile,
  updateProfile,
  searchUsers,
  getUserBadges,
  generateQRCode,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  getSettings,
  updateSettings,
  deleteAccount,
  addFriend,
} = require('../controllers/userController');

const upload = multer({ storage: multer.memoryStorage() });

// Search users (GET /users?search=xxx)
router.get('/', auth, searchUsers);

// Settings routes — MUST come before /:id
router.get('/settings', auth, getSettings);
router.put('/settings', auth, updateSettings);

// Profile update and delete
router.put('/profile', auth, uploadLimiter, upload.single('avatar'), updateProfile);
router.delete('/account', auth, deleteAccount);

// Friend routes — MUST come before /:id
router.get('/friends', auth, getFriends);
router.get('/friend-requests', auth, getFriendRequests);
router.post('/friends/request', auth, sendFriendRequest);
router.put('/friends/:requesterId/accept', auth, acceptFriendRequest);
router.put('/friends/:requesterId/decline', auth, declineFriendRequest);
router.delete('/friends/:friendId', auth, deleteFriend);

// Parameterized routes — MUST come last
router.get('/:id/badges', auth, getUserBadges);
router.get('/:id/qr', auth, generateQRCode);
router.post('/:userId/add-friend', auth, addFriend);
router.get('/:id', auth, getProfile);

module.exports = router;
