# Checkout Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites & Access Control](#prerequisites--access-control)
3. [Cart State Management](#cart-state-management)
4. [Checkout Page Lifecycle](#checkout-page-lifecycle)
5. [Checkout Form](#checkout-form)
6. [Payment Flows](#payment-flows)
   1. [Cash on Delivery](#cash-on-delivery)
   2. [Razorpay](#razorpay)
7. [API Endpoints](#api-endpoints)
8. [Email Notifications](#email-notifications)
9. [Loading & Error States](#loading--error-states)
10. [Analytics & Tracking](#analytics--tracking)
11. [Post-Checkout Experience](#post-checkout-experience)

---

## Overview

The checkout experience combines a persisted cart (Zustand), authenticated access control (NextAuth + middleware), and two payment strategies (COD and Razorpay). Buyers complete their shipping address, choose a payment method, and the system orchestrates order creation, payment verification, email notifications, and cart cleanup.

---

## Prerequisites & Access Control

- **Authentication Required:** `useSession()` ensures only authenticated users can proceed. If `status === "unauthenticated"`, the router issues `router.replace("/auth/login")`.
- **Middleware Guard:** `middleware.ts` lists `/checkout` inside `matcher`, redirecting unauthenticated users before the page renders.
- **Session Loading:** While NextAuth resolves, the page renders a full-screen loader with `"Loading checkout..."`.

---

## Cart State Management

Cart data lives in `lib/store/cart-store.ts`, persisted to `localStorage` via `zustand/middleware`.

### Store Shape
- **Items:** Array of `CartItem` objects (product id, name, pricing, quantity, optional size).
- **Mutators:** `addItem`, `removeItem`, `updateQuantity`, `clearCart`.
- **Derived Helpers:** `getTotalPrice` sums discounted prices when available, `getTotalItems` counts total units.

### Usage Highlights
- `app/cart/page.tsx` reads and mutates cart state for the cart view.
- `app/shop/[company]/product/[id]/page.tsx` writes into the cart on "Add to Cart" actions.
- `app/checkout/page.tsx` consumes `items`, `getTotalPrice`, and `clearCart` to present the order summary and reset the cart after success.

---

## Checkout Page Lifecycle

Located at `app/checkout/page.tsx`, the page coordinates data fetching, payment handling, and UI feedback.

1. **Session Guard:** Redirects unauthenticated visitors.
2. **Event Tracking:** On mount, triggers `trackInitiateCheckout(totalPrice, itemCount, productIds)` from `lib/facebook-pixel.ts` when the cart contains items.
3. **Prefetch Data:** Fetches `/api/admin/payment-settings` to determine available payment methods and `/api/users/profile` to hydrate shipping defaults.
4. **Razorpay Script Injection:** Dynamically injects `https://checkout.razorpay.com/v1/checkout.js` and removes it on unmount.
5. **UI Shell:**
   - **TopProgressBar:** Thin animated bar toggled by `isLoading`.
   - **FullPageLoader:** Modal overlay with spinner when payments are in flight.
6. **Child Components:**
   - Renders `<CheckoutForm>` with cart totals and initial profile data.
   - Displays an order summary card listing each cart item, subtotal, shipping (currently free), and total.

---

## Checkout Form

`components/checkout-form.tsx` encapsulates the shipping form and payment selector.

### Props
- **`totalAmount`** *(number)*: Order total in INR.
- **`onSubmit`** *(async function)*: Receives `formData` and `paymentMethod`.
- **`availablePaymentMethods`** *(string[])*: Typically `['razorpay', 'cod']` depending on admin settings.
- **`initialData`** *(optional object)*: Prefills name, phone, and address fields.

### Behavior
1. **Local State:** Manages form inputs, selected payment method, and internal `isLoading` for submit button.
2. **Controlled Inputs:** Collect full name, phone, street, city, state, ZIP, and country (locked to India).
3. **Payment Options:** Renders `RadioGroup` entries for Razorpay and COD if the methods are available.
4. **Submission:** Wraps `onSubmit` in its own loading guard, disabling inputs/buttons and showing "Processing..." on the submit button.

```typescript
const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setIsLoading(true);
  try {
    await onSubmit(formData, paymentMethod);
  } finally {
    setIsLoading(false);
  }
};
```

---

## Payment Flows

### Cash on Delivery

1. **Order Creation:** `handleCheckout` posts to `/api/orders` with cart items, shipping address, total, and `paymentMethod: "cod"`.
2. **Order Schema Mapping:** The API maps street → `address`, zip → `pincode`, sets statuses to `pending`.
3. **Email Dispatch:** Confirmation to the customer and notification to the admin are sent immediately.
4. **Success Path:** The cart store is cleared and the user is routed to `/order-success/<orderId>`.

### Razorpay

1. **Create Razorpay Order:** Client calls `/api/razorpay/create-order` with the total amount (₹ → paise conversion happens server-side).
2. **Open Checkout Widget:** The returned order ID and amount feed the Razorpay options. Prefill data uses the authenticated session (`name`, `email`).
3. **Payment Handler:** On success, the Razorpay `handler` callback posts to `/api/razorpay/verify-payment` with:
   - Razorpay IDs/signature
   - Cart items
   - Shipping address
   - Total amount
4. **Verification Endpoint:**
   - Validates the HMAC signature with `RAZORPAY_KEY_SECRET`.
   - Confirms the user session.
   - Either updates a pending Razorpay order or creates a new one, marking `paymentStatus: "completed"` and `orderStatus: "processing"`.
   - Adjusts product stock (`$inc: { stock: -quantity }`).
   - Sends confirmation emails (customer + admin).
5. **Fallbacks:** If the modal is dismissed, users see an alert and the local loading state resets.

```typescript
const verifyResponse = await fetch("/api/razorpay/verify-payment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    items,
    shippingAddress,
    totalAmount: getTotalPrice(),
  }),
});
```

---

## API Endpoints

| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/api/orders` | `POST` | Create COD orders (or generic orders) and trigger emails. | `app/api/orders/route.ts` |
| `/api/orders` | `GET` | Fetch authenticated user orders (excluding failed payments). | `app/api/orders/route.ts` |
| `/api/razorpay/create-order` | `POST` | Create a Razorpay order (server-to-Razorpay) and return the order ID. | `app/api/razorpay/create-order/route.ts` |
| `/api/razorpay/verify-payment` | `POST` | Verify Razorpay signature, persist/update order, adjust stock, send emails. | `app/api/razorpay/verify-payment/route.ts` |
| `/api/admin/payment-settings` | `GET` | Determines whether Razorpay and COD are enabled. | `app/api/admin/payment-settings/route.ts` |
| `/api/users/profile` | `GET` | Supplies shipping defaults (name, phone, address). | `app/api/users/profile/route.ts` |

---

## Email Notifications

All transactional emails leverage helpers in `lib/email.tsx`. Delivery happens via a lazily created Gmail transporter (`nodemailer.createTransport`) that reads `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD` from environment variables. When credentials are missing the helper logs an error and the caller continues, so API routes remain resilient even if email fails.

### Available Templates
- **`getWelcomeEmail(name)`**: Long-form HTML welcome message sent after OTP verification.
- **`getOrderConfirmationEmail({...})`**: Customer-facing invoice summary with line items, totals, and payment status tag.
- **`getAdminOrderNotificationEmail({...})`**: Internal alert summarizing buyer contact info, shipping address, payment method, and cart contents for fulfillment teams.
- **`getOtpEmail({ otp, name })`** *(from `lib/EmailOtp.ts`)*: Minimal template delivering 6-digit login verification codes.

### Sending Mechanisms & Trigger Points
1. **Account Verification (OTP flow)**
   - Route: `app/api/auth/verify-otp/route.ts`
   - Trigger: After an OTP is validated, `sendEmail` dispatches `getWelcomeEmail` to the customer so they know registration succeeded.

2. **Manual Email Trigger (admin/testing utility)**
   - Route: `app/api/email/send/route.ts`
   - Trigger: Receives arbitrary payloads and forwards them through `sendEmail`. Useful for testing template changes.

3. **Cash on Delivery Orders**
   - Route: `app/api/orders/route.ts` (POST)
   - Sequence:
     1. Order persisted with `paymentStatus: "pending"`.
     2. Order is populated with product details for richer templates.
     3. `getOrderConfirmationEmail` → `sendEmail` to `user.email` (subject `Order Received - <orderNumber>`).
     4. `getAdminOrderNotificationEmail` → `sendEmail` to `process.env.GMAIL_EMAIL` fallback `instapeels@gmail.com` (subject `🚨 NEW ORDER - <orderNumber>`).
     5. Errors in either delivery are logged but do not fail the API response.

4. **Razorpay Orders**
   - Route: `app/api/razorpay/verify-payment/route.ts`
   - Sequence:
     1. Payment signature validated.
     2. Pending order either updated or newly created with `paymentStatus: "completed"`.
     3. After cart items populate, the same pair of emails from steps 3.3–3.4 are sent, but the customer subject changes to `Order Confirmation - <orderNumber>` and the admin template reflects `paymentStatus: "completed"`.

5. **Order Status Updates**
   - Route: `app/api/orders/[id]/route.ts`
   - Trigger: When admins mutate an order, `getOrderStatusUpdateEmail` (from `lib/email.tsx`) is filled with the new status, expected delivery info, and tracking link before dispatching to the customer.

### Failure Handling & Observability
- **Graceful Degradation:** All callers wrap `sendEmail` in `try/catch` and log failures without interrupting order or payment flows.
- **Logging:** Success and failure logs are emitted with recipient addresses to aid debugging in server logs.
- **Environment Prerequisites:** Ensure Gmail credentials are available in deployment environments; otherwise the transporter returns `null` and no emails leave the server.

---

## Loading & Error States

- **TopProgressBar:** Visible while `isLoading` is true (after submit until order creation/payment verification finishes).
- **FullPageLoader:** Modal overlay discouraging navigation during payment processing.
- **Form State:** `CheckoutForm` disables inputs and submit button while awaiting `onSubmit`.
- **Alerts:** Razorpay failure paths emit `alert()` messages to the user if verification fails or the modal is closed.
- **Fallback Payment Settings:** If fetching admin settings fails, both Razorpay and COD default to enabled.

---

## Analytics & Tracking

- **Facebook Pixel:** `trackInitiateCheckout` fires once per visit when the cart has items, reporting `value`, `num_items`, and product IDs.
- **Extensibility:** Hook additional events (e.g., `Purchase`) in the Razorpay/COD success branches to extend analytics coverage.

---

## Post-Checkout Experience

- **Success Redirect:** Both payment paths navigate to `/order-success/<orderId>` upon success.
- **Cart Reset:** `useCartStore.clearCart()` is invoked to empty the cart.
- **Orders Listing:** Authenticated users can review completed orders via `GET /api/orders`, surfaced elsewhere in the UI.
- **Stock Management:** Razorpay flow decrements product stock server-side; COD relies on complete fulfillment workflows to adjust inventory later.