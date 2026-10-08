const mongoose = require('mongoose');

let isConnectedToMongo = false;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cravenest';
  
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout if Mongo daemon is not running
    });
    isConnectedToMongo = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB not reachable at ${mongoUri} (${error.message}).`);
    console.warn(`⚡ Falling back to high-performance In-Memory JSON Datastore. The application will run 100% functionally!`);
    isConnectedToMongo = false;
    return false;
  }
};

const getIsConnectedToMongo = () => isConnectedToMongo;

module.exports = { connectDB, getIsConnectedToMongo };
