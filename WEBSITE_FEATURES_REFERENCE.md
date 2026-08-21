# Nezal Website — Feature Reference Doc

Purpose: a complete, actionable inventory of every feature on the Nezal e-commerce site, so it can be handed to Claude Code (or any dev) as a spec to replicate individual features — or the whole feature set — on another website. Point at any numbered section/bullet and say "build this."

Source project: Next.js 15 (App Router) + React 19 + TypeScript, MongoDB/Mongoose, Tailwind CSS 4 + shadcn/ui.

---

## 1. Tech Stack (what powers each feature)

| Concern | Tech used |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling/UI | Tailwind CSS 4, shadcn/ui (Radix primitives), Lucide icons, Framer Motion |
| Client state | Zustand + `persist` middleware (localStorage) — cart, wishlist, checkout address/payment, loading state |
| Forms | React Hook Form + Zod validation |
| Drag & drop | `@dnd-kit` — used everywhere admin needs manual ordering (products, collections, carousel slides, hero products, concerns, rituals, brands) |
| Search | Fuse.js — fuzzy/typo-tolerant search |
| Database | MongoDB via Mongoose, cached global connection, pooled (max 10 / min 2) |
| Auth | NextAuth — Credentials provider + Google OAuth, JWT sessions (30-day expiry) |
| Payments | CCAvenue (primary), Razorpay (secondary), Cash on Delivery |
| Shipping | Shiprocket API — rate calc, order creation, cancellation, tracking, status webhooks |
| Images | Cloudinary (uploads) |
| Email | Nodemailer via Gmail SMTP, HTML/JSX templates |
| Bot protection | Cloudflare Turnstile CAPTCHA on registration |
| Analytics/Marketing | Google Tag Manager (GA4 + Ads), Meta/Facebook Pixel (client) + Meta Conversions API (server, deduped) |
| Admin charts | Recharts |
| Testing | Vitest + mongodb-memory-server |

---

## 2. Customer-Facing Site

### 2.1 Site structure / routes
- `/` — homepage: hero carousel, hero products, "shop by category" auto-scrolling coverflow carousel, "shop by concern", new arrivals, ingredient/ritual discovery blocks, testimonials, FAQ, trust bar
- `/shop` — all products
- `/shop/[company]` — single-brand storefront
- `/shop/[company]/[category]` — category filtered within a brand
- `/shop/[company]/product/[id]` — product detail page
- `/collections` and `/collections/[slug]` — curated marketing collections (grouped by nav category/sub-category)
- `/concerns` and `/concerns/[slug]` — "shop by skin/hair concern" (e.g. Acne, Pigmentation, Hair Fall)
- `/ingredients` and `/ingredients/[slug]` — ingredient education pages with curated products
- `/rituals` and `/rituals/[slug]` — step-by-step routine pages with a curated product bundle
- `/blog`, `/blog/[slug]` — blog/CMS
- `/reviews` — sitewide reviews
- `/cart`, `/checkout`, `/order-success/[id]`
- `/profile`, `/profile/orders`, `/profile/orders/[id]`, `/profile/wishlist`
- `/auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/forgot-password`, `/auth/reset-password`
- `/about-us`, `/contact-us` (with anchor sections: story, philosophy, commitment, trust)
- Legal: `/privacy-policy`, `/refund-policy`, `/shipping-policy`, `/termsofservice`, `/orders-and-returns`

### 2.2 Product catalog & merchandising
- **Multi-brand architecture**: Company (brand) → Category → Product, plus a parallel Collection system for marketing-driven landing pages.
- **Product detail page**: image gallery, size/variant selector (independent price+stock per size), "why you'll love it" bullets, fragrance notes, "who is it for", skin/hair concern tags, expected results, key ingredients (name+benefit+icon), before/after results blocks, ritual-step tagging, reviews, wishlist button, Buy Now / Add to Cart, optional "Buy on Amazon" external link, related products.
- **Size variants**: each product can have multiple sizes, each with its own price, discount price, stock, SKU, weight, and dimensions.
- **Three-layer discount system** (single source of truth, priority resolved centrally):
  1. Direct per-product sale
  2. Collection-wide sale (auto-applied to all products in a collection, auto-cleared on removal)
  3. Flash sale (time-boxed, always wins while active, computed live — never persisted on the product)
- **Best-seller flagging** (admin-set, plus a separate "hero product" best-seller badge)
- **Reviews & ratings**: 1 review per user per product, 1–5 stars, moderation workflow (pending → approved/rejected), admin can reply to a review, product's aggregate rating/review count auto-recomputed on any moderation action.
- **Search**: unified fuzzy search returning grouped results — products, concerns, and ingredients (deduped across all products) — powers a header search dropdown.
- **Content taxonomies** beyond category/company, each with its own landing pages: Collections, Concerns, Ingredients, Rituals — all support curated product lists and SEO fields.
- **Blog/CMS**: title, slug, rich HTML content, excerpt, image, author, tags, published toggle.

> **See Appendix A below for a full field-by-field breakdown of the Product entity — what every field is for, exactly how the 3-layer pricing engine resolves a display price, how size variants behave, and how the admin "Quick Paste" bulk-entry tool works.**

### 2.3 Cart & checkout
- Cart persisted client-side (Zustand + localStorage), supports size variants, flash-sale price snapshot, and ritual-bundle tagging on line items; bulk-order cap (e.g. 12 units) routes large orders to a manual/phone flow.
- **Guest checkout supported** — cart, checkout, and order placement all work without login; orders store guest name/email/phone instead of a user reference.
- Checkout stepper: Cart → Delivery → Confirm.
- Saved-address reuse for logged-in users.
- **Address autocomplete** via OpenStreetMap Nominatim (free, no API key), debounced.
- **Real-time shipping rate calculation** per pincode + computed package weight/dimensions, returns cheapest courier + all available options.
- **Coupon codes**: separate "validate" (preview discount, no side effects) vs "redeem" (atomic, race-condition-safe) steps; percentage or flat discount, min order value, usage cap, date window, active toggle.
- **Free shipping threshold** (admin-configurable).
- Three payment methods at checkout, individually toggleable from admin: CCAvenue, Razorpay, Cash on Delivery (with optional COD handling fee, flat or percentage, and min/max order amount limits for COD eligibility).
- Server always re-verifies prices/stock/tax — never trusts client-submitted totals.
- Per-line-item GST/tax breakdown (GST-inclusive pricing, HSN code per product).
- Order success page with summary.
- Purchase tracking fires both client-side (Meta Pixel) and server-side (Meta Conversions API), deduplicated via a shared event ID.

### 2.4 Accounts & auth
- Register with name/email/password → OTP verification (6-digit, 10-min expiry, hashed, max attempt limit) before the account is usable.
- Cloudflare Turnstile CAPTCHA on registration to block bots.
- "Continue with Google" OAuth on both login and register (auto-creates verified account on first Google sign-in).
- Forgot password → OTP → reset flow (separate OTP fields from registration).
- Sessions last 30 days (JWT), rolling 24h refresh.
- Role field on user (`user`/`admin`) gates admin routes server-side.
- Wishlist: persisted server-side for logged-in users, client-side (localStorage) fallback for guests.
- Account dashboard with order history + order detail, and a wishlist page.

### 2.5 Trust/marketing UI blocks
- Animated testimonials, trust bar, "why choose us", FAQ accordion, sitewide promo announcement bar (admin-configurable message/link/colors/priority).
- Homepage hero banner carousel (admin-managed slides, each linkable to a product/collection/URL).
- "Hero products" homepage spotlight (separate from new arrivals).
- Per-brand "New Arrivals" carousel and "Shop by Concern" tiles, each independently admin-editable.

---

## 3. Admin Panel — MUST-HAVE features

Base route: `/admin`. All gated by `role === "admin"` checked server-side on every admin API route.

### 3.1 Dashboard & Analytics (`/admin`)
A single, very comprehensive analytics dashboard:
- Date range filter (7d/30d/3m/6m/1y or custom) with automatic prior-period comparison for growth %.
- Overview KPIs: total orders, total revenue, active product count, total users.
- Brand/company performance: revenue, orders, AOV, growth %, monthly trend, market share, rankings.
- Top products by units sold, revenue, growth, average rating.
- Top categories by revenue.
- Customer analytics: new vs returning, average order value + change, high-value customer count, average customer lifetime value, top 10 customers by revenue.
- Payment method analytics: order count/revenue/AOV/success rate per method (COD/Razorpay/CCAvenue).
- Time-based analytics: hourly and weekday order/revenue distribution (find peak times).
- Geography: revenue/orders by state and city, top cities.
- Inventory health: in-stock / low-stock (<10) / out-of-stock / overstock (>50) counts and $ value, per-brand breakdown, "needs attention" low-stock list.
- Customer satisfaction: overall + per-brand average rating, recent feedback feed.
- Order status and payment status breakdowns.
- Recent orders feed.
- Charts via Recharts: revenue trend, order status pie, geographic performance, inventory health, customer satisfaction.

### 3.2 Product management (`/admin/products`)
- Full CRUD (add/edit/delete) with a 2-step delete confirmation.
- Drag-and-drop manual reordering (sets a `sortOrder` field used by the "manual" sort mode on the storefront).
- Active/inactive toggle per product (soft-hide without deleting — `PATCH /api/products/[id]`).
- Pagination.
- **Size/variant editor**: add multiple sizes, each with own price/discount price/stock/SKU/weight/dimensions (see Appendix A.3).
- **Direct sale field**: set a % discount on this exact product from the edit form (see Appendix A.2 for how it interacts with collection/flash sales).
- **"Quick Paste" entry**: admin pastes a structured text block (name, price, description, ingredients, benefits, key ingredients, etc.) and the form auto-fills — major time-saver for bulk catalog entry (see Appendix A.4 for the exact format).
- Bulk image upload to Cloudinary (folder-scoped, size/type restricted).
- SEO fields per product/collection.
- Category and brand assignment.
- GST% and HSN code fields per product (tax compliance, used to compute the checkout tax breakdown).
- Server-side admin-only guard: every write endpoint (`POST`/`PUT`/`DELETE`/`PATCH`/reorder) checks `session.user.role === "admin"` and 403s otherwise.

> **See Appendix A for the exact Product schema and the full CRUD/pricing logic to replicate.**

### 3.3 Category management (`/admin/categories`)
- CRUD with nested/parent-child category support.

### 3.4 Brand/company management (`/admin/companies`)
- CRUD for brands.
- Per-brand nested management pages:
  - Manage that brand's homepage "New Arrivals" carousel.
  - Manage that brand's "Shop by Concern" tiles.

### 3.5 Collections (`/admin/collections`)
- CRUD, including hero section, story text, key ingredients, ritual steps, related collections, FAQ, SEO fields, nav category/sub-category grouping.
- Manage which products belong to a collection.
- Apply/remove a collection-wide sale that auto-propagates to member products.

### 3.6 Concerns & Rituals (`/admin/concerns`, `/admin/rituals`)
- CRUD for "shop by concern" tiles (label, headline, hero image, curated products, color theme).
- CRUD for rituals (ordered steps optionally linked to products, "ideal for" list, curated product bundle).
- Drag-and-drop reordering.

### 3.7 Homepage merchandising controls
- **Hero Products** (`/admin/hero-products`): curate homepage spotlight list, drag-reorder, best-seller flag, visibility/limit settings.
- **Home Carousel** (`/admin/home-carousel`): manage hero banner slides, each linkable to a product/collection/custom URL/none, drag-reorder.

### 3.8 Promotions
- **Flash Sales** (`/admin/flash-sales`): product multi-select, discount %, start/end date, active kill-switch. Always overrides other discounts while live.
- **Coupons** (`/admin/coupons`): percentage or flat discount, min order value, usage cap, date window, active toggle, race-condition-safe redemption.
- **Promo bar** (`/admin/promos`): sitewide announcement message, link+label, background/text color, priority ordering, active toggle.

### 3.9 Order management (`/admin/orders`)
- View/filter all orders.
- Update order status.
- Cancellation workflow: approve / reject / mark complete.
- Manual "Ship via [shipping provider]" trigger.
- Manual "Sync with [shipping provider]" to pull latest tracking status.
- Order detail viewer.

### 3.10 Reviews moderation (`/admin/reviews`)
- Approve/reject submitted reviews.
- Admin reply to a review.
- Product rating/review count auto-recalculated on any change.

### 3.11 User/customer management (`/admin/users`)
- Customer directory listing.
- Promote/demote role (user ↔ admin).
- Delete user.

### 3.12 Blog/CMS (`/admin/blogs`)
- CRUD with rich text editor, tags, author, published toggle.

### 3.13 Image management (`/admin/images`)
- Scans both local storage and cloud storage (Cloudinary) for all images.
- Folder-based browser with color-coded tagging.
- Orphaned image detection.
- One-click delete.

### 3.14 Settings (`/admin/settings`)
- Enable/disable each payment method (COD/Razorpay/CCAvenue) independently.
- COD min/max order amount thresholds.
- Free shipping threshold.
- COD handling fee (flat or percentage, with a minimum floor).

### 3.15 Setup Wizard (`/admin/setup`)
- Guided first-time onboarding: Step 1 create brands, Step 2 create categories, Step 3 seed sample products.
- "Run everything at once" one-click bootstrap option.
- Great feature to replicate for a fresh install of the new site.

---

## 4. Backend Business Logic Worth Replicating Exactly

These are "hard-won" implementation details — replicate the *behavior*, not just the UI:

- **Centralized sale-price resolution**: one module computes the effective price given direct sale / collection sale / flash sale, so price displays never go inconsistent between pages. Priority: flash sale > most-recently-applied (direct vs collection).
- **Server-side price/stock re-verification on every order**, regardless of what the client submitted — prevents price tampering.
- **Idempotent payment verification**: check for an existing order with the same payment ID before creating a new one (handles double-submit/retries).
- **Atomic, race-condition-safe coupon redemption**: single atomic update with a guard condition (`usedCount < maxUses`), separate from the "preview/validate" step which has no side effects.
- **Guest vs. logged-in order handling** must be consistent across every entry point that can create an order (COD, gateway A, gateway B) — don't let them drift.
- **Unified cancellation/refund flow**: one function handles cancelling the shipment, auto-initiating a refund if eligible, updating order state, and emailing the customer — callable both from the admin UI and from inbound shipping-provider webhooks, so both paths behave identically.
- **Abandoned payment recovery**: a scheduled job finds orders stuck "pending payment" past a timeout with no recovery email sent yet, sends one, and marks it sent (don't resend).
- **Phone number sanitization** before sending to a shipping API — malformed numbers are a common real-world cause of shipment-creation failures.
- **COD handling fee folded into the shipping charge** field sent to the shipping provider, so the amount collected on delivery matches what the customer was quoted at checkout.
- **Denormalized rating/review-count caching** on the product, recomputed on every review moderation action rather than aggregated live on every page view (performance).
- **Client-side cache layer** with TTL (stale-after) vs max-age (hard evict), background stale-while-revalidate refresh, request de-duplication for in-flight identical requests, and targeted cache invalidation after admin edits.

---

## 5. Data Models (Mongoose collections)

`User`, `Product`, `Category`, `Company`, `Order`, `Otp`, `Coupon`, `Review`, `Collection`, `FlashSale`, `Ritual`, `Concern`, `HeroProduct`, `HomeBanner`, `Promo`, `PaymentSettings`, `Blog`.

Key fields worth calling out:
- **User**: name, email, password (bcrypt), role (user/admin), isVerified, provider (credentials/google), wishlist (product refs), OTP/reset-OTP hash+expiry fields.
- **Product**: name, slug, description, price, discountPrice, images[], stock, SKU, category, company, weight/dimensions (with per-size overrides), HSN code, GST%, amazonUrl, merchandising copy fields, skinTypes[], concerns[], size variants[], rating, reviewCount, isBestSeller, sortOrder.
- **Order**: line items (with GST breakdown per item), shipping address, guest or user reference, payment method + status, order status, shipping status, cancellation subdocument, coupon applied, totals.

---

## 6. Integrations Checklist (env vars / accounts you'll need on the new site)

- MongoDB database
- NextAuth secret + URL
- Google OAuth client ID/secret (for Google sign-in)
- Gmail SMTP credentials (or swap for another transactional email provider) for OTP/order/notification emails
- A payment gateway (Razorpay and/or a local gateway like CCAvenue) + Cash on Delivery support
- A shipping/logistics API (Shiprocket or equivalent) for rate calculation, order creation, tracking
- Cloudinary (or equivalent) for image uploads
- Google Tag Manager ID
- Meta/Facebook Pixel ID + Conversions API access token
- Cloudflare Turnstile site/secret key for bot protection on signup
- A cron mechanism (for abandoned-payment recovery emails) with a shared secret to protect the endpoint

---

## Appendix A — Product Feature Deep Dive

This is the full breakdown of the single most important entity on the site: the Product. Everything below is taken directly from the actual schema and logic files, not guessed.

### A.1 Full Product schema — field by field

| Field | Type | Purpose |
|---|---|---|
| `name` | string, required | Product title shown everywhere (card, PDP, search, cart, order). |
| `slug` | string, required, lowercased | URL-safe identifier — product page is `/shop/[company]/product/[id]`, but the slug is also used for lookups/SEO. Auto-generated from `name` on create if not supplied. |
| `description` | string | Free-text product description. The Quick Paste parser treats the **first line specially as a "tagline"** and joins the rest as body text (`tagline\nrest`), so the PDP can render a short hook line distinctly from the full description. |
| `price` | number, required | Base/original price (MRP). This is the "was" price shown struck-through when a discount is active. **Always GST-inclusive** — `gstPercent` is only used to back-calculate the tax line, never added on top. |
| `discountPrice` | number, nullable | The **current effective selling price**. This field is not hand-set by admins — it's written automatically by `lib/sale.ts` as the output of whichever sale (direct/collection) currently wins. Never edit it directly; always go through `setDirectSale()`/`applyCollectionSale()`. |
| `image` | string | Primary/cover image URL (Cloudinary). Falls back to `images[0]` if not explicitly set. |
| `images` | string[] | Full gallery for the PDP image carousel. |
| `category` | ObjectId → Category | Which category (and via category → subcategory logic) the product appears under in `/shop/[company]/[category]`. |
| `company` | ObjectId → Company, required | Which brand owns this product — the core of the multi-brand architecture. |
| `stock` | number, default 0 | Inventory count used **only when the product has no size variants**. If `sizes[]` is populated, stock is tracked per-size instead and this field is ignored by the storefront. |
| `sku` | string, required | Stock-keeping unit / warehouse identifier. |
| `weight`, `length`, `breadth`, `height` | numbers (defaults 0.3kg / 10cm cube) | Package dimensions used to calculate shipping cost via the shipping-rate API. Each size variant can override these with its own packed dimensions (a 50ml bottle ships lighter/smaller than a 500ml one). |
| `hsn` | string | HSN code (tax classification code) — required for GST-compliant invoicing in India; put on every order line item at checkout. |
| `amazonUrl` | string | Optional. If set, the PDP shows a "Buy on Amazon" button linking out — a secondary sales-channel feature, not core to the cart flow. |
| `gstPercent` | number 0–28, nullable | Tax rate applied to this product. Used to compute the GST breakdown shown at checkout/on the invoice — **does not change the customer-facing price**, since prices are already tax-inclusive. |
| `ingredients`, `benefits`, `usage`, `suitableFor` | string arrays / text | Legacy free-text merchandising fields, still populated and displayed but superseded in newer products by the structured fields below. |
| `collectionSlug` | string, indexed | Links this product into the parallel "Collection" marketing architecture (e.g. all variants of a "face serum" line share one `collectionSlug`). Powers `/collections/[slug]` pages and collection-wide sales. |
| `variantLabel` | string | Human label distinguishing this product from siblings in the same collection, e.g. "Tea Tree + Salicylic Acid" vs "Lavender" — shown as a variant-picker chip on the collection page. |
| `skinTypes` | string[] | e.g. `["oily","acne-prone","combination"]`. Drives skin-type filtering. |
| `concerns` | string[], indexed | Concern slugs this product addresses (e.g. `["acne","pigmentation"]`) — this is the field that makes a product show up on `/concerns/[slug]` pages. |
| `whyYoullLoveIt` | string[] | Bullet list rendered as a "why you'll love it" checklist section on the PDP. |
| `fragranceExp` | string[] | e.g. `["Cool","Fresh","Revitalizing"]` — small descriptor chips for scent profile. |
| `whoIsItFor` | string | Paragraph describing the target user. |
| `skinHairConcern` | string | Paragraph describing what problem this solves. |
| `expectedResults` | string | Paragraph setting expectations ("visible results in X weeks" type copy). |
| `keyIngredients` | `[{name, benefit, icon}]` | Structured ingredient list — richer than the flat `ingredients[]` array, each with its own benefit copy and optional icon, rendered as a visual "key ingredients" grid on the PDP. |
| `ritualStep` | enum: cleanse / exfoliate / treat / moisturize / protect / style / other | Marks where this product sits in a routine — used by the Rituals feature to auto-place products into step order. |
| `results` | `[{image, title, text}]` | Before/after proof blocks (image + headline + supporting text) shown on the PDP for credibility. |
| `sizes` | array of size objects | See A.3 below — the size-variant system. |
| `isActive` | boolean, default true | Soft-delete / visibility toggle. Inactive products are excluded from all public queries unless an admin session explicitly requests `includeInactive=true`. |
| `sortOrder` | number, indexed | Manual drag-and-drop order set in the admin product list; storefront's "manual" sort mode (the default) sorts by this, falling back to `createdAt` for ties (i.e. new products append at the end until an admin actually drags something). |
| `rating`, `reviewCount` | number, nullable / number | Denormalized snapshot of the product's average star rating and review count. Not computed live on every page load — recalculated and written once whenever a review is approved/rejected/added (see `lib/syncProductRating.ts`), which is far cheaper than aggregating the Review collection on every request. |
| `isBestSeller` | boolean | Admin-set flag that shows a "Best Seller" ribbon on the card/PDP. Deliberately a **separate concept** from `HeroProduct.isBestSeller`, which only controls the badge inside the homepage Hero Products carousel — the two can disagree. |
| `directSalePercentage` / `directSaleAppliedAt` | number / date | This product's own sale, set from the admin product edit form. `AppliedAt` is only bumped when the percentage actually *changes* — resubmitting the same value on an unrelated edit must not let a stale direct sale steal priority from a newer collection sale. |
| `collectionSalePercentage` / `collectionSaleAppliedAt` / `collectionSaleId` | number / date / ObjectId | This product's inherited share of its collection's bulk sale, stamped by `applyCollectionSale()`/`inheritCollectionSaleOnAdd()`. |
| `saleSource` / `salePercentage` / `saleSourceId` / `saleAppliedAt` | enum / number / ObjectId / date | The **derived "current winner" snapshot** — computed by `computeEffectiveSale()` and written by `lib/sale.ts` alone. Every read path (product list, PDP, cart) trusts these fields rather than re-deriving priority itself. |

### A.2 The pricing engine — exactly how a display price is decided

There are **three independent sale mechanisms**, layered with a strict priority, all funneling into one `discountPrice`:

1. **Direct sale** — set per-product on the admin edit form (a plain percentage-off field next to price).
2. **Collection sale** — set once on a Collection in `/admin/collections`, then bulk-stamped onto every product currently in that collection via a single `Product.bulkWrite()`. When a product is later *added* to a collection that already has an active sale, it's auto-stamped immediately (`inheritCollectionSaleOnAdd`) — the admin doesn't have to remember to reapply it. When *removed*, the stamp is cleared and the product falls back to its direct sale if it has one (`removeCollectionSaleOnRemove`).
3. **Flash sale** — a separate `FlashSale` document with a product list, discount %, and start/end datetime. This one is **never written onto the product at all** — it's resolved live, at read time, by scanning currently-active flash sales and overlaying the discount onto whatever price the product/listing API is about to return (`lib/flashSale.ts: applyFlashSale()`). This means a flash sale switching on/off needs zero product writes and can't leave stale state behind.

**Priority resolution** (`computeEffectiveSale()` in `lib/sale.ts`, the single function every write path calls):
- If both a direct and a collection sale are currently set on a product, **whichever was applied more recently wins** (compares `directSaleAppliedAt` vs `collectionSaleAppliedAt`).
- The loser isn't deleted — both records are kept independently, so if the winning one is later cleared, the product automatically falls back to the other instead of dropping to "no sale."
- Flash sale is layered on top of all of this **at read time only**, in every list/detail API response, and always wins while its date window is active — because it's the most operationally urgent (time-boxed campaigns shouldn't be silently overridden by a stale direct-sale field).

**Why it's built this way**: this avoids the classic e-commerce bug where "the shop grid shows one price and the product page shows another" — because literally every route that returns product data pipes its result through the same two functions (`computeEffectiveSale` for direct/collection, `applyFlashSale` for flash) instead of each page inventing its own discount math.

**On the frontend**, `product-card.tsx` takes this one step further for **sized products**: since each size variant historically carries its own manual `discountPrice`, a product-level sale (`salePercentage`) is converted to a percentage-off and applied to *every size's own price* (unless that size already has a more specific manual discount set) — so a sale actually shows up on all variants, not just size-less products. The card also always displays "cheapest size" pricing by default until the shopper picks a specific size.

### A.3 Size variants — how they work

Any product can optionally define a `sizes[]` array instead of (or alongside) a flat `stock`. Each entry is independent:

```
{ size: "250", unit: "ml", quantity: 250, price, discountPrice, stock, sku, weight, length, breadth, height }
```

- **Independent pricing & stock per size** — a 100ml and 500ml of the same product can be priced, discounted, and stocked completely separately.
- **Independent shipping data per size** — because a 500ml bottle weighs and packs differently than a 100ml one, each size can override the product-level weight/dimensions so the shipping-rate calculator quotes accurately.
- **Frontend behavior** (`product-card.tsx`):
  - 0 sizes → the product behaves like a simple flat-stock item using `price`/`discountPrice`/`stock` directly.
  - 1 size → auto-selected silently; the shopper never sees a size picker, but pricing/stock still comes from that one size entry.
  - 2+ sizes → renders pill-button size selector; "Add to Cart" is disabled until a size is picked; switching size resets the chosen quantity (since available stock changed); the card defaults to showing the **cheapest available size's effective price** before any selection is made.
  - Duplicate size entries (e.g. "500ml" accidentally saved twice by an admin) are defensively de-duplicated client-side by a `size+unit+quantity` composite key.
- **Admin editor**: `components/admin/size-form.tsx` / `size-card.tsx` — add/edit/remove size rows on the product form.

### A.4 "Quick Paste" — bulk product entry from plain text

A big admin productivity feature (`lib/parseQuickPaste.ts` + `components/QuickPasteBox.tsx`): instead of filling in 15+ separate form fields by hand, the admin pastes one structured text block and the parser auto-fills the entire Add/Edit Product form.

**Format** — case-insensitive `Label: value` lines; some labels start a multi-line block that continues until the next recognized label:

```
Name: Tea Tree Foaming Face Wash
Price: 399
Discount Price: 299
Stock: 120
SKU: NZ-TT-FW-100

Description:
Deep-cleans without stripping your skin.
Formulated with tea tree oil and salicylic acid to control excess oil and breakouts.

Ingredients:
Tea Tree Oil
Salicylic Acid
Aloe Vera

Benefits:
Controls oil
Reduces breakouts
Non-drying

Why You'll Love It:
Gentle daily-use formula
No sulfates or parabens

Suitable For:
Oily skin
Acne-prone skin

Fragrance Experience:
Cool
Fresh

Who Is This For:
Anyone dealing with excess oil or occasional breakouts.

Skin Concern:
Acne and oily skin.

Expected Results:
Visibly clearer skin within 2-3 weeks of regular use.

Key Ingredients:
Tea Tree Oil — Controls excess sebum naturally
Salicylic Acid — Exfoliates and unclogs pores
```

**Parsing rules worth replicating**:
- Labels are matched case-insensitively against a fixed map, with several accepted spelling variants per label (e.g. "Who Is This For" / "Who Is It For" both map to the same field).
- Four field "types" determine how the block under a label is consumed: `single-line` (Name/Price/Stock/SKU — inline value only), `paragraph` (Description/Usage/etc. — lines joined with spaces into one block), `list` (Ingredients/Benefits/etc. — one item per line, leading bullet characters `✓ • - * — –` stripped), and `key-ingredients` (each line split on an em-dash/en-dash/hyphen into a `{name, benefit}` pair).
- **Description gets special treatment**: the first non-empty line is preserved as a distinct "tagline" line (joined to the rest with `\n`, not merged), so the PDP can style the hook line differently from the body paragraph.
- Unrecognized lines are silently appended to whatever section is currently open — so free-flowing pasted text degrades gracefully instead of erroring.
- To replicate: build the same label→field map for your new site's product fields, write one parser function that scans line-by-line tracking "current field," and wire its output to prefill your product form's state.

### A.5 Reviews tie-in

- One `Review` document per `(product, user)` pair — enforced by a unique compound index, so a user can only review a given product once (they'd update their existing review, not create a second one).
- Fields: `product`, `company`, `user`, `rating` (1–5), `comment`, `userName`/`userEmail` (denormalized so display doesn't require a join), optional `reply` (admin's response: message, timestamp, who replied), `status` (`pending`/`approved`/`rejected`).
- New reviews start `pending` and only count toward the product's public rating once an admin approves them.
- Every moderation action (approve/reject/reply) re-triggers the rating/reviewCount recompute against the `Product` document, keeping the denormalized snapshot in sync without a live aggregation on every page view.

### A.6 Product API surface (what to rebuild)

| Endpoint | Method | Behavior |
|---|---|---|
| `/api/products` | GET | Public product listing. Supports `company`, `category` (auto-expands to include subcategories when a parent category is requested), `search` (routes through Fuse.js fuzzy matching instead of a DB text filter — tolerates typos), `sort` (`manual`/`price_asc`/`price_desc`/`name_asc`/`newest`), `page`/`limit` pagination, `exclude` (comma-separated IDs to omit, e.g. "don't show the product I'm already viewing" in a related-products rail), and an `ids` batch-fetch mode (comma-separated IDs → used by the wishlist page to hydrate full product data from stored IDs). Response always has flash-sale pricing merged in. Inactive products are excluded unless the requester is a logged-in admin explicitly passing `includeInactive=true`. Responses are cached in-memory for 2 minutes (disabled in dev) to absorb traffic spikes. |
| `/api/products` | POST | Admin-only create. Resolves category from either a direct `category` or a `mainCategory` fallback so a product is never silently saved category-less. Auto-assigns the next `sortOrder` (max existing + 1) so new products append at the end of the manual order. Normalizes messy textarea input (newline- or comma-separated) into clean string arrays for `ingredients`/`benefits`/`suitableFor`/`skinTypes`. Applies a direct sale at creation time if a `salePercentage` was provided, going through the same `computeEffectiveSale` logic as an edit. |
| `/api/products/[id]` | GET | Single product with company/category/collection populated, flash sale merged in. |
| `/api/products/[id]` | PUT | Admin-only full update. Direct sale is deliberately handled as a **separate second step** after the main field update saves — so the sale-priority recompute always runs against the just-saved price, and a no-op resubmit of the same percentage doesn't fraudulently "refresh" `directSaleAppliedAt` and steal priority from a newer collection sale. |
| `/api/products/[id]` | PATCH | Admin-only — toggles `isActive` only (lightweight endpoint just for the show/hide switch in the admin list, avoids resending the whole product body). |
| `/api/products/[id]` | DELETE | Admin-only hard delete. |
| `/api/products/reorder` | (see admin products page) | Persists new `sortOrder` values after a drag-and-drop reorder in the admin list. |
| `/api/products/[id]/reviews` | — | Review CRUD scoped to one product. |
| `/api/products/reviews/all` | GET | Admin review moderation queue across all products. |

---

## 7. How to use this doc with Claude Code

Point Claude Code at a specific numbered section (e.g. "3.8 Promotions — Flash Sales") and ask it to implement that feature on the new site, including the data model fields, the admin CRUD UI, and any business logic nuance called out in section 4 that applies. For full-site rebuilds, work top-to-bottom: data models (§5) → core catalog (§2.2) → cart/checkout (§2.3) → auth (§2.4) → admin CRUD screens (§3) → analytics dashboard (§3.1) last, since it depends on everything else existing first.
