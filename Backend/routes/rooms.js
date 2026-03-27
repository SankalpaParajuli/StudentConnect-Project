const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getRooms,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomById,
} = require('../controllers/roomController');

router.get('/', auth, getRooms);
router.post('/', auth, createRoom);
router.post('/:roomId/join', auth, joinRoom);
router.post('/:roomId/leave', auth, leaveRoom);
router.get('/:roomId', auth, getRoomById);

module.exports = router;
