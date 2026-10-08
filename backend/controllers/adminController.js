const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Food = require('../models/Food');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { memoryStore } = require('../services/memoryStore');

// @desc    Get system analytics and operational metrics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const totalUsers = await User.countDocuments();
      const totalRestaurants = await Restaurant.countDocuments();
      const totalFoods = await Food.countDocuments();
      const totalOrders = await Order.countDocuments();
      const totalCoupons = await Coupon.countDocuments();

      // Today's orders
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = await Order.countDocuments({
        createdAt: { $gte: startOfToday }
      });

      // Pending orders
      const pendingOrders = await Order.countDocuments({
        status: { $nin: ['Delivered', 'Cancelled'] }
      });

      // Total revenue (from delivered or paid orders)
      const revenueResult = await Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]);
      const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

      return res.json({
        success: true,
        stats: {
          totalUsers,
          totalRestaurants,
          totalFoods,
          totalOrders,
          todayOrders,
          pendingOrders,
          totalCoupons,
          totalRevenue: Math.round(totalRevenue)
        }
      });
    } else {
      const totalUsers = memoryStore.users.length;
      const totalRestaurants = memoryStore.restaurants.length;
      const totalFoods = memoryStore.foods.length;
      const totalOrders = memoryStore.orders.length;
      const totalCoupons = memoryStore.coupons.length;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = memoryStore.orders.filter(o => new Date(o.createdAt) >= startOfToday).length;
      const pendingOrders = memoryStore.orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length;

      const totalRevenue = memoryStore.orders
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      return res.json({
        success: true,
        stats: {
          totalUsers,
          totalRestaurants,
          totalFoods,
          totalOrders,
          todayOrders,
          pendingOrders,
          totalCoupons,
          totalRevenue: Math.round(totalRevenue)
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users for admin management
// @route   GET /api/admin/users
// @access  Private/Admin
const getAdminUsers = async (req, res) => {
  try {
    const { search } = req.query;

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query).select('-password').sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: users.length,
        users
      });
    } else {
      let list = [...memoryStore.users];

      if (search) {
        const s = search.toLowerCase();
        list = list.filter(u =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone && u.phone.includes(s))
        );
      }

      const safeUsers = list.map(({ password, ...u }) => u);

      return res.json({
        success: true,
        count: safeUsers.length,
        users: safeUsers
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle user active/inactive status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      // Prevent deactivating own account
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account' });
      }

      user.isActive = !user.isActive;
      await user.save();

      return res.json({
        success: true,
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        user: { _id: user._id, name: user.name, email: user.email, isActive: user.isActive }
      });
    } else {
      const user = memoryStore.users.find(u => u._id.toString() === id.toString());
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account' });
      }

      user.isActive = user.isActive === false ? true : false;

      return res.json({
        success: true,
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        user: { _id: user._id, name: user.name, email: user.email, isActive: user.isActive }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminStats,
  getAdminUsers,
  toggleUserStatus
};
