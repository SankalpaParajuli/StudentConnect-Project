const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getTutors,
  getMyTutorProfile,
  applyAsTutor,
  getTutorSessions,
  requestTutorSession,
  respondToTutorSession,
  completeTutorSession,
} = require('../controllers/tutorController');

router.get('/', auth, getTutors);
router.get('/sessions', auth, getTutorSessions);
router.post('/apply', auth, applyAsTutor);
router.post('/sessions', auth, requestTutorSession);
router.put('/sessions/:sessionId/respond', auth, respondToTutorSession);
router.put('/sessions/:sessionId/complete', auth, completeTutorSession);

module.exports = router;
