/**
 * CraveNest - Checkout Engine
 * Address selection & modal, order summary breakdown, simulated payments, and order placement
 */

let selectedAddress = null;
let savedAddresses = [];
let selectedPaymentMethod = 'Cash on Delivery';

document.addEventListener('DOMContentLoaded', () => {
  // Ensure user is logged in before accessing checkout
  if (!AuthHelper.isLoggedIn()) {
    showToast('Please sign in to proceed with checkout', 'info');
    setTimeout(() => {
      window.location.href = `login.html?redirect=checkout.html`;
    }, 800);
    return;
  }

  // Ensure cart is not empty
  const cart = Cart.getCart();
  if (cart.items.length === 0) {
    showToast('Your cart is empty. Add items to checkout!', 'warning');
    setTimeout(() => {
      window.location.href = 'restaurants.html';
    }, 1000);
    return;
  }

  loadUserAddresses();
  renderOrderSummary();
  initAddressModal();
  initPaymentSelection();
  initPlaceOrder();
});

// Load user saved addresses from backend profile
async function loadUserAddresses() {
  const container = document.getElementById('saved-addresses-list');
  if (!container) return;

  try {
    const res = await API.get('/users/profile');
    savedAddresses = (res.user && res.user.addresses) || [];

    if (savedAddresses.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; background: var(--bg-subtle); border-radius: var(--radius-md); text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
          No saved addresses found. Please add a delivery address below.
        </div>
      `;
      return;
    }

    container.innerHTML = savedAddresses.map((addr, idx) => `
      <div class="address-card-option ${idx === 0 ? 'selected' : ''}" data-id="${addr._id}" style="border: 2px solid ${idx === 0 ? 'var(--primary)' : 'var(--border-color)'}; background: ${idx === 0 ? '#FFF8F6' : 'white'}; border-radius: var(--radius-md); padding: 16px; cursor: pointer; margin-bottom: 12px; transition: all 0.2s;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span class="badge ${addr.type === 'Home' ? 'badge-primary' : 'badge-warning'}">${addr.type || 'Home'}</span>
          <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${addr.phone}</span>
        </div>
        <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 2px;">${addr.name}</div>
        <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.4;">
          ${addr.house}, ${addr.street}, ${addr.area}, ${addr.city} - ${addr.pincode}
        </div>
      </div>
    `).join('');

    selectedAddress = savedAddresses[0];

    // Address card click handlers
    container.querySelectorAll('.address-card-option').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.address-card-option').forEach(c => {
          c.classList.remove('selected');
          c.style.borderColor = 'var(--border-color)';
          c.style.background = 'white';
        });
        card.classList.add('selected');
        card.style.borderColor = 'var(--primary)';
        card.style.background = '#FFF8F6';

        const id = card.dataset.id;
        selectedAddress = savedAddresses.find(a => a._id === id);
      });
    });
  } catch (err) {
    console.error(err);
  }
}

// Render Order Summary
function renderOrderSummary() {
  const itemsContainer = document.getElementById('checkout-items-list');
  const totals = Cart.calculateTotals();
  const cart = Cart.getCart();

  if (itemsContainer) {
    itemsContainer.innerHTML = `
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; font-weight: 600;">
        From: <strong style="color: var(--text-primary);">${cart.restaurantName || 'Restaurant'}</strong>
      </div>
      ${cart.items.map(item => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--border-light); font-size: 0.9rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="diet-indicator ${item.isVeg ? 'veg' : 'nonveg'}" style="width: 14px; height: 14px;"></span>
            <span style="font-weight: 600;">${item.name} <span style="color: var(--text-muted); font-size: 0.8rem;">× ${item.quantity}</span></span>
          </div>
          <div style="font-family: 'Outfit'; font-weight: 700;">₹${item.price * item.quantity}</div>
        </div>
      `).join('')}
    `;
  }

  // Update Bill Elements
  document.getElementById('checkout-subtotal').textContent = `₹${totals.subtotal}`;
  document.getElementById('checkout-delivery-fee').textContent = totals.deliveryFee === 0 ? 'FREE' : `₹${totals.deliveryFee}`;
  document.getElementById('checkout-tax').textContent = `₹${totals.tax}`;

  const discountRow = document.getElementById('checkout-discount-row');
  if (discountRow) {
    if (totals.discount > 0) {
      discountRow.style.display = 'flex';
      document.getElementById('checkout-discount').textContent = `- ₹${totals.discount}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  document.getElementById('checkout-final-total').textContent = `₹${totals.total}`;
}

// Initialize Add Address Modal
function initAddressModal() {
  const modal = document.getElementById('address-modal');
  const openBtn = document.getElementById('add-new-address-btn');
  const closeBtn = document.getElementById('close-address-modal');
  const form = document.getElementById('new-address-form');

  if (!modal || !openBtn) return;

  openBtn.addEventListener('click', () => modal.classList.add('show'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addrData = {
        name: document.getElementById('addr-name').value.trim(),
        phone: document.getElementById('addr-phone').value.trim(),
        house: document.getElementById('addr-house').value.trim(),
        street: document.getElementById('addr-street').value.trim(),
        area: document.getElementById('addr-area').value.trim(),
        city: document.getElementById('addr-city').value.trim(),
        state: document.getElementById('addr-state').value.trim() || 'West Bengal',
        pincode: document.getElementById('addr-pincode').value.trim(),
        type: document.getElementById('addr-type').value,
        isDefault: true
      };

      try {
        const res = await API.post('/users/address', addrData);
        if (res.success) {
          showToast('Delivery address saved!', 'success');
          modal.classList.remove('show');
          form.reset();
          await loadUserAddresses();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

// Payment Selection
function initPaymentSelection() {
  const paymentCards = document.querySelectorAll('.payment-option-card');
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'var(--border-color)';
        c.style.background = 'white';
      });
      card.classList.add('active');
      card.style.borderColor = 'var(--primary)';
      card.style.background = '#FFF8F6';

      selectedPaymentMethod = card.dataset.method;

      // Show/hide simulated card or UPI form fields if selected
      const upiWrap = document.getElementById('simulated-upi-wrap');
      const cardWrap = document.getElementById('simulated-card-wrap');
      if (upiWrap) upiWrap.style.display = selectedPaymentMethod === 'UPI' ? 'block' : 'none';
      if (cardWrap) cardWrap.style.display = selectedPaymentMethod === 'Card' ? 'block' : 'none';
    });
  });
}

// Order Placement Handler
function initPlaceOrder() {
  const placeOrderBtn = document.getElementById('place-order-btn');
  if (!placeOrderBtn) return;

  placeOrderBtn.addEventListener('click', async () => {
    if (!selectedAddress) {
      showToast('Please select or add a delivery address', 'warning');
      return;
    }

    const cart = Cart.getCart();
    if (cart.items.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }

    const instructions = document.getElementById('delivery-instructions')?.value.trim() || '';

    try {
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

      const orderPayload = {
        restaurantId: cart.restaurantId,
        items: cart.items,
        deliveryAddress: selectedAddress,
        paymentMethod: selectedPaymentMethod,
        couponCode: cart.coupon ? cart.coupon.code : undefined,
        deliveryInstructions: instructions
      };

      const res = await API.post('/orders', orderPayload);

      if (res.success) {
        showToast('🎉 Order placed successfully!', 'success');
        Cart.clearCart();

        setTimeout(() => {
          window.location.href = `orders.html?id=${res.order.orderId || res.order._id}`;
        }, 800);
      }
    } catch (err) {
      showToast(err.message, 'error');
      placeOrderBtn.disabled = false;
      placeOrderBtn.innerHTML = 'Place Order Now';
    }
  });
}
