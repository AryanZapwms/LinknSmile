# Security Fixes — Plain-English Summary

_Last updated: 2026-08-17_

This explains, in simple terms, what security problems we found in the app, what's been fixed, what changed in the live database, and what's still left to do.

---

## ✅ What's been fixed (done, committed, not yet pushed to GitHub)

All 9 of the commits below are sitting locally on the `project-source-of-truth` branch. **Nothing has been pushed to GitHub yet** — say the word when you want that done.

### 1. Anyone could delete image files from the server — fixed
There was a page (`admin/images/delete`) that let anyone on the internet delete image files, no login required. Now you have to be logged in as an admin.

### 2. Anyone could see a full map of your server's image files — fixed
A related page (`admin/images/scan`) leaked a list of every image file and which products/blogs it belonged to, again with no login required. Same fix — admin login required now.

### 3. A hidden "debug" link could silently make someone a vendor — fixed
There was a leftover developer tool (`debug/link-shop`) that, if anyone visited its URL, would automatically turn a specific hardcoded account into an approved vendor with their own shop. No login was needed to trigger it. Now it requires admin login. We also checked — that account is real and belongs to a legitimately registered vendor ("Happy Shop Aryan"), and nothing about it looks tampered with.

### 4. A hidden link could wipe out all your product categories — fixed
Another leftover developer tool (`temp-update-categories`) would delete your entire category list and replace it with test data, the moment anyone visited its URL — even accidentally, e.g. a bot scanning links. We removed this page entirely.

### 5. Any logged-in customer could see every user's info — fixed
A page meant for admins only (`users` list) was actually accessible to anyone with any account — customers, vendors, anyone. It leaked every user's name, email, phone, and role. Now it correctly checks that you're an admin.

### 6. Vendors could see reviews for other vendors' products — fixed
A page meant to show a vendor their own product reviews wasn't filtering properly — it showed **everyone's** reviews to **any** logged-in vendor. Now it correctly shows only your own shop's reviews.

### 7. A vendor's wallet balance could be tricked into "refilling" itself — fixed (the serious one)
This was the most important fix. When a vendor requested a payout, the app correctly deducted that money from their balance. But every time the vendor *looked at* their wallet page, a bug recalculated their balance from scratch and **accidentally put the already-paid-out money back**. In practice, this meant a vendor could request a payout, refresh their wallet page, and request the same money again — a real risk of paying someone twice for the same sale. The wallet page now just displays the real, correctly-tracked balance instead of recalculating it incorrectly.

### 8. Server files could be read (and in one case, deleted) using a URL trick — fixed
We found — and proved with a real test — that a few pages meant to serve images (`serve-files`, `serve-upload`, and one general-purpose file page) could be tricked into reading files **outside** the folder they were supposed to be limited to, using a URL trick (`..%2f` instead of `../`). We confirmed this worked by planting a harmless test file outside the allowed folder and successfully reading it through the bug — then fixed it, then proved the trick no longer works, and that normal image loading still works fine. The same weak check existed in the admin image-delete page too (harder to test live since it now requires login, but the underlying flaw was the same, and we fixed it the same way).

---

## 🗄️ What changed in the actual database (not just code)

Because of bug #7 above, some vendors' wallet numbers had drifted from what they should actually be — money was showing as "pending" or "frozen" when it shouldn't have been, purely due to the bug.

We checked this carefully before touching anything (showed you the exact before/after numbers first), then corrected it:

- **4 out of 9 vendor wallets** had incorrect numbers and were corrected.
- **"Pending" balance** was wrong on 2 wallets (₹126 and ₹1,908) — both corrected to reflect their real, accurate value.
- **"Frozen" balance** was wrong on 4 wallets (totaling ₹3,447) — this money wasn't actually frozen for any real reason (we checked — there were zero real dispute cases on record), so it was reset to ₹0.
- **Withdrawable balance was never wrong** — that part of the system was fine the whole time.

No vendor's actual withdrawable money was changed. This only corrected numbers that were showing incorrectly due to the bug.

---

## ⏳ What's still left to do

### A. One more small code change (waiting on you to say "go")
There are actually **two different systems** in the app that were both designed to release vendor earnings after a 7-day wait — but neither one was ever scheduled to run automatically (we checked the server's task scheduler directly, nothing was calling either one). You told us to keep the better-designed one and remove the other. We haven't deleted the old one yet — just say go and we'll remove that one leftover file.

### B. You need to add one line to the server's schedule
Once the leftover system above is removed, the *good* system still needs to actually be scheduled to run automatically (right now, nothing runs it — that's part of why vendor balances had drifted). This has to be done by you directly on the server (we don't have that kind of access) — it's a single line added to the server's task scheduler. We gave you the exact line to add earlier in our conversation.

### C. A smaller cleanup question, not urgent
There's a leftover inconsistency where the same status word ("released") means two slightly different things in two different places in the code. It's not a security risk, just a bit confusing for future changes. Not fixed, not urgent — up to you if/when to address it.

### D. Two things we haven't touched, on purpose
- **How the app is built and tested** — right now, the app can be published live even if there are code errors or style problems, because those checks aren't set up to block anything. This is a bigger process decision (not a quick fix), so we're holding off until you want to discuss it properly.
- **Nothing has been pushed to GitHub yet.** Everything above is sitting as 9 separate saved changes (commits) on your computer, ready to go, but not yet sent to the shared repository. Let us know when you want that done.

---

## Quick status check

| Area | Status |
|---|---|
| Security bugs fixed | 8 of 8 approved items ✅ |
| Wallet numbers corrected | ✅ Done |
| Leftover duplicate system removed | ⏳ Waiting on your go-ahead |
| Server schedule updated | ⏳ You need to do this on the server |
| Build/testing process reviewed | ⏳ Not started, needs a separate conversation |
| Changes sent to GitHub | ⏳ Not yet — say the word |
