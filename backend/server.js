const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
// Also fallback to root .env if present
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB, getIsConnectedToMongo } = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const foodRoutes = require('./routes/foodRoutes');
const orderRoutes = require('./routes/orderRoutes');
const couponRoutes = require('./routes/couponRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all incoming cross-origin requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    brand: 'CraveNest Food Delivery',
    database: getIsConnectedToMongo() ? 'MongoDB (Connected)' : 'High-Performance In-Memory JSON Store (Active)',
    timestamp: new Date()
  });
});

// Mount REST APIs
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Static frontend file serving
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// For HTML5 history / frontend routing support, serve index.html or specific pages
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 CraveNest Backend Server running on port ${PORT}`);
    console.log(`🌐 Frontend UI: http://localhost:${PORT}`);
    console.log(`📦 REST API:    http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });

  return server;
};

// Start the server if this script is executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
