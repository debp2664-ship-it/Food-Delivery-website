const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Food item must belong to a restaurant']
  },
  name: {
    type: String,
    required: [true, 'Please provide food name'],
    trim: true,
    maxlength: [100, 'Food name cannot exceed 100 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    required: [true, 'Please provide food image URL'],
    default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  },
  category: {
    type: String,
    required: [true, 'Please specify category'],
    enum: [
      'Biryani',
      'Pizza',
      'Burger',
      'Chinese',
      'Indian',
      'Bengali',
      'Fast Food',
      'Desserts',
      'Beverages',
      'Healthy Food'
    ]
  },
  subCategory: {
    type: String,
    default: 'Recommended',
    enum: [
      'Recommended',
      'Starters',
      'Main Course',
      'Rice',
      'Biryani',
      'Chinese',
      'Drinks',
      'Desserts'
    ]
  },
  price: {
    type: Number,
    required: [true, 'Please specify food price'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 4.5
  },
  ratingCount: {
    type: Number,
    default: 40
  },
  isVeg: {
    type: Boolean,
    required: [true, 'Specify whether this item is vegetarian']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Food', foodSchema);
