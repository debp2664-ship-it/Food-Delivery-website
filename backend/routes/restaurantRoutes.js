const express = require('express');
const router = express.Router();
const {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
} = require('../controllers/restaurantController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.route('/')
  .get(getRestaurants)
  .post(protect, adminOnly, createRestaurant);

router.route('/:id')
  .get(getRestaurantById)
  .put(protect, adminOnly, updateRestaurant)
  .delete(protect, adminOnly, deleteRestaurant);

module.exports = router;
