const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide restaurant name'],
    trim: true,
    maxlength: [100, 'Restaurant name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    required: [true, 'Please provide an image URL'],
    default: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
  },
  cuisine: {
    type: [String],
    required: [true, 'Please provide at least one cuisine type'],
    default: ['Multi-Cuisine']
  },
  address: {
    street: { type: String, default: '' },
    area: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, default: '' }
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    default: 4.2
  },
  reviewsCount: {
    type: Number,
    default: 120
  },
  deliveryTime: {
    type: String,
    default: '25-35 mins'
  },
  deliveryFee: {
    type: Number,
    default: 30
  },
  minOrder: {
    type: Number,
    default: 150
  },
  priceRange: {
    type: String,
    enum: ['₹', '₹₹', '₹₹₹', '₹₹₹₹'],
    default: '₹₹'
  },
  openingHours: {
    type: String,
    default: '10:00 AM - 11:00 PM'
  },
  isVeg: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  offers: {
    type: [String],
    default: ['50% OFF up to ₹100']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
