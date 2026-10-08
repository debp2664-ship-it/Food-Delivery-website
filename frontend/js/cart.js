/**
 * CraveNest - Shopping Cart Management System
 * Handles Cart items, quantity controls, coupon discounts, calculations, and badge updates
 */

const Cart = {
  getCart() {
    try {
      const data = localStorage.getItem('cravenest_cart');
      return data ? JSON.parse(data) : { restaurantId: null, restaurantName: null, items: [], coupon: null };
    } catch (e) {
      return { restaurantId: null, restaurantName: null, items: [], coupon: null };
    }
  },

  saveCart(cart) {
    localStorage.setItem('cravenest_cart', JSON.stringify(cart));
    this.updateCartBadge();
    window.dispatchEvent(new Event('cartUpdated'));
  },

  addItem(food, restaurant = null) {
    const cart = this.getCart();

    // Check if adding from different restaurant
    if (cart.items.length > 0 && cart.restaurantId && restaurant && cart.restaurantId !== (restaurant._id || restaurant.id)) {
      if (!confirm(`Your cart already contains items from "${cart.restaurantName || 'another restaurant'}". Would you like to clear your cart and start a new order from "${restaurant.name}"?`)) {
        return false;
      }
      cart.items = [];
    }

    if (restaurant) {
      cart.restaurantId = restaurant._id || restaurant.id;
      cart.restaurantName = restaurant.name;
      cart.deliveryFee = restaurant.deliveryFee !== undefined ? restaurant.deliveryFee : 30;
    }

    const foodId = food._id || food.id;
    const existingIndex = cart.items.findIndex(item => (item.food || item._id || item.id) === foodId);

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += 1;
    } else {
      cart.items.push({
        food: foodId,
        _id: foodId,
        name: food.name,
        price: food.price,
        image: food.image,
        isVeg: food.isVeg,
        quantity: 1
      });
    }

    this.saveCart(cart);
    showToast(`Added "${food.name}" to your cart!`, 'success');
    return true;
  },

  updateQuantity(foodId, delta) {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(item => (item.food || item._id || item.id) === foodId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += delta;
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
      if (cart.items.length === 0) {
        cart.restaurantId = null;
        cart.restaurantName = null;
        cart.coupon = null;
      }
      this.saveCart(cart);
    }
  },

  removeItem(foodId) {
    const cart = this.getCart();
    cart.items = cart.items.filter(item => (item.food || item._id || item.id) !== foodId);
    if (cart.items.length === 0) {
      cart.restaurantId = null;
      cart.restaurantName = null;
      cart.coupon = null;
    }
    this.saveCart(cart);
    showToast('Item removed from cart', 'info');
  },

  clearCart() {
    const empty = { restaurantId: null, restaurantName: null, items: [], coupon: null };
    this.saveCart(empty);
    showToast('Cart cleared', 'info');
  },

  getItemCount() {
    const cart = this.getCart();
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getItemQuantity(foodId) {
    const cart = this.getCart();
    const item = cart.items.find(i => (i.food || i._id || i.id) === foodId);
    return item ? item.quantity : 0;
  },

  updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getItemCount();
    badges.forEach(b => {
      b.textContent = count;
      if (count > 0) {
        b.style.display = 'inline-block';
      } else {
        b.style.display = 'inline-block'; // keep visible with 0 or small
      }
    });
  },

  async applyCoupon(code) {
    const cart = this.getCart();
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (subtotal <= 0) {
      showToast('Add food items to cart before applying coupons', 'warning');
      return false;
    }

    try {
      const res = await API.post('/coupons/validate', {
        code,
        orderAmount: subtotal
      });

      if (res.success) {
        cart.coupon = {
          code: res.coupon.code,
          discount: res.discount,
          discountType: res.coupon.discountType,
          discountValue: res.coupon.discountValue,
          description: res.coupon.description
        };
        this.saveCart(cart);
        showToast(res.message, 'success');
        return true;
      }
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  },

  removeCoupon() {
    const cart = this.getCart();
    cart.coupon = null;
    this.saveCart(cart);
    showToast('Coupon removed', 'info');
  },

  calculateTotals() {
    const cart = this.getCart();
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Delivery fee rule: Free if subtotal >= 500
    let deliveryFee = subtotal > 0 ? (cart.deliveryFee !== undefined ? cart.deliveryFee : 30) : 0;
    if (subtotal >= 500) {
      deliveryFee = 0;
    }

    // 5% GST on food
    const tax = subtotal > 0 ? Math.round(subtotal * 0.05) : 0;

    let discount = 0;
    if (cart.coupon) {
      discount = cart.coupon.discount || 0;
    }

    const total = Math.max(0, subtotal + deliveryFee + tax - discount);

    return {
      subtotal,
      deliveryFee,
      tax,
      discount,
      total,
      coupon: cart.coupon,
      restaurantName: cart.restaurantName
    };
  }
};

// Initialize badge count on script load
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateCartBadge();
});
