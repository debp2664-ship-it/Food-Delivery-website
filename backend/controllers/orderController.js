const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Coupon = require('../models/Coupon');
const { memoryStore } = require('../services/memoryStore');

// Generate unique human-friendly order identifier
const generateOrderId = () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `CN-ORD-${dateStr}-${randNum}`;
};

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      items,
      deliveryAddress,
      paymentMethod,
      couponCode,
      deliveryInstructions
    } = req.body;

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty or missing restaurant reference'
      });
    }

    if (!deliveryAddress || !deliveryAddress.house || !deliveryAddress.street || !deliveryAddress.area) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a complete delivery address'
      });
    }

    // Get restaurant info
    let restaurant;
    if (mongoose.connection.readyState === 1) {
      restaurant = await Restaurant.findById(restaurantId);
    } else {
      restaurant = memoryStore.restaurants.find(r => r._id.toString() === restaurantId.toString());
    }

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Selected restaurant not found'
      });
    }

    // Calculate subtotal
    let subtotal = 0;
    const formattedItems = items.map(item => {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      subtotal += price * quantity;
      return {
        food: item.food || item._id,
        name: item.name,
        price,
        quantity,
        image: item.image || '',
        isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true
      };
    });

    // Delivery fee logic
    let deliveryFee = restaurant.deliveryFee || 30;
    if (subtotal >= 500) {
      deliveryFee = 0; // Free delivery above 500
    }

    // Tax logic (5% GST)
    const tax = Math.round(subtotal * 0.05);

    // Coupon discount logic
    let discount = 0;
    let validCouponCode = '';

    if (couponCode) {
      const codeUpper = couponCode.toUpperCase().trim();
      let coupon;
      if (mongoose.connection.readyState === 1) {
        coupon = await Coupon.findOne({ code: codeUpper, isActive: true });
      } else {
        coupon = memoryStore.coupons.find(c => c.code.toUpperCase() === codeUpper && c.isActive !== false);
      }

      if (coupon && (!coupon.expiryDate || new Date(coupon.expiryDate) >= new Date())) {
        if (!coupon.minimumOrder || subtotal >= coupon.minimumOrder) {
          if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maximumDiscount) discount = Math.min(discount, coupon.maximumDiscount);
          } else {
            discount = coupon.discountValue;
            if (coupon.maximumDiscount) discount = Math.min(discount, coupon.maximumDiscount);
          }
          discount = Math.min(discount, subtotal);
          validCouponCode = coupon.code;
        }
      }
    }

    const total = Math.max(0, subtotal + deliveryFee + tax - Math.round(discount));
    const orderId = generateOrderId();

    const orderData = {
      orderId,
      user: req.user._id,
      restaurant: restaurant._id,
      items: formattedItems,
      deliveryAddress,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Completed',
      subtotal,
      deliveryFee,
      tax,
      discount: Math.round(discount),
      couponApplied: validCouponCode,
      total,
      status: 'Order Placed',
      statusHistory: [
        {
          status: 'Order Placed',
          time: new Date(),
          note: 'Order successfully placed by customer'
        }
      ],
      estimatedDeliveryTime: restaurant.deliveryTime || '30-40 mins',
      deliveryInstructions: deliveryInstructions || '',
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const newOrder = await Order.create(orderData);
      const populatedOrder = await Order.findById(newOrder._id)
        .populate('restaurant', 'name cuisine image address rating')
        .populate('user', 'name email phone');

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        order: populatedOrder
      });
    } else {
      orderData._id = memoryStore.generateId();
      memoryStore.orders.unshift(orderData);

      const populatedOrder = {
        ...orderData,
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          image: restaurant.image,
          address: restaurant.address,
          rating: restaurant.rating
        },
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone
        }
      };

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        order: populatedOrder
      });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to place order'
    });
  }
};

// @desc    Get all orders (Admin gets all, user gets their own)
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const { status, search } = req.query;

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (req.user.role !== 'admin') {
        query.user = req.user._id;
      }

      if (status && status !== 'All') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { orderId: { $regex: search, $options: 'i' } },
          { 'deliveryAddress.name': { $regex: search, $options: 'i' } },
          { 'deliveryAddress.phone': { $regex: search, $options: 'i' } }
        ];
      }

      const orders = await Order.find(query)
        .populate('restaurant', 'name image address cuisine')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: orders.length,
        orders
      });
    } else {
      let list = [...memoryStore.orders];

      if (req.user.role !== 'admin') {
        list = list.filter(o => o.user.toString() === req.user._id.toString());
      }

      if (status && status !== 'All') {
        list = list.filter(o => o.status === status);
      }

      if (search) {
        const s = search.toLowerCase();
        list = list.filter(o =>
          (o.orderId && o.orderId.toLowerCase().includes(s)) ||
          (o.deliveryAddress && o.deliveryAddress.name && o.deliveryAddress.name.toLowerCase().includes(s))
        );
      }

      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const populated = list.map(o => {
        const rest = memoryStore.restaurants.find(r => r._id.toString() === o.restaurant.toString());
        const usr = memoryStore.users.find(u => u._id.toString() === o.user.toString());
        return {
          ...o,
          restaurant: rest ? {
            _id: rest._id,
            name: rest.name,
            image: rest.image,
            address: rest.address,
            cuisine: rest.cuisine
          } : o.restaurant,
          user: usr ? {
            _id: usr._id,
            name: usr.name,
            email: usr.email,
            phone: usr.phone
          } : o.user
        };
      });

      return res.json({
        success: true,
        count: populated.length,
        orders: populated
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's personal orders
// @route   GET /api/orders/user/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const orders = await Order.find({ user: req.user._id })
        .populate('restaurant', 'name image address cuisine deliveryTime')
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: orders.length,
        orders
      });
    } else {
      const list = memoryStore.orders
        .filter(o => o.user.toString() === req.user._id.toString())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(o => {
          const rest = memoryStore.restaurants.find(r => r._id.toString() === o.restaurant.toString());
          return {
            ...o,
            restaurant: rest ? {
              _id: rest._id,
              name: rest.name,
              image: rest.image,
              address: rest.address,
              cuisine: rest.cuisine,
              deliveryTime: rest.deliveryTime
            } : o.restaurant
          };
        });

      return res.json({
        success: true,
        count: list.length,
        orders: list
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single order by ID or orderId
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      let order;
      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id)
          .populate('restaurant', 'name image address cuisine rating deliveryTime')
          .populate('user', 'name email phone');
      }

      if (!order) {
        order = await Order.findOne({ orderId: id })
          .populate('restaurant', 'name image address cuisine rating deliveryTime')
          .populate('user', 'name email phone');
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check authorization (only owner or admin can view)
      if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }

      return res.json({
        success: true,
        order
      });
    } else {
      let order = memoryStore.orders.find(o => o._id.toString() === id.toString() || o.orderId === id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }

      const rest = memoryStore.restaurants.find(r => r._id.toString() === order.restaurant.toString());
      const usr = memoryStore.users.find(u => u._id.toString() === order.user.toString());

      return res.json({
        success: true,
        order: {
          ...order,
          restaurant: rest ? {
            _id: rest._id,
            name: rest.name,
            image: rest.image,
            address: rest.address,
            cuisine: rest.cuisine,
            rating: rest.rating,
            deliveryTime: rest.deliveryTime
          } : order.restaurant,
          user: usr ? {
            _id: usr._id,
            name: usr.name,
            email: usr.email,
            phone: usr.phone
          } : order.user
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

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin, or User for cancelling pending order)
const updateOrderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, note } = req.body;

    const validStatuses = [
      'Order Placed',
      'Restaurant Accepted',
      'Food Preparing',
      'Out for Delivery',
      'Delivered',
      'Cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    if (mongoose.connection.readyState === 1) {
      let order = await Order.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
          { orderId: id }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if user is cancelling
      if (req.user.role !== 'admin') {
        if (order.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only manage your own orders'
          });
        }
        if (status !== 'Cancelled') {
          return res.status(403).json({
            success: false,
            message: 'Only admins can update order processing status'
          });
        }
        if (order.status !== 'Order Placed') {
          return res.status(400).json({
            success: false,
            message: 'Order cannot be cancelled after the restaurant has accepted it'
          });
        }
      }

      order.status = status;
      order.statusHistory.push({
        status,
        time: new Date(),
        note: note || (status === 'Cancelled' ? 'Order cancelled' : `Status changed to ${status}`)
      });

      await order.save();

      return res.json({
        success: true,
        message: `Order status updated to '${status}'`,
        order
      });
    } else {
      let order = memoryStore.orders.find(o => o._id.toString() === id.toString() || o.orderId === id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (req.user.role !== 'admin') {
        if (order.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only manage your own orders'
          });
        }
        if (status !== 'Cancelled') {
          return res.status(403).json({
            success: false,
            message: 'Only admins can update order processing status'
          });
        }
        if (order.status !== 'Order Placed') {
          return res.status(400).json({
            success: false,
            message: 'Order cannot be cancelled after the restaurant has accepted it'
          });
        }
      }

      order.status = status;
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status,
        time: new Date(),
        note: note || (status === 'Cancelled' ? 'Order cancelled' : `Status changed to ${status}`)
      });

      return res.json({
        success: true,
        message: `Order status updated to '${status}'`,
        order
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
  createOrder,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus
};
