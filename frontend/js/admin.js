/**
 * CraveNest - Complete Admin Dashboard Portal
 * Analytics stats, live order management, restaurant CRUD, food items CRUD, coupons, and user access controls
 */

let allAdminRestaurants = [];
let allAdminFoods = [];
let allAdminOrders = [];
let allAdminCoupons = [];
let allAdminUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  // Ensure user is logged in as admin
  if (!AuthHelper.isLoggedIn() || !AuthHelper.isAdmin()) {
    showToast('Admin access required. Please sign in with admin credentials.', 'error');
    setTimeout(() => {
      window.location.href = 'login.html?redirect=admin.html';
    }, 1000);
    return;
  }

  // Set admin name in sidebar
  const adminUser = AuthHelper.getUser();
  if (adminUser) {
    const nameEl = document.getElementById('admin-sidebar-name');
    if (nameEl) nameEl.textContent = adminUser.name;
  }

  initAdminNavTabs();
  loadAdminStats();
  loadAdminOrders();
  loadAdminRestaurants();
  loadAdminFoods();
  loadAdminCoupons();
  loadAdminUsers();
  initAdminModals();
});

// Sidebar Tab Switching
function initAdminNavTabs() {
  const tabs = document.querySelectorAll('.admin-nav-item');
  const sections = document.querySelectorAll('.admin-tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.style.display = 'none');

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.style.display = 'block';

      // Update Topbar Title
      const titleEl = document.getElementById('admin-active-tab-title');
      if (titleEl) titleEl.textContent = tab.textContent.trim();
    });
  });
}

// 1. Analytics & Overview Stats
async function loadAdminStats() {
  try {
    const res = await API.get('/admin/stats');
    const s = res.stats;

    document.getElementById('stat-total-revenue').textContent = `₹${s.totalRevenue}`;
    document.getElementById('stat-total-orders').textContent = s.totalOrders;
    document.getElementById('stat-today-orders').textContent = s.todayOrders;
    document.getElementById('stat-pending-orders').textContent = s.pendingOrders;
    document.getElementById('stat-total-restaurants').textContent = s.totalRestaurants;
    document.getElementById('stat-total-users').textContent = s.totalUsers;

    if (window.init3DTilt) {
      window.init3DTilt(document.querySelector('.stats-cards-grid') || document);
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// 2. Manage Orders
async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-table-body');
  if (!container) return;

  try {
    const res = await API.get('/orders');
    allAdminOrders = res.orders || [];

    renderAdminOrdersTable(allAdminOrders);

    // Search filter
    const searchInput = document.getElementById('admin-order-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allAdminOrders.filter(o =>
          o.orderId.toLowerCase().includes(val) ||
          (o.deliveryAddress?.name && o.deliveryAddress.name.toLowerCase().includes(val)) ||
          (o.restaurant?.name && o.restaurant.name.toLowerCase().includes(val))
        );
        renderAdminOrdersTable(filtered);
      });
    }

    // Status filter dropdown
    const statusSelect = document.getElementById('admin-order-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const filtered = val === 'All' ? allAdminOrders : allAdminOrders.filter(o => o.status === val);
        renderAdminOrdersTable(filtered);
      });
    }
  } catch (err) {
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">${err.message}</td></tr>`;
  }
}

function renderAdminOrdersTable(orders) {
  const container = document.getElementById('admin-orders-table-body');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No orders found</td></tr>`;
    return;
  }

  const validStatuses = [
    'Order Placed',
    'Restaurant Accepted',
    'Food Preparing',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  container.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight: 700;">#${o.orderId}</td>
      <td>
        <div style="font-weight: 600;">${o.deliveryAddress?.name || o.user?.name || 'Customer'}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${o.deliveryAddress?.phone || ''}</div>
      </td>
      <td>${o.restaurant?.name || 'Restaurant'}</td>
      <td style="font-family: 'Outfit'; font-weight: 800;">₹${o.total}</td>
      <td>
        <select class="status-select order-status-select" data-id="${o._id || o.orderId}">
          ${validStatuses.map(st => `
            <option value="${st}" ${st === o.status ? 'selected' : ''}>${st}</option>
          `).join('')}
        </select>
      </td>
      <td style="font-size: 0.82rem; color: var(--text-muted);">${new Date(o.createdAt).toLocaleDateString()} ${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>
        <button class="action-btn-sm view-order-details-btn" data-id="${o._id || o.orderId}" title="View Details">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Handle status update change
  container.querySelectorAll('.order-status-select').forEach(select => {
    select.addEventListener('change', async () => {
      const id = select.dataset.id;
      const newStatus = select.value;

      try {
        await API.put(`/orders/${id}/status`, {
          status: newStatus,
          note: `Status updated by administrator to ${newStatus}`
        });
        showToast(`Order status updated to "${newStatus}"`, 'success');
        loadAdminStats();
      } catch (err) {
        showToast(err.message, 'error');
        loadAdminOrders();
      }
    });
  });

  // Handle View Details modal
  container.querySelectorAll('.view-order-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const order = orders.find(o => (o._id === id || o.orderId === id));
      if (order) showOrderDetailsModal(order);
    });
  });
}

function showOrderDetailsModal(order) {
  const modal = document.getElementById('admin-modal-view-order');
  const body = document.getElementById('admin-order-modal-body');

  body.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 800; font-size: 1.1rem;">Order #${order.orderId}</span>
        <span class="badge badge-primary">${order.status}</span>
      </div>
      <div style="font-size: 0.88rem; color: var(--text-secondary);">
        <strong>Restaurant:</strong> ${order.restaurant?.name || 'Restaurant'}<br>
        <strong>Customer:</strong> ${order.deliveryAddress?.name} (${order.deliveryAddress?.phone})<br>
        <strong>Delivery Address:</strong> ${order.deliveryAddress?.house}, ${order.deliveryAddress?.street}, ${order.deliveryAddress?.area}, ${order.deliveryAddress?.city} - ${order.deliveryAddress?.pincode}<br>
        <strong>Payment Method:</strong> ${order.paymentMethod} (${order.paymentStatus})
      </div>
    </div>
    <div style="border-top: 1px solid var(--border-light); padding-top: 12px; margin-bottom: 16px;">
      <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px;">Ordered Items:</h4>
      ${order.items.map(i => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.88rem;">
          <span>${i.name} × ${i.quantity}</span>
          <span style="font-weight: 700;">₹${i.price * i.quantity}</span>
        </div>
      `).join('')}
    </div>
    <div style="border-top: 1px dashed var(--border-color); padding-top: 10px; font-size: 0.9rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Subtotal:</span><span>₹${order.subtotal}</span></div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Delivery Fee:</span><span>₹${order.deliveryFee}</span></div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Tax (GST):</span><span>₹${order.tax}</span></div>
      ${order.discount ? `<div style="display: flex; justify-content: space-between; color: var(--accent-emerald); margin-bottom: 4px;"><span>Discount:</span><span>- ₹${order.discount}</span></div>` : ''}
      <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 6px;">
        <span>Final Total:</span><span>₹${order.total}</span>
      </div>
    </div>
  `;

  modal.classList.add('show');
}

// 3. Manage Restaurants
async function loadAdminRestaurants() {
  const container = document.getElementById('admin-restaurants-table-body');
  if (!container) return;

  try {
    const res = await API.get('/restaurants');
    allAdminRestaurants = res.restaurants || [];
    renderAdminRestaurantsTable(allAdminRestaurants);
  } catch (err) {
    console.error(err);
  }
}

function renderAdminRestaurantsTable(restaurants) {
  const container = document.getElementById('admin-restaurants-table-body');
  if (!container) return;

  container.innerHTML = restaurants.map(r => `
    <tr>
      <td><img src="${r.image}" class="table-img-thumb" alt="${r.name}"></td>
      <td style="font-weight: 700;">${r.name}</td>
      <td style="font-size: 0.85rem; color: var(--text-secondary);">${r.cuisine.join(', ')}</td>
      <td><span class="rating-badge">★ ${r.rating}</span></td>
      <td>${r.address?.area || 'Kolkata'}</td>
      <td>
        <span class="badge ${r.isActive !== false ? 'badge-success' : 'badge-danger'}">
          ${r.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn-sm edit edit-restaurant-btn" data-id="${r._id}" title="Edit Restaurant"><i class="fas fa-edit"></i></button>
          <button class="action-btn-sm delete delete-restaurant-btn" data-id="${r._id}" title="Delete Restaurant"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  // Delete Restaurant
  container.querySelectorAll('.delete-restaurant-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Are you sure you want to delete this restaurant and all associated food items?')) {
        try {
          await API.delete(`/restaurants/${id}`);
          showToast('Restaurant deleted', 'success');
          loadAdminRestaurants();
          loadAdminFoods();
          loadAdminStats();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // Edit Restaurant
  container.querySelectorAll('.edit-restaurant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const rest = restaurants.find(r => r._id === id);
      if (rest) openEditRestaurantModal(rest);
    });
  });
}

// 4. Manage Foods
async function loadAdminFoods() {
  const container = document.getElementById('admin-foods-table-body');
  if (!container) return;

  try {
    const res = await API.get('/foods');
    allAdminFoods = res.foods || [];
    renderAdminFoodsTable(allAdminFoods);
  } catch (err) {
    console.error(err);
  }
}

function renderAdminFoodsTable(foods) {
  const container = document.getElementById('admin-foods-table-body');
  if (!container) return;

  container.innerHTML = foods.map(f => {
    const restName = typeof f.restaurant === 'object' ? f.restaurant.name : 'Restaurant';
    return `
      <tr>
        <td><img src="${f.image}" class="table-img-thumb" alt="${f.name}"></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="diet-indicator ${f.isVeg ? 'veg' : 'nonveg'}" style="width: 14px; height: 14px;"></span>
            <span style="font-weight: 700;">${f.name}</span>
          </div>
        </td>
        <td style="font-size: 0.85rem;">${restName}</td>
        <td><span class="badge badge-primary">${f.category}</span></td>
        <td style="font-family: 'Outfit'; font-weight: 800;">₹${f.price}</td>
        <td>
          <span class="badge ${f.isAvailable !== false ? 'badge-success' : 'badge-danger'}">
            ${f.isAvailable !== false ? 'In Stock' : 'Unavailable'}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn-sm edit edit-food-btn" data-id="${f._id}" title="Edit Food"><i class="fas fa-edit"></i></button>
            <button class="action-btn-sm delete delete-food-btn" data-id="${f._id}" title="Delete Food"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Delete Food
  container.querySelectorAll('.delete-food-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Are you sure you want to delete this food item?')) {
        try {
          await API.delete(`/foods/${id}`);
          showToast('Food item deleted', 'success');
          loadAdminFoods();
          loadAdminStats();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // Edit Food
  container.querySelectorAll('.edit-food-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const food = foods.find(f => f._id === id);
      if (food) openEditFoodModal(food);
    });
  });
}

// 5. Manage Coupons
async function loadAdminCoupons() {
  const container = document.getElementById('admin-coupons-table-body');
  if (!container) return;

  try {
    const res = await API.get('/coupons');
    allAdminCoupons = res.coupons || [];

    container.innerHTML = allAdminCoupons.map(c => `
      <tr>
        <td style="font-family: 'Outfit'; font-weight: 800; font-size: 1rem; color: var(--primary);">${c.code}</td>
        <td style="font-size: 0.85rem;">${c.description}</td>
        <td>${c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
        <td>₹${c.minimumOrder || 0}</td>
        <td>
          <span class="badge ${c.isActive !== false ? 'badge-success' : 'badge-danger'}">
            ${c.isActive !== false ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn-sm delete delete-coupon-btn" data-id="${c._id}" title="Delete Coupon"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    // Delete coupon
    container.querySelectorAll('.delete-coupon-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Are you sure you want to delete this coupon?')) {
          try {
            await API.delete(`/coupons/${id}`);
            showToast('Coupon deleted', 'success');
            loadAdminCoupons();
            loadAdminStats();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

// 6. Manage Users
async function loadAdminUsers() {
  const container = document.getElementById('admin-users-table-body');
  if (!container) return;

  try {
    const res = await API.get('/admin/users');
    allAdminUsers = res.users || [];

    renderAdminUsersTable(allAdminUsers);

    const searchInput = document.getElementById('admin-user-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allAdminUsers.filter(u =>
          u.name.toLowerCase().includes(val) ||
          u.email.toLowerCase().includes(val) ||
          (u.phone && u.phone.includes(val))
        );
        renderAdminUsersTable(filtered);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function renderAdminUsersTable(users) {
  const container = document.getElementById('admin-users-table-body');
  if (!container) return;

  container.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight: 700;">${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone || 'N/A'}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}">${u.role}</span></td>
      <td>
        <span class="badge ${u.isActive !== false ? 'badge-success' : 'badge-danger'}">
          ${u.isActive !== false ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td>
        <button class="btn-secondary toggle-user-status-btn" data-id="${u._id}" style="padding: 5px 12px; font-size: 0.8rem;">
          ${u.isActive !== false ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  `).join('');

  container.querySelectorAll('.toggle-user-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        const res = await API.put(`/admin/users/${id}/status`, {});
        showToast(res.message, 'success');
        loadAdminUsers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// Modals Setup (Add/Edit Restaurant, Food, Coupon)
function initAdminModals() {
  // Close buttons on all modals
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
    });
  });

  // Open Add Restaurant Modal
  document.getElementById('open-add-restaurant-modal')?.addEventListener('click', () => {
    const form = document.getElementById('restaurant-modal-form');
    form.reset();
    document.getElementById('restaurant-form-id').value = '';
    document.getElementById('restaurant-modal-title').textContent = 'Add New Restaurant';
    document.getElementById('admin-modal-restaurant').classList.add('show');
  });

  // Open Add Food Modal
  document.getElementById('open-add-food-modal')?.addEventListener('click', () => {
    const form = document.getElementById('food-modal-form');
    form.reset();
    document.getElementById('food-form-id').value = '';
    document.getElementById('food-modal-title').textContent = 'Add New Food Item';

    // Populate restaurants select
    const restSelect = document.getElementById('food-form-restaurant');
    if (restSelect) {
      restSelect.innerHTML = allAdminRestaurants.map(r => `
        <option value="${r._id}">${r.name}</option>
      `).join('');
    }

    document.getElementById('admin-modal-food').classList.add('show');
  });

  // Open Add Coupon Modal
  document.getElementById('open-add-coupon-modal')?.addEventListener('click', () => {
    document.getElementById('coupon-modal-form').reset();
    document.getElementById('admin-modal-coupon').classList.add('show');
  });

  // Save Restaurant Form Submit
  document.getElementById('restaurant-modal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('restaurant-form-id').value;
    const payload = {
      name: document.getElementById('rest-form-name').value.trim(),
      description: document.getElementById('rest-form-desc').value.trim(),
      image: document.getElementById('rest-form-image').value.trim(),
      cuisine: document.getElementById('rest-form-cuisine').value.trim(),
      address: {
        area: document.getElementById('rest-form-area').value.trim(),
        city: 'Kolkata'
      },
      rating: Number(document.getElementById('rest-form-rating').value) || 4.5,
      deliveryTime: document.getElementById('rest-form-time').value.trim() || '25-35 mins',
      deliveryFee: Number(document.getElementById('rest-form-fee').value) || 30,
      minOrder: Number(document.getElementById('rest-form-min').value) || 150,
      isVeg: document.getElementById('rest-form-isveg').checked
    };

    try {
      if (id) {
        await API.put(`/restaurants/${id}`, payload);
        showToast('Restaurant updated successfully', 'success');
      } else {
        await API.post('/restaurants', payload);
        showToast('Restaurant created successfully', 'success');
      }
      document.getElementById('admin-modal-restaurant').classList.remove('show');
      loadAdminRestaurants();
      loadAdminStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Save Food Form Submit
  document.getElementById('food-modal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('food-form-id').value;
    const payload = {
      restaurant: document.getElementById('food-form-restaurant').value,
      name: document.getElementById('food-form-name').value.trim(),
      description: document.getElementById('food-form-desc').value.trim(),
      image: document.getElementById('food-form-image').value.trim(),
      category: document.getElementById('food-form-category').value,
      subCategory: document.getElementById('food-form-subcategory').value,
      price: Number(document.getElementById('food-form-price').value),
      originalPrice: Number(document.getElementById('food-form-orig-price').value) || 0,
      isVeg: document.getElementById('food-form-isveg').checked,
      isAvailable: document.getElementById('food-form-available').checked
    };

    try {
      if (id) {
        await API.put(`/foods/${id}`, payload);
        showToast('Food item updated successfully', 'success');
      } else {
        await API.post('/foods', payload);
        showToast('Food item added successfully', 'success');
      }
      document.getElementById('admin-modal-food').classList.remove('show');
      loadAdminFoods();
      loadAdminStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Save Coupon Form Submit
  document.getElementById('coupon-modal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      code: document.getElementById('coupon-form-code').value.trim(),
      description: document.getElementById('coupon-form-desc').value.trim(),
      discountType: document.getElementById('coupon-form-type').value,
      discountValue: Number(document.getElementById('coupon-form-val').value),
      minimumOrder: Number(document.getElementById('coupon-form-min').value) || 0,
      maximumDiscount: Number(document.getElementById('coupon-form-max').value) || 0,
      isActive: true
    };

    try {
      await API.post('/coupons', payload);
      showToast('Coupon created successfully', 'success');
      document.getElementById('admin-modal-coupon').classList.remove('show');
      loadAdminCoupons();
      loadAdminStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function openEditRestaurantModal(r) {
  document.getElementById('restaurant-form-id').value = r._id;
  document.getElementById('rest-form-name').value = r.name;
  document.getElementById('rest-form-desc').value = r.description;
  document.getElementById('rest-form-image').value = r.image;
  document.getElementById('rest-form-cuisine').value = Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine;
  document.getElementById('rest-form-area').value = r.address?.area || '';
  document.getElementById('rest-form-rating').value = r.rating || 4.5;
  document.getElementById('rest-form-time').value = r.deliveryTime || '25-35 mins';
  document.getElementById('rest-form-fee').value = r.deliveryFee !== undefined ? r.deliveryFee : 30;
  document.getElementById('rest-form-min').value = r.minOrder || 150;
  document.getElementById('rest-form-isveg').checked = Boolean(r.isVeg);

  document.getElementById('restaurant-modal-title').textContent = 'Edit Restaurant';
  document.getElementById('admin-modal-restaurant').classList.add('show');
}

function openEditFoodModal(f) {
  document.getElementById('food-form-id').value = f._id;
  document.getElementById('food-form-name').value = f.name;
  document.getElementById('food-form-desc').value = f.description;
  document.getElementById('food-form-image').value = f.image;
  document.getElementById('food-form-category').value = f.category;
  document.getElementById('food-form-subcategory').value = f.subCategory || 'Main Course';
  document.getElementById('food-form-price').value = f.price;
  document.getElementById('food-form-orig-price').value = f.originalPrice || '';
  document.getElementById('food-form-isveg').checked = Boolean(f.isVeg);
  document.getElementById('food-form-available').checked = f.isAvailable !== false;

  const restSelect = document.getElementById('food-form-restaurant');
  restSelect.innerHTML = allAdminRestaurants.map(r => `
    <option value="${r._id}" ${r._id === (f.restaurant._id || f.restaurant) ? 'selected' : ''}>${r.name}</option>
  `).join('');

  document.getElementById('food-modal-title').textContent = 'Edit Food Item';
  document.getElementById('admin-modal-food').classList.add('show');
}
