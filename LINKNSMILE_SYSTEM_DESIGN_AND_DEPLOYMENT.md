# LinknSmile — System Design, Deployment Architecture & Request Flow

**Purpose of this document:** if you're a developer touching this codebase or its infrastructure for the first time, read this fully before changing any deployment config, VPS setting, or CI/CD file. This project has real, subtle infrastructure gotchas (see §7) that have caused hours of debugging in the past — most of that pain is preventable just by knowing this document exists.

**Last verified:** September 2026, following the UAE deployment rollout and the extprocessor-collision incident (see §7.1).

---

## 1. What this system is

LinknSmile is a multi-vendor e-commerce marketplace: vendors list products, customers buy from multiple vendors in one cart, vendors get payouts. Built as a single Next.js codebase, backed by MongoDB, currently deployed twice — once for India, once for the UAE — with more countries planned.

**Stack:**
- **Frontend + API:** Next.js 15 (App Router), React, deployed as a Node.js server (not static export) — runs via `next start`, not serverless
- **Database:** MongoDB (Atlas, shared cluster `Cluster0`, separate database per country)
- **Auth:** NextAuth
- **Payments:** Razorpay (India), Tap Payments (UAE/Qatar/Saudi — code exists, UAE not live yet)
- **Process manager:** PM2, cluster mode
- **Web server / control panel:** OpenLiteSpeed, managed via CyberPanel
- **Reverse proxy layer:** nginx (see §3 — this is unusual and important)
- **CI/CD:** GitHub Actions, self-triggered SSH deploys to a single VPS
- **Hosting:** Single VPS (HostZop), domains via HostGator, no CDN/WAF in front

---

## 2. The multi-country model

One codebase, one VPS, one GitHub repo — **N independent running instances**, one per country. Each instance is fully isolated at the infrastructure level:

| | India (live) | UAE (live) | Future country |
|---|---|---|---|
| Domain | `linknsmile.com` | `ae.linknsmile.com` | `<xx>.linknsmile.com` |
| App folder | `/home/linknsmile.com/` | `/home/ae.linknsmile.com/` | `/home/<xx>.linknsmile.com/` |
| PM2 process name | `linknsmile` | `linknsmile-ae` | `linknsmile-<xx>` |
| Port | 3004 | 3005 | 3006, 3007, ... |
| MongoDB database | `test` *(historical name, not `linknsmile` — see §4.1)* | `linknsmile_ae` | `linknsmile_<xx>` |
| MongoDB user | `work_db_user` | `uae_db_user` | `<xx>_db_user` |
| Currency | INR | AED | per country |
| Payment gateway | Razorpay | Tap (placeholder key until GCC number available) | per country |
| GitHub Actions workflow | `deploy.yml` / `rollback.yml` | `deploy-ae.yml` / `rollback-ae.yml` | `deploy-<xx>.yml` / `rollback-<xx>.yml` |

**Critical design principle: each country's deploy pipeline is fully independent.** Deploying UAE can never touch India's running process, database, or files, and vice versa. This is enforced by using entirely separate folders, separate GitHub Actions workflows (not a shared matrix), and a parameterized `ecosystem.config.js` (see §5.2). This was a deliberate architectural choice specifically so a mistake in one country's deploy can never take down another.

---

## 3. Infrastructure topology (read this before touching any server config)

This VPS has an **unusual, layered setup**: nginx AND OpenLiteSpeed both run simultaneously, doing different jobs. This is not standard CyberPanel behavior — it appears to have been added at some point for specific reasons (likely to support `backmovc.movementcreations.in`'s separate CORS requirements) and now every domain on the box, including LinknSmile, has to go through it.

```
Internet
   │
   ├── Port 80 (HTTP) ──────────────► nginx
   │                                    │
   │                                    ├─ per-domain server{} blocks in /etc/nginx/conf.d/*.conf
   │                                    │  - redirects everything to HTTPS
   │                                    │  - EXCEPT /.well-known/acme-challenge/ → proxies to
   │                                    │    127.0.0.1:7080 (OpenLiteSpeed's internal ACME listener)
   │                                    │  - EVERY domain needs its OWN file here — CyberPanel does
   │                                    │    NOT auto-create this when you add a site (see §7.2)
   │
   └── Port 443 (HTTPS) ────────────► nginx (TCP-level SNI passthrough, NOT decrypting)
                                          │
                                          │ /etc/nginx/stream.d/sni-passthrough.conf
                                          │ reads the SNI hostname only, routes based on it:
                                          │
                                          ├─ backmovc.movementcreations.in → 127.0.0.1:8443 (different app)
                                          └─ everything else (default)     → [::1]:443 (OpenLiteSpeed)
                                                                                │
                                                                                ▼
                                                                    OpenLiteSpeed terminates TLS here
                                                                    (picks the right cert via its own
                                                                     listener→vhost domain mapping)
                                                                                │
                                                                                ▼
                                                              vhost.conf's `context /` block
                                                              (type: proxy, points at a named
                                                               `extprocessor`)
                                                                                │
                                                                                ▼
                                                          named extprocessor resolves to an
                                                          address:port — ⚠️ SEE §7.1, THIS NAME
                                                          MUST BE GLOBALLY UNIQUE ACROSS ALL VHOSTS
                                                                                │
                                                                                ▼
                                                              PM2-managed Node.js process
                                                              (Next.js `next start -p <port>`)
```

### Where SSL certs actually come from
**Not certbot.** OpenLiteSpeed has its own built-in AutoSSL feature (`autoSSL 1` in `/usr/local/lsws/conf/httpd_config.conf`), which requests/renews real Let's Encrypt certs itself, writing to the conventional `/etc/letsencrypt/live/<domain>/` paths (for compatibility only — certbot itself is never invoked). This relies on the HTTP-01 challenge succeeding via the nginx port-80 → port 7080 path described above. **If a new domain's port-80 nginx config is missing, AutoSSL will fail silently/repeatedly and the domain gets stuck with a self-signed placeholder cert.**

### Where the "Issue SSL" button actually lives in CyberPanel
**Websites → List Websites → [domain] → SSL** (in that site's own left sidebar). There is a *different*, deprecated page at `/manageSSL/sslForHostName` that looks similar but is for securing the CyberPanel admin panel's own hostname — it is not the right tool and appears to have a broken backend. Avoid it.

---

## 4. Application-level architecture

### 4.1 Database
- Single Atlas project (`LinkAndSmile`), single cluster (`Cluster0`), **shared across all countries** — isolation is achieved via separate *databases* within the cluster and separate *database users* scoped to only their own database (not separate clusters — deemed sufficient isolation for the current scale/risk level).
- India's database is historically named `test` (not `linknsmile`) — an artifact of the original single-country build never specifying a db name in the connection string, so MongoDB's default (`test`) stuck. **This is not a bug, just a historical naming quirk — don't "fix" it without understanding the blast radius**, since it's referenced by name nowhere in code (Mongoose reads the db name from the connection string itself).
- Every new country gets: a new database (e.g. `linknsmile_ae`), a new dedicated user with `readWrite` scoped to only that database, and its own `MONGODB_URI` in that country's `shared/.env`.

### 4.2 Environment / config strategy
Environment-specific behavior (currency, locale, payment gateway, site URL, analytics IDs) is driven entirely by env vars, read in `lib/env.ts` and `lib/currency.ts`/`lib/i18n-config.ts`. Key files:
- **`lib/env.ts`** — the single source of truth for required/optional env vars and their validation. Runs `validateEnv()` at import time (imported at the top of `lib/db.ts`), which **throws and crashes the app at startup** if a required var is missing. This is intentional — fails loud and fast rather than silently misbehaving mid-request.
- **`PAYMENT_GATEWAY` env var** determines which gateway-specific vars are required. Defaults to `"razorpay"` if unset — **this means you cannot simply leave `PAYMENT_GATEWAY` unset for a new country that isn't using Razorpay; the app will fail to start** unless you also provide Razorpay's vars. Set it explicitly to the real intended gateway (e.g. `tap`) even if using a placeholder key for now (see §6.3).
- Several vars (`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_FB_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, etc.) **silently default to India's live values if left unset** — meaning a new country's traffic can accidentally mix into India's analytics if these aren't explicitly set. Always set country-specific values for these before treating a deployment as fully "clean."

### 4.3 i18n / locale
Two independent concepts, easy to confuse — do not conflate them when configuring a new country:
- **`NEXT_PUBLIC_LOCALE`** (e.g. `en-IN`, `en-AE`) — an *Intl formatting* locale only (date formats, currency display conventions). Almost always `en-<COUNTRY>`, NOT the local language — India uses `en-IN`, not a Hindi locale, even though Hindi is available as a UI language.
- **`NEXT_PUBLIC_SECONDARY_LOCALE`** (e.g. `hi` for India, `ar` for UAE) — the actual secondary *UI translation* language. As of this writing, **i18n is only "Phase 1" complete** — only `components/header.tsx`, `components/footer.tsx`, and `app/page.tsx` are actually translated; everything else renders hardcoded English regardless of this setting. Don't assume a new country's UI is fully localized just because this var is set.

### 4.4 Multi-tenancy / "which country am I" logic
**As of this writing, there is deliberately no cross-request domain-based routing logic in the app itself** (confirmed no `middleware.ts` exists in the repo — verified multiple times, most recently during the incident in §7.1). Each deployment is a **fully separate, independent process** with its own hardcoded (well, env-var-driven) `MONGODB_URI` baked in at that process's runtime. The app itself has no concept of "which country am I serving" beyond whatever database its `MONGODB_URI` happens to point at. This is a deliberate simplicity choice — don't add cross-country request-time logic without a very good reason; it would break the isolation guarantee this whole architecture is built around.

---

## 5. The deploy pipeline, end to end

### 5.1 Trigger
GitHub Actions, triggered on push to `main` (or on CI success, depending on workflow config) — `.github/workflows/deploy.yml` (India) and `deploy-ae.yml` (UAE) run **in parallel**, independently, off the same commit. Each has its own concurrency group so India and UAE deploys can never block or race each other.

### 5.2 `ecosystem.config.js` — parameterized, shared file
```js
const APP_NAME = process.env.PM2_APP_NAME || "linknsmile";
const APP_ROOT = process.env.PM2_APP_ROOT || "/home/linknsmile.com";
const PORT = Number(process.env.PM2_PORT) || 3004;
const INSTANCES = Number(process.env.PM2_INSTANCES) || 2;
```
This single file serves every country. India's workflow doesn't set these vars (so it gets the defaults, unchanged from before multi-country existed). UAE's workflow (`deploy-ae.yml`) explicitly exports `PM2_APP_NAME=linknsmile-ae`, `PM2_APP_ROOT=/home/ae.linknsmile.com`, `PM2_PORT=3005`, `PM2_INSTANCES=2` before invoking `deploy.sh`. **A future third country's workflow must do the same with its own unique values.**

### 5.3 `scripts/deploy/deploy.sh` — runs ON the server, inside the fresh release
Key behaviors, in order:
1. Refuses to proceed if `$APP_ROOT/shared/.env` doesn't exist — **first deploy for a new country will fail here until you manually create `shared/.env` once.** This is intentional, not a bug.
2. Symlinks `shared/.env` → `<release>/.env.local` and `shared/logs` → `<release>/logs` — **done automatically on every single deploy**, not a one-time setup step.
3. `npm ci && npm run build`
4. Health-checks the new build on a temporary port (default 3999; UAE uses 3998 to avoid collision) — **only if this passes** does it proceed
5. Atomically flips the `current` symlink (`mv -Tf` — atomic on POSIX, so there's never a moment where `current` points at a half-written release)
6. `pm2 startOrReload ecosystem.config.js --update-env`
7. Re-confirms the live process actually answers `/api/health` on the real port
8. Prunes old releases, keeping the last 5

**If the health check at step 4 fails, `current` is never touched and the previous release keeps serving traffic untouched** — deploys fail safe, not partial.

### 5.4 `scripts/deploy/rollback.sh`
Same pattern, but skips build entirely — reuses an already-built release directory, so it's fast (seconds, not minutes). Run manually or via the `rollback.yml`/`rollback-ae.yml` GitHub Actions workflow.

---

## 6. Onboarding a new country — full checklist

Follow this exactly, in order, based on everything learned from the UAE rollout (including its mistakes).

### 6.1 Code side (repo)
- [ ] No code changes needed for a basic deployment if the app is already multi-country-aware for currency/locale/gateway (check `PROJECT_SOURCE_OF_TRUTH.md` — as of UAE's rollout, this groundwork was already done for UAE/Qatar/Saudi).
- [ ] Create `.github/workflows/deploy-<xx>.yml` and `rollback-<xx>.yml` by copying UAE's, changing: port numbers, `PM2_APP_NAME`, `PM2_APP_ROOT`, concurrency group name.
- [ ] Create `.env.<xx>.example` in the repo — cross-check every var against the **actual, current** `lib/env.ts`, not a stale template. (This bit us during UAE setup — an old template comment said "leave PAYMENT_GATEWAY unset," which would have crashed the app; always verify against real code.)

### 6.2 VPS — folders, one-time setup
```bash
mkdir -p /home/<xx>.linknsmile.com/{releases,shared/logs}
```

### 6.3 MongoDB (Atlas)
- Create a new database named `linknsmile_<xx>` (lazily created on first write — or manually via Atlas UI's "Create Database" with a throwaway initial collection).
- Create a new dedicated database user (`<xx>_db_user`), autogenerated password, **Specific Privilege → readWrite → scoped to only `linknsmile_<xx>`** (never a built-in "readWrite any database" role).
- Do NOT reuse another country's database or user — this is the actual data-isolation boundary.

### 6.4 `shared/.env`
Populate `/home/<xx>.linknsmile.com/shared/.env` from `.env.<xx>.example`, `chmod 600` it. Critically:
- `MONGODB_URI` — this country's own db/user, same cluster host is fine
- `NEXTAUTH_SECRET` and `CRON_SECRET` — **fresh, unique `openssl rand -hex 32` values, never reused across countries, and never pasted into a chat/ticket/Slack message** (see §8 for why this matters — it's bitten this project before)
- `PAYMENT_GATEWAY` — set to the **real intended gateway explicitly**, even with a placeholder secret key, rather than leaving unset (see §4.2)
- `NEXT_PUBLIC_IMAGE_HOSTNAMES` — must include this country's own domain or self-hosted images will 400
- Analytics IDs (Sentry/Pixel/GTM/Ads) — set country-specific values or explicitly accept they'll default to India's

### 6.5 CyberPanel — website + reverse proxy
1. **Websites → Create Website** for the new domain. This auto-creates `/home/<xx>.linknsmile.com/public_html` (unused — the real app runs on a PM2 port, not served as static files from here) and a basic `vhost.conf`.
2. Edit that vhost's **vHost Conf** (Websites → List Websites → Manage → [domain] → vHost Conf), inserting before the `rewrite {}` block:
```
context / {
  type                    proxy
  handler                 nextapp_<xx>
  addDefaultCharset       off
}
extprocessor nextapp_<xx> {
  type                    proxy
  address                 127.0.0.1:<this country's port>
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
```
   **⚠️ THE EXTPROCESSOR NAME (`nextapp_<xx>`) MUST BE GLOBALLY UNIQUE ACROSS EVERY VHOST ON THIS SERVER.** See §7.1 for the full story of why this is written in bold caps. Do not name it just `nextapp` — that name is used by (at minimum) India and UAE already.
3. Create the matching nginx port-80 config (CyberPanel does NOT do this automatically — see §7.2):
```bash
printf '%s\n' \
'server {' \
'    listen 80;' \
"    server_name <xx>.linknsmile.com;" \
'' \
'    location /.well-known/acme-challenge/ {' \
'        proxy_pass http://127.0.0.1:7080;' \
'        proxy_set_header Host $host;' \
'    }' \
'' \
'    location / {' \
'        return 301 https://$host$request_uri;' \
'    }' \
'}' > /etc/nginx/conf.d/<xx>-linknsmile.conf
nginx -t && systemctl reload nginx
```
   (Use `printf`, not a `cat << EOF` heredoc — some SSH clients/terminals have been observed silently mangling semicolons on heredoc paste.)
4. **Websites → List Websites → [domain] → SSL → Issue SSL.** Should succeed immediately now that step 3 is in place. If it doesn't, check `/usr/local/lsws/logs/error.log` for `[AutoSSL]` entries — the error detail will usually say exactly what failed.

### 6.6 First deploy
Merge the branch with the new country's scaffolding to `main`. The new `deploy-<xx>.yml` should fire alongside India's/UAE's existing workflows. Confirm it fails safely if `shared/.env` isn't ready (it will, per §5.3 step 1).

### 6.7 Verification — do ALL of these, not just some
```bash
pm2 list                                                    # expect linknsmile-<xx>, 2 instances, 0 crashy restarts
curl -sf http://127.0.0.1:<port>/api/health                 # direct-to-app health check
curl -I https://<xx>.linknsmile.com                          # public HTTPS check
curl -s https://<xx>.linknsmile.com/api/products             # ⚠️ MUST return THIS country's data, not another's
                                                              #    — see §7.1, this is the exact check that would
                                                              #    have caught the extprocessor collision immediately
openssl x509 -in /etc/letsencrypt/live/<xx>.linknsmile.com/fullchain.pem -noout -issuer -dates
                                                              # confirm real Let's Encrypt issuer, ~90-day validity
                                                              # (NOT "O=Dis, L=Springfield" — that's the self-signed
                                                              #  placeholder CyberPanel writes before a real cert exists)
```
**Do not consider a new country deployment "done" until the `/api/products` (or equivalent) check above returns that country's own — likely empty — data, verified through the real public HTTPS domain, not just directly against the port.** This single check would have caught the entire multi-day UAE incident in five seconds.

---

## 7. Known infrastructure gotchas (learned the hard way — read before debugging anything)

### 7.1 ⚠️ OpenLiteSpeed `extprocessor` names must be globally unique across ALL vhosts on this server

**This is the single most important gotcha in this whole document.**

OpenLiteSpeed's `extprocessor` blocks inside a vhost's `vhost.conf` are **not scoped to that vhost** — they appear to be resolved by name across the entire server. If two different vhosts each define, say, `extprocessor nextapp { address 127.0.0.1:XXXX }`, OpenLiteSpeed will silently let one definition win globally, and **every vhost referencing that name via `context / { handler nextapp }` will be routed to whichever definition actually won** — regardless of what that vhost's own config says, and **surviving full service restarts with a freshly-spawned process ID.**

**This caused a multi-hour, extremely difficult-to-diagnose incident during UAE's rollout**: UAE's `vhost.conf` was built by closely mirroring India's, and both independently used the extprocessor name `nextapp`. As a result, `ae.linknsmile.com` publicly served **India's live product data** for roughly a day, despite UAE's own database, app process, and every other config file being independently, provably correct. The bug was invisible to:
- Direct requests to UAE's own port (bypasses named-extprocessor resolution entirely)
- Checking UAE's vhost.conf file content (it was correct on disk)
- Checking UAE's access logs (the request correctly landed at the right vhost — only the *extprocessor resolution* was wrong)
- Restarting OpenLiteSpeed, even with a verified-fresh process ID
- Checking CyberPanel's own database, DNS, nginx's SNI passthrough config, and the app's own code — none of these are involved in extprocessor name resolution

**The only thing that would have caught it immediately:** checking the public API response content, per §6.7.

**Rule going forward: every country's extprocessor name MUST include that country's identifier** (e.g. `nextapp_india`, `nextapp_ae`, `nextapp_qa`), never a generic shared name like `nextapp`. India's own vhost.conf still uses the bare `nextapp` name as of this writing — **recommended (not yet done) to rename it to `nextapp_india` for symmetry and to eliminate any residual collision risk for future countries.**

### 7.2 CyberPanel does not auto-create the nginx port-80 config for new domains on this server

Because of the unusual nginx+OpenLiteSpeed layering (§3), adding a website through CyberPanel's UI creates the OpenLiteSpeed vhost correctly, but **does not** create the corresponding `/etc/nginx/conf.d/<domain>.conf` file that's needed on *this specific server* for the ACME HTTP-01 challenge to succeed. Without it, SSL issuance will fail repeatedly with a `502` or timeout in OpenLiteSpeed's AutoSSL log, and the domain will be stuck on a self-signed placeholder cert. This is not general CyberPanel behavior — it's specific to this box's layered setup. Always create this file manually per §6.5 step 3 for any new domain.

### 7.3 `systemctl restart lsws` (or even `reload`) is production-impacting for every country simultaneously

OpenLiteSpeed is a single shared process serving every domain on this box. A restart briefly interrupts all of them. **Additionally**, OpenLiteSpeed's AutoSSL background job can fire automatically around restarts and, if it attempts reissuance for multiple domains at once, can exhaust nginx's file-descriptor limit (`worker_rlimit_nofile`, currently a modest `1024`), causing a **wider outage across all domains on the box**, not just OpenLiteSpeed itself. This happened once during UAE's rollout — fixed via `systemctl restart nginx` (a lighter, more contained restart) — India was confirmed to recover fully within minutes, but it's a real risk to keep in mind. **Recommended follow-up (not yet done): raise `worker_rlimit_nofile` in `/etc/nginx/nginx.conf`.**

**Rule: always run `curl -sI https://linknsmile.com` (or the equivalent for whichever countries are live) immediately before AND after any `systemctl restart/reload lsws` or `nginx` command**, regardless of which country you're actually working on.

### 7.4 India's database is named `test`, not `linknsmile`

Historical artifact, not a bug. Don't be alarmed when you don't find a database literally named `linknsmile` in Atlas.

### 7.5 The heredoc semicolon-mangling issue

Some SSH terminal/client combinations have been observed to silently insert backslashes before semicolons when pasting a `cat << 'EOF' ... EOF` block, breaking nginx config syntax in a confusing way (`nginx -t` reports "invalid number of arguments" at a line that looks visually correct). If this happens, switch to `printf '%s\n' 'line1' 'line2' ... > file` instead, which has not been observed to have this problem.

### 7.6 CyberPanel has a deprecated, broken-looking global SSL page

`/manageSSL/sslForHostName` is for the CyberPanel admin panel's own hostname, not per-site SSL, and its backend appears to return a connection error regardless. The correct per-site SSL management is under **List Websites → [domain] → SSL** in that site's own left sidebar.

---

## 8. Security practices established for this project

- **Never paste real secrets (passwords, API keys, `CRON_SECRET`, `NEXTAUTH_SECRET`, `openssl rand` output intended for a `.env` file) into chat, tickets, or any shared log.** This has happened twice during this project (an `openssl` output pasted before use, and India's real `CRON_SECRET` exposed via a `crontab -l` paste) — both were treated as compromised and regenerated/flagged for rotation. Generate secrets and copy them directly into the target file (`nano`) without an intermediate paste anywhere else.
- Each country gets its own dedicated MongoDB user, scoped to only that country's database — never a shared "readWrite any database" role.
- Each country gets its own unique `CRON_SECRET` and `NEXTAUTH_SECRET` — never reused across countries.
- **Open action item as of this writing: India's `CRON_SECRET` was exposed during the UAE debugging session and should be rotated** (update the crontab's `Authorization: Bearer` value and whatever the app validates against — likely just the env var, then `pm2 reload` India). Not yet done.

---

## 9. Debugging playbook — if a country's public site is serving wrong/unexpected data

If you ever see a scenario similar to §7.1 again (public site returns different content than its own database/app should produce), work through this list in order — it's the fastest path based on everything learned:

1. **Confirm the database is actually what you think it is** — write a tiny standalone Node script (not going through the app) that manually reads `.env.local`, connects via the app's own `node_modules/mongoose`, and directly queries. This isolates "is the data layer actually wrong" from everything else, definitively, in under a minute.
2. **Hit the app directly on its own port** (`curl http://127.0.0.1:<port>/api/...`), bypassing OpenLiteSpeed/nginx entirely. If this is correct but the public domain isn't, the bug is 100% in the reverse-proxy layer, not the app or database — don't waste time debugging app code.
3. **Check for an extprocessor name collision first** (§7.1) — `grep extprocessor` across every vhost.conf on the server and look for duplicates. This is now a known, previously-occurring failure mode; check it before anything else in the proxy layer.
4. **Deliberately break the suspected proxy config** (point it at a definitely-dead port) and see if the public behavior changes. If it doesn't change at all, even after a full service restart with a verified new PID, that's the smoking gun that something else entirely is answering — which is exactly the symptom that led to finding §7.1.
5. **Rule out anything external to the VPS** with `curl --resolve <domain>:443:127.0.0.1 https://<domain>/...` — forces the connection to stay on this exact machine, ruling out any CDN/WAF/DNS-level surprises in one command.
6. Only after 1–5, consider more invasive options like deleting and recreating the CyberPanel website registration — this is a last resort, not a first move, since it doesn't explain *why* something broke and might not even fix it if the root cause is something like §7.1.

---

## 10. Open follow-up items (not yet done, tracked here for visibility)

- [ ] Rename India's `extprocessor nextapp` → `nextapp_india` in its vhost.conf, for symmetry and to eliminate residual collision risk (§7.1)
- [ ] Rotate India's `CRON_SECRET` (exposed during UAE debugging session)
- [ ] Raise nginx's `worker_rlimit_nofile` above the current `1024` (§7.3)
- [ ] Set up UAE-dedicated Sentry/FB Pixel/GTM/Google Ads IDs (currently silently defaulting to India's)
- [ ] Get real Tap Payments credentials once a GCC-region phone number is available for account signup; swap into UAE's `shared/.env`, replacing the current placeholder `TAP_SECRET_KEY`
- [ ] Fix the harmless-but-worth-cleaning-up duplicate `idempotencyKey` Mongoose schema index warning (appears in every deployment's logs)
- [ ] Consider adding UAE-specific homepage marketing copy/imagery — currently shows India-flavored hardcoded banner/tagline content since only header/footer/homepage structure (not all copy) is translated per the Phase 1 i18n scope
- [ ] Consider whether UAE needs its own Cloudinary account/folder vs. sharing India's (currently left unset, meaning image uploads are effectively disabled for UAE vendors/admins until decided)