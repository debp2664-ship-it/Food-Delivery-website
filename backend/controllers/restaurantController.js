const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const { memoryStore } = require('../services/memoryStore');

// @desc    Get all restaurants with filters and sorting
// @route   GET /api/restaurants
// @access  Public
const getRestaurants = async (req, res) => {
  try {
    const {
      search,
      cuisine,
      category,
      minRating,
      maxDeliveryTime,
      priceRange,
      isVeg,
      hasOffers,
      featured,
      sortBy
    } = req.query;

    if (mongoose.connection.readyState === 1) {
      let query = { isActive: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { cuisine: { $regex: search, $options: 'i' } },
          { 'address.area': { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (cuisine && cuisine !== 'All') {
        query.cuisine = { $in: [new RegExp(cuisine, 'i')] };
      }

      if (minRating) {
        query.rating = { $gte: parseFloat(minRating) };
      }

      if (isVeg === 'true') {
        query.isVeg = true;
      }

      if (featured === 'true') {
        query.featured = true;
      }

      if (hasOffers === 'true') {
        query.offers = { $exists: true, $not: { $size: 0 } };
      }

      let sortOptions = { rating: -1 };
      if (sortBy === 'rating') sortOptions = { rating: -1 };
      else if (sortBy === 'priceAsc') sortOptions = { minOrder: 1, deliveryFee: 1 };
      else if (sortBy === 'priceDesc') sortOptions = { minOrder: -1 };
      else if (sortBy === 'deliveryTime') sortOptions = { deliveryTime: 1 };
      else if (sortBy === 'popular') sortOptions = { reviewsCount: -1 };

      let restaurants = await Restaurant.find(query).sort(sortOptions);

      // If category is provided, also filter by restaurants that serve foods in that category
      if (category && category !== 'All') {
        const matchingFoods = await Food.find({ category: new RegExp(category, 'i') }).select('restaurant');
        const restaurantIdsWithCategory = new Set(matchingFoods.map(f => f.restaurant.toString()));
        restaurants = restaurants.filter(r => restaurantIdsWithCategory.has(r._id.toString()) || r.cuisine.some(c => c.toLowerCase() === category.toLowerCase()));
      }

      return res.json({
        success: true,
        count: restaurants.length,
        restaurants
      });
    } else {
      // Memory Store fallback
      let list = [...memoryStore.restaurants];

      // Filter active (admin can see all via separate admin query, but public sees isActive !== false)
      list = list.filter(r => r.isActive !== false);

      if (search) {
        const s = search.toLowerCase();
        list = list.filter(r =>
          r.name.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.cuisine.some(c => c.toLowerCase().includes(s)) ||
          (r.address && r.address.area && r.address.area.toLowerCase().includes(s))
        );
      }

      if (cuisine && cuisine !== 'All') {
        list = list.filter(r =>
          r.cuisine.some(c => c.toLowerCase() === cuisine.toLowerCase())
        );
      }

      if (minRating) {
        list = list.filter(r => r.rating >= parseFloat(minRating));
      }

      if (isVeg === 'true') {
        list = list.filter(r => r.isVeg === true);
      }

      if (featured === 'true') {
        list = list.filter(r => r.featured === true);
      }

      if (hasOffers === 'true') {
        list = list.filter(r => r.offers && r.offers.length > 0);
      }

      if (category && category !== 'All') {
        const cat = category.toLowerCase();
        const restaurantIdsWithCat = new Set(
          memoryStore.foods
            .filter(f => f.category && f.category.toLowerCase() === cat)
            .map(f => f.restaurant.toString())
        );
        list = list.filter(r =>
          restaurantIdsWithCat.has(r._id.toString()) ||
          r.cuisine.some(c => c.toLowerCase() === cat)
        );
      }

      if (sortBy === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'priceAsc') {
        list.sort((a, b) => a.minOrder - b.minOrder);
      } else if (sortBy === 'priceDesc') {
        list.sort((a, b) => b.minOrder - a.minOrder);
      } else if (sortBy === 'popular') {
        list.sort((a, b) => b.reviewsCount - a.reviewsCount);
      } else if (sortBy === 'deliveryTime') {
        list.sort((a, b) => parseInt(a.deliveryTime) - parseInt(b.deliveryTime));
      } else {
        list.sort((a, b) => b.rating - a.rating);
      }

      return res.json({
        success: true,
        count: list.length,
        restaurants: list
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single restaurant by ID with its menu items
// @route   GET /api/restaurants/:id
// @access  Public
const getRestaurantById = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const restaurant = await Restaurant.findById(id);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      const foods = await Food.find({ restaurant: id, isAvailable: true });

      return res.json({
        success: true,
        restaurant,
        foods
      });
    } else {
      const restaurant = memoryStore.restaurants.find(r => r._id.toString() === id);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      const foods = memoryStore.foods.filter(f => f.restaurant.toString() === id && f.isAvailable !== false);

      return res.json({
        success: true,
        restaurant,
        foods
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new restaurant
// @route   POST /api/restaurants
// @access  Private/Admin
const createRestaurant = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      cuisine,
      address,
      rating,
      deliveryTime,
      deliveryFee,
      minOrder,
      priceRange,
      openingHours,
      isVeg,
      featured,
      offers
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide restaurant name and description'
      });
    }

    const cuisineArray = Array.isArray(cuisine)
      ? cuisine
      : (typeof cuisine === 'string' ? cuisine.split(',').map(s => s.trim()) : ['Multi-Cuisine']);

    const restaurantData = {
      name,
      description,
      image: image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      cuisine: cuisineArray,
      address: typeof address === 'object' ? address : { area: address || 'Downtown', city: 'Kolkata' },
      rating: Number(rating) || 4.2,
      reviewsCount: 1,
      deliveryTime: deliveryTime || '25-35 mins',
      deliveryFee: Number(deliveryFee) || 30,
      minOrder: Number(minOrder) || 150,
      priceRange: priceRange || '₹₹',
      openingHours: openingHours || '10:00 AM - 11:00 PM',
      isVeg: Boolean(isVeg),
      featured: Boolean(featured),
      offers: Array.isArray(offers) ? offers : (offers ? [offers] : []),
      isActive: true,
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const newRestaurant = await Restaurant.create(restaurantData);
      return res.status(201).json({
        success: true,
        message: 'Restaurant added successfully',
        restaurant: newRestaurant
      });
    } else {
      restaurantData._id = memoryStore.generateId();
      memoryStore.restaurants.push(restaurantData);
      return res.status(201).json({
        success: true,
        message: 'Restaurant added successfully',
        restaurant: restaurantData
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private/Admin
const updateRestaurant = async (req, res) => {
  try {
    const id = req.params.id;

    if (req.body.cuisine && typeof req.body.cuisine === 'string') {
      req.body.cuisine = req.body.cuisine.split(',').map(s => s.trim());
    }

    if (mongoose.connection.readyState === 1) {
      const restaurant = await Restaurant.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      return res.json({
        success: true,
        message: 'Restaurant updated successfully',
        restaurant
      });
    } else {
      const index = memoryStore.restaurants.findIndex(r => r._id.toString() === id);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      memoryStore.restaurants[index] = {
        ...memoryStore.restaurants[index],
        ...req.body
      };

      return res.json({
        success: true,
        message: 'Restaurant updated successfully',
        restaurant: memoryStore.restaurants[index]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private/Admin
const deleteRestaurant = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const restaurant = await Restaurant.findByIdAndDelete(id);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      // Also clean up food items belonging to this restaurant
      await Food.deleteMany({ restaurant: id });

      return res.json({
        success: true,
        message: 'Restaurant and related menu items deleted successfully'
      });
    } else {
      const index = memoryStore.restaurants.findIndex(r => r._id.toString() === id);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      memoryStore.restaurants.splice(index, 1);
      memoryStore.foods = memoryStore.foods.filter(f => f.restaurant.toString() !== id);

      return res.json({
        success: true,
        message: 'Restaurant and related menu items deleted successfully'
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
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
};
