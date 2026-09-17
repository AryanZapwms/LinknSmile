# LinknSmile — Complete Project Documentation

> A multi-vendor e-commerce marketplace for local & handcrafted products, deployed independently
> per country (India live, UAE live, Qatar/Saudi planned).
> Built with Next.js 15, MongoDB, NextAuth, Razorpay + Tap Payments, next-intl, and Tailwind CSS.

> **For deeper/more current architectural detail than this README covers, see
> [`PROJECT_SOURCE_OF_TRUTH.md`](./PROJECT_SOURCE_OF_TRUTH.md)** (the authoritative,
> continuously-verified architecture reference) and
> [`MULTI_COUNTRY_REQUIREMENTS.md`](./MULTI_COUNTRY_REQUIREMENTS.md) (business/launch blockers
> per country). Where this README and the code disagree, **the code wins** — please fix the
> README rather than trust it blindly.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [Getting Started](#6-getting-started)
7. [Authentication Flow](#7-authentication-flow)
8. [API Reference](#8-api-reference)
9. [Database Models](#9-database-models)
10. [Admin Panel](#10-admin-panel)
11. [Vendor Portal](#11-vendor-portal)
12. [Payment Integration](#12-payment-integration)
13. [Tax / VAT Engine](#13-tax--vat-engine)
14. [Internationalization (i18n / RTL)](#14-internationalization-i18n--rtl)
15. [Multi-Country Deployment](#15-multi-country-deployment)
16. [Email System](#16-email-system)
17. [Deployment Guide](#17-deployment-guide)
18. [Known Issues](#18-known-issues)
19. [Security Checklist](#19-security-checklist)

---

## 1. Project Overview

LinknSmile is a **multi-vendor e-commerce marketplace** (a single Next.js App Router monolith)
serving local/handcrafted products. Three roles share one codebase:

- **Customers** — browse, cart, checkout (Razorpay/Tap or Cash on Delivery), track orders,
  review products, save wishlist/favourites.
- **Vendors** (`shop_owner` role) — register, get admin-approved, pay an annual subscription fee,
  list products (each product also needs separate admin approval), fulfill orders, run coupon
  codes, and withdraw earnings via a wallet/payout system.
- **Admins** — approve vendors/products, manage categories/promos/blogs/homepage merchandising,
  moderate reviews, control payment/tax settings, run analytics, approve payouts, oversee the
  platform wallet.

The same codebase is deployed **once per country**, each as a fully independent instance (its
own process, port, domain, and MongoDB database) — see [§15](#15-multi-country-deployment).

**Live URLs:**
| Country | Domain | Status |
|---|---|---|
| India | https://linknsmile.com | Live, primary market |
| UAE | https://ae.linknsmile.com | Live, SSL-verified — **do not treat as trustworthy for real data yet**, see [§18](#18-known-issues) |
| Qatar / Saudi Arabia | `qa.linknsmile.com` / `sa.linknsmile.com` (planned) | Not yet deployed |

**Repository:** https://github.com/AryanZapwms/LinknSmile
**Dev Port:** 3004 (India). Each additional country deployment runs on its own port, set via
`ecosystem.config.js`'s `PM2_*` env vars (UAE currently uses 3005).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 18, TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 (CSS-first config, no `tailwind.config.ts`) + shadcn/ui ("new-york" style) |
| Database | MongoDB via Mongoose |
| Auth | NextAuth.js v4 — Credentials provider + Google OAuth, JWT sessions |
| Payments | Razorpay (India) + Tap Payments (UAE/Qatar/Saudi) + Cash on Delivery, behind a shared gateway adapter |
| i18n | next-intl — cookie-based (no `/[locale]/` URL prefix); English + one optional secondary locale (Hindi for India, Arabic for UAE/Qatar/Saudi) |
| Email | Nodemailer via Gmail SMTP, locale-aware |
| Image storage | Cloudinary or Bunny.net, selectable per deployment via `IMAGE_PROVIDER` |
| State (client) | Zustand (cart store, favourites store) |
| Monitoring | Sentry (`@sentry/nextjs`), Vercel Analytics |
| Testing | Playwright (a handful of smoke-test specs, not wired into a blocking CI gate) |
| Deployment | Self-hosted VPS via PM2 + GitHub Actions SSH deploy, one instance per country |

---

## 3. Architecture

Single Next.js application — **no separate backend service**. `app/api/**` route handlers are
the entire backend.

- **No message queue / job runner.** "Background" work (payout clearing, subscription sweeps) is
  done via HTTP-triggered cron routes (`app/api/cron/*`) gated by a `CRON_SECRET` bearer token,
  called by an external Linux crontab on the VPS. This check is **fail-open if `CRON_SECRET` is
  unset** — always set it in production.
- **`middleware.ts` exists but is narrow in scope** — it only rejects requests with a malformed
  or duplicated `Host`/`X-Forwarded-Host` header and logs `/api/auth/*` traffic for debugging. It
  does **not** do auth/role route-protection. Route protection is still handled per-route
  (`getServerSession` + role check, server-side) and per-layout (client-side `useSession()`
  redirect in `app/admin/layout.tsx`, `app/vendor/layout.tsx`, `app/profile/layout.tsx`).
- **Deployment is VPS + PM2 + GitHub Actions**, not Vercel and not Docker — see [§17](#17-deployment-guide).

```
Browser (React Server/Client Components, Zustand cart/favourites stores)
        │ fetch()
        ▼
Next.js server on VPS (PM2)  ──auth──►  NextAuth (Credentials + Google OAuth, JWT)
        │
        ├──► MongoDB (Mongoose models, one database per country deployment)
        ├──► Razorpay / Tap Payments (checkout + vendor subscription)
        ├──► Cloudinary / Bunny.net (image storage)
        ├──► Gmail SMTP (nodemailer, locale-aware)
        └──► Sentry (error capture)

External Linux crontab ──Authorization: Bearer CRON_SECRET──► app/api/cron/*
```

---

## 4. Project Structure

```
LinknSmile/
├── app/
│   ├── (customer)/                # Customer-only route group (wishlist, etc.)
│   ├── admin/**                   # Admin dashboard — see §10
│   ├── vendor/**                  # Vendor portal — see §11
│   ├── auth/**                    # Login, register, OTP, password reset
│   ├── vendor-apply/, register-as-seller/   # Vendor onboarding funnels
│   ├── shop/[slug]/, categories/[slug]/, product/[id]/   # Storefront browsing
│   ├── cart/, checkout/, order-success/[id]/
│   ├── checkout/tap-return/, vendor-tap-return/          # Tap Payments hosted-redirect returns
│   ├── profile/**                 # Account details, order history, addresses
│   ├── blog/**, about-us/, contact-us/, termsofservice/, privacy-policy/,
│   │   refund-policy/, orders-and-returns/                # Static/CMS pages
│   ├── sellers/                   # Public vendor directory
│   ├── api/**                     # All backend route handlers — see §8
│   ├── layout.tsx, page.tsx, error.tsx, global-error.tsx, not-found.tsx
│   ├── robots.ts, sitemap.ts
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── admin/                     # Admin-specific widgets
│   ├── auth/                      # Login/register/OTP forms, SessionProvider wrapper
│   ├── assets/
│   └── header.tsx, footer.tsx, promo-bar.tsx, home-carousel.tsx, category-slider.tsx,
│       product-card.tsx, checkout-form.tsx, locale-switcher.tsx, ...
├── hooks/                         # use-mobile, use-toast, useFavourites, usePlatformSettings
├── lib/
│   ├── models/                    # All Mongoose schemas — see §9
│   ├── payments/                  # Gateway adapters — types.ts, razorpay.ts, tap.ts
│   ├── storage/                   # Image storage adapters — cloudinary.ts, bunny.ts
│   ├── services/                  # ledger-service.ts (double-entry wallet accounting)
│   ├── store/                     # cart-store.ts (Zustand)
│   ├── actions/                   # Server actions (e.g. locale.ts)
│   ├── scripts/                   # Manual-run maintenance scripts (seed-products, reconcile)
│   ├── db.ts, env.ts              # DB connection, required-env validation
│   ├── auth-options.ts, auth.ts, admin-check.ts
│   ├── pricing.ts, coupon-pricing.ts   # Order pricing incl. tax/VAT — see §13
│   ├── currency.ts, site-config.ts     # Client-safe currency + tracking-ID config
│   ├── i18n-config.ts, normalize-digits.ts, email-locale.ts   # i18n/RTL plumbing — see §14
│   ├── email.tsx, EmailOtp.ts          # Transactional email (two parallel modules, see §18)
│   ├── stock-reservation.ts, stock-safe-decrement.ts
│   ├── vendor-subscription-status.ts, order-fulfillment.ts, subscription-fulfillment.ts
│   └── cacheClient.ts, cors.ts, rate-limit.ts, facebook-pixel.ts, home-cache.ts, constants.ts,
│       utils.ts, validation.ts
├── i18n/request.ts                # next-intl request config (reads the locale cookie)
├── messages/                      # en.json, hi.json, ar.json — translation catalogs
├── types/                         # TypeScript augmentations (next-auth module, etc.)
├── hooks/, e2e/                   # Playwright smoke specs
├── scripts/deploy/                # deploy.sh, rollback.sh, health-check.sh
├── public/                        # Static assets
├── middleware.ts                  # Host-header validation + auth-route logging (not auth gating)
├── ecosystem.config.js            # PM2 config, parameterized per country
├── next.config.mjs, tsconfig.json
└── Dockerfile, vercel.json        # Present but vestigial — see §17
```

---

## 5. Environment Variables

Create a `.env` file at the project root (or `.env.ae` etc. per country deployment).
**Never commit real values.** `lib/env.ts` throws on startup if any *always-required* var is
missing.

```env
# ─── Always required ─────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxx.mongodb.net/<db-name>
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://linknsmile.com          # localhost:3004 for dev
NEXT_PUBLIC_SITE_URL=https://linknsmile.com  # localhost:3004 for dev
NODE_ENV=production                          # development for dev
GMAIL_EMAIL=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx       # Gmail App Password, not the account password
EMAIL_FROM=your@gmail.com                    # falls back to GMAIL_EMAIL if unset

# ─── Payment gateway (choose one set via PAYMENT_GATEWAY) ─
PAYMENT_GATEWAY=razorpay                     # "razorpay" (default) or "tap"
# Razorpay (India)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
# Tap Payments (UAE/Qatar/Saudi)
TAP_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYMENT_GATEWAY=tap

# ─── Image storage (choose one via IMAGE_PROVIDER) ───────
IMAGE_PROVIDER=cloudinary                    # "cloudinary" (default) or "bunny"
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
# Bunny.net (alternative)
BUNNY_STORAGE_ZONE=your_zone
BUNNY_STORAGE_API_KEY=your_key
BUNNY_STORAGE_ENDPOINT=storage.bunnycdn.com
BUNNY_PULL_ZONE_HOSTNAME=your-zone.b-cdn.net

# ─── Auth (optional) ─────────────────────────────────────
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx

# ─── Currency / locale / i18n ────────────────────────────
NEXT_PUBLIC_CURRENCY_CODE=INR                # default INR
NEXT_PUBLIC_LOCALE=en-IN                     # Intl number/date formatting only
NEXT_PUBLIC_SECONDARY_LOCALE=hi              # "hi" for India, "ar" for UAE/Qatar/Saudi; empty = English-only
NEXT_PUBLIC_DEFAULT_COUNTRY=India            # checkout form default only

# ─── Tracking / analytics (optional, default to India's IDs if unset) ─
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_GOOGLE_ADS_ID=
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=

# ─── Misc ─────────────────────────────────────────────────
CRON_SECRET=some-strong-secret               # MUST be set in production — cron routes fail open if unset
ADMIN_EMAIL=admin@linknsmile.com             # optional CC on order notification emails
NEXT_PUBLIC_IMAGE_HOSTNAMES=res.cloudinary.com,your-zone.b-cdn.net
```

> **Common mistake:** Setting `NEXTAUTH_URL` or `NEXT_PUBLIC_SITE_URL` to `localhost:3004` while
> deploying to production causes logout and auth redirects to break. Always update these for
> production. **Also watch for duplicated values** (e.g. an env var accidentally set twice,
> comma-joined) — this has caused a live `ERR_INVALID_URL` crash on the UAE deployment, see
> [§18](#18-known-issues).

---

## 6. Getting Started

### Prerequisites

- Node.js ≥ 18.18.0
- npm (this repo is npm-only — no `pnpm-lock.yaml`, despite the `Dockerfile` assuming pnpm)
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

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`      | Start dev server on port 3004        |
| `npm run build`    | Production build                     |
| `npm run start`    | Serve production build on port 3004  |
| `npm run lint`     | Run ESLint (not a blocking CI gate — see §17) |
| `npm run typecheck`| Run TypeScript compiler checks (the actual blocking CI gate) |

---

## 7. Authentication Flow

LinknSmile uses **NextAuth.js v4** with a JWT session strategy and two providers:

- **Credentials** (email + bcrypt-hashed password)
- **Google OAuth** (when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set)

### Registration

1. User submits name, email, password at `/auth/register` (or `/auth/register-vendor` for shops).
2. Registration data is staged on a pending `Otp` document; an OTP is sent via `lib/EmailOtp.ts`,
   with Arabic-Indic digit input normalized (`lib/normalize-digits.ts`) before comparison.
3. `verify-otp` creates the real `User` document (and a `Shop` for vendor registrations).
4. A locale-aware welcome email is dispatched via `lib/email.tsx`.

### Login

1. User submits credentials (or uses Google) at `/auth/login`.
2. NextAuth validates against the DB (bcrypt compare for credentials) or the Google profile.
3. A JWT session is issued, stored in an HTTP-only cookie.
4. Session is accessible via `useSession()` client-side or `getServerSession()` server-side.

### Password Reset

1. `/auth/forgot-password` → user enters email → OTP sent.
2. `/auth/verify-reset-otp` → user enters OTP → verified.
3. `/auth/reset-password` → user sets new password → bcrypt hashed & saved.

### Route Protection

There is **no centralized auth middleware** — `middleware.ts` only validates the `Host` header
and logs auth traffic (see [§3](#3-architecture)). Protection is applied:

- Server-side, per API route: `getServerSession(authOptions)` + a manual role check.
- Client-side, per layout: `useSession()` redirect in `app/admin/layout.tsx`,
  `app/vendor/layout.tsx`, and `app/profile/layout.tsx`.

A separate, parallel mobile-auth mechanism also exists (`api/login`/`api/me` with a custom
`jsonwebtoken` scheme, alongside `api/mobile-auth/login` which is NextAuth-cookie-compatible) —
see [§18](#18-known-issues).

### Session Shape

```ts
session.user = {
  id: string,
  name: string,
  email: string,
  role: "user" | "admin" | "shop_owner",
  image?: string
}
```

---

## 8. API Reference

All routes live under `app/api/**`. Grouped by concern (see each route's own file for exact
HTTP methods and payloads):

**Auth** — `auth/[...nextauth]`, `login`, `register`, `register-vendor`, `verify-otp`,
`resend-otp`, `forgot-password`, `verify-reset-otp`, `reset-password`, `change-password`, `me`,
`mobile-auth/login`

**Catalog (public read)** — `products`, `products/[id]`, `products/[id]/reviews`,
`products/reviews/all`, `categories`, `categories/[id]`, `companies`, `shops`, `blogs`,
`blogs/[slug]`, `promos`, `promos/[id]`, `home-banner`, `hero-products`,
`platform-settings/public`

**Cart / Orders / Coupons** — `cart`, `orders`, `orders/[id]`, `coupons`, `coupons/validate`

**Payments** — `razorpay/create-order`, `razorpay/verify-payment`, `tap/create-order`,
`tap/verify-payment`, `tap/webhook`

**Vendor portal** (`shop_owner`-gated) — `vendor/apply`, `vendor/apply/intent`,
`vendor/bank-details`, `vendor/exit`, `vendor/orders(+/[id])`, `vendor/payout/request`,
`vendor/payouts`, `vendor/products(+/[id],/bulk-upload,/reviews,/stats)`,
`vendor/reviews(+/[id],/[id]/reply)`, `vendor/settings`, `vendor/stats`, `vendor/status`,
`vendor/subscription/{create-order,verify-payment}`,
`vendor/subscription/tap/{create-order,verify-payment,webhook}`,
`vendor/wallet(+/ledger,/orders)`, `vendor/coupons(+/[id])`

**Admin** — `admin/analytics`, `admin/orders`, `admin/products(+/approve,/approve-all,/pending)`,
`admin/categories`, `admin/reviews(+/[id],/[id]/reply,/[id]/status)`,
`admin/home-banner(+/[id],/reorder)`, `admin/hero-products(+/[id],/reorder)`,
`admin/payment-settings(+/public)`, `admin/platform-settings`, `admin/payouts`,
`admin/vendor-subscription-settings`, `admin/vendor-subscriptions(+/[shopId])`,
`admin/vendors(+/[id])`, `admin/wallet-action`, `admin/wallet-overview`,
`admin/images/{delete,scan}`

**Cron** (bearer-token gated) — `cron/clear-pending-funds`, `cron/vendor-subscription-sweep`

**Wishlist / Favourites / Users / Addresses** — `wishlist`, `wishlist/[productId]`,
`favourites`, `addresses(+/[id])`, `users`, `users/[id]`, `users/profile`

**File serving** — `serve-files/[...path]`, `serve-upload/[...path]`, `upload`

**Dev / infra** — `debug/link-shop`, `setup/brands`, `setup/categories`, `test`,
`sentry-example-api`, `health`, `email/send` — several of these are dev-only utilities; see
[§18](#18-known-issues) and `CLAUDE_CODE_RULES.md` before removing or exposing any of them.

---

## 9. Database Models

All schemas live in `lib/models/`:

| Model | Purpose |
|---|---|
| User | Account (customer/admin/vendor), auth, `locale` field for email language |
| Shop | Vendor storefront record — approval, commission rate, bank details, slug |
| Product | Catalog item — price, stock, sizes, approval workflow, subscription-hide flag |
| Category | Hierarchical product category (self-referential parent) |
| Company | Brand/landing-page content referenced by products/blogs |
| Cart | Server-side cart, keyed by userId, revalidated against DB on every write |
| Order | Order record — items, tax, coupon, multi-gateway payment fields, vendor payout split |
| Wishlist | Simple product-only save list (legacy, narrower than Favourite) |
| Favourite | Generic save (product or seller) — the more current mechanism |
| Address | Saved address book entries (no `country` field yet) |
| Review | Product reviews with moderation status + audit log |
| Promo | Sitewide announcement/banner content |
| Blog | CMS blog posts |
| Otp | OTP codes + staging table for pending registration data |
| Wallet | Per-shop balance cache (pending / withdrawable / frozen) |
| LedgerEntry | Double-entry accounting log — the actual source of truth for money |
| Payout | Vendor payout requests + approval state machine |
| DisputeCase | Chargeback/refund/fraud dispute tracking |
| AuditLog | Immutable admin/ledger action log |
| PaymentSettings | Singleton admin toggle (enable COD/online payments, min/max COD) |
| VendorSubscriptionSettings | Singleton — annual fee amount/currency |
| VendorSubscription | Per-shop subscription status/expiry/payment history (both gateways) |
| HomeBanner | Admin-managed homepage hero carousel slides |
| HeroProduct | Curated homepage "Featured" product spotlight |
| Coupon | Per-vendor discount codes |
| PlatformSettings | Singleton — support email/phone, tagline, tax rate |

---

## 10. Admin Panel

Access at `/admin` — requires a session with `role: "admin"` (checked per-route/per-layout, see
[§7](#7-authentication-flow)).

| Section | Purpose |
|---|---|
| Dashboard (`/admin`) | Revenue chart, KPI cards (orders, revenue, products, users), top-category breakdown |
| Users (`/admin/users`) | View/search customers, edit role, delete users |
| Orders (`/admin/orders`) | Full order list, update order status |
| Products (`/admin/products`, `/add`, `/edit/[id]`) | Product CRUD, toggle active/inactive |
| Product Approvals (`/admin/product-approvals`) | Approve/reject vendor-submitted products |
| Vendors (`/admin/vendors`, `/[id]`, `/subscriptions`) | Manage vendor status and subscriptions |
| Categories (`/admin/categories`) | Category CRUD |
| Promos (`/admin/promo-bar`) | Scrolling promo banner content |
| Home Banner / Hero Products | Homepage carousel and featured-product merchandising |
| Blogs (`/admin/blogs`, `/add`, `/[slug]/edit`) | Blog CMS |
| Reviews (`/admin/reviews`) | Review moderation, admin replies |
| Payouts (`/admin/payouts`) | Approve/process vendor payout requests |
| Wallet (`/admin/wallet`) | Platform wallet oversight, manual wallet actions |
| Payment Settings (`/admin/payment-settings`) | Toggle COD/online payments, min/max COD |
| Platform Settings (`/admin/platform-settings`) | Support contact info, tagline, tax rate, per deployment |
| Images (`/admin/images`) | Image scan/delete utility |

---

## 11. Vendor Portal

Access at `/vendor` — requires a session with `role: "shop_owner"` and an approved `Shop`.
Subscription renewal is not a separate page — it's a gate baked into `app/vendor/layout.tsx`
(a grace-period banner/block once the annual subscription lapses).

| Section | Purpose |
|---|---|
| Dashboard / Stats | Vendor-scoped sales stats |
| Products (`/products`, `/add`, `/edit/[id]`, `/bulk-upload`) | Product CRUD + CSV bulk upload |
| Orders (`/orders`, `/[id]`) | Fulfill orders placed for this vendor's products |
| Coupons (`/coupons`, `/add`, `/edit/[id]`) | Per-vendor discount codes |
| Reviews (`/reviews`) | View and reply to reviews on this vendor's products |
| Wallet (`/wallet`) | Balance, ledger history, order-level earnings breakdown |
| Payouts (`/payouts`) | Request withdrawals against the wallet balance |
| Bank Details (`/bank-details`) | Payout bank account (IFSC for India, SWIFT/BIC available for GCC) |
| Settings (`/settings`) | Shop profile settings |

---

## 12. Payment Integration

Both gateways share a common `PaymentGatewayAdapter` interface (`lib/payments/types.ts`); the
active gateway is selected deployment-wide via `PAYMENT_GATEWAY` (not per-request).

### Razorpay (India)

```
Customer clicks "Pay Now"
       ↓
POST /api/razorpay/create-order  → creates a Razorpay order server-side
       ↓
Razorpay widget opens client-side → customer completes payment
       ↓
POST /api/razorpay/verify-payment
  → verifies the payment signature, creates the Order in DB, reduces stock,
    sends confirmation email to customer + admin
       ↓
Redirect to /order-success/[orderId]
```
There is **no Razorpay webhook** — confirmation is entirely client-driven (see
[§18](#18-known-issues)).

### Tap Payments (UAE / Qatar / Saudi)

Server-driven hosted-redirect checkout (`lib/payments/tap.ts`) rather than an embedded widget.
Includes a signed webhook (`tap/webhook`) using a constant-time `hashstring` comparison — the
safer pattern of the two gateways. **Status:** code-complete and typechecked, but not yet
live-tested end-to-end — blocked on a GCC-region mobile number needed for Tap's own account
signup. See `MULTI_COUNTRY_REQUIREMENTS.md` §1 for the current blocker detail.

### Cash on Delivery

```
Customer selects "Cash on Delivery"
       ↓
POST /api/orders → creates order with paymentMethod: "cod", paymentStatus: "pending"
  → sends confirmation email → returns { orderId }
       ↓
Redirect to /order-success/[orderId]
```

---

## 13. Tax / VAT Engine

`computeOrderPricing()` in `lib/pricing.ts` applies a per-deployment, admin-editable
`PlatformSettings.taxRatePercent` **additively on the post-discount subtotal**. Vendor
commission/payout math is computed pre-tax and is unaffected. `Order.taxRatePercent`/`taxAmount`
record what was actually charged. Threaded through every pricing entry point, including Tap's.

Confirmed rates: **UAE 5%**, **Saudi Arabia 15%**, **Qatar 0%** (a real zero — genuinely not
charging VAT there, not an unfinished feature). India's rate is 0 (no-op).

This is a **compute-and-charge engine only** — no VAT registration-number collection, no
invoicing, no e-invoicing (e.g. ZATCA) compliance. It is not verified tax/legal advice; actual
KSA/UAE deemed-supplier registration/filing obligations are a separate open question for real
tax counsel (see `MULTI_COUNTRY_REQUIREMENTS.md` §2).

---

## 14. Internationalization (i18n / RTL)

Uses **next-intl** in cookie-based "without i18n routing" mode — there is **no `/[locale]/` URL
prefix**; the active locale is read from a `NEXT_LOCALE` cookie per-request (`i18n/request.ts`).

- **Locales:** English is always on. Each deployment has at most one optional secondary locale,
  set via `NEXT_PUBLIC_SECONDARY_LOCALE` — Hindi (`hi`) for India, Arabic (`ar`) for
  UAE/Qatar/Saudi.
- **Catalogs:** `messages/en.json`, `hi.json`, `ar.json`, namespaced by component/page.
- **RTL:** Tailwind v4's native logical-property utilities (`ms-*`/`me-*`, `text-start`/`text-end`),
  no plugin; `dir="rtl"` is set on `<html>` via `lib/i18n-config.ts`'s `RTL_LOCALES`.
  Arabic-Indic digit input (OTP fields) is normalized via `lib/normalize-digits.ts`.
- **Emails:** `User.locale` is captured at registration and kept in sync on every logged-in
  locale switch; `lib/email-locale.ts`'s `getEmailTranslator()` sends customer/vendor-facing
  transactional emails in that locale, with an `"en"` fallback. Admin-only email builders stay
  hardcoded English by design.
- **Coverage:** the entire non-admin, customer/vendor/seller-facing surface is translated.
  `app/admin/**` is deliberately English-only (internal-only, lowest priority).
- **Caveat:** neither `hi.json` nor `ar.json` has had a native-speaker review pass yet —
  recommended before either goes live for real, especially the ledger/accounting vocabulary and
  the legal/policy pages.

---

## 15. Multi-Country Deployment

LinknSmile is **not** a shared multi-tenant application (one app/database partitioned by a
tenant or country field). Instead, each country gets a **fully independent deployment**:

- Its own MongoDB database (e.g. India's DB vs. UAE's separate `linknsmile_ae` database, each
  with its own connection string and, ideally, its own DB user).
- Its own PM2 process and port (`ecosystem.config.js` runs exactly one app per invocation,
  parameterized via `PM2_*` env vars — never a multi-app array).
- Its own domain/subdomain and its own GitHub Actions deploy/rollback workflow
  (`deploy.yml`/`rollback.yml` for India, `deploy-ae.yml`/`rollback-ae.yml` for UAE).

This keeps each country's data, traffic, and deploy lifecycle fully isolated from the others at
the infrastructure level — there is no in-app "which tenant/country am I" resolution logic to
reason about.

> **⚠️ UAE data-isolation bug — unresolved.** `ae.linknsmile.com` has been confirmed serving
> India's product/platform-settings/home-banner data to real UAE visitors, despite its own
> database being verified correct and genuinely empty. This has been ruled out as an application
> code bug (DB URI, `.env` handling, Mongoose config, build/page caching were all individually
> cleared) — the leading theory is an infra-level misconfiguration (an orphaned process or
> reverse-proxy misroute on UAE's port). **Do not treat `ae.linknsmile.com` as trustworthy for
> demos, testing, or anything data-related until this is resolved.** Full investigation history:
> `LINKNSMILE_UAE_DEPLOYMENT.md` §7, `MULTI_COUNTRY_REQUIREMENTS.md` §5,
> `00_LINKNSMILE_SYSTEM_DESIGN_AND_DEPLOYMENT.md`.

---

## 16. Email System

Emails are sent via **Nodemailer** using Gmail SMTP, through **two parallel wrapper modules**
(a known duplication, see [§18](#18-known-issues)): `lib/email.tsx` (orders, payouts,
subscriptions, 11 templates) and `lib/EmailOtp.ts` (registration/reset OTPs).

### Setup

```env
GMAIL_EMAIL=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Use a Gmail **App Password** (not your account password). Enable 2FA on Gmail first, then
generate an App Password from Google Account → Security.

### Email Types

| Trigger | Template Location | Recipients | Locale-aware |
|---|---|---|---|
| Registration OTP | `lib/EmailOtp.ts` | New user | No |
| Welcome | `lib/email.tsx` | New user | Yes |
| Password reset OTP | `lib/EmailOtp.ts` | User | No |
| Order confirmation (COD / Razorpay / Tap) | `lib/email.tsx` | Customer + Admin | Yes (customer copy) |
| Order status update | `lib/email.tsx` | Customer | Yes |
| Vendor payout / subscription notices | `lib/email.tsx` | Vendor / Admin | Yes (vendor copy), admin-only stay English |

> Email failures are caught gracefully and never block the primary transaction from completing.

---

## 17. Deployment Guide

**Current, live deployment method: self-hosted VPS + PM2 + GitHub Actions**, one instance per
country. `Dockerfile` (pnpm-based, but the repo is npm-only) and `vercel.json` (only declares
cron schedules) both exist in the repo but are **not used by any live deploy path** — treat them
as vestigial unless you're the one reviving them.

### Via GitHub Actions (real path)

Pushing to the tracked deploy branch triggers `.github/workflows/deploy.yml` (India) or
`deploy-ae.yml` (UAE), which SSHes into the VPS, pulls, installs, builds, and reloads the PM2
process defined in `ecosystem.config.js`. `rollback.yml`/`rollback-ae.yml` exist for reverting.
CI (`ci.yml`) runs `npm ci` + `npm run build` on Node 24; its lint step is
`continue-on-error: true` and `next.config.mjs` suppresses TypeScript/ESLint build errors, so
**`npm run typecheck` is the only real blocking gate** — always run it before merging.

### Manual / VPS

```bash
npm run build
npm run start     # Serves on the configured port (3004 for India)
```

Use **nginx**/OpenLiteSpeed as a reverse proxy in front of the Node process. If you're standing
up a *new* country deployment, give its OpenLiteSpeed `extprocessor` a **globally-unique name**
across the whole server — a naming collision between two countries' vhost configs was the root
cause of a serious cross-country data leak, see
`00_LINKNSMILE_SYSTEM_DESIGN_AND_DEPLOYMENT.md`.

### Environment Variables Checklist Before Deploying

- [ ] `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` point to the real production domain (not localhost), and are not accidentally duplicated/comma-joined
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` points at this country's own database
- [ ] `PAYMENT_GATEWAY` and the matching gateway's live keys are set correctly for this country
- [ ] `CRON_SECRET` is set (the cron routes fail open if it's missing)
- [ ] `NEXT_PUBLIC_SECONDARY_LOCALE` matches this country's intended language
- [ ] `NEXTAUTH_SECRET` is a strong random string

---

## 18. Known Issues

- **UAE data-isolation bug — unresolved.** See [§15](#15-multi-country-deployment).
- **Active investigation: `ERR_INVALID_URL` crash on the UAE deployment**, caused by a
  duplicated env value feeding NextAuth a malformed URL. Debug logging is currently live in
  `app/api/auth/[...nextauth]/route.ts` and `middleware.ts` pending root-cause confirmation —
  remove it once closed out.
- **`sonner`'s `<Toaster>` is never mounted.** ~14 files still call `toast()` from `sonner`;
  those calls are silent no-ops in production. Either mount `sonner`'s own `<Toaster>` or migrate
  those files to the already-working shadcn `useToast()`/`<Toaster />`.
- **Stale "Instapeel" branding + a missing logo** on `app/auth/forgot-password/page.tsx` — still
  references the pre-rebrand name and `/companylogo.jpg`, which doesn't exist on disk (broken
  image, `400` from Next's image optimizer on every load).
- **No Razorpay webhook** — payment confirmation is entirely client-driven.
- **Razorpay signature check uses a plain `!==` comparison**, not a constant-time compare.
- **Two parallel mobile-auth mechanisms** (`api/login`/`api/me` custom JWT vs.
  `api/mobile-auth/login` NextAuth-cookie-compatible) — unclear which the mobile client actually
  uses; worth consolidating.
- **Two parallel email-sending modules** (`lib/email.tsx` and `lib/EmailOtp.ts`) — duplication,
  not yet unified.
- **4 dead-code components with stale pre-rebrand skincare-brand content**
  (`components/FAQ.tsx`, `testimonials.tsx`, `brand-filters.tsx`, `coming-soon.tsx`) —
  confirmed unreferenced anywhere; safe cleanup candidates, low priority.
- **Address model has no `country` field** — will need a schema change before a non-India
  customer can properly save an address-book entry.

For the full, continuously-updated backlog (including anything marked "Needs Manual
Verification"), see `PROJECT_SOURCE_OF_TRUTH.md` §12/§16 and `CLAUDE_CODE_RULES.md` before
touching any of the above.

---

## 19. Security Checklist

- [ ] `.env` (and any per-country `.env.*`) is in `.gitignore` and never committed — the tracked
      `.env.example`/`.env.ae.example` should only ever contain blank placeholders
- [ ] `NEXTAUTH_SECRET` is a strong random string (32+ chars)
- [ ] `CRON_SECRET` is always set in production — the check fails open if it's missing
- [ ] Razorpay payment signature verified server-side before confirming any order (upgrade the
      current plain `!==` compare to a constant-time comparison when touching that code)
- [ ] Tap webhook `hashstring` signature verified (already constant-time)
- [ ] Passwords hashed with bcrypt
- [ ] Admin/vendor routes protected both server-side (`getServerSession(authOptions)` + role
      check — make sure `authOptions` is always passed; a couple of admin routes currently call
      bare `getServerSession()`) and client-side (layout-level redirect)
- [ ] `middleware.ts`'s Host-header validation stays in place — it's a real defense, not just logging
- [ ] MongoDB Atlas IP whitelist configured (not `0.0.0.0/0` in production)
- [ ] Gmail App Password used (not account password)
- [ ] Live Razorpay/Tap keys rotated if ever accidentally exposed
- [ ] Cloudinary/Bunny.net credentials rotated if ever accidentally exposed
- [ ] `npm run typecheck` passes — it's the only real blocking build gate (lint and TS/ESLint
      build errors are otherwise suppressed)
- [ ] Dev/debug routes (`debug/*`, `setup/*`, `test`) are not reachable/left auth-gated in
      production — confirm before every country launch

---

_This README reflects the application as of 2026-09-11. Keep it in sync with real changes —
see the note added to `CLAUDE_CODE_RULES.md` about updating this file alongside
`PROJECT_SOURCE_OF_TRUTH.md`._
