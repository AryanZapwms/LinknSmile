# Multi-Country Launch — Outstanding Requirements

> Purpose: this is a parking lot for everything the UAE/Qatar/Saudi expansion needs that is **not** an engineering task — business decisions, account signups, documents, and approvals that have to come from your boss or from external providers before certain code can be finished or tested. Engineering work that doesn't depend on any of this keeps moving in parallel (see "Not Blocked" section at the bottom).
>
> Last updated: 2026-08-21 (i18n/RTL Batch 3b — vendor portal complete — item 3; i18n/RTL Batch 3 — vendor portal, first slice — completed — item 3; i18n/RTL Batch 2 — core purchase funnel — completed — item 3; i18n/RTL Phase 1 proof-of-concept completed — item 3; tax/VAT engine computation piece completed — item 2; Tap Payments still paused on phone verification — item 1)

---

## 1. Tap Payments (Payment Gateway — UAE/Qatar/Saudi)

**Status:** Code complete (gateway abstraction, schema, checkout/subscription flows, redirect handling) and typechecked. **Not yet live-tested** — blocked on account signup.

### What's blocking it
- Tap's signup form (`register.tap.company`) requires a mobile number from a supported GCC/MENA country (Kuwait, Bahrain, Egypt, Jordan, Lebanon, Oman, Qatar, Saudi Arabia, UAE). No Indian number accepted.
- Google/Facebook sign-in shortcut is currently broken on Tap's own side (`Error 400: origin_mismatch` — their OAuth config issue, not ours).

### What's needed, and from whom
| Item | Needed from | Notes |
|---|---|---|
| A mobile number from any supported country | **Boss** — one of his existing UAE/Qatar/Saudi contacts | Just needs to receive one OTP to complete signup. Doesn't need to be a permanent business number. |
| Sandbox `TAP_SECRET_KEY` | Self-serve once signup completes | No business KYC needed for test-mode key — confirmed self-serve, key-based, test keys prefixed `sk_test_`. |
| (Later, for going live) Business KYC — trade license, bank IBAN, signed activation letter | **Boss** — business/legal side | Only needed before *real* money can move. Not needed to build/test in sandbox. |
| A non-production test MongoDB database | Can set up independently (free MongoDB Atlas tier) | So sandbox Tap testing doesn't touch real India order data. |

### What happens once unblocked
1. Get sandbox `sk_test_...` key from Tap dashboard (goSell → API Credentials → Generate Key)
2. Point local `.env.local` at a test database, add `TAP_SECRET_KEY`, set `PAYMENT_GATEWAY=tap`
3. Run a real end-to-end test: create order → Tap hosted redirect → test card → return → verify → order created
4. Spot-check `app/vendor-tap-return/page.tsx`'s auth handling once (it sits outside the normal `app/vendor/**` layout gating for a documented reason — worth one look before trusting it)

---

## 2. Tax / VAT Engine

**Status: computation/charging piece DONE (2026-08-21).** Rates confirmed and implemented: UAE 5% flat, Saudi Arabia 15% flat, Qatar 0% (confirmed still genuinely not implemented there as of 2026, not a placeholder). `computeOrderPricing` (`lib/pricing.ts`) now applies `PlatformSettings.taxRatePercent` additively on the post-discount subtotal; vendor commission/payout math is unaffected (computed pre-tax, exactly as before); `Order.taxRatePercent`/`taxAmount` record what was actually charged; the cosmetic "Tax: Included" labels in cart/checkout are gone, replaced with a real computed line. Threaded through every route that touches pricing, including Tap's (the gateway that will actually see non-zero rates in production). Live-verified — India confirmed as a genuine no-op, a 5% test order confirmed correct end-to-end, all test data cleaned up. Full detail: `PROJECT_SOURCE_OF_TRUTH.md` §4.17.

**Money model** (confirmed explicitly before implementing, given real legal stakes): tax is additive on the post-discount subtotal, charged to the customer, doesn't touch vendor commission/payout math — the platform collects it and is responsible for remitting, consistent with KSA/UAE "deemed supplier" marketplace VAT treatment (the platform, not individual vendors, is the party obligated to register/collect/remit in that framework). This is a computation-and-charging model, **not verified tax/legal advice** — whether this business's actual KSA/UAE operations trigger deemed-supplier registration or other compliance obligations beyond charging the right number is still a real question for actual counsel, not something this code change answers.

### Still open — deliberately out of scope for the 2026-08-21 work
| Item | Needed from | Notes |
|---|---|---|
| Whether VAT is per-category or flat-rate | **Boss** | Implemented as flat-rate only (one rate per deployment). If any product category needs zero-rating/exemption within a country that otherwise has VAT, that's a real follow-up task, not yet built. |
| Whether tax registration numbers need to be collected from vendors per-country (like the existing India-only `gstNumber` field) | **Boss** | Not built — explicitly out of scope per this task's own requirement 5 (no VAT registration collection, no invoicing/e-invoicing compliance features). |
| Actual KSA/UAE deemed-supplier compliance verification (registration thresholds, filing obligations) | **Boss / real tax counsel** | The code assumes/matches deemed-supplier treatment computationally but this was never confirmed as this business's actual legal status — see money model note above. |
| Vendor-facing tax reporting/invoicing | **Future task** | Explicitly excluded from this pass. |

### Not blocked on anything
The remaining items above are compliance/business-process work, not engineering blockers — nothing about them prevents launching in a country once the rate itself is confirmed (already done for all three).

---

## 3. i18n / RTL (Language Support)

**Status: Phase 1 (infrastructure + proof-of-concept) DONE (2026-08-21). Batch 2 (core purchase funnel, 8 files) DONE (2026-08-21). Batch 3 + 3b (vendor portal, complete — 16 files) DONE (2026-08-21). Full site sweep NOT complete — roughly 123 files remain, this was always going to be multi-session given the file count.**

**What's done:** library chosen and verified (next-intl, cookie-based "without i18n routing" mode — deliberately not the standard URL-prefixed tutorial pattern, since restructuring ~150 routes under `app/[locale]/` would be a large migration disconnected from translation work and doesn't suit Path B anyway), message-catalog structure created (`messages/en.json`, `hi.json`, `ar.json`), RTL confirmed working via Tailwind v4's native logical properties (no plugin needed), a locale switcher built. Phase 1 fully translated and RTL-audited 3 representative files (`components/header.tsx`, `components/footer.tsx`, `app/page.tsx`); Batch 2 extended this to the core purchase funnel — 8 files — and added ICU plural handling with full Arabic CLDR plural categories, live-verified interactively (browse → detail → cart). Batches 3 and 3b together fully translated and RTL-audited the entire vendor portal — 16 files: layout/nav, dashboard, products (list/add/edit/bulk-upload), orders (list/detail), wallet (the largest single file in the sweep so far, 843 lines), payouts, bank details, reviews, settings, coupons (list/add/edit) — with the same ICU-plural approach, plus deep scrutiny on commission/payout/subscription/wallet terminology (the entire vendor portal is money-adjacent, so this carried real trust risk, not just UX polish) and, for batch 3b specifically, backend enum values were read directly from `lib/models/ledger.ts`/`lib/models/payout.ts` rather than guessed from the UI, to make sure ledger/payout status labels are actually correct rather than just plausible-looking. New env var: `NEXT_PUBLIC_SECONDARY_LOCALE` (e.g. `"hi"` for India, `"ar"` for UAE/Qatar/Saudi) — empty/unset means English-only, a no-op for the current deployment. Full technical detail: `PROJECT_SOURCE_OF_TRUTH.md` §4.18 (Phase 1), §4.19 (Batch 2), §4.20 (Batch 3), §4.21 (Batch 3b).

**Translation confidence, resolved without needing a translator for this pass:** both Arabic and Hindi got real translations (not placeholders) for everything translated so far — every string in scope was short-to-medium common e-commerce/vendor-portal UI/nav/marketing/toast copy, not specialized or legally-sensitive content, so this was judged in-scope confidence. **Still recommend a native-speaker review pass on `messages/hi.json` and `messages/ar.json` before either goes live** — this wasn't certified by a native speaker, just judged reasonable-confidence machine+model translation. This now specifically includes: the Arabic ICU plural word-forms added in Batch 2 (e.g. `منتج`/`منتجان`/`منتجات`/`منتجًا`); Batch 3's commission/payout/subscription/wallet terminology; and **Batch 3b's ledger/accounting-specific vocabulary most of all** (Hindi `लेजर`/`समाशोधन`/`निपटान`, Arabic `دفتر الحسابات`/`تسوية`, and the deliberate `VOIDED`-vs-`CANCELLED` word split in both languages) — this is the most specialized, least "ordinary UI copy" vocabulary translated in the sweep so far, flagged accordingly rather than treated as routine.

**Scoping question raised during Batch 2, now resolved for the vendor side:** the vendor portal (`app/vendor/**`) is used by real vendors — actual UAE/Qatar/Saudi business owners — so it likely needs translation before a GCC launch, unlike the admin panel (`app/admin/**`), which is the platform's own internal team and can plausibly stay English-only indefinitely. **The vendor portal is now fully translated (batches 3 + 3b close it out).** The admin panel remains deliberately untouched, per the standing decision.

### What's needed, and from whom — now narrower than before
| Item | Needed from | Notes |
|---|---|---|
| Which languages, precisely | **Boss** | Still open. India got Hindi, UAE/Qatar/Saudi got Arabic as the working assumption — confirm this is actually the intended pairing, and whether English-only is acceptable at launch for any of the GCC markets (materially changes urgency/scope for the remaining ~123 files). |
| The remaining ~123-file sweep | **Engineering (future sessions)** | Vendor portal is now fully done. Punch list and suggested order in `PROJECT_SOURCE_OF_TRUTH.md` §4.21: auth/registration forms next, then `lib/validation.ts`/toasts/email templates, then the "everything else" tier (profile pages, wishlist, static/policy pages, misc), then finally the admin panel (lowest priority, internal-only). |
| `lib/validation.ts`, toast strings (outside translated areas), `lib/email.tsx` templates | **Engineering (future sessions)** | Still explicitly deferred. The email-template case has the same "thread a param through many call sites" ripple already documented for `supportEmail` (§4.16) — expect that to be the most structurally involved piece of the remaining work. |
| Native-speaker review of `hi.json`/`ar.json` | **Boss / translator** | Recommended before production launch — see confidence note above. The ledger/accounting terminology from Batch 3b is the highest-priority item to check first, given both its specialized vocabulary and its direct connection to a vendor's own money. |
| RTL layout tolerance for the remaining ~123 files | **Boss / design call** (mostly resolved technically) | RTL mirroring has now been proven across static pages, an interactive storefront flow, and a large, table-and-form-heavy admin-style UI (the entire vendor portal) — with Tailwind v4's logical properties, no plugin, no major friction found anywhere, including CSS Grid column ordering (confirmed already direction-aware, needed no manual fix). Remaining question is really just review bandwidth for the full sweep, not a technical open question anymore. |
| Disposable verified test account for authenticated checkout flow | **Engineering (future session), if closing this gap is wanted** | Batch 2 could not live-verify the authenticated portion of `/checkout` (coupon apply, payment method, place order) — it correctly redirects unauthenticated sessions, and creating a real verified account requires a genuine OTP email round-trip, judged disproportionate for a UI-text/RTL check against the shared production database this pass. |
| Disposable vendor account (approved shop, active subscription) for authenticated vendor-portal verification | **Engineering (future session), if closing this gap is wanted** | Same class of gap as above, one level deeper — every `app/vendor/**` route requires an authenticated `shop_owner` session, so batches 3/3b's live checks could confirm routes load without runtime/translation errors and RTL attributes are correct, but could not visually confirm real rendered layout (bounding-box mirroring, ICU plurals against real data, status label maps against real backend values) the way Batch 2 could for the unauthenticated parts of the storefront. A static cross-check of all 664 `t()`/`t.rich()` calls across all 16 vendor-portal files against all three catalogs (0 missing keys) was used as the strongest available substitute across both batches — see §4.20/§4.21 for exactly what that does and doesn't prove. |

### Not blocked on Tap
Confirmed independent, as before — and now also proven technically, not just theoretically, across four passes: the library/RTL/pattern choices all work end-to-end without Tap being live.

---

## 4. Other business-side items surfaced during the audit (not yet actioned)

These aren't blocking any specific engineering task right now, but will need answers before a country actually goes live:

- **Support contact info per country** — is support email/phone shared across all countries for now, or does each country need its own? (Left as shared for now per earlier decision — revisit before launch.) **Update 2026-08-21:** these are now admin-editable DB fields (`PlatformSettings.supportEmail`/`supportPhone`, see `PROJECT_SOURCE_OF_TRUTH.md` §4.16), not an env var as this line previously implied — each country's separate database/deployment can already set its own values independently through the admin UI, no code change needed. This item is really just the *business* question (shared or per-country) now, not a technical blocker.
- **Domain/subdomain per country** — confirm `ae.linknsmile.com` / `qa.linknsmile.com` / `sa.linknsmile.com` (or whatever pattern) and get DNS set up when ready.
- **Tracking IDs per country** — Sentry, Facebook Pixel, GTM, Google Ads currently default to the existing India IDs (env-pluggable now, per Step 4 work) — decide whether each new country deployment gets its own tracking accounts or shares the existing ones.
- **Address model** — `lib/models/address.ts` (the saved address-book, separate from the checkout form) has no `country` field at all. Deliberately deferred during Step 5 — will need its own schema-change task before a UAE customer can save an address book entry properly, not just check out once.
- **Regional bank details for vendor payouts** — the existing IFSC (India) validation has a SWIFT/BIC path already available as an alternate — confirm this is sufficient for GCC vendor payouts or needs its own local bank-format validation.

---

## NOT Blocked — Can Continue Immediately

For clarity, since this document exists to *unblock* other work, not stall it:
- Any further storefront/vendor/admin feature work unrelated to payments, tax, or language (e.g. return/refund flow, shipping/courier integration, the outstanding security quick-fixes from the original audit — debug routes, `admin/images/*` auth, `/api/users` role bug)
- The remaining i18n/RTL file sweep (~147 files) — infrastructure is done (item 3), each remaining file is now a mechanical extraction following the pattern already proven on header/footer/homepage
- Anything on the original feature brainstorm list not yet built