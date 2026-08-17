# Reminder: Set Up the Vendor Fund-Release Cron Job

_Written: 2026-08-17. Not urgent — read this whenever you're ready to set it up._

---

## Why this exists

The app has a "wait 7 days, then release the vendor's money" rule for every sale. Something has to actually run that check once a day — but right now, **nothing does**. We checked the server directly (`crontab -l` for both `root` and the app's user `linkn1054`) and confirmed there's no scheduled task calling it at all.

Until this is set up, new vendor sales will pile up as "pending" and never automatically become withdrawable. (We already fixed the incorrect numbers this caused for existing wallets — see `SECURITY_FIXES_SUMMARY.md` for that part. This reminder is only about making sure it doesn't happen again going forward.)

## Background context (so future-you doesn't have to re-derive this)

There used to be **two different systems** in the code trying to do this same job — one based on the ledger (the correct, "source of truth" one) and an older one based directly on order records. You chose to keep the ledger-based one. The old one (`app/api/cron/clear-funds/route.ts`) is still sitting in the codebase, unused — **there's a pending decision to delete that file**, separate from this cron setup. Ask Claude Code to pick that back up whenever you're ready ("delete the old cron/clear-funds route, finding #8").

## What needs to happen, exactly

Once a day, something needs to send a request to this URL:

```
https://linknsmile.com/api/cron/clear-pending-funds
```

with this header attached:

```
Authorization: Bearer <your CRON_SECRET value>
```

The `CRON_SECRET` value already exists in your server's `.env` file at `/home/linknsmile.com/shared/.env` — you don't need to create a new one, just reuse what's there. (If it turns out nothing is set for `CRON_SECRET`, the route currently runs with **no protection at all** if that variable is empty — so it's worth double-checking a real value is set before or during this setup.)

There are two smaller vendor-subscription-related jobs too, lower priority but worth doing at the same time if you're already in there:

```
https://linknsmile.com/api/cron/vendor-subscription-sweep
```
(same `Authorization: Bearer` header) — this one just sends reminder emails and hides expired vendors' storefronts after 30 days; it's not money-critical the way the fund-release one is.

## How to actually set it up — two options

### Option 1: CyberPanel's built-in Cron Jobs page (recommended — no command line)
Your server runs CyberPanel. Look for a **"Cron Jobs"** section in its dashboard (typically under *Manage → Cron Jobs*). Add a new job:
- **Schedule:** once daily (e.g. 8:30 PM, matches what the old Vercel config used to say)
- **Command:**
  ```
  curl -s -H "Authorization: Bearer YOUR_SECRET_HERE" https://linknsmile.com/api/cron/clear-pending-funds
  ```
  (paste the real secret value in directly, only into this one field)

### Option 2: A free external scheduling website (no server access needed at all)
Something like **cron-job.org** (free):
1. Sign up
2. Add a job pointing at `https://linknsmile.com/api/cron/clear-pending-funds`
3. Add a custom header: `Authorization: Bearer YOUR_SECRET_HERE`
4. Set it to run once a day

### Option 3 (manual/advanced): raw crontab
If you're comfortable with SSH and prefer the command line directly, as the `linkn1054` user (not root):
```
crontab -e
```
and add a line like:
```
30 20 * * * curl -s -H "Authorization: Bearer YOUR_SECRET_HERE" https://linknsmile.com/api/cron/clear-pending-funds >> /home/linknsmile.com/shared/logs/cron-clear-pending-funds.log 2>&1
```

## How to check it's working, later

- After it's set up and has run at least once, check `/home/linknsmile.com/shared/logs/cron-clear-pending-funds.log` (if you used the logging version above) or whatever CyberPanel/cron-job.org shows as job history.
- Ask Claude Code to check the database again (same read-only method used before) to confirm `LedgerEntry` records with `status: PENDING` are actually flipping to `CLEARED` after their 7-day wait, and that vendor wallets' `withdrawableBalance` is moving accordingly.

## Related files, if you want the deeper technical picture later
- `app/api/cron/clear-pending-funds/route.ts` — the route being scheduled
- `lib/services/ledger-service.ts` — the `clearPendingFunds()` logic it calls
- `PROJECT_SOURCE_OF_TRUTH.md` §8.3, §11 — architecture and deployment context
- `SECURITY_FIXES_SUMMARY.md` — what's already been fixed as of this writing
