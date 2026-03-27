const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  getResources,
  uploadResource,
  getResourceById,
  rateResource,
  deleteResource,
  downloadResource,
} = require('../controllers/libraryController');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, getResources);
router.post('/', auth, uploadLimiter, upload.single('file'), uploadResource);
router.post('/:id/download', auth, downloadResource);
router.post('/:id/rate', auth, rateResource);
router.delete('/:id', auth, deleteResource);
router.get('/:id', auth, getResourceById);

module.exports = router;
