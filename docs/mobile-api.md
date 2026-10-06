# LinknSmile mobile API (India)

For the mobile app developers. Base URL: `https://linknsmile.com`.

The exact request/response shapes live in [`lib/contracts/`](../lib/contracts) as zod schemas with
TypeScript types. That folder imports only `zod`, so the app can use it directly.
`MOBILE_ROUTES` in [`lib/contracts/index.ts`](../lib/contracts/index.ts) lists every endpoint
below, and `tests/contracts.test.ts` checks each one against the real handlers.

## Authentication

1. `POST /api/mobile-auth/login` → store `accessToken` and `refreshToken` in SecureStore.
2. Send `Authorization: Bearer <accessToken>` on every request.
3. On `401` with code `UNAUTHORIZED`, call `POST /api/mobile-auth/refresh` once, store **both** new
   tokens, and retry the request. If the refresh fails, log the user out.

Token rules:

| | Lifetime | Notes |
|---|---|---|
| Access token | 15 minutes | Stateless. Carries `id`, `email`, `name`, `role`, `shopId`. |
| Refresh token | 30 days, **never more than 90 days after the original login** | Rotated on every refresh: the old one stops working immediately. After 90 days the user must log in again, however often they refreshed. |

- **Refresh one request at a time** (single-flight) and always keep the newest refresh token.
  Presenting an already-used refresh token more than 10 seconds after it was used is treated as
  theft: that login (this device's session) is revoked and the user must log in again
  (`REFRESH_TOKEN_REUSED`); other devices are unaffected. Within 10 seconds you get
  `REFRESH_TOKEN_ROTATED` instead: retry with the newest stored token.
- Role, shop and account status are re-read on every refresh, so role changes appear within
  15 minutes and a deactivated account gets `SESSION_REVOKED`.
- Logging out, deleting the account or being deactivated revokes refresh tokens immediately. An
  access token already issued stays valid until it expires (≤15 min), so drop it locally.
- The login response also contains `token`. It is **deprecated** (the old cookie scheme for
  earlier app versions); ignore it.

## Errors

Failing requests on the endpoints below return `{ "error": "<message for people>", "code": "<CODE>" }`,
sometimes with extra fields. Switch on `code`, show `error`. A few older endpoints (profile,
addresses, cart, favourites, orders list, change-password, and everything under
[Sign-up and password reset](#sign-up-and-password-reset)) still return only `{ error }` or
`{ message }`; use the HTTP status there.

| Code | HTTP | Meaning / what the app should do |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Malformed request; may include `issues[]`. |
| `UNAUTHORIZED` | 401 | Missing, invalid or expired access token → refresh, then retry. |
| `FORBIDDEN` | 403 | Signed in but not allowed. |
| `NOT_FOUND` | 404 | |
| `RATE_LIMITED` | 429 | Wait `Retry-After` seconds. |
| `INTERNAL_ERROR` | 500 | Retry later. |
| `INVALID_CREDENTIALS` | 401/403 | Wrong email or password. |
| `EMAIL_NOT_VERIFIED` | 403 | Send the user to OTP verification. |
| `OAUTH_ACCOUNT` | 401 | The account uses Google sign-in (no password). |
| `ACCOUNT_DISABLED` | 403 | Deactivated by an admin; show support contacts. |
| `REFRESH_TOKEN_INVALID` | 401 | Unknown, expired, revoked, or past the 90-day cap → log in again. |
| `REFRESH_TOKEN_REUSED` | 401 | Old refresh token re-used; login revoked → log in again. |
| `REFRESH_TOKEN_ROTATED` | 401 | Concurrent refresh; retry with the newest stored token. |
| `SESSION_REVOKED` | 401 | Account deactivated or deleted → log in again. |
| `NOT_VENDOR` | 403 | Vendor endpoint called by a non-vendor. |
| `SHOP_NOT_FOUND` | 404 | Vendor has no shop yet. |
| `MOU_REQUIRED` | 403 | Show the MOU (`GET/POST /api/vendor/mou`). Extra: `mouVersion`. |
| `SUBSCRIPTION_EXPIRED` | 403 | Selling features blocked; renewal is on the website. Extra: `subscriptionStatus`, `expiryDate`. |
| `SHOP_PENDING` | 403 | Shop awaiting admin approval. |
| `PAYMENT_NOT_AVAILABLE_ON_MOBILE` | 403 | Subscription payment isn't possible in the app. Extra: `subscription`. |
| `PAYMENT_METHOD_DISABLED` | 403 | The admin turned this payment method off; offer the other one. Extra: `paymentMethod`. |
| `PRICING_ERROR` | 400/404 | Cart can't be priced (product gone, size unavailable, coupon invalid…); show `error`. |
| `CONFIRMATION_REQUIRED` | 400 | Account deletion needs `{ "confirm": "DELETE" }`. |
| `OPEN_ORDERS` | 409 | Account deletion blocked by orders in progress. Extra: `openOrders`. |
| `WALLET_FROZEN` | 400/409 | Vendor exit/deletion blocked: wallet frozen (dispute). |
| `PENDING_SALES` | 400/409 | Vendor exit/deletion blocked: sales not yet cleared. |
| `PAYOUT_IN_PROGRESS` | 400/409 | Vendor exit/deletion blocked: a payout is being processed. |
| `BANK_DETAILS_REQUIRED` | 400/409 | Vendor exit/deletion needs bank details for the final settlement. |

## Endpoints

Auth column: – none · opt optional · user signed in · vendor shop owner.

### Auth

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /api/mobile-auth/login` | – | `{ email, password, deviceName? }` | `{ success, user{id,email,name,role,shopId}, accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, tokenType:"Bearer", token }` |
| `POST /api/mobile-auth/refresh` | – | `{ refreshToken }` | same as login, without `token` |
| `POST /api/mobile-auth/logout` | opt | `{ refreshToken?, pushToken? }` | `{ success }`, always 200 |
| `POST /api/auth/change-password` | user | `{ currentPassword, newPassword (≥6) }` | `{ message }` |

Login is limited to 10 attempts per minute per IP and 10 per 15 minutes per email.

### Sign-up and password reset

Schemas: [`lib/contracts/registration.ts`](../lib/contracts/registration.ts). Codes are 6 digits,
sent by email, valid for 10 minutes.

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /api/auth/register` (customer) | – | `{ name (≥2), email, password (≥6), confirmPassword, role?: "user" }` | **201** `{ message, email }`; a code is emailed |
| `POST /api/auth/register-vendor` (seller) | – | `{ name, email, password, shopName, street, city, state, pincode, phone?, description?, gstNumber?, panNumber? }` | **201** `{ success, message, email }`; a code is emailed |
| `POST /api/auth/verify-otp` | – | `{ email, otp }` | `{ message, role }`; the account now exists, log in |
| `POST /api/auth/resend-otp` | – | `{ email }` | `{ message }` |
| `POST /api/auth/forgot-password` | – | `{ email }` | `{ message }`, the same whether or not the email has an account |
| `POST /api/auth/verify-reset-otp` | – | `{ email, otp }` | `{ message }`; the code stays usable |
| `POST /api/auth/reset-password` | – | `{ email, otp, newPassword (≥6) }` | `{ message }`; the code is used up |

- These routes have no error codes. Validation failures are 400: `register` sends `error` as an
  array of `{ message, path }` issues, `register-vendor` sends `{ message }`, the others
  `{ error }`.
- `register` accepts only `role: "user"` (or no role). Sellers use `register-vendor`; their
  shop is created at `verify-otp` and awaits approval (see [Vendor](#vendor)).
- A wrong sign-up code is 400; after 5 wrong attempts `verify-otp` answers 429 and a new code is
  needed. `resend-otp` answers 429 within 30 seconds of the previous code and after 10 codes in
  a day, and 404 when there is no sign-up waiting for that email.
- Password reset: 3 codes per 15 minutes per email and per IP, 10 code checks per 15 minutes
  (429 with `Retry-After`), and a code is discarded after 5 wrong attempts.

### App start

`GET /api/app-config` (no auth) returns:

```json
{
  "minSupportedAppVersion": { "ios": "1.0.0", "android": "1.0.0" },
  "latestAppVersion": null,
  "region": "IN",
  "currency": "INR",
  "support": { "email": "…", "phone": "…" },
  "payments": { "cod": true, "razorpay": true, "razorpayKeyId": "rzp_live_…" },
  "links": { "website": "…", "privacyPolicy": "…", "terms": "…", "refundPolicy": "…" }
}
```

If the app's version is below `minSupportedAppVersion` for its platform, block with a
forced-update screen (`isBelowVersion()` in `lib/contracts/app-config.ts`). Show only the
payment methods that `payments` enables.

`payments.razorpayKeyId` is the Razorpay **key id** to open the payment sheet with, so the app
needs no build-time key. It is the key the server creates Razorpay orders under (a payment only
succeeds with the key its order belongs to) and is public by design; the key secret never leaves
the server. It is `null` when online payment is turned off or not configured: don't offer
Razorpay then. A value starting `rzp_test_` means the server is in Razorpay test mode.

### Catalogue and pricing

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `GET /api/products` | – | `?search` (or `q`), `featured=true`, `category` (id or slug), `origin`, `shopId`, `ids` (comma-separated), `exclude`, `page`, `limit` (default 12, max 100) | `{ products[], pagination{ total, page, limit, pages, hasMore } }` |
| `POST /api/pricing/quote` | opt (user if `couponCode`) | `{ items[{ product, quantity, selectedSize?{size,quantity} }] (1–50), couponCode? }` | `{ currency, items[{product,name,quantity,unitPrice,lineTotal,selectedSize,shopId,shopName}], subtotal, discountAmount, coupon, taxRatePercent, taxAmount, shippingAmount:0, totalAmount }` |

- `search` matches product names (case-insensitive, substring). `featured=true` returns the
  admin's featured products in their featured order. Use `page`/`hasMore` for infinite scroll
  with 20–50 per page.
- **Always show `totalAmount` from the quote**: it is exactly what the order will charge.
  There is no shipping fee on the server.

### Account

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `GET /api/users/profile` | user | – | `{ name, email, phone, image, address, city, state, pincode, role, pendingVendorApplication }` |
| `PUT /api/users/profile` | user | any of `{ name, phone, address, city, state, pincode, imageBase64 }` | `{ user{…} }` |
| `POST /api/users/push-token` | user | `{ token: "ExponentPushToken[…]", platform? }` | `{ success }` |
| `DELETE /api/users/push-token` | user | `{ token }` | `{ success }` |
| `DELETE /api/users/me` | user | `{ confirm: "DELETE", password? }` | `{ success }` |
| `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/:id` | user | `{ label?, name, phone, street, city, state, pincode, isDefault? }` | address(es); POST returns **201** |
| `PATCH /api/addresses/:id` | user | – (no body) | the address, now the default; the user's other addresses stop being the default |
| `GET/POST /api/cart` | user | POST replaces the cart: `{ items[{ productId, name, slug, quantity, selectedSize? }] }` | `{ items, cart }` / `{ cart }` |
| `GET/POST /api/favourites` | user | POST toggles: `{ type: "product"\|"seller", refId }` | list / `{ added }` |

- **Push tokens:** register after login and whenever Expo gives a new token. A token belongs to
  one device, so registering it moves it off any other account. Pass `pushToken` to logout so
  the device stops receiving that user's notifications.
- **Account deletion** (App Store / Play requirement):
  - `password` is required when the account has one; Google-only accounts just confirm.
  - Blocked while orders are in progress (`OPEN_ORDERS`).
  - For vendors it first runs the vendor exit: the shop is closed, and any withdrawable balance
    becomes a final settlement to their bank account. It can be refused with `WALLET_FROZEN`,
    `PENDING_SALES`, `PAYOUT_IN_PROGRESS` or `BANK_DETAILS_REQUIRED`.
  - Admin accounts can't self-delete (`FORBIDDEN`).
  - On success, clear all local data and tokens.
- Use `/api/favourites`, not the legacy `/api/wishlist`.

### Orders and payment

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /api/orders` (cash on delivery) | user | header `X-Idempotency-Key: <uuid per checkout attempt>`; body `{ items, shippingAddress, couponCode? }` | `{ success, orderId, orderNumber, message }` |
| `GET /api/orders` | user | – | `{ orders[] }` |
| `POST /api/razorpay/create-order` | user | `{ items, shippingAddress, couponCode? }` | `{ id, amount, currency, totalAmount }` → open Razorpay with `order_id=id` |
| `POST /api/razorpay/verify-payment` | user | `{ razorpayOrderId, razorpayPaymentId, razorpaySignature, shippingAddress? }` | `{ success, orderId }` |
| `POST /api/coupons/validate` | user | `{ items, couponCode }` | `{ success, discountAmount, totalAmount, taxRatePercent, taxAmount, code }` (prefer the quote) |

- `shippingAddress` is `{ name, phone, email?, street, city, state, pincode, country }`. Other
  keys (e.g. `addressLine1`) are dropped by the server.
- `items` are `{ product, quantity, selectedSize?{ size, quantity } }`. Prices always come from
  the server.
- If the admin has turned off COD or online payment, `POST /api/orders` or
  `POST /api/razorpay/create-order` returns 403 `PAYMENT_METHOD_DISABLED`. Once a Razorpay
  payment has been made, `verify-payment` always completes it.
- Reuse the same `X-Idempotency-Key` when retrying one COD attempt; a retry then returns the
  existing order instead of creating a second one.
- If `verify-payment` fails after the Razorpay sheet succeeded, show "checking payment" and
  refresh `GET /api/orders`; the server-side webhook completes the order independently.

### Vendor

| Endpoint | Checks |
|---|---|
| `GET /api/vendor/status`, `GET/POST /api/vendor/mou` | shop owner only; never blocked |
| `stats`, `wallet`, `wallet/ledger`, `payouts` (GET, POST), `bank-details` (GET, PUT), `settings` | MOU accepted |
| `orders`, `orders/:id` (PATCH status), `products*`, `coupons*`, `reviews*` | MOU accepted + subscription active or in grace + shop approved |
| `POST /api/vendor/subscription/create-order`, `verify-payment` | always 403 `PAYMENT_NOT_AVAILABLE_ON_MOBILE` from the app |

Drive the vendor area from `GET /api/vendor/status`:

```json
{
  "isApproved": true,
  "isActive": true,
  "mouAccepted": true,
  "mouVersion": "…",
  "blockingCode": null,
  "subscription": {
    "status": "active",
    "expiryDate": "…",
    "daysUntilExpiry": 120,
    "isInGracePeriod": false,
    "isBlocked": false,
    "source": "paid"
  }
}
```

- `blockingCode: "MOU_REQUIRED"` → only the MOU screen is usable.
- `blockingCode: "SUBSCRIPTION_EXPIRED"` → orders, products, coupons and reviews are locked; the
  **wallet, payouts and bank details stay available** so the vendor can withdraw what they earned.
  Show the status only: no renewal button and no link to a payment page (App Store guideline
  3.1.1). Renewal happens on the website.
- `isApproved: false` → selling features show "pending approval".
- `subscription.status` is one of `no_subscription`, `active`, `grace_period` (up to 7 days past
  expiry, still fully usable) or `blocked`.
