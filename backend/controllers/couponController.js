const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const { memoryStore } = require('../services/memoryStore');

// @desc    Validate a coupon code against order amount
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a coupon code'
      });
    }

    const amount = Number(orderAmount) || 0;
    const cleanCode = code.toUpperCase().trim();

    let coupon;
    if (mongoose.connection.readyState === 1) {
      coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
    } else {
      coupon = memoryStore.coupons.find(c => c.code.toUpperCase() === cleanCode && c.isActive !== false);
    }

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Coupon code '${cleanCode}' is invalid or has expired`
      });
    }

    // Check expiry
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: `Coupon code '${cleanCode}' has expired`
      });
    }

    // Check minimum order
    if (coupon.minimumOrder && amount < coupon.minimumOrder) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum order of ₹${coupon.minimumOrder}. Add ₹${(coupon.minimumOrder - amount).toFixed(2)} more to apply!`
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (amount * coupon.discountValue) / 100;
      if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    } else {
      discount = coupon.discountValue;
      if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    }

    discount = Math.min(discount, amount);
    const finalAmount = Math.max(0, amount - discount);

    return res.json({
      success: true,
      message: `Coupon '${cleanCode}' applied successfully! Saved ₹${Math.round(discount)}`,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description
      },
      discount: Math.round(discount),
      finalAmount: Math.round(finalAmount)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Public / Admin
const getCoupons = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = req.user && req.user.role === 'admin' ? {} : { isActive: true };
      const coupons = await Coupon.find(query).sort({ createdAt: -1 });
      return res.json({
        success: true,
        count: coupons.length,
        coupons
      });
    } else {
      let list = [...memoryStore.coupons];
      if (!req.user || req.user.role !== 'admin') {
        list = list.filter(c => c.isActive !== false);
      }
      return res.json({
        success: true,
        count: list.length,
        coupons: list
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrder,
      maximumDiscount,
      expiryDate,
      isActive
    } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide coupon code, discount type, and discount value'
      });
    }

    const cleanCode = code.toUpperCase().trim();

    const couponData = {
      code: cleanCode,
      description: description || '',
      discountType,
      discountValue: Number(discountValue),
      minimumOrder: Number(minimumOrder) || 0,
      maximumDiscount: Number(maximumDiscount) || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const exists = await Coupon.findOne({ code: cleanCode });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' already exists`
        });
      }
      const newCoupon = await Coupon.create(couponData);
      return res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        coupon: newCoupon
      });
    } else {
      const exists = memoryStore.coupons.find(c => c.code.toUpperCase() === cleanCode);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' already exists`
        });
      }
      couponData._id = memoryStore.generateId();
      memoryStore.coupons.push(couponData);
      return res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        coupon: couponData
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
const updateCoupon = async (req, res) => {
  try {
    const id = req.params.id;

    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase().trim();
    }

    if (mongoose.connection.readyState === 1) {
      const coupon = await Coupon.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      return res.json({
        success: true,
        message: 'Coupon updated successfully',
        coupon
      });
    } else {
      const index = memoryStore.coupons.findIndex(c => c._id.toString() === id.toString());
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      memoryStore.coupons[index] = {
        ...memoryStore.coupons[index],
        ...req.body
      };
      return res.json({
        success: true,
        message: 'Coupon updated successfully',
        coupon: memoryStore.coupons[index]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const coupon = await Coupon.findByIdAndDelete(id);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      return res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } else {
      const index = memoryStore.coupons.findIndex(c => c._id.toString() === id.toString());
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      memoryStore.coupons.splice(index, 1);
      return res.json({
        success: true,
        message: 'Coupon deleted successfully'
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
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
