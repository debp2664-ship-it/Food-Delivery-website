const mongoose = require('mongoose');
const Food = require('../models/Food');
const Restaurant = require('../models/Restaurant');
const { memoryStore } = require('../services/memoryStore');

// @desc    Get all foods with search, filter, and sorting
// @route   GET /api/foods
// @access  Public
const getFoods = async (req, res) => {
  try {
    const {
      search,
      category,
      subCategory,
      restaurantId,
      isVeg,
      minPrice,
      maxPrice,
      sortBy
    } = req.query;

    if (mongoose.connection.readyState === 1) {
      let query = { isAvailable: true };

      if (restaurantId) {
        query.restaurant = restaurantId;
      }

      if (category && category !== 'All') {
        query.category = new RegExp(category, 'i');
      }

      if (subCategory && subCategory !== 'All') {
        query.subCategory = new RegExp(subCategory, 'i');
      }

      if (isVeg === 'true') {
        query.isVeg = true;
      } else if (isVeg === 'false') {
        query.isVeg = false;
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }

      let sortOptions = { rating: -1 };
      if (sortBy === 'priceAsc') sortOptions = { price: 1 };
      else if (sortBy === 'priceDesc') sortOptions = { price: -1 };
      else if (sortBy === 'rating') sortOptions = { rating: -1 };
      else if (sortBy === 'name') sortOptions = { name: 1 };

      const foods = await Food.find(query).populate('restaurant', 'name cuisine address rating image').sort(sortOptions);

      return res.json({
        success: true,
        count: foods.length,
        foods
      });
    } else {
      // Memory Store fallback
      let list = [...memoryStore.foods].filter(f => f.isAvailable !== false);

      if (restaurantId) {
        list = list.filter(f => f.restaurant.toString() === restaurantId.toString());
      }

      if (category && category !== 'All') {
        list = list.filter(f => f.category.toLowerCase() === category.toLowerCase());
      }

      if (subCategory && subCategory !== 'All') {
        list = list.filter(f => f.subCategory && f.subCategory.toLowerCase() === subCategory.toLowerCase());
      }

      if (isVeg === 'true') {
        list = list.filter(f => f.isVeg === true);
      } else if (isVeg === 'false') {
        list = list.filter(f => f.isVeg === false);
      }

      if (minPrice) list = list.filter(f => f.price >= Number(minPrice));
      if (maxPrice) list = list.filter(f => f.price <= Number(maxPrice));

      if (search) {
        const s = search.toLowerCase();
        list = list.filter(f =>
          f.name.toLowerCase().includes(s) ||
          f.description.toLowerCase().includes(s) ||
          f.category.toLowerCase().includes(s)
        );
      }

      if (sortBy === 'priceAsc') list.sort((a, b) => a.price - b.price);
      else if (sortBy === 'priceDesc') list.sort((a, b) => b.price - a.price);
      else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
      else list.sort((a, b) => b.rating - a.rating);

      // Populate restaurant basic info
      const populated = list.map(f => {
        const rest = memoryStore.restaurants.find(r => r._id.toString() === f.restaurant.toString());
        return {
          ...f,
          restaurant: rest ? {
            _id: rest._id,
            name: rest.name,
            cuisine: rest.cuisine,
            rating: rest.rating,
            image: rest.image
          } : f.restaurant
        };
      });

      return res.json({
        success: true,
        count: populated.length,
        foods: populated
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single food item
// @route   GET /api/foods/:id
// @access  Public
const getFoodById = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const food = await Food.findById(id).populate('restaurant', 'name address rating deliveryTime');
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }
      return res.json({ success: true, food });
    } else {
      const food = memoryStore.foods.find(f => f._id.toString() === id.toString());
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      const rest = memoryStore.restaurants.find(r => r._id.toString() === food.restaurant.toString());
      return res.json({
        success: true,
        food: {
          ...food,
          restaurant: rest || food.restaurant
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new food item
// @route   POST /api/foods
// @access  Private/Admin
const createFood = async (req, res) => {
  try {
    const {
      restaurant,
      name,
      description,
      image,
      category,
      subCategory,
      price,
      originalPrice,
      isVeg,
      rating,
      tags
    } = req.body;

    if (!restaurant || !name || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide restaurant, name, category, and price'
      });
    }

    const foodData = {
      restaurant,
      name: name.trim(),
      description: description || '',
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      category,
      subCategory: subCategory || 'Main Course',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : 0,
      isVeg: Boolean(isVeg),
      rating: Number(rating) || 4.5,
      ratingCount: 1,
      isAvailable: true,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const newFood = await Food.create(foodData);
      return res.status(201).json({
        success: true,
        message: 'Food item added successfully',
        food: newFood
      });
    } else {
      foodData._id = memoryStore.generateId();
      memoryStore.foods.push(foodData);
      return res.status(201).json({
        success: true,
        message: 'Food item added successfully',
        food: foodData
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update food item
// @route   PUT /api/foods/:id
// @access  Private/Admin
const updateFood = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const food = await Food.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });

      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      return res.json({
        success: true,
        message: 'Food item updated successfully',
        food
      });
    } else {
      const index = memoryStore.foods.findIndex(f => f._id.toString() === id.toString());
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }

      memoryStore.foods[index] = {
        ...memoryStore.foods[index],
        ...req.body
      };

      return res.json({
        success: true,
        message: 'Food item updated successfully',
        food: memoryStore.foods[index]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete food item
// @route   DELETE /api/foods/:id
// @access  Private/Admin
const deleteFood = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const food = await Food.findByIdAndDelete(id);
      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }
      return res.json({
        success: true,
        message: 'Food item deleted successfully'
      });
    } else {
      const index = memoryStore.foods.findIndex(f => f._id.toString() === id.toString());
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found'
        });
      }
      memoryStore.foods.splice(index, 1);
      return res.json({
        success: true,
        message: 'Food item deleted successfully'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood
};
