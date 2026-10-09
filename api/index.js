const { app } = require('../backend/server');
const { connectDB } = require('../backend/config/database');

module.exports = async (req, res) => {
  if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('127.0.0.1')) {
    try {
      await connectDB();
    } catch (e) {
      // Fallback silently to memoryStore
    }
  }
  return app(req, res);
};
