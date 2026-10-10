# 🍔 CraveNest - Modern Full-Stack Food Delivery Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.19+-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://www.mongodb.com/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-orange.svg)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

> **CraveNest** is a full-featured, responsive, production-ready Food Delivery Web Application built without heavy frontend frameworks. Designed with inspiration from top platforms like Swiggy and Zomato, featuring custom branding, glassmorphism UI, real-time live search, dynamic shopping cart calculations, server-side coupon validation, live order tracking stepper, and an administrative control portal.

🌐 Live Demo

Check out my Food Delivery Website live here:

Visit Food Delivery Website : https://cravenest-food-delivery.vercel.app/
---

## 🌟 Key Features

### 👤 Customer Experience
1. **Interactive Homepage:**
   - **Hero Section:** Real-time search with debounced dropdown preview, location selector, express 30-min badges.
   - **Food Categories:** 10 diverse categories (Biryani, Pizza, Burger, Chinese, Indian, Bengali, Fast Food, Desserts, Beverages, Healthy Food).
   - **Curated Feeds:** Popular restaurants, top-rated restaurants (4.7+ ★), today's promotional offers with 1-click coupon copy, trending delicacies.
   - **Social Proof & Steps:** Verified customer review cards and a 4-step ordering guide.
2. **Restaurant Listing & Advanced Filters:**
   - Multi-criteria filtering: Cuisines, Pure Veg toggle, Active offers, Minimum Rating (4.0+, 4.5+).
   - Real-time sorting: Top Rated, Fastest Delivery, Price Low to High, Price High to Low, Most Popular.
   - Debounced keyword search filter across restaurant names, cuisines, and localities.
3. **Restaurant Menu & Dish Customizer:**
   - Detailed restaurant banner (ratings, reviews count, address, opening hours, delivery fee, minimum order).
   - Menu categorizer tabs: *Recommended*, *Starters*, *Main Course*, *Biryani*, *Rice*, *Drinks*, *Desserts*.
   - Veg / Non-Veg diet indicator badges (compliant with Indian food safety standards).
   - In-card quantity controls (`[-] qty [+]`) synced live with the global cart and bottom floating mini-cart.
4. **Shopping Basket & Cart Management:**
   - LocalStorage persistence for guest users, auto-synced with user account.
   - Transparent bill breakdown: Subtotal, Delivery Fee (Free on orders ₹500+), Taxes (5% GST), Coupon Discount, Grand Total.
   - Server-side coupon verification (`WELCOME50`, `FEAST100`, `FREEDEL`, `CRAVE20`, `BITE75`, `BIRYANI30`).
5. **Multi-Address Checkout:**
   - Saved address selector with default badge.
   - Modal form for creating and saving multiple delivery addresses (House, Street, Area, City, PIN code).
   - Multiple simulated payment options: Cash on Delivery (COD), UPI (VPA ID), Credit/Debit Card, Net Banking.
6. **Live Visual Order Tracking:**
   - 5-stage animated progress stepper:
     $$\text{Order Placed} \rightarrow \text{Restaurant Accepted} \rightarrow \text{Food Preparing} \rightarrow \text{Out for Delivery} \rightarrow \text{Delivered}$$
   - Order cancellation (allowed while status is `Order Placed`).
   - Order history tab with 1-click "Reorder" action.
7. **User Dashboard & Favorites:**
   - Profile management (name, phone, password update).
   - Address book management (add, delete saved addresses).
   - Saved favorites list for restaurants and dishes with instant ordering.

---

### 🛡️ Admin Operations Portal
- **Dashboard Metrics:** Real-time revenue tracker, total orders, today's order count, pending orders, active restaurants, and user counts.
- **Order Management:** View all orders, inspect customer & delivery details, live status updater dropdown that immediately synchronizes with customer tracking.
- **Restaurant Management:** Create, edit, delete, and toggle restaurant status.
- **Food Catalog:** Add, edit, delete dishes, update prices, and mark items as "In Stock" or "Unavailable".
- **Coupon Management:** Create percentage or flat discounts, set minimum order criteria and maximum discount limits.
- **User Control:** View and search user list, activate/deactivate accounts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (3D Perspective & Layered Depth System, Vanilla CSS, Flexbox & Grid, Glassmorphism, Specular Glares, Parallax Micro-animations), Vanilla JavaScript (Interactive 3D Tilt Engine, Mouse Parallax, ES6+, Fetch API, Debounce) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose (with built-in high-performance in-memory fallback for zero-dependency instant testing) |
| **Security & Auth** | JSON Web Tokens (JWT), Bcrypt.js, CORS, input validation, role-based authorization |

---

## 📂 Project Structure

```text
rr/
│
├── frontend/
│   ├── index.html            # Main Landing & Home Page
│   ├── restaurants.html      # Restaurant Explorer & Filter Engine
│   ├── restaurant.html       # Restaurant Details & Categorized Menu
│   ├── cart.html             # Cart & Coupon Application
│   ├── checkout.html         # Saved Addresses & Payment Selector
│   ├── orders.html           # Live Order Tracking & History
│   ├── profile.html          # User Account, Addresses & Favorites
│   ├── login.html            # Sign In with 1-click Demo Fill
│   ├── register.html         # Account Registration
│   ├── admin.html            # Comprehensive Admin Operations Portal
│   │
│   ├── css/
│   │   ├── style.css         # Design system, typography & cards
│   │   ├── responsive.css    # Mobile-first breakpoints (360px - 1920px)
│   │   └── admin.css         # Admin dashboard layout & tables
│   │
│   └── js/
│       ├── api.js            # Unified HTTP client, JWT header & Toasts
│       ├── auth.js           # Auth state & header sync
│       ├── cart.js           # Cart engine & calculations
│       ├── app.js            # Home feeds, live search & location modal
│       ├── restaurants.js     # Filter & sorting logic
│       ├── food.js           # Restaurant menu & sticky mini-cart
│       ├── checkout.js       # Address picker & order creation
│       ├── orders.js         # Progress timeline & status tracker
│       └── admin.js          # Admin CRUD forms & status manager
│
├── backend/
│   ├── server.js             # Express app & static server
│   ├── seed.js               # Database population script
│   ├── .env                  # Environment configuration
│   ├── package.json          # Backend dependencies
│   │
│   ├── config/
│   │   └── database.js       # MongoDB connection & smart fallback
│   │
│   ├── models/
│   │   ├── User.js           # User schema with bcrypt hooks
│   │   ├── Restaurant.js     # Restaurant schema & cuisines
│   │   ├── Food.js           # Food item schema & veg/non-veg tags
│   │   ├── Order.js          # Order schema & tracking timeline
│   │   └── Coupon.js         # Promo coupon schema & rules
│   │
│   ├── routes/
│   │   ├── authRoutes.js     # Auth routes
│   │   ├── restaurantRoutes.js
│   │   ├── foodRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── couponRoutes.js
│   │   ├── userRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── restaurantController.js
│   │   ├── foodController.js
│   │   ├── orderController.js
│   │   ├── couponController.js
│   │   ├── userController.js
│   │   └── adminController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── adminMiddleware.js # Role-based access control
│   │   └── errorMiddleware.js # Global error handler
│   │
│   └── services/
│       ├── seedData.js       # Rich datasets (12 rests, 48+ dishes, coupons)
│       └── memoryStore.js    # In-memory persistence engine
│
├── package.json              # Root npm scripts
├── README.md                 # Complete documentation
└── .gitignore
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js**: v18 or newer
- **MongoDB** *(Optional)*: If running locally (`mongodb://127.0.0.1:27017/cravenest`) or MongoDB Atlas.
  > *Note: If MongoDB is not running, the application automatically uses the built-in high-performance In-Memory JSON Datastore preloaded with all data!*

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create or edit `.env` in the root or `backend/` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/cravenest
JWT_SECRET=cravenest_super_secret_jwt_key_2026_production_grade_token
JWT_EXPIRE=30d
```

### 4. (Optional) Seed MongoDB
If using an active MongoDB daemon or Atlas:
```bash
npm run seed
```

### 5. Start the Application
```bash
npm start
```
- 🌐 **Web Application:** `http://localhost:5000`
- 🛡️ **Admin Portal:** `http://localhost:5000/admin.html`
- 📡 **API Health Check:** `http://localhost:5000/api/health`

---

## 🔑 Demo Credentials

| Role | Email | Password | Quick Login |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `admin123` | Click **"Demo Admin"** button on Login page |
| **Customer** | `user@example.com` | `user123` | Click **"Demo User"** button on Login page |
| **Customer 2** | `rohan@example.com` | `password123` | Manual input |

---

## 🎟️ Active Demo Coupons

| Coupon Code | Discount | Conditions |
| :--- | :--- | :--- |
| `WELCOME50` | 50% OFF (Up to ₹100) | Min order ₹149 |
| `FEAST100` | Flat ₹100 OFF | Min order ₹399 |
| `CRAVE20` | 20% OFF (Up to ₹120) | Min order ₹250 |
| `FREEDEL` | Flat ₹40 OFF (Free Delivery) | Min order ₹199 |
| `BITE75` | Flat ₹75 OFF | Min order ₹299 |
| `BIRYANI30` | 30% OFF (Up to ₹150) | Min order ₹350 |

---

## 📡 REST API Documentation

### Authentication
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Authenticate & obtain JWT
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Get current session details *(Protected)*

### Restaurants
- `GET /api/restaurants` - List restaurants with query parameters (`search`, `cuisine`, `minRating`, `isVeg`, `hasOffers`, `sortBy`)
- `GET /api/restaurants/:id` - Get restaurant details with full menu
- `POST /api/restaurants` - Add restaurant *(Admin)*
- `PUT /api/restaurants/:id` - Update restaurant *(Admin)*
- `DELETE /api/restaurants/:id` - Delete restaurant *(Admin)*

### Food Menu
- `GET /api/foods` - List dishes with filters (`category`, `subCategory`, `restaurantId`, `isVeg`, `search`)
- `GET /api/foods/:id` - Single dish details
- `POST /api/foods` - Add dish *(Admin)*
- `PUT /api/foods/:id` - Update dish *(Admin)*
- `DELETE /api/foods/:id` - Remove dish *(Admin)*

### Orders
- `POST /api/orders` - Place new order *(Protected)*
- `GET /api/orders` - Get orders list (Users get their own, Admins get all) *(Protected)*
- `GET /api/orders/user/my-orders` - Get current user's order history *(Protected)*
- `GET /api/orders/:id` - Get order tracking & receipt *(Protected)*
- `PUT /api/orders/:id/status` - Update delivery stage or cancel *(Protected)*

### Coupons
- `POST /api/coupons/validate` - Server-side validation of code & calculation of discount
- `GET /api/coupons` - List active coupons
- `POST /api/coupons` - Create coupon *(Admin)*
- `DELETE /api/coupons/:id` - Delete coupon *(Admin)*

### User Profile & Favorites
- `GET /api/users/profile` - User profile details *(Protected)*
- `PUT /api/users/profile` - Update name, phone, password *(Protected)*
- `POST /api/users/address` - Add new delivery address *(Protected)*
- `DELETE /api/users/address/:addressId` - Delete saved address *(Protected)*
- `GET /api/users/favorites` - Get favorite restaurants and dishes *(Protected)*
- `POST /api/users/favorites` - Toggle favorite item *(Protected)*

### Admin Portal
- `GET /api/admin/stats` - Analytics counters & revenue *(Admin)*
- `GET /api/admin/users` - User directory *(Admin)*
- `PUT /api/admin/users/:id/status` - Activate / deactivate user *(Admin)*

---

## 🚀 Future Roadmap
- Integration with Razorpay / Stripe for real card & UPI payments.
- Live GPS rider tracking using Mapbox / Google Maps API.
- WebSockets / Socket.io for instantaneous order status push notifications.
- Kitchen Partner dashboard for restaurant owners.
