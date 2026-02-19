<p align="center">
  <img src="./public/companylogo.jpg" alt="Instapeels logo" width="220" />
</p>

<h1 align="center">Instapeels.com</h1>

<p align="center"><strong>Multi-brand skincare commerce platform with a production-ready storefront, checkout engine, and admin suite.</strong></p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15-black?style=flat&logo=nextdotjs" alt="Next.js" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=000" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=fff" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/TailwindCSS-4-38BDF8?style=flat&logo=tailwindcss&logoColor=fff" alt="TailwindCSS" /></a>
  <a href="https://mongoosejs.com"><img src="https://img.shields.io/badge/Mongoose-ODM-AA2929?style=flat&logo=mongoose" alt="Mongoose" /></a>
</p>

---

# Table of Contents

1. [Overview](#overview)
2. [Key Product Pillars](#key-product-pillars)
3. [Tech Stack](#tech-stack)
4. [Solution Architecture](#solution-architecture)
5. [Major Application Areas](#major-application-areas)
6. [Project Structure](#project-structure)
7. [Environment Configuration](#environment-configuration)
8. [Getting Started](#getting-started)
9. [Available Scripts](#available-scripts)
10. [Business Flows](#business-flows)
11. [Integrations & 3rd-Party Services](#integrations--3rd-party-services)
12. [Security & Compliance](#security--compliance)
13. [Performance & Observability](#performance--observability)
14. [Deployment Guide](#deployment-guide)
15. [Maintenance & Ops](#maintenance--ops)
16. [Additional Documentation](#additional-documentation)
17. [Contribution Guidelines](#contribution-guidelines)
18. [Acknowledgements](#acknowledgements)

---

# Overview

Instapeels2 is a full-stack e-commerce platform focused on premium skincare brands. It ships as a production-ready Next.js App Router project that combines a customer-facing storefront, a checkout system powered by Razorpay & Cash-on-Delivery, and a feature-rich admin workspace with analytics, catalog management, and marketing tooling.

The application is built for scalability, with serverless-friendly API routes, MongoDB persistence, distributed caching hooks, marketing pixels, and robust transactional email capabilities.

---

# Key Product Pillars

- **Multi-brand Storefront**: Curated product listings, concern-based merchandising, blog support, and rich marketing content.
- **Conversion-Optimized Checkout**: Persistent cart, authenticated flow, Razorpay integration, COD fallback, and analytics tagging.
- **Admin Operations Suite**: Comprehensive analytics dashboard, catalog CRUD, order fulfillment tooling, promotional management, and user administration.
- **Lifecycle Messaging**: OTP-based onboarding, post-purchase confirmations, admin alerts, and status update notifications via Gmail SMTP.
- **Scalable Foundation**: App Router, shadcn/ui design system, optimized images, Vercel Analytics, and structured SEO metadata.

---

# Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19 and TypeScript 5.
- **Styling**: Tailwind CSS 4, shadcn/ui component primitives, Lucide iconography.
- **State Management**: Zustand (cart persistence), React Query-style caching helpers (`lib/cacheClient`).
- **Forms & Validation**: React Hook Form, Zod schemas, Radix UI form controls.
- **Authentication**: NextAuth (credentials provider + JWT sessions), OTP verification flows.
- **Database**: MongoDB via Mongoose ODM (`lib/db.ts`).
- **Payments**: Razorpay order creation & verification APIs with signed webhook-style validation, Cash on Delivery pathway.
- **Email**: Nodemailer Gmail transporter, HTML templates in `lib/email.tsx` & `lib/EmailOtp.ts`.
- **Analytics**: Google Tag Manager, Google Ads conversion tracking, Facebook Pixel, Vercel Analytics.

---

# Solution Architecture

- **App Router**: Segregated routes for public pages (`app/page.tsx`, `app/shop`, `app/blog`), account management (`app/profile`), and admin modules (`app/admin`).
- **API Layer**: `/app/api/**` exposes RESTful endpoints for authentication, catalog, orders, Razorpay integration, uploads, and analytics. Each handler uses `connectDB()` to reuse MongoDB connections across edge invocations.
- **Middleware**: `middleware.ts` enforces authentication on `/checkout`, `/admin`, and dashboard routes using NextAuth session tokens.
- **Data Source**: MongoDB collections for products, orders, users, reviews, companies, promos, and analytics aggregates.
- **Caching Strategy**: Custom `fetchWithCache` & `getCachedSync` utilities allow time-based caching of storefront queries with background refresh.
- **Email Templates**: JSX-based templates render rich transactional emails dispatched via `lib/email.tsx`.
- **Front-End Composition**: shadcn/ui components plus custom modules (carousels, shop-by-concern, testimonials) deliver a modern UX optimized for conversion and storytelling.

---

# Major Application Areas

## Storefront

- **Home Experience**: Carousel, concern-based product discovery, featured collections, social proof components.
- **Catalog**: Dynamic company + category pages at `app/shop/[company]` and `app/shop/[company]/[category]` with filtering, sorting, and pagination support.
- **Content**: Rich CMS-powered blog (`app/blog`) to boost organic traffic and thought leadership.
- **Informational Pages**: About Us, Contact, Privacy Policy, Terms of Service, Refund Policy, Orders & Returns.

## Customer Account & Auth

- **Registration**: OTP-verified signup ensuring valid contact information before enabling access.
- **Login**: Credential-based sign-in with JWT sessions maintained via HTTP-only cookies.
- **Password Recovery**: OTP-secured reset flows (`/auth/forgot-password`, `/auth/verify-reset-otp`, `/auth/reset-password`).
- **Profile Area**: Order history, account details, and address management under `app/profile` and nested routes.

Refer to [AuthFlow.md](./AuthFlow.md) for a deep-dive into the authentication lifecycle.

## Checkout & Orders

- **Cart Persistence**: Stored in Zustand + `localStorage` to recover across sessions.
- **Checkout Screen**: Auth-gated flow with address capture, payment method selection, and real-time validation.
- **Payment Options**: Razorpay embedded checkout for prepaid transactions, Cash on Delivery for alternate payment preference.
- **Order Success**: Post-payment confirmation screens under `/order-success/[id]` with order summary.

Refer to [CheckoutFlow.md](./CheckoutFlow.md) for detailed sequence diagrams and endpoint mapping.

## Admin Suite

- **Dashboard**: Extensive analytics (revenue, orders, customer insights, product performance, geographic heatmaps) built atop Recharts.
- **Catalog Operations**: CRUD for companies, categories, products, promos, blogs, and reviews.
- **Order Management**: Status updates, payment tracking, stock adjustments.
- **User Directory**: Insight into customer base and role management.
- **Setup Wizards**: Guided flows for bootstrapping brands, categories, and initial inventory.

---

# Project Structure

```bash
Instapeels2/
├─ app/
│  ├─ page.tsx                # Storefront landing page
│  ├─ layout.tsx              # Global layout, SEO metadata, tracking pixels
│  ├─ auth/                   # Login, register, OTP, reset pages
│  ├─ cart/, checkout/, order-success/  # Customer purchase journey
│  ├─ profile/                # Account + order history
│  ├─ admin/                  # Operations dashboard & CRUD modules
│  └─ api/                    # Server routes (auth, products, orders, razorpay, etc.)
├─ components/                # Reusable UI primitives & feature components
├─ hooks/                     # Custom React hooks
├─ lib/                       # Database, auth, email, cache utilities, stores
├─ public/                    # Static assets (logo, images, fonts)
├─ styles/                    # Global styling overrides
├─ AuthFlow.md                # Authentication system documentation
├─ CheckoutFlow.md            # Checkout process documentation
├─ next.config.mjs            # Next.js configuration
├─ package.json               # npm scripts & dependencies
└─ tsconfig.json              # TypeScript configuration
```

---

# Environment Configuration

Create a `.env.local` at the repository root with the following keys:

```bash
# Database
MONGODB_URI=""

# Authentication & Sessions
NEXTAUTH_URL="http://localhost:3004"
NEXTAUTH_SECRET=""

# Email (Gmail SMTP)
GMAIL_EMAIL=""
GMAIL_APP_PASSWORD=""
EMAIL_FROM=""           # optional – defaults to GMAIL_EMAIL

# Razorpay
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
NEXT_PUBLIC_RAZORPAY_KEY_ID=""  # exposed to client during checkout

# Optional: Analytics & Tracking
FACEBOOK_PIXEL_ID="997663834042843"        # already embedded in layout
GOOGLE_TAG_MANAGER_ID="GTM-KTP32WN"
GOOGLE_ADS_ID="AW-602275335"
```

> **Security Reminder:** Never commit `.env.local` or any secrets to version control. Use Vercel environment variables or a secure secret manager in production.

---

# Getting Started

1. **Install Node.js ≥ 18.18.0** and npm ≥ 9 (or use pnpm if preferred).
2. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-org>/Instapeels2.git
   cd Instapeels2
   ```
3. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```
4. **Configure environment:** duplicate `.env.local.example` if provided or create `.env.local` with the keys listed above.
5. **Seed data (optional):** use the admin setup wizard under `/admin/setup` after running the dev server to bootstrap brands, categories, and products.
6. **Start the development server:**
   ```bash
   npm run dev
   ```
7. **Open** `http://localhost:3004` in your browser.

---

# Available Scripts

- `npm run dev` – Launches Next.js in development mode on port 3004 with fast refresh.
- `npm run build` – Creates a production build.
- `npm run start` – Serves the production build on port 3004.
- `npm run lint` – Runs the ESLint suite.

> **Testing:** Formal automated tests are not yet included. Consider adding Playwright end-to-end flows (checkout, admin updates) and Jest unit tests for utilities (`lib/**`).

---

# Business Flows

## Authentication Lifecycle

1. User registers via `/auth/register`, triggering OTP dispatch.
2. OTP verification toggles `isVerified` and sends a welcome email (`getWelcomeEmail`).
3. NextAuth credential provider issues JWT sessions (`app/api/auth/[...nextauth]/route.ts`).
4. Middleware restricts protected routes based on session presence.
5. Password resets follow a second OTP pipeline to ensure account ownership.

## Checkout Journey

1. Cart items persisted via `lib/store/cart-store.ts` (Zustand).
2. Authenticated users access `/checkout` (guarded via middleware + `useSession`).
3. Shipping form (`components/checkout-form.tsx`) captures address details.
4. Payment selection triggers either:
   - **COD:** `POST /api/orders` creates order, sends customer/admin emails, redirects to `/order-success/:id`.
   - **Razorpay:** Client fetches `/api/razorpay/create-order`, confirms payment in widget, then `POST /api/razorpay/verify-payment` validates signature, updates inventory, sends emails, redirects to success page.
5. Cart clears and analytics events (Pixel `trackInitiateCheckout`) fire accordingly.

---

# Integrations & 3rd-Party Services

- **Razorpay**: Secure online payments with signature verification and stock adjustments.
- **Gmail SMTP (Nodemailer)**: Transactional email pipeline for OTPs, confirmations, notifications.
- **Facebook Pixel + Google Tag Manager + Google Ads**: Marketing attribution and conversion tracking.
- **Vercel Analytics**: First-party page analytics (imported in `app/layout.tsx`).
- **shadcn/ui + Radix UI**: Accessible, headless UI primitives.

---

# Security & Compliance

- **Authentication**: JWT sessions stored in secure cookies, OTP gating for critical flows.
- **Password Safety**: Bcrypt hashing (10 rounds), minimum length enforcement, rate-limited OTP attempts.
- **Order Protection**: Server-side signature validation for Razorpay callbacks to mitigate tampering.
- **Email Safety**: Graceful failure handling – email issues never block primary transactional flows.
- **Access Control**: Admin routes guarded at middleware and page level; server actions double-check user roles.
- **Secrets Handling**: Relies on environment variables; ensure proper secret management in deployments.

---

# Performance & Observability

- **Optimized Rendering**: Leverages Next.js App Router, server components, and incremental caching.
- **Static Assets**: Served from `/public` with preloading for logo and fonts.
- **Caching Utilities**: `fetchWithCache` reduces repeat API calls with stale-while-revalidate semantics.
- **Logging**: API routes log operational errors (email send failures, payment issues) without exposing sensitive data.
- **Analytics Hooks**: Pre-configured marketing pixels provide funnel visibility.

---

# Deployment Guide

1. **Choose Hosting**: Vercel is recommended for zero-config deployment of Next.js 15 applications.
2. **Set Environment Variables**: Mirror `.env.local` values in your hosting provider (Vercel Project Settings → Environment Variables).
3. **Configure Domains & DNS**: Ensure custom domain points to the deployment; update `NEXTAUTH_URL` and SEO metadata if domain changes.
4. **Provision MongoDB**: Use MongoDB Atlas; whitelist Vercel IP ranges or use Atlas Serverless.
5. **Razorpay Setup**: Generate live keys, enable relevant payment methods, configure webhook endpoints if used.
6. **Email Configuration**: Use a dedicated Gmail or switch to a production SMTP provider (e.g., SendGrid) for higher throughput.
7. **Build & Deploy**:
   ```bash
   npm run build
   npm run start
   ```
   On Vercel, this is handled automatically during deployment.
8. **Post-Deployment QA**: Validate checkout (test Razorpay sandbox & COD), email delivery, admin analytics, and marketing pixels.

---

# Maintenance & Ops

- **Data Backups**: Implement scheduled MongoDB backups (Atlas automated snapshots recommended).
- **Monitoring**: Pair Vercel Analytics with additional logging (e.g., Logtail, Datadog) if needed.
- **Scaling**: Vertical scaling handled by serverless runtime; monitor DB throughput and storage.
- **Dependency Updates**: Track Next.js, React, NextAuth, Razorpay SDK, and Tailwind releases for security patches.
- **Content Updates**: Admin CMS supports ongoing blog & catalog changes; static informational pages live in `app/**/page.tsx`.

---

# Additional Documentation

- [Authentication System Documentation](./AuthFlow.md)
- [Checkout Flow Documentation](./CheckoutFlow.md)
- Inspect individual API routes under `app/api/**` for implementation specifics (e.g., `/api/orders`, `/api/razorpay`, `/api/admin/analytics`).

---

# Contribution Guidelines

1. **Fork & Branch**: Create feature branches from `main`.
2. **Code Style**: Follow existing TypeScript + Tailwind patterns. Keep components modular and accessible.
3. **Linting**: Run `npm run lint` before opening a pull request.
4. **Testing**: Add tests when introducing critical logic or bug fixes (unit or E2E).
5. **PR Checklist**:
   - Clear description of change and impact.
   - Screenshots or recordings for UI updates.
   - Notes on migrations or environment variable changes.

For major features or architectural updates, please open a proposal issue first.

---

# Acknowledgements

- **Design & Engineering**: Inspired by modern D2C skincare experiences and optimized for omnichannel commerce.
- **Special Thanks**: Contributors maintaining the Tailwind, shadcn/ui, NextAuth, and Razorpay ecosystems.

---

**Crafted with ❤️ by [Varun Singh](https://github.com/VarunSingh19).**#   L i n k n S m i l e  
 