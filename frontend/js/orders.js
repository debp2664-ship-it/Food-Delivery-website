/**
 * CraveNest - Order Tracking & Order History Engine
 * Visual 5-step progress timeline, dynamic status updates, cancellation, and re-order functionality
 */

const ORDER_STEPS = [
  { key: 'Order Placed', label: 'Order Placed', icon: 'fa-file-invoice' },
  { key: 'Restaurant Accepted', label: 'Restaurant Accepted', icon: 'fa-clipboard-check' },
  { key: 'Food Preparing', label: 'Food Preparing', icon: 'fa-fire' },
  { key: 'Out for Delivery', label: 'Out for Delivery', icon: 'fa-motorcycle' },
  { key: 'Delivered', label: 'Delivered', icon: 'fa-check-circle' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (!AuthHelper.isLoggedIn()) {
    showToast('Please sign in to view your orders', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  if (orderId) {
    loadOrderTracking(orderId);
  } else {
    // Show order history view directly
    document.getElementById('active-tracking-section')?.classList.add('hide');
  }

  loadOrderHistory();
});

// Load single order tracking
async function loadOrderTracking(id) {
  const trackingSection = document.getElementById('active-tracking-section');
  if (!trackingSection) return;

  trackingSection.classList.remove('hide');

  try {
    const res = await API.get(`/orders/${id}`);
    const order = res.order;
    renderOrderTracking(order);
  } catch (err) {
    trackingSection.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="background: #FEE2E2; color: #DC2626;"><i class="fas fa-exclamation-circle"></i></div>
        <h3 class="empty-state-title">Order Not Found</h3>
        <p class="empty-state-desc">${err.message}</p>
      </div>
    `;
  }
}

// Render visual progress tracker
function renderOrderTracking(order) {
  document.getElementById('tracking-order-id').textContent = order.orderId;
  document.getElementById('tracking-rest-name').textContent = order.restaurant?.name || 'Restaurant';
  document.getElementById('tracking-est-time').textContent = order.estimatedDeliveryTime || '30-40 mins';
  document.getElementById('tracking-total-amount').textContent = `₹${order.total}`;

  // Address
  const addr = order.deliveryAddress;
  document.getElementById('tracking-delivery-addr').textContent =
    `${addr.name} • ${addr.house}, ${addr.street}, ${addr.area}, ${addr.city} (${addr.phone})`;

  // Items
  const itemsContainer = document.getElementById('tracking-items-list');
  if (itemsContainer) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--border-light); font-size: 0.9rem;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="diet-indicator ${item.isVeg ? 'veg' : 'nonveg'}" style="width: 14px; height: 14px;"></span>
          <span style="font-weight: 600;">${item.name} × ${item.quantity}</span>
        </div>
        <div style="font-weight: 700;">₹${item.price * item.quantity}</div>
      </div>
    `).join('');
  }

  // Render 5-step progress tracker
  const stepsContainer = document.getElementById('tracking-steps-container');
  if (stepsContainer) {
    if (order.status === 'Cancelled') {
      stepsContainer.innerHTML = `
        <div style="background: #FEF2F2; border: 1.5px solid #EF4444; border-radius: var(--radius-lg); padding: 20px; text-align: center; color: #DC2626;">
          <i class="fas fa-times-circle" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
          <h3 style="font-size: 1.25rem; font-weight: 800;">This Order Has Been Cancelled</h3>
          <p style="font-size: 0.88rem; color: #991B1B;">Status history: ${order.statusHistory?.map(h => h.note || h.status).join(' • ') || 'Order was cancelled'}</p>
        </div>
      `;
    } else {
      const currentStepIndex = ORDER_STEPS.findIndex(s => s.key === order.status);

      stepsContainer.innerHTML = `
        <div class="stepper-progress-bar" style="position: relative; display: flex; align-items: center; justify-content: space-between; margin: 30px 10px 40px;">
          <div style="position: absolute; top: 22px; left: 20px; right: 20px; height: 4px; background: #E2E8F0; z-index: 1;">
            <div style="height: 100%; background: var(--accent-emerald); width: ${(Math.max(0, currentStepIndex) / (ORDER_STEPS.length - 1)) * 100}%; transition: width 0.5s ease;"></div>
          </div>
          ${ORDER_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return `
              <div class="stepper-step-node" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: ${isCompleted ? 'var(--accent-emerald)' : 'white'}; border: 3px solid ${isCompleted ? 'var(--accent-emerald)' : '#CBD5E1'}; color: ${isCompleted ? 'white' : '#94A3B8'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: ${isCurrent ? '0 0 0 6px rgba(16, 185, 129, 0.2)' : 'none'};">
                  <i class="fas ${step.icon}"></i>
                </div>
                <div style="font-size: 0.78rem; font-weight: ${isCurrent ? '800' : '600'}; color: ${isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'}; max-width: 80px;">
                  ${step.label}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancel-order-btn');
  if (cancelBtn) {
    if (order.status === 'Order Placed') {
      cancelBtn.style.display = 'inline-block';
      cancelBtn.onclick = async () => {
        if (confirm('Are you sure you want to cancel this order?')) {
          try {
            const res = await API.put(`/orders/${order._id || order.orderId}/status`, {
              status: 'Cancelled',
              note: 'Cancelled by customer'
            });
            showToast('Order cancelled', 'info');
            renderOrderTracking(res.order);
            loadOrderHistory();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      };
    } else {
      cancelBtn.style.display = 'none';
    }
  }

  // Refresh tracker button
  const refreshBtn = document.getElementById('refresh-tracking-btn');
  if (refreshBtn) {
    refreshBtn.onclick = () => loadOrderTracking(order.orderId || order._id);
  }
}

// Load Order History List
async function loadOrderHistory() {
  const container = document.getElementById('order-history-list-container');
  if (!container) return;

  try {
    const res = await API.get('/orders/user/my-orders');
    const orders = res.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-receipt"></i></div>
          <h3 class="empty-state-title">No Orders Yet</h3>
          <p class="empty-state-desc">You haven't placed any orders yet. Discover delicious foods from top restaurants now!</p>
          <a href="restaurants.html" class="btn-primary" style="margin: 0 auto;">Browse Restaurants</a>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      let statusClass = 'status-placed';
      if (order.status === 'Delivered') statusClass = 'status-delivered';
      if (order.status === 'Out for Delivery') statusClass = 'status-out';
      if (order.status === 'Food Preparing') statusClass = 'status-preparing';
      if (order.status === 'Cancelled') statusClass = 'status-cancelled';

      const itemsSummary = order.items.map(i => `${i.name} (×${i.quantity})`).join(', ');

      return `
        <div class="order-history-card tilt-card-3d" style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 22px; margin-bottom: 20px; box-shadow: var(--shadow-sm); position: relative;">
          <div class="card-glare"></div>
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light);">
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary);">${order.restaurant?.name || 'Restaurant'}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Order #${order.orderId} • ${new Date(order.createdAt).toLocaleDateString()} at ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="status-badge-pill ${statusClass}">${order.status}</span>
              <span style="font-family: 'Outfit'; font-weight: 800; font-size: 1.2rem; color: var(--text-primary);">₹${order.total}</span>
            </div>
          </div>
          <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 16px;">
            ${itemsSummary}
          </div>
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
            <button class="btn-secondary reorder-btn-action" data-order-id="${order._id}" style="padding: 7px 16px; font-size: 0.85rem;">
              <i class="fas fa-redo"></i> Reorder
            </button>
            <a href="orders.html?id=${order.orderId}" class="btn-primary" style="padding: 7px 18px; font-size: 0.85rem;">
              <i class="fas fa-location-arrow"></i> Track Order
            </a>
          </div>
        </div>
      `;
    }).join('');

    if (window.init3DTilt) window.init3DTilt(container);

    // Reorder Action: Adds items back to cart and goes to cart
    container.querySelectorAll('.reorder-btn-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.orderId;
        const targetOrder = orders.find(o => o._id === orderId);
        if (targetOrder) {
          targetOrder.items.forEach(item => {
            Cart.addItem({
              _id: item.food || item._id,
              name: item.name,
              price: item.price,
              image: item.image,
              isVeg: item.isVeg
            }, targetOrder.restaurant);
          });
          showToast('Items added to cart from previous order!', 'success');
          setTimeout(() => { window.location.href = 'cart.html'; }, 600);
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}
