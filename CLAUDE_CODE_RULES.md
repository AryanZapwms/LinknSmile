# Rules for Claude Code — LinknSmile Remediation Work

These rules apply to ALL work in this repo until explicitly revoked. They sit above any
individual prompt. If a prompt conflicts with these rules, follow these rules and flag the conflict.

> **Note added 2026-08-24 (not superseding this file's rules — those still apply — just
> correcting a stale pointer within it):** `SECURITY_VERIFICATION_REPORT.md`, referenced in
> rule 1 below as "the fix backlog," **does not exist anywhere in this repo** (confirmed via
> a full reconciliation pass — it was apparently never committed). The numbered findings this
> file refers to throughout (#1–#13) are the same ones now tracked, verified against current
> code, and kept up to date in `PROJECT_SOURCE_OF_TRUTH.md` §12 and §16 — treat that doc's §12
> as the actual current fix backlog in this report's absence. `SECURITY_FIXES_SUMMARY.md` (the
> plain-English changelog this process produced) is marked historical/superseded as of the same
> date, at its own top.

## 1. Reference documents
- `PROJECT_SOURCE_OF_TRUTH.md` is the architecture reference. Do not regenerate it wholesale.
- ~~`SECURITY_VERIFICATION_REPORT.md` (the confirmed-findings report) is the fix backlog.~~ This
  file does not exist in the repo — see the note above. Use `PROJECT_SOURCE_OF_TRUTH.md` §12
  instead.
- If either document conflicts with the current code, the **code wins** — but flag the
  discrepancy in your response instead of silently editing the doc.

## 2. One finding at a time
- Fix exactly ONE numbered finding per session unless explicitly told to batch.
- Do not "also clean up" adjacent code, refactor unrelated files, or fix things not on the
  approved list, even if you notice something else broken. Note it instead, don't touch it.
- Before writing any code: state which finding you're fixing, the file(s) you'll touch, and
  the exact change you intend to make. Wait for confirmation before editing.

## 3. No scope creep on data-touching or money-touching code
- Any change touching `Wallet`, `LedgerEntry`, `Order.vendorPayouts`, `Payout`, or cron jobs
  under `app/api/cron/*` requires:
  - A written explanation of the exact state transition before and after the fix.
  - No direct database writes/migrations without explicit approval.
  - No deletion or draining of existing collections.
- Never run scripts that call `deleteMany`, `drop`, or similar against any collection,
  in dev or prod, without explicit per-command approval.

## 4. Auth fixes — minimum viable, not redesign
- When adding auth checks to previously-unauthenticated routes (e.g. `admin/images/*`,
  `debug/link-shop`, `temp-update-categories`, `users` GET), match the auth pattern already
  used elsewhere in the codebase (e.g. same `getServerSession` + role-check style as other
  admin routes). Do not introduce a new auth pattern.
- Preserve existing route behavior for legitimately authorized callers — don't change
  response shapes, status codes for the success path, or route paths.

## 5. Destructive/dangerous routes
- `debug/*` and `temp-*` routes: default recommendation is to require admin auth AND confirm
  whether they are still needed at all. Do not delete these routes outright without asking —
  something else in the app or a deploy script might call them.
- Any route that does bulk writes (`deleteMany`, `updateMany`) on a plain GET must be flagged
  as unsafe HTTP semantics regardless of auth — recommend converting to POST/DELETE with auth,
  and ask before doing so.

## 6. No secrets, no env values
- Never print, log, or write actual values of secrets/env vars (API keys, DB URIs, JWT
  secrets, SMTP credentials) to any file, commit, or response — including in commit messages
  or code comments. Reference them by name only.

## 7. Verification before "done"
- After each fix, state: what you changed, why it fixes the finding, and how to verify it
  (a curl command, a test to run, or a manual repro step) — do not just assert it's fixed.
- Run `npm run typecheck` (and `npm run lint` if fast) after each change and report the result.
- Do not mark a finding resolved if verification wasn't actually run.

## 8. Items marked "Needs Manual Verification" are off-limits until resolved
- Do not implement a fix for #8 (parallel fund-release crons) until the user confirms:
  (a) whether `CRON_SECRET` is set in production, and
  (b) which cron jobs are actually scheduled in the live crontab.
- Do not implement a fix for #3 (`debug/link-shop`) assuming the hardcoded account is
  inert — ask whether that account is real/live first, since it changes whether this is
  "remove dead code" or "close an active backdoor."
- Do not attempt a live path-traversal test against a running instance (#13) without
  explicit permission — this is a real exploit attempt, not a code read.

## 9. Git hygiene
- One finding = one commit, with a message referencing the finding number
  (e.g. `fix: add admin auth to /api/admin/images/delete (#1)`).
- Do not force-push, rewrite history, or touch branches other than the working branch.
- Do not touch `.github/workflows/ci.yml`, `next.config.mjs` build-error suppression (#14/#15),
  or CI config without a separate, explicit go-ahead — these are process changes, not just code
  fixes, and affect the whole team's workflow.

## 10. Stop conditions — ask before proceeding if:
- The fix would change an API's response shape or route path.
- The fix touches more than 3 files.
- You're unsure whether existing legitimate callers depend on current (broken) behavior.
- The finding turns out to be different in the current code than the report described.