const express = require('express');
const router = express.Router();
const {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood
} = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.route('/')
  .get(getFoods)
  .post(protect, adminOnly, createFood);

router.route('/:id')
  .get(getFoodById)
  .put(protect, adminOnly, updateFood)
  .delete(protect, adminOnly, deleteFood);

module.exports = router;
