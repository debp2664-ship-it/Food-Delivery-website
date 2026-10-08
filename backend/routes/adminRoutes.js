const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAdminUsers,
  toggleUserStatus
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.get('/stats', protect, adminOnly, getAdminStats);
router.get('/users', protect, adminOnly, getAdminUsers);
router.put('/users/:id/status', protect, adminOnly, toggleUserStatus);

module.exports = router;
