# LinknSmile UAE Deployment — Full Handoff Doc

**Date of this session:** August 27–28, 2026
**Author:** Prepared by Claude (chat session) for handoff to another Claude instance / future self with full app codebase context.
**Status at end of session: SSL and infra are done. There is one unresolved, confirmed, reproducible data bug (see §7) blocking real use of the UAE store.**

---

## 1. Goal

Stand up a second, fully independent country deployment of the LinknSmile multi-vendor e-commerce app — UAE, at `ae.linknsmile.com` — alongside the existing live India deployment at `linknsmile.com`, without touching or risking India's live production pipeline.

Same Next.js codebase, same VPS, same CyberPanel/OpenLiteSpeed stack, same GitHub Actions deploy model — parameterized to run two independent instances side by side.

---

## 2. Infrastructure overview

**VPS:** HostZop-hosted server, IP `103.191.132.47`, running **CyberPanel** (control panel) on top of **OpenLiteSpeed** (the actual web server — NOT raw nginx, despite nginx also being present on this box for other purposes — see §3).

**Domain registrar:** HostGator (for `linknsmile.com` / `ae.linknsmile.com`). **Not** behind Cloudflare — this was investigated and ruled out mid-session (a red herring from a third-party checker tool's own Cloudflare-fronted error page, not a real finding about this domain).

**Deploy model:** GitHub Actions (GitHub-hosted runners, not self-hosted — confirmed no `actions-runner` directory exists on the VPS) → SSH/rsync into a `releases/<timestamp>/` folder → build → health-check → atomic symlink flip of `current` → PM2 `startOrReload`.

**Process manager:** PM2, cluster mode, 2 instances per deployment.

### Directory pattern (per deployment, e.g. India)
```
/home/linknsmile.com/
├── current -> releases/<timestamp>/       (symlink, atomically flipped on successful deploy)
├── releases/
│   └── <timestamp>/                       (one folder per deploy; old ones pruned, keeps last 5)
│       ├── .env.local -> ../../shared/.env  (symlink, recreated on EVERY deploy by deploy.sh)
│       ├── logs -> ../../shared/logs        (symlink, recreated on EVERY deploy)
│       ├── ecosystem.config.js
│       ├── scripts/deploy/deploy.sh
│       ├── scripts/deploy/rollback.sh
│       └── ... (full Next.js app)
└── shared/
    ├── .env                                (the REAL secrets file — never committed, never touched by deploy)
    └── logs/
```

UAE mirrors this exactly at `/home/ae.linknsmile.com/`.

---

## 3. What was already done before this session (via earlier Claude Code sessions, in the repo)

- `ecosystem.config.js` parameterized: reads `PM2_APP_NAME` / `PM2_APP_ROOT` / `PM2_PORT` / `PM2_INSTANCES` env vars, all defaulting to India's exact existing values (`linknsmile`, `/home/linknsmile.com`, `3004`, `2`) — **zero behavior change for India** if these vars are unset.
- `.github/workflows/deploy-ae.yml` and `rollback-ae.yml` — new, standalone workflows mirroring India's `deploy.yml`/`rollback.yml`, targeting port `3005`, separate concurrency group (`deploy-production-ae`), reusing the same SSH secrets (same VPS, no new GitHub Secrets needed).
- `nginx/ae.linknsmile.com.conf` — a template file was prepared in-repo, but **this template was NOT actually the mechanism used** to configure the reverse proxy — see §4 for what was actually needed (CyberPanel/OpenLiteSpeed native config, not raw nginx server blocks, for the *application* reverse-proxy; a *different*, hand-written nginx config was needed for a completely separate reason — the port-80 ACME challenge routing, see §5).
- `.env.ae.example` — template for UAE's `shared/.env`, every variable cross-checked against `lib/env.ts`'s actual `validateEnv()` logic (not copied blind from the stale `.env.example`).
- `deploy.sh` / `rollback.sh` / `deploy.yml` / `rollback.yml` / `ci.yml` — **zero lines touched**. India's pipeline is byte-identical to before this project started.
- `npm run typecheck` — confirmed passing with the `ecosystem.config.js` changes.

### Key discovery about `deploy.sh` (read directly from the live release on the server)
`deploy.sh` runs **from inside a freshly-cloned release directory** on the server (invoked by the GitHub Actions workflow over SSH). Key behavior:
- Refuses to proceed if `$APP_ROOT/shared/.env` doesn't exist yet (`exit 1` with a clear message) — this is what makes "first deploy fails safely if shared/.env isn't ready" true for free, no extra logic needed.
- **Recreates the `.env.local` symlink on every single deploy**: `ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env.local"`. This is NOT a one-time manual step — it is idempotent and automatic per-deploy. (This was investigated at length mid-session because it wasn't obvious where this symlink came from; the answer is this exact line in `deploy.sh`.)
- Builds (`npm ci && npm run build`), health-checks the new build on a **temporary port** (default 3999, or 3998 for AE) before ever touching the live `current` symlink — if the health check fails, `current` is never flipped and the previous release keeps serving traffic untouched.
- Only after a passing health check: atomically flips `current` (`mv -Tf` after building a `current.tmp` symlink — atomic on POSIX), then `pm2 startOrReload ecosystem.config.js --update-env`, then re-confirms the live process answers `/api/health` on the real port before declaring success.
- Prunes old releases, keeping the last 5 (by reverse-lexicographic sort of the `YYYYMMDDHHMMSS` folder names — doesn't depend on filesystem mtimes).

`rollback.sh` is the same pattern but skips build (reuses an already-built release directory), so it's fast (seconds).

**Conclusion: the deploy/rollback pipeline itself is well-engineered and was NOT the source of any problem encountered this session.**

---

## 4. CyberPanel / OpenLiteSpeed reverse proxy setup (what was actually done)

This server uses **CyberPanel with OpenLiteSpeed**, not the raw nginx `server { proxy_pass ... }` pattern the in-repo `nginx/ae.linknsmile.com.conf` template assumed. That template was effectively unused/superseded once this was discovered.

The correct mechanism is OpenLiteSpeed's own **vHost Conf**, edited via CyberPanel's dashboard (**Websites → List Websites → Manage → [domain] → vHost Conf**). India's existing, proven-working vhost conf was inspected first and used as the reference pattern:

```
context / {
  type                    proxy
  handler                 nextapp
  addDefaultCharset       off
}
extprocessor nextapp {
  type                    proxy
  address                 127.0.0.1:3004    # (3005 for AE)
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
```

This exact block (with port 3005) was added to `/usr/local/lsws/conf/vhosts/ae.linknsmile.com/vhost.conf` via CyberPanel's vHost Conf editor, inserted just before the existing `rewrite { }` block (after the auto-generated PHP `scripthandler`/`extprocessor`/`phpIniOverride` blocks, which were left untouched — harmless since the new `context /` proxy block takes precedence for all paths).

CyberPanel auto-triggers an OpenLiteSpeed config reload on save from its UI.

**Verification performed:**
- `systemctl status lsws` → `active (running)`, config accepted without error.
- `curl http://127.0.0.1:3005/...` → correctly showed `Connection refused` before any app was deployed (proxy config correct; nothing listening yet is the expected state at that point).

---

## 5. SSL — the actual saga (long, but fully resolved)

This was the single longest part of the session. Documenting fully because the root cause was genuinely non-obvious and the debugging path is useful context for future incidents on this box.

### 5.1 Initial state discovered
- `ae.linknsmile.com`'s vhost was auto-created by CyberPanel when the site was added, including a `vhssl` block pointing at `/etc/letsencrypt/live/ae.linknsmile.com/{privkey,fullchain}.pem`.
- Those files **existed on disk already** — but turned out to be a **self-signed placeholder** (issuer `C=US, O=Dis, L=Springfield` — the literal OpenSSL default template values — 10-year validity), not a real Let's Encrypt cert. CyberPanel appears to write this placeholder automatically at site-creation time before a real cert is issued.

### 5.2 Live incident (unrelated to AE specifically, but happened mid-session)
While debugging AE's SSL, a `systemctl restart lsws` was run (to test whether OpenLiteSpeed needed a full restart, not just reload, to pick up new SNI/SSL contexts for a new domain). This coincided with — and possibly triggered — OpenLiteSpeed's **AutoSSL** background job firing for multiple domains simultaneously (`mannequin.in`, `digimusicdistro.com`, `ae.linknsmile.com` all attempted reissuance in the same run). This caused **nginx** (which sits in front of OpenLiteSpeed on this box for TCP-level SNI passthrough on port 443, plus separate HTTP-level handling on port 80 for several domains — see §5.4) to exhaust its file-descriptor limit:
```
accept4() failed (24: Too many open files)
```
This caused **both India and UAE to become briefly unreachable** (timeouts on port 443 for both domains). **Diagnosed and fixed within minutes** by `systemctl restart nginx` (a lighter, more contained restart than restarting OpenLiteSpeed again). **India was confirmed fully restored and healthy** (`HTTP/2 200`, real page content) before continuing. No data loss, no lasting impact — but worth knowing this box's nginx has a moderate fd limit (`1024` soft, confirmed via `/proc/<pid>/limits`) that a burst of AutoSSL/reissuance activity across multiple domains at once can exhaust. **Follow-up recommended, not done this session:** raise `worker_rlimit_nofile` in `/etc/nginx/nginx.conf`.

### 5.3 Network topology discovered (relevant for any future infra work on this box)
This VPS runs **both OpenLiteSpeed and nginx** simultaneously, in a layered arrangement:
- **Port 443:** nginx does **TCP-level SNI passthrough** (`ngx_stream_ssl_preread`, config at `/etc/nginx/stream.d/sni-passthrough.conf`) — inspects the SNI hostname without decrypting, and routes to either a special backend (`backmovc.movementcreations.in` → `127.0.0.1:8443`) or, by default, straight to OpenLiteSpeed (`[::1]:443`). OpenLiteSpeed does the actual TLS termination and per-domain cert selection via its own `listener SSL { map domain domain ... }` blocks in `/usr/local/lsws/conf/httpd_config.conf`.
- **Port 80:** nginx handles this **directly** (not passthrough) via per-domain `server {}` blocks in `/etc/nginx/conf.d/*.conf` — each domain has its own file (`linknsmile.conf`, `movementcreations.conf`, `armorray.conf`, `backmovc-cors.conf`, and now `ae-linknsmile.conf`, added this session). The established pattern in every existing file: proxy `/.well-known/acme-challenge/` to OpenLiteSpeed's dedicated internal port `7080` (where OpenLiteSpeed itself serves ACME challenge files from `/usr/local/lsws/Example/html/.well-known/acme-challenge/`), and `301`-redirect everything else to HTTPS.
- OpenLiteSpeed's own AutoSSL feature (`autoSSL 1` in `httpd_config.conf`) is what actually requests/renews Let's Encrypt certs — **not certbot** (confirmed: `/etc/letsencrypt/renewal/` has no config for `linknsmile.com` at all, meaning certbot has never managed any cert on this box; OpenLiteSpeed's built-in ACME client does it all, writing output to the same `/etc/letsencrypt/live/<domain>/` paths for compatibility/convention only).

### 5.4 The actual root cause (found last)
**`ae.linknsmile.com` was simply missing its port-80 nginx server block entirely.** Every other domain on this box (`linknsmile.com`, `movementcreations.in`, etc.) had one; AE's was never created when the site was added via CyberPanel (CyberPanel's UI creates the *website* and the OpenLiteSpeed vhost, but does not appear to auto-create the corresponding nginx port-80 config that this box's particular layered setup separately requires — this is specific to this VPS's somewhat unusual dual nginx+OLS arrangement, not a general CyberPanel behavior).

Without this block, Let's Encrypt's HTTP-01 validator hit `http://ae.linknsmile.com/.well-known/acme-challenge/<token>` and got routed to nginx's undefined/default handling for that domain — producing a `502` (confirmed directly in OpenLiteSpeed's own AutoSSL error log: `"detail": "...: 502"`) or, in one attempt, an outright timeout (`"Timeout after connect (your server may be slow or overloaded)"` — likely transient, coinciding with the fd-exhaustion incident above).

**Verified as systemic, not AE-specific:** the same manual test (`curl http://linknsmile.com/.well-known/acme-challenge/<fake-file>`) showed **India's own ACME path was ALSO broken** in exactly the same way (redirecting to HTTPS instead of proxying to port 7080) — and the AutoSSL log showed `mannequin.in` and `digimusicdistro.com` failing identically in the same run, confirming this was a pre-existing, box-wide latent issue that simply hadn't surfaced because none of those domains needed cert reissuance recently. **Nothing done this session broke this — it predates the session.**

### 5.5 The fix
Created `/etc/nginx/conf.d/ae-linknsmile.conf`, following the exact pattern of the other domains:
```nginx
server {
    listen 80;
    server_name ae.linknsmile.com;

    location /.well-known/acme-challenge/ {
        proxy_pass http://127.0.0.1:7080;
        proxy_set_header Host $host;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```
(Note: had to be written via `printf` rather than a `cat << EOF` heredoc — the terminal/SSH client in use was silently inserting backslashes before semicolons on heredoc paste, which broke nginx's config parser twice before this was diagnosed. `printf '%s\n' 'line1' 'line2' ... > file` sidestepped it cleanly.)

`nginx -t` passed, `systemctl reload nginx` (graceful, not restart) applied it. Manually verified end-to-end with a literal test file dropped into the challenge directory and curled through the full chain before trusting it.

Then triggered a real reissuance via **CyberPanel → Websites → List Websites → [ae.linknsmile.com] → SSL (left sidebar within that site's manage view) → Issue SSL** button — this is the correct, non-deprecated per-site SSL page. (Note: CyberPanel also has a *different*, deprecated global page at `/manageSSL/sslForHostName` meant only for securing the CyberPanel admin panel's own hostname — this was hit by mistake twice during the session and is NOT the right tool for per-website certs; it also appears to have a broken backend causing a "Connection Error" — avoid it.)

**Result — confirmed via `openssl x509 -noout -issuer -dates`:**
```
issuer=C=US, O=Let's Encrypt, CN=YE2
notBefore=Aug 28 02:43:07 2026 GMT
notAfter=Nov 26 02:43:06 2026 GMT
```
Real, valid, ~90-day Let's Encrypt cert. **SSL is fully resolved.** `https://ae.linknsmile.com` now completes a real TLS handshake.

**Recommended follow-up (not done this session, low priority):** the same port-80 gap likely still needs a permanent fix check for any *future* new domains added to this box — worth documenting in CyberPanel setup runbook that a manual nginx conf.d file must be added for any new domain, since CyberPanel's UI doesn't do this automatically on this particular server.

---

## 6. UAE environment configuration (`shared/.env`)

`/home/ae.linknsmile.com/shared/.env` was built from `.env.ae.example`, filled in as follows. File permissions: `chmod 600` (root-only read/write), matching sensitive-secret hygiene.

| Variable | UAE value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `MONGODB_URI` | `mongodb+srv://uae_db_user:<real password>@cluster0.crwv2s7.mongodb.net/linknsmile_ae?appName=Cluster0` | Same Atlas cluster (`Cluster0`) as India, **separate database** (`linknsmile_ae` vs. India's `test`), **separate dedicated DB user** (`uae_db_user`, readWrite scoped only to `linknsmile_ae`) — chosen over a fully separate cluster as proportionate isolation for a "plumbing, not yet live" milestone. India's DB user is `work_db_user`. **See §7 — this URI, verified correct and working in isolation, is somehow NOT what the live app is actually using.** |
| `NEXTAUTH_SECRET` | fresh `openssl rand -hex 32` output | Different from India's. Generated and inserted directly on the server via `nano`, never pasted into chat (an earlier pair of openssl outputs WAS accidentally pasted into chat mid-session and had to be treated as burned/regenerated — see §9 lessons). |
| `NEXTAUTH_URL` | `https://ae.linknsmile.com` | |
| `GMAIL_EMAIL` | `ae.linknsmile@gmail.com` | Dedicated UAE Gmail account. |
| `GMAIL_APP_PASSWORD` | 16-char Google App Password | Requires 2FA enabled on that Gmail account; generated at myaccount.google.com/apppasswords. |
| `EMAIL_FROM` | `ae.linknsmile@gmail.com` | |
| `PAYMENT_GATEWAY` | `tap` | **Not** left commented/unset as originally planned — see decision note below. |
| `NEXT_PUBLIC_PAYMENT_GATEWAY` | `tap` | Client-side mirror, drives checkout UI branching. |
| `TAP_SECRET_KEY` | `PLACEHOLDER_NOT_A_REAL_KEY_DO_NOT_USE_LIVE` | **Deliberate placeholder.** See below. |
| `NEXT_PUBLIC_CURRENCY_CODE` | `AED` | |
| `NEXT_PUBLIC_LOCALE` | `en-AE` | Intl formatting locale (NOT translation language) — matches India's own pattern of using `en-IN` rather than a Hindi locale. Confirmed correct via `lib/currency.ts`/`lib/i18n-config.ts` header comments. |
| `NEXT_PUBLIC_SECONDARY_LOCALE` | `ar` | Enables Arabic as secondary UI language. **Only header/footer/homepage are actually translated so far (Phase 1 i18n, per repo comments) — everything else still renders hardcoded English regardless of this setting.** |
| `NEXT_PUBLIC_DEFAULT_COUNTRY` | `United Arab Emirates` | Checkout form default only (free-text field, not a validator). |
| `NEXT_PUBLIC_SITE_URL` | `https://ae.linknsmile.com` | |
| `NEXT_PUBLIC_IMAGE_HOSTNAMES` | `ae.linknsmile.com` | Must be set or defaults to India's domains — self-hosted (non-Cloudinary) images would 400 without this. |
| `CLOUDINARY_*` (4 vars) | left blank | Per template's own caveat: fine only if no vendor/admin will upload images on this deployment yet — **worth revisiting before any real vendor onboarding.** |
| `CRON_SECRET` | fresh `openssl rand -hex 32` output, different from India's and from `NEXTAUTH_SECRET` | India's real `CRON_SECRET` was accidentally exposed in this chat via a `crontab -l` paste mid-session — **India's CRON_SECRET should be rotated** (see §9, this is still an open action item, not yet done). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | left blank | Google sign-in disabled for UAE until set up. |
| `ADMIN_EMAIL` | left blank | Order-notification CC disabled. |
| `NEXT_PUBLIC_SENTRY_DSN` / `FB_PIXEL_ID` / `GTM_ID` / `GOOGLE_ADS_ID` / `GOOGLE_ADS_CONVERSION_LABEL` | all left blank | **Important:** per `lib/env.ts`, if left unset these ALL silently default to INDIA's live analytics IDs — meaning UAE traffic may currently be mixing into India's Sentry/Pixel/GTM/Ads data. Flagged as a recommended follow-up, not fixed this session. |

### Decision: `PAYMENT_GATEWAY=tap` with a placeholder key, NOT left unset
Original plan was to leave `PAYMENT_GATEWAY` commented out entirely (defaulting to Razorpay, per the `.env.ae.example` template's own comment). **This was checked against the actual `lib/env.ts` source and found to be a real blocker**: `validateEnv()` defaults `PAYMENT_GATEWAY` to `"razorpay"` when unset, which then requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` — none of which exist or are wanted for UAE. Leaving it unset would have made the app **fail to start entirely** (thrown error in `validateEnv()`, causing `deploy.sh`'s health check to fail and the deploy to safely abort). 

**Decision made and confirmed with the user:** set `PAYMENT_GATEWAY=tap` (the correct real value for UAE long-term) with an obvious, clearly-labeled placeholder `TAP_SECRET_KEY` for now, since a real Tap Payments account requires a GCC-region phone number the business doesn't have yet (tracked separately, per the user, likely in a `MULTI_COUNTRY_REQUIREMENTS.md` file in the repo — not verified to exist by this session, just referenced). This satisfies `validateEnv()`'s presence check (it only checks the var exists, not that it's a real working key) and lets the app boot correctly. **Checkout will fail at runtime if a real payment is attempted** — this is expected and intentional. **Action item for whoever picks this up:** get real Tap sandbox/live credentials once a GCC number is available, swap into `shared/.env`, `pm2 reload` (no rebuild needed for this specific var since it's not `NEXT_PUBLIC_`-prefixed... actually verify this, see the `env.ts` note that `NEXT_PUBLIC_PAYMENT_GATEWAY` IS public and drives UI branching, so a real gateway switch likely DOES need a rebuild to update client bundles, not just an env change + reload).

---

## 7. ⚠️ UNRESOLVED BUG — UAE app returns India's product data (session ended mid-investigation)

**This is the most important section for the next person/session to pick up.**

### Symptom
`https://ae.linknsmile.com` (and its `/api/products` endpoint specifically) returns a **real, live product** — `"Handmade Crochet Plant Hanger"`, `_id: 6a1a62afbc387b93856e7645` — that was confirmed to exist in **India's** `test` database. This happens consistently, on every request, across multiple full process restarts.

### What has been conclusively RULED OUT (do not re-check these — confirmed clean):
1. **`shared/.env`'s `MONGODB_URI` content is correct**: verified via direct `grep` (password confirmed correct by the user, not a placeholder/typo) — points at `cluster0.crwv2s7.mongodb.net/linknsmile_ae` with user `uae_db_user`.
2. **The `.env.local` symlink is correct and live**: `/home/ae.linknsmile.com/current/.env.local -> /home/ae.linknsmile.com/shared/.env`, confirmed via `ls -la`.
3. **`lib/db.ts`'s connection code is clean**: read in full — no hardcoded `dbName` override, no fallback URI, straightforwardly does `mongoose.connect(process.env.MONGODB_URI, opts)`.
4. **PM2 process freshness is not the cause**: fully `pm2 delete`'d and restarted fresh (`pm2 start ecosystem.config.js` with `PM2_APP_NAME=linknsmile-ae PM2_APP_ROOT=/home/ae.linknsmile.com PM2_PORT=3005 PM2_INSTANCES=2` explicitly exported) — brand new PIDs, 0 restarts, and the bug was **still present immediately** on the fresh process.
5. **Not Next.js static build caching**: checked `prerender-manifest.json` directly — `/api/products` does not appear in it. No static response body file exists alongside the compiled `route.js`.
6. **Not OpenLiteSpeed's page cache module**: `/usr/local/lsws/cachedata/ae.linknsmile.com/` only contained lock/shm files, no actual cached response bodies. (User declined to blanket-delete this directory when prompted — reasonably, since it wasn't shown to contain relevant cached content anyway.)
7. **Not a Mongoose connection/auth failure**: `pm2 logs` showed clean startup, `✓ Ready in 3.2s`, zero connection errors — only an unrelated harmless duplicate-schema-index warning (`idempotencyKey` index declared twice — a real but minor code cleanup item, unrelated to this bug).
8. **Not the compiled bundle having a different/hardcoded URI baked in**: `grep`'d the actual compiled `.next/server/app/api/products/route.js` for any `mongodb+srv` string or hardcoded db name — only the variable reference `MONGODB_URI` appears, no baked-in literal connection string.
9. **THE DEFINITIVE TEST — a standalone, from-scratch Node script**, run directly in `/home/ae.linknsmile.com/current` (so it resolves the same `node_modules/mongoose` the app itself uses), manually parsing `.env.local` and connecting:
   ```js
   const fs = require('fs');
   const envContent = fs.readFileSync('.env.local', 'utf8');
   const match = envContent.match(/^MONGODB_URI=(.+)$/m);
   const uri = match[1].trim();
   const mongoose = require('mongoose');
   mongoose.connect(uri).then(async () => {
     console.log('Connected to database:', mongoose.connection.db.databaseName);
     const count = await mongoose.connection.db.collection('products').countDocuments();
     console.log('Product count:', count);
     const found = await mongoose.connection.db.collection('products').findOne({ slug: 'handmade-crochet-plant-hanger' });
     console.log('Found the mystery product here?', !!found);
   });
   ```
   **Result:**
   ```
   Connected to database: linknsmile_ae
   Product count in this database: 0
   Found the mystery product here? false
   ```
   This is airtight: the real database is genuinely empty, and a from-scratch script using the exact same file/URI/library gets the correct answer. **The bug is not in the database, the URI, the credentials, or Mongoose itself.**

### What this narrows the bug down to
Something specific to **how the actual compiled/running Next.js server process handles this particular request** differs from a simple standalone script — despite using identical `lib/db.ts` source code (confirmed by direct file read) and identical env resolution. Candidate remaining theories, **not yet tested**, in rough order of likelihood:

- **A second, orphaned/leftover process** still running and actually answering on port 3005 (or something between OpenLiteSpeed and port 3005) instead of the freshly-started PM2 process — this was the very last theory being tested when the session ended, via:
  ```bash
  ss -tlnp | grep :3005     # cross-check reported PID against `pm2 list`'s PID
  pm2 flush linknsmile-ae && tail -f shared/logs/out.log & curl .../api/products ; # watch if the fresh process's log receives the request AT ALL
  ```
  **This is the single most important next step** — if the live log shows nothing during a real curl request, the request is being served by something other than this PM2 process entirely (a stray process from an earlier, buggy start; OpenLiteSpeed proxying to the wrong port somehow; or an entirely separate app/service squatting on 3005).
- **Node/V8 module-level caching quirk** inside the Next.js standalone/cluster bundle specific to the `global.mongoose` caching pattern in `lib/db.ts` (this pattern is designed for Next.js dev-mode hot-reload dedup, and while it *should* be harmless in production cluster mode since each PM2 worker is a separate OS process with its own `global`, this hasn't been ruled out with full certainty — worth instrumenting `lib/db.ts` temporarily to `console.log` the URI and resolved `databaseName` at the moment of connection, directly inside the real app, not a side-script).
- **A completely different `.env` file being read** that hasn't been found yet — e.g., if `next.config.mjs` or some middleware does its own separate `dotenv` load from a different/wrong path before `lib/db.ts` ever runs. Worth grepping the whole repo (not just `lib/`) for any other `.env` reads: `grep -rn "dotenv\|\.env\b" --include="*.ts" --include="*.mjs" --include="*.js" /home/ae.linknsmile.com/current --exclude-dir=node_modules`.
- **A reverse proxy or DNS-level issue causing `ae.linknsmile.com` traffic to actually route to India's port 3004 process**, despite our vhost `context /` config pointing at 3005 — this seems unlikely given the vhost conf was directly verified on disk, but has not been 100% eliminated with a byte-for-byte trace of an actual live request through OpenLiteSpeed's access log correlated to which upstream port it hit.

### Recommended immediate next steps for whoever picks this up
1. Run the `ss -tlnp | grep :3005` + live `tail -f` log-watch test described above — this was the very next planned step.
2. If that doesn't resolve it, temporarily add explicit `console.log(process.env.MONGODB_URI)` and `console.log(mongoose.connection.db?.databaseName)` directly inside `lib/db.ts`'s `connectDB()` function, redeploy (or just edit the file live in `current/` and `pm2 restart` — acceptable for a temporary diagnostic on a non-live-payments deployment), and watch `pm2 logs` during a real request to see exactly what the live app itself believes at the moment of connection.
3. Check for a possible **second product with the exact same fields** actually seeded into `linknsmile_ae` by an old/forgotten script (re-run the standalone diagnostic script but search more broadly — `find({})` the whole `products` collection, not just this one slug, in case there's stale seed data with a *different* `_id` that merely looks identical due to a shared seed source — though the countDocuments()===0 result makes this unlikely, it's cheap to double check).
4. Worth checking `lib/scripts/seed-products.ts` (seen to exist during this session, not read in full) — if this seed script was ever accidentally run against the wrong `MONGODB_URI` at some point, or if it has its own hardcoded fallback, that's a plausible explanation for how India-like data could appear to originate from "the AE side" even if the live `linknsmile_ae` database is currently empty — e.g., if some *other* process/cron/script is being asked to seed or proxy on demand. (Speculative — not confirmed, worth a quick read of that file.)

**Until this is resolved, do not treat `ae.linknsmile.com` as trustworthy for demos, testing, or anything data-related — it is unexpectedly serving India's real product content to any visitor, which is a real (if fortunately non-sensitive, publicly-visible-anyway) data hygiene issue.**

---

## 8. Current live status (as of session end)

| Component | Status |
|---|---|
| India (`linknsmile.com`) | ✅ Healthy, confirmed multiple times throughout session, untouched by any deliberate change |
| UAE folder structure | ✅ Done (`/home/ae.linknsmile.com/{releases,shared/logs}`) |
| UAE MongoDB (`linknsmile_ae` + `uae_db_user`) | ✅ Created, confirmed correct and connectable, confirmed genuinely empty |
| UAE `shared/.env` | ✅ Populated, `chmod 600`, all placeholders replaced (verified via `grep -c "REPLACE_"` returning 0) |
| UAE CyberPanel/OpenLiteSpeed reverse proxy | ✅ Done, verified in vhost.conf, OpenLiteSpeed healthy |
| UAE SSL | ✅ Real Let's Encrypt cert issued and verified (see §5) |
| UAE PM2 process | ✅ Running (`linknsmile-ae`, 2 cluster instances, port 3005, currently 0 restarts as of last check) |
| UAE first deploy | ✅ Happened (apparently automatically, ~15h before end of session — exact trigger not confirmed in this chat, likely a branch merge outside this conversation) |
| **UAE data correctness** | ❌ **BROKEN — see §7. Serving India's product data despite a provably-correct, empty, separate database.** |
| UAE cron jobs | ⏸ Deliberately not set up yet (per plan) |
| UAE real Tap Payments credentials | ⏸ Blocked on GCC phone number for account signup (business-side, tracked elsewhere) |
| UAE homepage marketing content (₹ symbols, India-flavored banner/tagline) | ⏸ Known, not yet localized — Phase 1 i18n only covers header/footer/homepage structure, not all copy/currency display in promotional content |
| UAE-dedicated analytics IDs (Sentry/Pixel/GTM/Ads) | ⏸ Left blank, currently silently defaulting to India's per `lib/env.ts` — recommended follow-up |

---

## 9. Lessons / process notes for future sessions on this project

- **Secrets exposed in this chat session that should be treated as compromised and rotated:**
  - India's real `CRON_SECRET` — appeared in a `crontab -l` output pasted into chat. **Not yet rotated as of session end — this is an open action item.**
  - Two `openssl rand -hex 32` outputs generated early in the session (intended for `NEXTAUTH_SECRET`/`CRON_SECRET`) were pasted into chat before being used — these specific values were discarded and fresh ones generated and used instead (confirmed not reused).
- **This VPS has a non-obvious dual nginx+OpenLiteSpeed architecture** (§5.3) — any future domain onboarding on this box needs an nginx `conf.d` file added manually for port-80 ACME handling; CyberPanel's UI does not appear to do this automatically here.
- **CyberPanel has a deprecated global "Manage SSL" page** (`/manageSSL/sslForHostName`) that looks similar to the correct per-site SSL page but is the wrong tool and appears broken (backend connection error). The correct page is under **List Websites → [site] → SSL** in that site's own left sidebar.
- **`systemctl restart lsws` affects India too** (shared OpenLiteSpeed instance) — treat as a production-impacting action, not a casual debug step. Prefer `reload` where possible; if a restart is truly needed, watch India immediately after.
- **Terminal/SSH client in this session had a semicolon-escaping quirk on heredoc paste** — if a `cat << EOF` produces mysteriously broken nginx/config syntax with backslashes appearing before semicolons, switch to `printf '%s\n' 'line1' 'line2' ... > file` instead.