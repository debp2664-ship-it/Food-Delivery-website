const {
  getSeedUsers,
  getSeedRestaurants,
  getSeedFoods,
  getSeedCoupons,
  getSeedOrders
} = require('./seedData');

class MemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = getSeedUsers();
    this.restaurants = getSeedRestaurants();
    this.foods = getSeedFoods();
    this.coupons = getSeedCoupons();
    this.orders = getSeedOrders();
  }

  generateId() {
    return '66' + Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(22, '0');
  }
}

const memoryStore = new MemoryStore();

module.exports = { memoryStore };
