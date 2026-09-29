# Runbook: Razorpay payment alert log lines

For whoever is on call for payments on a Razorpay deployment (India).
Each section says what a log line means, whether the customer lost money,
and what to do.

## Where to look

- Logs: `/home/linknsmile.com/shared/logs/error.log` on the VPS (PM2).
  ```bash
  grep -E "\[Razorpay( webhook)?\] [A-Z_]+" /home/linknsmile.com/shared/logs/error.log | tail -50
  ```
- Every line carries `razorpayOrderId` and `razorpayPaymentId`; most also
  carry `userId` and the expected vs paid amounts (in paise).
- The server-side record of each checkout is the `razorpaycheckouts`
  collection. Look it up read-only:
  ```js
  db.razorpaycheckouts.findOne({ razorpayOrderId: "order_XXXX" })
  ```
  `status` is one of `created` (no payment accepted yet), `processing`,
  `fulfilled` (has `orderId`) or `rejected` (has `rejectionReason`).
  `lastPaymentId` is the last payment Razorpay reported for it.
- Payments themselves: Razorpay Dashboard → Transactions → Payments →
  search by payment id. Refunds are issued from there (Refund button).

Code: `lib/razorpay-fulfillment.ts` (shared by
`app/api/razorpay/verify-payment` and `app/api/razorpay/webhook`).

---

## REFUND_REQUIRED — money taken, no order created

**Meaning:** Razorpay captured the payment, but the order could not be
created at that price. `reason` says why:
- `price_changed`: product price, tax or coupon value changed between the
  customer opening the payment window and paying; `paidTotal` vs
  `recomputedTotal` shows both amounts.
- `pricing_error`: a product became unavailable, out of its size, hidden
  by the subscription sweep, or the coupon stopped being valid; `detail`
  has the exact message.

**Customer impact:** charged, no order. The customer saw "Your cart
changed after payment… Your payment will be refunded".

**Do:**
1. Confirm in the Dashboard that the payment is `captured` and not
   already refunded.
2. Refund it in full (Dashboard → payment → Refund).
3. Tell the customer (email is on the user from `userId`), and invite them
   to order again at the current price.
4. The checkout record is `rejected` and will not be retried automatically;
   no cleanup needed.

Do **not** create the order by hand at the old price unless the business
decides to honour it; if it does, create it through admin and still note
the payment id on the order.

---

## NOT_CAPTURED — payment authorised but not yet captured

**Meaning:** when the browser or webhook asked Razorpay, the payment
status was not `captured` (usually `authorized` for a few seconds, or
`failed`). The checkout was released back to `created` so it can be
retried.

**Customer impact:** usually none. If the payment is captured later, the
`payment.captured` webhook completes the order automatically (Razorpay
retries on our `503`s). The customer may have seen "Payment not confirmed
yet".

**Do:**
- A single line: nothing. Check a few minutes later that the checkout is
  `fulfilled`.
- If the checkout is still `created` after ~30 minutes and the Dashboard
  shows the payment `captured`: the webhook isn't arriving. Check the
  webhook is configured and active (Dashboard → Settings → Webhooks,
  event `payment.captured`) and that `RAZORPAY_WEBHOOK_SECRET` is set
  (look for `RAZORPAY_WEBHOOK_SECRET is not set` in the logs). Once fixed,
  use Dashboard → Webhooks → resend for that payment.
- If the Dashboard shows `authorized` for hours: auto-capture failed.
  Either capture it in the Dashboard (the webhook then completes the order)
  or let Razorpay auto-refund it, and tell the customer.
- If the Dashboard shows `failed`: nothing to do; no money was taken.

---

## UNKNOWN_ORDER / WEBHOOK_IGNORED_UNKNOWN_ORDER — no checkout record

**Meaning:** a payment arrived for a Razorpay order that has no
`razorpaycheckouts` record.
- `WEBHOOK_IGNORED_UNKNOWN_ORDER` (a warning, from the webhook) is
  **expected for every vendor subscription payment**: subscriptions don't
  create checkout records and are handled by
  `/api/vendor/subscription/verify-payment`.
- `UNKNOWN_ORDER` (an error, from the browser verify) is not expected
  in normal operation. Right after a deploy of this feature it means a
  customer started paying on the old code and finished on the new code.

**Customer impact:** for storefront payments, possibly charged with no
order.

**Do:**
1. Find the payment in the Dashboard. If it's a vendor subscription
   (small, fixed amount; the vendor's subscription shows as renewed), ignore it.
2. If it's a storefront payment: check whether an order exists for it:
   ```js
   db.orders.findOne({ razorpayPaymentId: "pay_XXXX" })
   ```
   - Order exists: nothing to do.
   - No order and payment `captured`: refund it and ask the customer to
     order again (their cart is still there).
3. A burst of these hours after a deploy, from real customers, would mean
   create-order isn't writing checkout records. Check the logs for errors
   from `/api/razorpay/create-order`.

---

## Other tags

| Tag | Meaning | Money taken? | Action |
|---|---|---|---|
| `AMOUNT_MISMATCH` | Razorpay's captured amount/currency ≠ the amount stored at create-order. Should never happen legitimately. | Yes | Treat as possible tampering: refund, then investigate the user (`userId`). |
| `ORDER_ID_MISMATCH` | Payment belongs to a different Razorpay order than claimed. | Yes | Same as above. |
| `USER_MISMATCH` | Someone tried to verify another user's checkout. | Not by them | Investigate `sessionUserId`; the real owner's order is unaffected. |
| `SECOND_PAYMENT_FOR_ORDER` | A second, different payment arrived for an already-fulfilled checkout (e.g. customer paid twice). | Yes (twice) | Refund the payment in the log line, **not** `firstPaymentId`. |
| `PAYMENT_ID_REUSED` | A payment id already bound to another checkout. | — | Investigate; should not happen. |
| `MISSING_ADDRESS` | Webhook for a checkout created before addresses were stored. | Yes | If the browser verify didn't complete it within an hour, refund or create the order by hand with the customer's address. |
| `PAYMENT_LOOKUP_FAILED` | Couldn't reach Razorpay's API. Released for retry. | Maybe | Nothing unless it persists (check Razorpay status and our outbound network). |
| `IN_PROGRESS` (warning) | Another request (usually the `payment.captured` webhook, which fires alongside the browser) holds the claim on this checkout. A browser verify waits up to 15s for it to finish and returns that order; this line is logged only when it gives up — the other request released the claim, or 15s passed. From the webhook it just means "Razorpay will retry" (503). | Maybe | Normal race handling; a single line needs no action. Escalate only if the checkout is not `fulfilled` a few minutes later, or it's followed by `NOT_CAPTURED` / `FULFILMENT_ERROR` / `PAYMENT_LOOKUP_FAILED` for the same `razorpayOrderId`. A spike from the browser (`source: "verify"`) means the 15s wait is regularly expiring — slow order creation or DB/Razorpay latency under heavy concurrent load — and needs investigation. |
| `FULFILMENT_ERROR` | Unexpected error while creating the order; released for retry. | Maybe | Check the error; the webhook retries automatically. If it keeps failing, fix the cause, then resend the webhook. |
| `[LedgerService] AUDIT_LOG_WRITE_FAILED` | A sale/payout WAS committed to the ledger and wallet, but its `auditlogs` row couldn't be written. | n/a (money is correct) | Nothing is lost financially. Check why Mongo writes to `auditlogs` fail; the line has action, order/payout id, actor and amounts if you want to backfill the audit row. |
| `INVALID_SIGNATURE` (webhook) | Request to the webhook with a wrong/missing signature. | No | A few: noise/probing. Constant: the secret in `shared/.env` doesn't match the Dashboard. |
| `RAZORPAY_WEBHOOK_SECRET is not set` | Webhook is failing closed with 503. | No | Set the secret (see Deployment.md → Razorpay webhook) and reload PM2. |

## Abandoned checkouts

`razorpaycheckouts` records that never saw a payment are deleted
automatically 7 days after creation by a MongoDB TTL index on
`expiresAt`. Any record that ever saw a payment has no `expiresAt` and is
kept forever (fulfilled, rejected, and released ones), so refunds and
audits always have a record. If `autoIndex` is ever disabled, create the
index by hand:

```js
db.razorpaycheckouts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```
