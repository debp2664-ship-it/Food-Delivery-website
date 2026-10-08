/**
 * CraveNest - Restaurant Detail & Interactive Menu
 * Categorized menu sections, veg toggles, search within menu, live quantity sync, and sticky cart bar
 */

let currentRestaurant = null;
let allMenuItems = [];
let activeCategory = 'All';
let vegOnlyFilter = false;
let menuSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('id');

  if (!restaurantId) {
    showToast('Restaurant not found. Redirecting to listing...', 'warning');
    setTimeout(() => { window.location.href = 'restaurants.html'; }, 1500);
    return;
  }

  loadRestaurantDetails(restaurantId);
  initMenuControls();
  window.addEventListener('cartUpdated', updateStickyCartBar);
});

async function loadRestaurantDetails(id) {
  const bannerContainer = document.getElementById('restaurant-hero-banner');
  const menuContainer = document.getElementById('menu-items-container');

  try {
    const res = await API.get(`/restaurants/${id}`);
    currentRestaurant = res.restaurant;
    allMenuItems = res.foods || [];

    renderRestaurantBanner(currentRestaurant);
    renderMenu();
    updateStickyCartBar();
  } catch (err) {
    if (bannerContainer) {
      bannerContainer.innerHTML = `<div class="empty-state"><p>Error loading restaurant: ${err.message}</p></div>`;
    }
  }
}

function renderRestaurantBanner(r) {
  const banner = document.getElementById('restaurant-hero-banner');
  if (!banner) return;

  const addressText = typeof r.address === 'object'
    ? `${r.address.street ? r.address.street + ', ' : ''}${r.address.area || ''}, ${r.address.city || 'Kolkata'}`
    : r.address;

  banner.innerHTML = `
    <div class="restaurant-detail-header-card" style="background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-color); overflow: hidden; box-shadow: var(--shadow-md);">
      <div style="position: relative; height: 260px; overflow: hidden;">
        <img src="${r.image}" alt="${r.name}" style="width: 100%; height: 100%; object-fit: cover;">
        <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%);"></div>
        <div style="position: absolute; bottom: 24px; left: 24px; right: 24px; color: white;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span class="rating-badge" style="font-size: 0.9rem; padding: 4px 10px;">★ ${r.rating}</span>
            <span style="font-size: 0.85rem; color: #E2E8F0;">(${r.reviewsCount || 150}+ verified reviews)</span>
            ${r.isVeg ? `<span class="badge badge-success">Pure Veg</span>` : ''}
          </div>
          <h1 style="font-size: 2.3rem; font-weight: 800; color: white; margin-bottom: 4px;">${r.name}</h1>
          <div style="font-size: 0.95rem; color: #CBD5E1;">${r.cuisine.join(' • ')}</div>
        </div>
      </div>
      <div style="padding: 20px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; background: #FAFBFD;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 24px; font-size: 0.88rem; color: var(--text-secondary);">
          <div><i class="far fa-clock" style="color: var(--primary); margin-right: 6px;"></i><strong>${r.deliveryTime}</strong> delivery</div>
          <div><i class="fas fa-motorcycle" style="color: var(--primary); margin-right: 6px;"></i><strong>${r.deliveryFee === 0 ? 'Free Delivery' : '₹' + r.deliveryFee + ' Delivery'}</strong></div>
          <div><i class="fas fa-shopping-bag" style="color: var(--primary); margin-right: 6px;"></i>Min Order: <strong>₹${r.minOrder || 150}</strong></div>
          <div><i class="far fa-calendar-alt" style="color: var(--primary); margin-right: 6px;"></i>Open: <strong>${r.openingHours || '10 AM - 11 PM'}</strong></div>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          <i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i>${addressText}
        </div>
      </div>
    </div>
  `;
}

function initMenuControls() {
  // Category tabs
  const tabs = document.querySelectorAll('.menu-category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      renderMenu();
    });
  });

  // Veg toggle
  const vegToggle = document.getElementById('menu-veg-toggle');
  if (vegToggle) {
    vegToggle.addEventListener('change', (e) => {
      vegOnlyFilter = e.target.checked;
      renderMenu();
    });
  }

  // Search within menu
  const menuSearch = document.getElementById('menu-search-input');
  if (menuSearch) {
    menuSearch.addEventListener('input', debounce((e) => {
      menuSearchQuery = e.target.value.trim().toLowerCase();
      renderMenu();
    }, 250));
  }
}

function renderMenu() {
  const container = document.getElementById('menu-items-container');
  if (!container) return;

  let filtered = allMenuItems;

  // Category filter
  if (activeCategory !== 'All') {
    filtered = filtered.filter(f =>
      (f.subCategory && f.subCategory.toLowerCase() === activeCategory.toLowerCase()) ||
      (f.category && f.category.toLowerCase() === activeCategory.toLowerCase())
    );
  }

  // Veg filter
  if (vegOnlyFilter) {
    filtered = filtered.filter(f => f.isVeg === true);
  }

  // Menu search query
  if (menuSearchQuery) {
    filtered = filtered.filter(f =>
      f.name.toLowerCase().includes(menuSearchQuery) ||
      (f.description && f.description.toLowerCase().includes(menuSearchQuery))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon"><i class="fas fa-search"></i></div>
        <h3 class="empty-state-title">No Dishes Match Your Selection</h3>
        <p class="empty-state-desc">Try resetting the veg filter or searching for another dish keyword.</p>
      </div>
    `;
    return;
  }

  // Group by subCategory or category for attractive sectioning if on 'All'
  if (activeCategory === 'All' && !menuSearchQuery) {
    const subCats = ['Recommended', 'Starters', 'Main Course', 'Rice', 'Biryani', 'Chinese', 'Drinks', 'Desserts'];
    let html = '';

    subCats.forEach(cat => {
      const items = filtered.filter(f => (f.subCategory || '').toLowerCase() === cat.toLowerCase());
      if (items.length > 0) {
        html += `
          <div class="menu-section-block" style="margin-bottom: 40px; grid-column: 1 / -1;">
            <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 18px; display: flex; align-items: center; gap: 8px;">
              <span>${cat}</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); background: var(--bg-subtle); padding: 2px 8px; border-radius: 10px;">${items.length}</span>
            </h3>
            <div class="foods-grid">
              ${items.map(item => renderFoodMenuItem(item)).join('')}
            </div>
          </div>
        `;
      }
    });

    // Also include any items not matching standard subCats
    const otherItems = filtered.filter(f => !subCats.some(c => c.toLowerCase() === (f.subCategory || '').toLowerCase()));
    if (otherItems.length > 0) {
      html += `
        <div class="menu-section-block" style="margin-bottom: 40px; grid-column: 1 / -1;">
          <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 18px;">Specialties</h3>
          <div class="foods-grid">
            ${otherItems.map(item => renderFoodMenuItem(item)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  } else {
    container.innerHTML = `
      <div class="foods-grid" style="grid-column: 1 / -1;">
        ${filtered.map(item => renderFoodMenuItem(item)).join('')}
      </div>
    `;
  }

  initFoodCartListeners();
  if (window.init3DTilt) window.init3DTilt(container);
}

function renderFoodMenuItem(f) {
  const currentQty = Cart.getItemQuantity(f._id);
  const tag = f.tags && f.tags.length > 0 ? f.tags[0] : null;

  return `
    <div class="food-card tilt-card-3d" data-id="${f._id}">
      <div class="card-glare"></div>
      <div class="card-sheen-sweep"></div>
      <div class="food-image-wrap">
        ${tag ? `<span class="food-tag-badge depth-pop-front">${tag}</span>` : ''}
        <button class="fav-btn depth-pop-front" data-id="${f._id}" data-type="food" title="Save to favorites">
          <i class="far fa-heart"></i>
        </button>
        <img class="food-img" src="${f.image}" alt="${f.name}" loading="lazy">
      </div>
      <div class="food-card-body depth-pop-mid">
        <div class="food-header-row">
          <span class="diet-indicator ${f.isVeg ? 'veg' : 'nonveg'} depth-pop-front"></span>
          <span class="food-rating-pill depth-pop-front"><i class="fas fa-star" style="font-size: 0.7rem;"></i> ${f.rating}</span>
        </div>
        <h4 class="food-name">${f.name}</h4>
        <p class="food-desc">${f.description}</p>
        <div class="food-footer-row">
          <div class="food-price-wrap depth-pop-front">
            <span class="food-price">₹${f.price}</span>
            ${f.originalPrice > f.price ? `<span class="food-original-price">₹${f.originalPrice}</span>` : ''}
          </div>
          <div class="food-action-control depth-pop-front" data-food-id="${f._id}">
            ${currentQty > 0 ? `
              <div class="qty-control-wrap">
                <button class="qty-btn menu-minus-btn" data-id="${f._id}">−</button>
                <span class="qty-display">${currentQty}</span>
                <button class="qty-btn menu-plus-btn" data-id="${f._id}">+</button>
              </div>
            ` : `
              <button class="add-cart-btn menu-add-btn" data-id="${f._id}">Add +</button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function initFoodCartListeners() {
  document.querySelectorAll('.menu-add-btn').forEach(btn => {
    btn.onclick = () => {
      const foodId = btn.dataset.id;
      const food = allMenuItems.find(item => item._id === foodId);
      if (food && currentRestaurant) {
        Cart.addItem(food, currentRestaurant);
        renderMenu();
        updateStickyCartBar();
      }
    };
  });

  document.querySelectorAll('.menu-plus-btn').forEach(btn => {
    btn.onclick = () => {
      const foodId = btn.dataset.id;
      Cart.updateQuantity(foodId, 1);
      renderMenu();
      updateStickyCartBar();
    };
  });

  document.querySelectorAll('.menu-minus-btn').forEach(btn => {
    btn.onclick = () => {
      const foodId = btn.dataset.id;
      Cart.updateQuantity(foodId, -1);
      renderMenu();
      updateStickyCartBar();
    };
  });

  initFavoriteButtons();
}

// Sticky Mini-Cart Bar on bottom of screen
function updateStickyCartBar() {
  let bar = document.getElementById('sticky-cart-bar');
  const count = Cart.getItemCount();

  if (count === 0) {
    if (bar) bar.style.display = 'none';
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'sticky-cart-bar';
    bar.style.position = 'fixed';
    bar.style.bottom = '20px';
    bar.style.left = '50%';
    bar.style.transform = 'translateX(-50%)';
    bar.style.zIndex = '999';
    bar.style.width = 'calc(100% - 40px)';
    bar.style.maxWidth = '600px';
    bar.style.background = 'var(--secondary)';
    bar.style.color = 'white';
    bar.style.padding = '14px 22px';
    bar.style.borderRadius = 'var(--radius-full)';
    bar.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.35)';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.justifyContent = 'space-between';
    bar.style.transition = 'all 0.3s ease';
    document.body.appendChild(bar);
  }

  const totals = Cart.calculateTotals();

  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="background: var(--primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem;">
        ${count}
      </div>
      <div>
        <div style="font-weight: 700; font-size: 0.95rem;">${count} item${count > 1 ? 's' : ''} added</div>
        <div style="font-size: 0.8rem; color: #94A3B8;">Subtotal: <strong style="color: white;">₹${totals.subtotal}</strong></div>
      </div>
    </div>
    <a href="cart.html" style="background: var(--primary); color: white; padding: 9px 20px; border-radius: var(--radius-full); font-weight: 700; font-size: 0.9rem; text-decoration: none; display: flex; align-items: center; gap: 6px;">
      View Cart <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i>
    </a>
  `;
  bar.style.display = 'flex';
}
