const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  addAddress,
  deleteAddress,
  toggleFavorite,
  getFavorites
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/address')
  .post(protect, addAddress);

router.route('/address/:addressId')
  .delete(protect, deleteAddress);

router.route('/favorites')
  .get(protect, getFavorites)
  .post(protect, toggleFavorite);

module.exports = router;
