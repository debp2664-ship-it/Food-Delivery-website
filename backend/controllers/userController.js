const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const bcrypt = require('bcryptjs');
const { memoryStore } = require('../services/memoryStore');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id).select('-password');
      return res.json({ success: true, user });
    } else {
      const user = memoryStore.users.find(u => u._id.toString() === req.user._id.toString());
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const { password, ...safeUser } = user;
      return res.json({ success: true, user: safeUser });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, password, currentPassword } = req.body;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id).select('+password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();

      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, message: 'Please provide current password to change password' });
        }
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password does not match' });
        }
        user.password = password;
      }

      await user.save();
      const updatedUser = await User.findById(user._id).select('-password');

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } else {
      const userIndex = memoryStore.users.findIndex(u => u._id.toString() === req.user._id.toString());
      if (userIndex === -1) return res.status(404).json({ success: false, message: 'User not found' });

      const user = memoryStore.users[userIndex];

      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();

      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, message: 'Please provide current password to change password' });
        }
        const isMatch = bcrypt.compareSync(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password does not match' });
        }
        user.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      }

      const { password: _, ...safeUser } = user;
      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: safeUser
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add saved address
// @route   POST /api/users/address
// @access  Private
const addAddress = async (req, res) => {
  try {
    const { name, phone, house, street, area, city, state, pincode, type, isDefault } = req.body;

    if (!house || !street || !area || !city || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete address details'
      });
    }

    const newAddress = {
      name: name || req.user.name,
      phone: phone || req.user.phone,
      house,
      street,
      area,
      city,
      state: state || 'West Bengal',
      pincode,
      type: type || 'Home',
      isDefault: Boolean(isDefault)
    };

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      if (newAddress.isDefault) {
        user.addresses.forEach(addr => addr.isDefault = false);
      }
      user.addresses.push(newAddress);
      await user.save();

      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        addresses: user.addresses
      });
    } else {
      const user = memoryStore.users.find(u => u._id.toString() === req.user._id.toString());
      newAddress._id = memoryStore.generateId();
      if (!user.addresses) user.addresses = [];
      if (newAddress.isDefault) {
        user.addresses.forEach(addr => addr.isDefault = false);
      }
      user.addresses.push(newAddress);

      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        addresses: user.addresses
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete saved address
// @route   DELETE /api/users/address/:addressId
// @access  Private
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
      await user.save();

      return res.json({
        success: true,
        message: 'Address deleted successfully',
        addresses: user.addresses
      });
    } else {
      const user = memoryStore.users.find(u => u._id.toString() === req.user._id.toString());
      if (user && user.addresses) {
        user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
      }
      return res.json({
        success: true,
        message: 'Address deleted successfully',
        addresses: user.addresses || []
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle favorite restaurant or food
// @route   POST /api/users/favorites
// @access  Private
const toggleFavorite = async (req, res) => {
  try {
    const { type, id } = req.body; // type: 'restaurant' | 'food'

    if (!type || !id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type (restaurant or food) and item id'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      if (!user.favorites) user.favorites = { restaurants: [], foods: [] };

      const key = type === 'restaurant' ? 'restaurants' : 'foods';
      const existsIndex = user.favorites[key].findIndex(itemId => itemId.toString() === id.toString());

      let isFavorited = false;
      if (existsIndex > -1) {
        user.favorites[key].splice(existsIndex, 1);
        isFavorited = false;
      } else {
        user.favorites[key].push(id);
        isFavorited = true;
      }

      await user.save();

      return res.json({
        success: true,
        isFavorited,
        message: isFavorited ? 'Added to favorites' : 'Removed from favorites',
        favorites: user.favorites
      });
    } else {
      const user = memoryStore.users.find(u => u._id.toString() === req.user._id.toString());
      if (!user.favorites) user.favorites = { restaurants: [], foods: [] };

      const key = type === 'restaurant' ? 'restaurants' : 'foods';
      const existsIndex = user.favorites[key].findIndex(itemId => itemId.toString() === id.toString());

      let isFavorited = false;
      if (existsIndex > -1) {
        user.favorites[key].splice(existsIndex, 1);
        isFavorited = false;
      } else {
        user.favorites[key].push(id.toString());
        isFavorited = true;
      }

      return res.json({
        success: true,
        isFavorited,
        message: isFavorited ? 'Added to favorites' : 'Removed from favorites',
        favorites: user.favorites
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user favorites populated
// @route   GET /api/users/favorites
// @access  Private
const getFavorites = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id)
        .populate('favorites.restaurants')
        .populate('favorites.foods');

      return res.json({
        success: true,
        favorites: user.favorites || { restaurants: [], foods: [] }
      });
    } else {
      const user = memoryStore.users.find(u => u._id.toString() === req.user._id.toString());
      const favs = user.favorites || { restaurants: [], foods: [] };

      const restaurants = memoryStore.restaurants.filter(r =>
        favs.restaurants && favs.restaurants.some(id => id.toString() === r._id.toString())
      );
      const foods = memoryStore.foods.filter(f =>
        favs.foods && favs.foods.some(id => id.toString() === f._id.toString())
      );

      return res.json({
        success: true,
        favorites: { restaurants, foods }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  addAddress,
  deleteAddress,
  toggleFavorite,
  getFavorites
};
