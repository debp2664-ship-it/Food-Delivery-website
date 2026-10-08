/**
 * CraveNest - Restaurant Listing & Filter Engine
 * Handles search query sync, multi-attribute filtering, sorting, and restaurant card rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  initRestaurantFilters();
  loadFilteredRestaurants();
});

let currentFilters = {
  search: '',
  cuisine: 'All',
  category: 'All',
  minRating: '',
  isVeg: false,
  hasOffers: false,
  sortBy: 'rating'
};

function initRestaurantFilters() {
  // Read URL params (e.g. ?search=biryani or ?category=Pizza)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('search')) {
    currentFilters.search = urlParams.get('search');
    const searchInput = document.getElementById('filter-search-input');
    if (searchInput) searchInput.value = currentFilters.search;
  }
  if (urlParams.has('category')) {
    currentFilters.category = urlParams.get('category');
    currentFilters.cuisine = urlParams.get('category');
  }

  // Live Search filter
  const searchInput = document.getElementById('filter-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentFilters.search = e.target.value.trim();
      loadFilteredRestaurants();
    }, 300));
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilters.sortBy = e.target.value;
      loadFilteredRestaurants();
    });
  }

  // Cuisine pills
  const cuisinePills = document.querySelectorAll('.filter-cuisine-pill');
  cuisinePills.forEach(pill => {
    pill.addEventListener('click', () => {
      cuisinePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilters.cuisine = pill.dataset.cuisine;
      currentFilters.category = pill.dataset.cuisine;
      loadFilteredRestaurants();
    });
  });

  // Rating filters
  const ratingRadios = document.querySelectorAll('input[name="rating-filter"]');
  ratingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentFilters.minRating = e.target.value;
      loadFilteredRestaurants();
    });
  });

  // Veg Only switch
  const vegSwitch = document.getElementById('filter-veg-only');
  if (vegSwitch) {
    vegSwitch.addEventListener('change', (e) => {
      currentFilters.isVeg = e.target.checked;
      loadFilteredRestaurants();
    });
  }

  // Has Offers switch
  const offersSwitch = document.getElementById('filter-has-offers');
  if (offersSwitch) {
    offersSwitch.addEventListener('change', (e) => {
      currentFilters.hasOffers = e.target.checked;
      loadFilteredRestaurants();
    });
  }

  // Clear filters button
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentFilters = {
        search: '',
        cuisine: 'All',
        category: 'All',
        minRating: '',
        isVeg: false,
        hasOffers: false,
        sortBy: 'rating'
      };
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'rating';
      if (vegSwitch) vegSwitch.checked = false;
      if (offersSwitch) offersSwitch.checked = false;
      cuisinePills.forEach(p => p.classList.toggle('active', p.dataset.cuisine === 'All'));
      const allRatingRadio = document.querySelector('input[name="rating-filter"][value=""]');
      if (allRatingRadio) allRatingRadio.checked = true;
      loadFilteredRestaurants();
    });
  }
}

async function loadFilteredRestaurants() {
  const container = document.getElementById('restaurants-list-container');
  const countDisplay = document.getElementById('results-count-text');
  if (!container) return;

  // Show loading skeleton
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card"><div class="skeleton-shimmer"></div></div>
  `).join('');

  const params = new URLSearchParams();
  if (currentFilters.search) params.append('search', currentFilters.search);
  if (currentFilters.cuisine && currentFilters.cuisine !== 'All') params.append('cuisine', currentFilters.cuisine);
  if (currentFilters.minRating) params.append('minRating', currentFilters.minRating);
  if (currentFilters.isVeg) params.append('isVeg', 'true');
  if (currentFilters.hasOffers) params.append('hasOffers', 'true');
  if (currentFilters.sortBy) params.append('sortBy', currentFilters.sortBy);

  try {
    const res = await API.get(`/restaurants?${params.toString()}`);
    const restaurants = res.restaurants || [];

    if (countDisplay) {
      countDisplay.textContent = `Showing ${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''}`;
    }

    if (restaurants.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fas fa-utensils"></i></div>
          <h3 class="empty-state-title">No Restaurants Found</h3>
          <p class="empty-state-desc">Try clearing or adjusting your filters to find great places to eat nearby.</p>
          <button id="reset-filter-action" class="btn-primary" style="margin: 0 auto;">Reset All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-filter-action');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          document.getElementById('clear-filters-btn')?.click();
        });
      }
      return;
    }

    container.innerHTML = restaurants.map(r => renderRestaurantCard(r)).join('');
    initFavoriteButtons();
    if (window.init3DTilt) window.init3DTilt(container);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon" style="background: #FEE2E2; color: #DC2626;"><i class="fas fa-exclamation-triangle"></i></div>
        <h3 class="empty-state-title">Failed to load restaurants</h3>
        <p class="empty-state-desc">${err.message}</p>
      </div>
    `;
  }
}
