const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  sendMessage,
  approveMessageRequest,
  declineMessageRequest,
  getMessageRequests,
} = require('../controllers/messageController');

router.get('/conversations', auth, getConversations);
router.get('/requests', auth, getMessageRequests);
router.get('/:userId', auth, getMessages);
router.post('/:userId', auth, sendMessage);
router.post('/:requesterId/approve', auth, approveMessageRequest);
router.delete('/:requesterId/decline', auth, declineMessageRequest);

module.exports = router;
