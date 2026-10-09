const mongoose = require('mongoose');

let isConnectedToMongo = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnectedToMongo = true;
    return true;
  }

  const mongoUri = process.env.MONGO_URI;

  // On serverless platforms like Vercel, skip localhost/127.0.0.1 timeout if no cloud URI is provided
  if ((!mongoUri || mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost')) && process.env.VERCEL) {
    isConnectedToMongo = false;
    return false;
  }

  const uriToUse = mongoUri || 'mongodb://127.0.0.1:27017/cravenest';

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uriToUse, {
      serverSelectionTimeoutMS: 2500, // Quick timeout if Mongo daemon is not running
    });
    isConnectedToMongo = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB not reachable at ${uriToUse} (${error.message}).`);
    console.warn(`⚡ Falling back to high-performance In-Memory JSON Datastore. The application will run 100% functionally!`);
    isConnectedToMongo = false;
    return false;
  }
};

const getIsConnectedToMongo = () => isConnectedToMongo || mongoose.connection.readyState === 1;

module.exports = { connectDB, getIsConnectedToMongo };
