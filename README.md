# LinknSmile — Complete Project Documentation

> A multi-vendor e-commerce platform for handcrafted & local Indian products.  
> Built with Next.js 15, MongoDB, NextAuth, Razorpay, and Tailwind CSS.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Getting Started](#5-getting-started)
6. [Authentication Flow](#6-authentication-flow)
7. [API Reference](#7-api-reference)
8. [Database Models](#8-database-models)
9. [Admin Panel](#9-admin-panel)
10. [Payment Integration](#10-payment-integration)
11. [Email System](#11-email-system)
12. [Deployment Guide](#12-deployment-guide)
13. [Known Issues & Fixes](#13-known-issues--fixes)
14. [Security Checklist](#14-security-checklist)

---

## 1. Project Overview

LinknSmile is a full-stack multi-vendor marketplace where local Indian sellers can list and sell products. It includes:

- A customer-facing storefront with product discovery, cart, and checkout
- A vendor portal for sellers to manage their listings
- A full-featured admin dashboard for platform operations
- Razorpay-powered payments with Cash on Delivery fallback
- OTP-based authentication with email notifications

**Live URL:** https://linknsmile.com  
**Repository:** https://github.com/AryanZapwms/LinknSmile  
**Dev Port:** 3004

---

## 2. Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Framework  | Next.js 15 (App Router)                              |
| Language   | TypeScript 5                                         |
| Styling    | Tailwind CSS 4 + shadcn/ui                           |
| Database   | MongoDB via Mongoose                                 |
| Auth       | NextAuth.js (Credentials + JWT)                      |
| Payments   | Razorpay + Cash on Delivery                          |
| Email      | Nodemailer (Gmail SMTP)                              |
| State      | Zustand (cart store)                                 |
| Images     | Cloudinary                                           |
| Analytics  | Google Tag Manager, Facebook Pixel, Vercel Analytics |
| Deployment | Docker / VPS (linknsmile.com)                        |

---

## 3. Project Structure

```
LinknSmile/
├── app/
│   ├── page.tsx                  # Homepage / storefront landing
│   ├── layout.tsx                # Global layout, SEO, tracking pixels
│   ├── globals.css
│   ├── auth/
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration + OTP
│   │   ├── forgot-password/      # Password reset - step 1
│   │   ├── verify-reset-otp/     # Password reset - step 2
│   │   └── reset-password/       # Password reset - step 3
│   ├── shop/
│   │   └── [company]/
│   │       └── [category]/       # Dynamic product listing pages
│   ├── product/[id]/             # Product detail page
│   ├── cart/                     # Cart page
│   ├── checkout/                 # Checkout (auth-gated)
│   ├── order-success/[id]/       # Post-payment confirmation
│   ├── profile/
│   │   ├── page.tsx              # Account details
│   │   └── orders/               # Order history
│   ├── blog/                     # Blog listing + detail pages
│   ├── admin/
│   │   ├── page.tsx              # Dashboard with analytics
│   │   ├── orders/               # Order management
│   │   ├── products/             # Product CRUD
│   │   ├── categories/           # Category management
│   │   ├── users/                # User directory & role management
│   │   ├── vendors/              # Vendor management
│   │   ├── finance/              # Finance overview
│   │   ├── vendor-payouts/       # Payout management
│   │   ├── payment-settings/     # Payment configuration
│   │   ├── product-approvals/    # Approve vendor product listings
│   │   └── promo-bar/            # Manage promotional banner
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── users/                # All users list (admin)
│       ├── users/[id]/           # Update/delete user
│       ├── users/profile/        # Current user profile CRUD
│       ├── products/             # Products API
│       ├── categories/           # Categories API
│       ├── orders/               # Orders API
│       ├── razorpay/
│       │   ├── create-order/     # Create Razorpay order
│       │   └── verify-payment/   # Verify & complete payment
│       ├── promos/               # Promo bar content
│       ├── admin/
│       │   └── analytics/        # Dashboard analytics data
│       └── seed-products/        # Dev seeding utility
├── components/
│   ├── auth/                     # AuthSessionProvider, session-provider
│   ├── header/                   # Site header + nav
│   ├── footer/                   # Site footer
│   ├── ui/                       # shadcn/ui primitives
│   ├── promo-bar/                # Scrolling promo banner
│   ├── cart-sync/                # Cart hydration component
│   └── gtm-scripts/              # GTM + pixel script injections
├── lib/
│   ├── db.ts                     # MongoDB connection utility
│   ├── models/
│   │   ├── user.ts               # User model
│   │   ├── product.ts            # Product model
│   │   ├── order.ts              # Order model
│   │   └── ...                   # Other models
│   ├── store/
│   │   └── cart-store.ts         # Zustand cart store
│   ├── email.tsx                 # Transactional email templates
│   ├── EmailOtp.ts               # OTP email dispatcher
│   ├── cors.ts                   # CORS helper (withCORS wrapper)
│   └── cacheClient.ts            # Fetch caching utilities
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
├── public/                       # Static assets
├── styles/                       # Global style overrides
├── middleware.ts                 # Route protection (auth + admin)
├── next.config.mjs               # Next.js config
├── Dockerfile                    # Docker build config
├── vercel.json                   # Vercel deployment config
└── tsconfig.json
```

---

## 4. Environment Variables

Create a `.env` file at the project root. **Never commit this file.**

```env
# ─── Database ────────────────────────────────────────────
# Production (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/?appName=Cluster0

# ─── Authentication ──────────────────────────────────────
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://linknsmile.com        # localhost:3004 for dev
NEXT_PUBLIC_SITE_URL=https://linknsmile.com # localhost:3004 for dev
NODE_ENV=production                         # development for dev

# ─── Email (Gmail SMTP) ──────────────────────────────────
GMAIL_EMAIL=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx     # Gmail App Password (not account password)
EMAIL_FROM=your@gmail.com

# ─── Payments (Razorpay) ─────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# ─── Cloudinary (Image Uploads) ──────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# ─── Misc ────────────────────────────────────────────────
MIGRATION_SECRET=some-secret-string
```

> **Common mistake:** Setting `NEXTAUTH_URL` or `NEXT_PUBLIC_SITE_URL` to `localhost:3004` while deploying to production causes logout and auth redirects to break. Always update these for production.

---

## 5. Getting Started

### Prerequisites

- Node.js ≥ 18.18.0
- npm ≥ 9 or pnpm
- MongoDB Atlas account (or local MongoDB)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/AryanZapwms/LinknSmile.git
cd LinknSmile

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env       # fill in your values

# 4. Start dev server
npm run dev
# App runs at http://localhost:3004
```

### Available Scripts

| Script          | Description                         |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start dev server on port 3004       |
| `npm run build` | Production build                    |
| `npm run start` | Serve production build on port 3004 |
| `npm run lint`  | Run ESLint                          |

---

## 6. Authentication Flow

LinknSmile uses **NextAuth.js** with a credentials provider and JWT sessions.

### Registration

1. User submits name, email, password at `/auth/register`
2. OTP is sent to their email via `lib/EmailOtp.ts`
3. User verifies OTP → `isVerified = true` set in DB
4. Welcome email dispatched via `lib/email.tsx`

### Login

1. User submits credentials at `/auth/login`
2. NextAuth credentials provider validates against DB (bcrypt compare)
3. JWT session issued, stored in HTTP-only cookie
4. Session accessible via `useSession()` on client or `getServerSession()` on server

### Password Reset

1. `/auth/forgot-password` → user enters email → OTP sent
2. `/auth/verify-reset-otp` → user enters OTP → verified
3. `/auth/reset-password` → user sets new password → bcrypt hashed & saved

### Route Protection

`middleware.ts` intercepts requests to:

- `/checkout` → requires any valid session
- `/admin/*` → requires session with `role: "admin"`
- `/profile/*` → requires any valid session

### Session Shape

```ts
session.user = {
  id: string,
  name: string,
  email: string,
  role: "user" | "admin",
  image?: string
}
```

---

## 7. API Reference

### Auth

| Method | Endpoint                  | Description                                |
| ------ | ------------------------- | ------------------------------------------ |
| POST   | `/api/auth/[...nextauth]` | NextAuth handler (login, session, signout) |

### Users

| Method | Endpoint             | Description                          | Auth  |
| ------ | -------------------- | ------------------------------------ | ----- |
| GET    | `/api/users`         | List all users                       | Admin |
| PUT    | `/api/users/[id]`    | Update user role                     | Admin |
| DELETE | `/api/users/[id]`    | Delete user                          | Admin |
| GET    | `/api/users/profile` | Get current user profile             | User  |
| PUT    | `/api/users/profile` | Update current user profile + avatar | User  |

### Products

| Method | Endpoint             | Description                   |
| ------ | -------------------- | ----------------------------- |
| GET    | `/api/products`      | List products (with filters)  |
| POST   | `/api/products`      | Create product (admin/vendor) |
| PUT    | `/api/products/[id]` | Update product                |
| DELETE | `/api/products/[id]` | Delete product                |

### Orders

| Method | Endpoint           | Description         |
| ------ | ------------------ | ------------------- |
| GET    | `/api/orders`      | List orders         |
| POST   | `/api/orders`      | Create order (COD)  |
| PUT    | `/api/orders/[id]` | Update order status |

### Payments

| Method | Endpoint                       | Description                               |
| ------ | ------------------------------ | ----------------------------------------- |
| POST   | `/api/razorpay/create-order`   | Create Razorpay order, returns `order_id` |
| POST   | `/api/razorpay/verify-payment` | Verify signature, confirm order           |

### Categories & Promos

| Method              | Endpoint               | Description                  |
| ------------------- | ---------------------- | ---------------------------- |
| GET                 | `/api/categories`      | List all categories          |
| GET/POST/PUT/DELETE | `/api/categories/[id]` | Category CRUD                |
| GET                 | `/api/promos`          | Get active promo bar content |

### Admin Analytics

| Method | Endpoint               | Description                                        |
| ------ | ---------------------- | -------------------------------------------------- |
| GET    | `/api/admin/analytics` | Dashboard stats (revenue, orders, users, products) |

---

## 8. Database Models

### User

```ts
{
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  phone: String,
  role: "user" | "admin" | "vendor",
  isVerified: Boolean,
  isActive: Boolean,
  image: String,
  address: {
    street, city, state, zipCode, country
  },
  createdAt: Date
}
```

### Product

```ts
{
  name: String,
  description: String,
  price: Number,
  discountedPrice: Number,
  images: [String],           // Cloudinary URLs
  category: ObjectId → Category,
  company: ObjectId → Company,
  vendor: ObjectId → User,
  stock: Number,
  isActive: Boolean,
  isApproved: Boolean,
  tags: [String],
  createdAt: Date
}
```

### Order

```ts
{
  user: ObjectId → User,
  items: [{
    product: ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  shippingAddress: { street, city, state, zipCode },
  paymentMethod: "razorpay" | "cod",
  paymentStatus: "pending" | "paid" | "failed",
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled",
  totalAmount: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  createdAt: Date
}
```

---

## 9. Admin Panel

Access at `/admin` — requires `role: "admin"` session.

### Dashboard (`/admin`)

- Revenue overview chart (7D / 30D / 3M / 6M / 1Y)
- KPI cards: Total Orders, Total Revenue, Total Products, Total Users
- Top categories breakdown

### Users (`/admin/users`)

- View all registered customers
- Search by name, email, or role
- Edit user role (user ↔ admin)
- Delete users
- Paginated (8 per page)

> **Note:** The `/api/users` route must return a plain array `[]`, not `{ users: [] }`, for the users page to work correctly.

### Orders (`/admin/orders`)

- Full order list with status, payment method, amount
- Update order status (processing → shipped → delivered)

### Products (`/admin/products`)

- CRUD for product listings
- Toggle active/inactive status

### Product Approvals (`/admin/product-approvals`)

- Review and approve/reject vendor-submitted products

### Vendors (`/admin/vendors`)

- View registered vendors
- Manage vendor status

### Promo Bar (`/admin/promo-bar`)

- Edit the scrolling promotional banner text displayed site-wide

### Finance & Payouts

- Revenue tracking per vendor
- Initiate vendor payouts

---

## 10. Payment Integration

### Razorpay Flow

```
Customer clicks "Pay Now"
       ↓
POST /api/razorpay/create-order
  → Creates Razorpay order server-side
  → Returns { order_id, amount, currency }
       ↓
Razorpay widget opens in browser
  → Customer completes payment
  → Razorpay calls success callback with { razorpay_payment_id, razorpay_order_id, razorpay_signature }
       ↓
POST /api/razorpay/verify-payment
  → Server verifies HMAC signature
  → Creates order in DB
  → Reduces product stock
  → Sends confirmation email to customer + admin
  → Returns { orderId }
       ↓
Redirect to /order-success/[orderId]
```

### COD Flow

```
Customer selects "Cash on Delivery"
       ↓
POST /api/orders
  → Creates order with paymentMethod: "cod", paymentStatus: "pending"
  → Sends confirmation email
  → Returns { orderId }
       ↓
Redirect to /order-success/[orderId]
```

---

## 11. Email System

Emails are sent via **Nodemailer** using Gmail SMTP.

### Setup

```env
GMAIL_EMAIL=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Use a Gmail **App Password** (not your account password). Enable 2FA on Gmail first, then generate an App Password from Google Account → Security.

### Email Types

| Trigger                       | Template Location | Recipients       |
| ----------------------------- | ----------------- | ---------------- |
| Registration OTP              | `lib/EmailOtp.ts` | New user         |
| Welcome                       | `lib/email.tsx`   | New user         |
| Password reset OTP            | `lib/EmailOtp.ts` | User             |
| Order confirmation (COD)      | `lib/email.tsx`   | Customer + Admin |
| Order confirmation (Razorpay) | `lib/email.tsx`   | Customer + Admin |
| Order status update           | `lib/email.tsx`   | Customer         |

> Email failures are caught gracefully and never block the primary transaction from completing.

---

## 12. Deployment Guide

### Via Docker

```bash
# Build image
docker build -t linknsmile .

# Run container
docker run -p 3004:3004 --env-file .env linknsmile
```

### Manual / VPS

```bash
npm run build
npm run start     # Serves on port 3004
```

Use **nginx** as a reverse proxy to forward port 80/443 to 3004.

### Environment Variables Checklist Before Deploying

- [ ] `NEXTAUTH_URL` = `https://linknsmile.com` (not localhost)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://linknsmile.com` (not localhost)
- [ ] `NODE_ENV` = `production`
- [ ] `MONGODB_URI` = Atlas production connection string
- [ ] `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` = live keys
- [ ] `NEXTAUTH_SECRET` = strong random string

---

## 13. Known Issues & Fixes

### Issue: Logout redirects to `localhost:3004`

**Cause:** `NEXTAUTH_URL` or `NEXT_PUBLIC_SITE_URL` set to localhost in production env.  
**Fix:** Set both to `https://linknsmile.com` in your hosting environment variables and redeploy.

### Issue: `/admin/users` crashes with `TypeError: h.filter is not a function`

**Cause:** `app/api/users/route.ts` was returning a profile object instead of a users array (wrong code pasted into the file).  
**Fix:** Replace `app/api/users/route.ts` with:

```ts
export async function GET() {
  await connectDB();
  const users = await User.find({}).select("-password").sort({ createdAt: -1 });
  return NextResponse.json(users); // plain array
}
```

Also add a safety guard in the users page:

```ts
setUsers(Array.isArray(data) ? data : (data.users ?? []));
```

### Issue: Vercel Analytics 404 (`/_vercel/insights/script.js`)

**Cause:** App is not deployed on Vercel — it's on a VPS, so the Vercel Analytics script path doesn't exist.  
**Fix:** Either deploy to Vercel, or remove `@vercel/analytics` from `app/layout.tsx` if you don't need it.

---

## 14. Security Checklist

- [ ] `.env` is in `.gitignore` and never committed
- [ ] `NEXTAUTH_SECRET` is a strong random string (32+ chars)
- [ ] Razorpay payment signature verified server-side before confirming any order
- [ ] Passwords hashed with bcrypt (10 rounds)
- [ ] Admin routes protected in both `middleware.ts` AND at the page/API level
- [ ] MongoDB Atlas IP whitelist configured (not `0.0.0.0/0` in production)
- [ ] Gmail App Password used (not account password)
- [ ] Live Razorpay keys rotated if accidentally exposed
- [ ] Cloudinary API secret rotated if accidentally exposed

---

_Documentation generated for LinknSmile v1.0 — June 2026_
