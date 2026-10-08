require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Restaurant = require('./models/Restaurant');
const Food = require('./models/Food');
const Order = require('./models/Order');
const Coupon = require('./models/Coupon');
const {
  getSeedUsers,
  getSeedRestaurants,
  getSeedFoods,
  getSeedCoupons,
  getSeedOrders
} = require('./services/seedData');

const seedDatabase = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cravenest';

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ Connected to MongoDB. Clearing existing collections...');

    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await Food.deleteMany({});
    await Order.deleteMany({});
    await Coupon.deleteMany({});

    console.log('Importing seed data into MongoDB...');
    const users = getSeedUsers();
    const restaurants = getSeedRestaurants();
    const foods = getSeedFoods();
    const coupons = getSeedCoupons();
    const orders = getSeedOrders();

    // Use insertMany (passwords already hashed in getSeedUsers)
    await User.insertMany(users);
    console.log(`✅ Users inserted: ${users.length}`);

    await Restaurant.insertMany(restaurants);
    console.log(`✅ Restaurants inserted: ${restaurants.length}`);

    await Food.insertMany(foods);
    console.log(`✅ Foods inserted: ${foods.length}`);

    await Coupon.insertMany(coupons);
    console.log(`✅ Coupons inserted: ${coupons.length}`);

    await Order.insertMany(orders);
    console.log(`✅ Orders inserted: ${orders.length}`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Accounts:');
    console.log('Admin: admin@example.com  |  Password: admin123');
    console.log('User:  user@example.com   |  Password: user123');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to seed MongoDB: ${error.message}`);
    console.log('\n💡 Note: If local MongoDB service is not started, the application');
    console.log('automatically runs with in-memory persistence loaded with this exact seed data!');
    process.exit(1);
  }
};

seedDatabase();
