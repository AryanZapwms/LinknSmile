# UAE Data-Leak Bug — Investigation Report

**Bug:** `https://ae.linknsmile.com` (and its `/api/products` endpoint) serves India's real product data ("Handmade Crochet Plant Hanger", `_id: 6a1a62afbc387b93856e7645`) despite UAE's own database (`linknsmile_ae`) being genuinely, provably empty.

**Status: UNRESOLVED. New lead found (see §Latest Finding) — not yet chased down.**

---

## Confirmed facts (things we know for certain are NOT the cause)

| # | What was tested | Result | Conclusion |
|---|---|---|---|
| 1 | `shared/.env`'s `MONGODB_URI` content | Correct: right user (`uae_db_user`), right database (`linknsmile_ae`), password confirmed correct by user | Not a config typo |
| 2 | `.env.local` symlink | `current/.env.local -> shared/.env`, confirmed live via `ls -la` | Symlink correctly wired |
| 3 | `lib/db.ts` source code | Read in full — plain `mongoose.connect(process.env.MONGODB_URI)`, no hardcoded `dbName`, no fallback | App code is clean |
| 4 | Stale PM2 process | Fully `pm2 delete`'d and restarted fresh (`PM2_APP_NAME/PORT/ROOT/INSTANCES` explicitly exported) — brand new PIDs, 0 restarts | Bug persisted immediately on a 100% fresh process — not a stale-process issue |
| 5 | Next.js static build caching | `prerender-manifest.json` has zero entries for `api/products`; no frozen response body file next to compiled `route.js` | Not static-build caching |
| 6 | OpenLiteSpeed page cache module | `/usr/local/lsws/cachedata/ae.linknsmile.com/` only contains `.cacheman.lock`/`.cacheman.shm` (engine internals, not visible cached bodies) | Inconclusive by inspection — ruled out empirically instead (see #10) |
| 7 | Mongoose connection/auth errors | `pm2 logs` shows clean `✓ Ready in 3.2s` startup, zero connection errors (only unrelated harmless duplicate-index warning) | Not an auth/connection failure |
| 8 | Hardcoded URI in compiled bundle | `grep`'d `.next/server/app/api/products/route.js` for `mongodb+srv`/db names — only the variable reference `MONGODB_URI` appears | Nothing hardcoded in the build output |
| 9 | **Standalone Node script**, run inside `current/`, manually parsing `.env.local`, connecting via the app's own `node_modules/mongoose` | `Connected to database: linknsmile_ae` / `Product count: 0` / `Found the mystery product? false` | **Definitive: the database, credentials, and Mongoose layer are 100% correct** |
| 10 | Cache-bypass test: unique, never-seen-before URL (`&cachebust=<timestamp>`) through the public domain | Still returned India's product | **Definitive: rules out caching at every layer** — browser, CDN, Next.js, and OpenLiteSpeed's cache module all ruled out simultaneously |
| 11 | Direct request to `http://127.0.0.1:3005/api/products` (bypassing OpenLiteSpeed entirely) | Correctly returned `{"products":[],"pagination":{"total":0,...}}` | **Definitive: the AE Node app itself, on its own port, is 100% correct and healthy** |
| 12 | `ss -tlnp \| grep :3005` | Shows PM2 itself (`PM2 v7.0.1: God`, pid 1233) owns port 3005, matching `pm2 list`'s two `linknsmile-ae` workers (pid 174125, 174132) | No rogue/unexpected process squatting on the port |
| 13 | Full `systemctl restart lsws` (OpenLiteSpeed), with India-safety checks before/after | India confirmed healthy before and after (`HTTP/2 200` both times) | Restart completed safely, but **did not fix the AE bug** — rules out "stale in-memory routing table needs a real restart" theory |
| 14 | TLS/SNI certificate check via `curl --resolve` forcing a fresh handshake | Correct cert served: `subject: CN=ae.linknsmile.com`, `issuer: Let's Encrypt` | **Definitive: OpenLiteSpeed's TLS/vhost selection is correct** — not a certificate/SNI misrouting issue |
| 15 | Static file check in `public_html` | Only contains the default `index.html` from site creation; no `api` folder, no stray files anywhere | Not a static-file-shadowing-the-proxy issue |
| 16 | OpenLiteSpeed's own error/stderr logs during a live test request | Empty / only unrelated PHP admin-panel housekeeping entries (`AdminPHP`, `extappkill`) — nothing related to this vhost or request | No errors are being logged; OpenLiteSpeed considers the proxy to have succeeded cleanly, which is consistent with a wrong **destination or headers**, not a failure |

---

## Latest finding — NOT yet chased down, most promising lead

**Direct header-by-header comparison of the same endpoint, public vs. direct-to-port:**

**Via public domain (`https://ae.linknsmile.com/api/products`):**
```
access-control-allow-origin: https://linknsmile.com    ← WRONG, should be ae.linknsmile.com
server: LiteSpeed
x-powered-by: CyberPanel-OLS/2.4.4
```

**Direct to port 3005 (`http://127.0.0.1:3005/api/products`):**
```
Access-Control-Allow-Origin: https://ae.linknsmile.com  ← CORRECT
```
(Body also correctly empty on this direct request, per #11 above.)

**Why this matters:** the `Access-Control-Allow-Origin` header is almost certainly computed by the **Next.js app itself** (based on the incoming request's `Host` header, or some site-config/domain-detection logic), not something OpenLiteSpeed would rewrite. The fact that it differs between these two otherwise-identical requests strongly suggests:

> **OpenLiteSpeed's `extprocessor`/proxy configuration for the AE vhost is not forwarding the original `Host` header (or is forwarding the wrong one) to the Next.js app.**

Recall the current proxy config (`vhost.conf`):
```
context / {
  type                    proxy
  handler                 nextapp
  addDefaultCharset       off
}
extprocessor nextapp {
  type                    proxy
  address                 127.0.0.1:3005
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
```
**There is no explicit header-forwarding directive here at all** — no `Host` header rewrite rule, nothing. If OpenLiteSpeed's default proxy behavior for this config doesn't pass through the original `Host: ae.linknsmile.com` header correctly (e.g., defaults to passing its own internal address, or passes nothing usable), the Next.js app receiving the request would have no reliable way to know it's supposed to be serving the AE site — and if there's ANY domain-based logic anywhere in the app (multi-country routing, middleware, a cached/default site-config lookup keyed by host), it could very plausibly fall back to a default that happens to be India.

This is the single most concrete, evidence-backed lead found so far — everything else has been individually ruled out, but this one is a genuine, observed discrepancy that hasn't been explained away.

---

## Recommended next steps (in order)

1. **Check exactly what `Host` header the Next.js app actually receives** when hit through the public domain vs. directly. Easiest way: temporarily add a debug log line at the very top of the `/api/products` route handler (or in middleware if one exists) printing `request.headers.get('host')`, redeploy/restart, hit both URLs, and diff the two logged values.
2. **In parallel/instead, fix the proxy config to explicitly forward the Host header**, which is standard practice for exactly this class of bug. OpenLiteSpeed's proxy `extprocessor` block may need an explicit header directive, e.g. adding a `reqHeader` or a rewrite rule that preserves `Host`, or alternatively adding a `context` block with the correct directive. **This needs to be looked up in OpenLiteSpeed's actual documentation for the `proxy` extprocessor type** — reverse-proxy header forwarding is not something we've configured yet in this project (India's config, checked earlier, has the exact same minimal block, so if this is the bug, it's a latent problem for India too, just invisible because India's app never had reason to behave differently based on Host).
3. **Search the app codebase for any domain/host-based logic** — grep for `headers().get('host')`, `NEXTAUTH_URL`, or any "which country/site am I" detection logic. If such logic exists and has a fallback/default, that default is very likely resolving to India. This is a code-level thing the next session (with full app context) is much better positioned to find than infra-side debugging.
4. Once the actual mechanism is confirmed (missing Host header, or app-side fallback logic, or both), the fix will be either an OpenLiteSpeed proxy config change, an app code change, or both — re-verify with the exact same test used throughout this investigation (`curl https://ae.linknsmile.com/api/products?featured=true` should return `{"products":[],...}`).

## Important reminder for whoever continues this

Every `systemctl restart lsws` is production-impacting for India (shared OpenLiteSpeed instance). Always re-check India (`curl -sI https://linknsmile.com`) immediately before and after any further OpenLiteSpeed-level changes. This was done safely multiple times in this investigation (see §Round 2 below) — India confirmed healthy every single time.

---

## Round 2 of investigation — chasing the CORS-header lead, and a definitive breakthrough

This section picks up after the report above was first written, continuing to chase the `Access-Control-Allow-Origin` discrepancy found earlier.

| # | What was tested | Result | Conclusion |
|---|---|---|---|
| 17 | Forced the exact `Host: ae.linknsmile.com` header on a **direct-to-port-3005** request (`curl -H "Host: ae.linknsmile.com" http://127.0.0.1:3005/api/products`) | Still correctly returned empty `{"products":[],...}` | **Rules out the "app is confused by the Host header" theory entirely.** The app doesn't use Host to decide anything — it's Host-agnostic and always queries the correct DB. This means the earlier CORS header discrepancy is a *symptom* of something else, not a root cause in the app itself. |
| 18 | Connection-tracking test: snapshot `ss -tnp \| grep 3005` immediately before and after a real public request, `diff`'d | **Zero difference** — no new (or reused, per further reasoning) connection activity to port 3005 was observed during a public request that returned real data | First hint that the public request may not be reaching port 3005 via the proxy at all |
| 19 | **Decisive test #1:** Temporarily repointed the AE vhost's proxy `address` from `127.0.0.1:3005` to a dead port (`127.0.0.1:9999`) in `vhost.conf`, then `systemctl reload lsws`, then hit the public URL | **Still returned `200` with the correct (wrong/India) data** — did NOT fail or 502 | **This is the single most important finding of the whole investigation: the public site's behavior is completely unaffected by changes to this vhost's proxy configuration.** Reverted immediately after (confirmed back to normal `200` baseline). |
| 20 | Re-ran the same dead-port test, this time with a full `systemctl restart lsws` (not just reload), to rule out "reload doesn't apply for new vhosts" theory | **Still returned `200`** even after a genuine full restart | Rules out reload-vs-restart entirely as an explanation. Reverted immediately after; India re-confirmed healthy before and after this restart. |
| 21 | Checked `httpd_config.conf`'s `virtualHost ae.linknsmile.com { configFile ... }` block to confirm OpenLiteSpeed is even pointed at the vhost.conf file we've been editing | Confirmed: `configFile $SERVER_ROOT/conf/vhosts/$VH_NAME/vhost.conf` — resolves to exactly the file being edited | Rules out "editing the wrong file" |
| 22 | Checked for a duplicate `virtualHost ae.linknsmile.com` block anywhere else in `httpd_config.conf` | Only one definition exists (line 348) | Rules out a duplicate/conflicting vhost definition |
| 23 | Confirmed only one OpenLiteSpeed instance/process tree is running on the whole machine (`ps aux`, `pgrep -fa litespeed`) | Single main process (PID 814814) + 6 workers, uptime 2+ days, unchanged by today's reload/restart attempts | Rules out a second/rogue OpenLiteSpeed instance |
| 24 | Checked `vhost.conf`'s actual on-disk modification timestamp after our edits | `Modify` timestamp matched exactly when the `sed` edits were made | Confirms our edits genuinely wrote to disk — not a permissions/write-failure issue |
| 25 | Compared both SSL listener blocks in `httpd_config.conf` (`listener SSL { address *:443 }` for IPv4, and `listener SSL IPv6 { address [ANY]:443 }`) — theory: nginx's stream passthrough forwards to `[::1]:443` specifically, which might use a *different* domain-to-vhost mapping than the IPv4 listener | **Both listeners have identical `map ae.linknsmile.com ae.linknsmile.com` entries** | Rules out an IPv4/IPv6 listener mapping mismatch |
| 26 | Checked DNS for multiple A records / any load-balancing (`dig +short ae.linknsmile.com A` / `linknsmile.com A`) | Both resolve to the single IP `103.191.132.47`, no ambiguity | Rules out DNS/multi-server confusion |
| 27 | Checked nginx's full config for any AE-specific rule beyond the one file we created ourselves (`grep -rn "ae.linknsmile" /etc/nginx/`) | Only our own `/etc/nginx/conf.d/ae-linknsmile.conf` (the port-80 ACME/redirect file) appears — no hidden stream-level or other rule | Rules out a hidden nginx-level redirect specific to this domain |
| 28 | Checked CyberPanel's own internal database (`cyberpanel` MySQL DB, `websiteFunctions_websites` table) for a possible duplicate/ghost site record for `ae.linknsmile.com` | Exactly one clean row each for `linknsmile.com` (id 16, externalApp `linkn1054`) and `ae.linknsmile.com` (id 18, externalApp `aelin8858`) — correctly separated system users, no anomalies in any field | Rules out a CyberPanel-database-level duplicate/misconfiguration |

### Where this leaves us

**Every individually-checkable layer of the stack has been proven correct**, and — critically — **a deliberate, verified-on-disk change to the proxy destination port, combined with both a graceful reload AND a full service restart, produced zero observable change in the live public response.** This is a very unusual result: it means the file we have full, confirmed read/write access to, which OpenLiteSpeed's own top-level config explicitly says it uses for this domain, does not appear to actually govern what gets served to the public.

No further individual config check has turned up an explanation. Every plausible "hidden second config/duplicate/wrong layer" theory (duplicate vhost block, duplicate CyberPanel DB record, IPv4/IPv6 listener mismatch, hidden nginx rule, multiple OpenLiteSpeed instances, DNS pointing elsewhere) has been directly tested and ruled out.

### Round 3 — triple-confirming the nginx SNI-passthrough layer (the one layer not yet directly inspected in Round 1/2)

A fresh theory was raised: this box's nginx does raw TCP-level SNI passthrough on port 443 *before* OpenLiteSpeed ever sees a request — this layer had been read once early in the session but not re-verified with the same rigor as everything else. Re-checked via three independent methods:

| # | Method | Result |
|---|---|---|
| 29 | Direct file read: `cat /etc/nginx/stream.d/sni-passthrough.conf` | `ae.linknsmile.com` is not explicitly listed; falls into the `map`'s `default` bucket → `litespeed_backend` → `[::1]:443`, same as India and every other domain except `backmovc.movementcreations.in` (which has its own explicit rule to a different backend, `127.0.0.1:8443`). |
| 30 | Fully-resolved config dump: `nginx -T \| grep -A 30 "^stream {"` | Confirms the `stream {}` block is just `include /etc/nginx/stream.d/*.conf;` — no inline overrides, no second stream block anywhere else in nginx's full resolved config. |
| 31 | Directory listing: `ls -la /etc/nginx/stream.d/` | Only one file exists (`sni-passthrough.conf`) — no second/hidden `.conf` file being silently included by the wildcard. |

**Conclusion: this layer is now confirmed clean via three independent methods. It is not where the bug lives.**

---

## Full status: every layer individually checked and confirmed correct, one option remains

At this point, literally every distinct layer of the request path has been checked, several via multiple independent methods, and all are individually correct:

- ✅ DNS (single IP, both domains, no ambiguity)
- ✅ nginx port-80 handling (ACME challenge routing works, ✅ real SSL cert issued and verified as a direct result)
- ✅ nginx port-443 SNI passthrough (triple-confirmed clean in Round 3)
- ✅ OpenLiteSpeed IPv4 SSL listener domain mapping
- ✅ OpenLiteSpeed IPv6 SSL listener domain mapping (identical to IPv4)
- ✅ OpenLiteSpeed vhost.conf file (confirmed to be the loaded file; confirmed edits persist to disk; **a deliberate dead-port change survived both a graceful reload AND a full service restart with zero effect on live behavior** — this is the single strangest, most important finding of the whole investigation)
- ✅ CyberPanel's own internal database record (`websiteFunctions_websites` table) — exactly one clean row per domain, no duplicates, no cross-contaminated fields
- ✅ The Next.js app itself, hit directly on its own port — correctly returns empty data every time, including when the exact public `Host` header is forced
- ✅ The MongoDB database (`linknsmile_ae`) — independently proven empty via a standalone script bypassing the whole app
- ✅ Only one OpenLiteSpeed process/instance exists on the whole machine

**No individual config file, mapping, or process has been found to be wrong.** Yet the public URL provably serves India's data, and changing the one config file that's supposed to control this has zero observable effect.

**The only remaining, untried option on the table: delete and recreate the `ae.linknsmile.com` website registration in CyberPanel from scratch.** This is a structural reset rather than a targeted fix — the reasoning is that some undiscovered stale/corrupted state must exist somewhere in this specific site's registration that isn't visible through any of the config files or database tables inspected so far, and rebuilding the registration is the only way to clear it without knowing exactly what "it" is.

**Preparation already done, nothing destructive yet:**
- Backed up `shared/.env` → `/root/ae-env-backup-<date>.env`
- Backed up the working `vhost.conf` → `/root/ae-vhost-backup-<date>.conf`
- About to reconfirm India is healthy immediately before proceeding

**Would be redone (quick, already know how):** CyberPanel website registration, OpenLiteSpeed vhost proxy config, SSL issuance.
**Would NOT be touched:** DNS, MongoDB, `shared/.env`, the deployed app code, the PM2 process, India entirely.

---

## Round 4 — testing a specific, well-reasoned alternate theory: a hidden rewrite rule

A second reviewer raised a genuinely good point: the `rewrite {}` block in `vhost.conf` had only ever been *assumed* harmless (per the original setup notes: "left untouched — harmless since the new context / proxy block takes precedence") — never actually verified. Given that changing the proxy destination had zero effect even after a full restart, an untested rewrite rule silently redirecting requests elsewhere before `context /` is ever evaluated would explain that exact symptom perfectly.

**Tested directly and definitively ruled out:**

| # | What was checked | Result |
|---|---|---|
| 32 | Full, unfiltered `cat -A` of the entire `vhost.conf` (not grepped snippets — every line, in order, with hidden characters visible) | `rewrite {}` contains **only** `enable 1` and `autoLoadHtaccess 1` — no inline `RewriteRule`/`RewriteCond` directives of any kind. Only one `context` block matches `/` (the proxy one); the second `context` block only matches the narrow `/.well-known/acme-challenge` path and can't interfere. Block ordering is clean, sequential, no duplicates, no truncation. |
| 33 | Checked whether `autoLoadHtaccess 1` could be loading a `.htaccess` file from the docroot that supplies the missing rewrite logic | `find /home/ae.linknsmile.com/public_html -name ".*" -type f` → **no dotfiles of any kind exist** in `public_html`, only the plain `index.html` already known about. Nothing for `autoLoadHtaccess` to load. |

**Conclusion: the rewrite-block theory is now definitively ruled out** — not just assumed harmless as it was originally, but actually verified byte-for-byte. This was a well-reasoned lead worth testing properly, and it tightens the mystery further: **every single line of the vhost.conf file has now been read and accounted for**, and none of it explains why changing the proxy's destination port had zero effect on live behavior even after a full restart.

This further supports the theory that the explanation lies outside this file entirely — either at the application/build level (as flagged as a possibility in Round 3's closing question) or in some part of the request path not yet identified.

Everything above has been checked as rigorously as we know how, from the infra side, with no root cause found. **Before taking the irreversible step of deleting and recreating the CyberPanel website entry, we want a second opinion: does this reasoning hold up, or is there a check we're missing — especially anything at the application/code level (middleware, domain-based routing logic, a build-time constant, a reverse-proxy trust setting in Next.js itself, etc.) that wouldn't be visible from the infrastructure side alone?**

One thing in particular worth a second set of eyes: is it possible this is not an infrastructure bug at all, but an **application-level one** — e.g., Next.js's `trustHostHeader`/`X-Forwarded-Host` handling, a CDN-image-optimization cache keyed oddly, or some multi-tenant "which site am I" logic in the codebase that resolves based on something other than a live Host header (a build-time env var baked into a shared bundle, perhaps) — since everything on the infra side has now been so thoroughly eliminated that a code-level explanation is starting to look more likely than a config-level one.

---

## Round 5 — Test B (loopback bypass) and the final decisive check

A third reviewer flagged that two prior suggested tests (checking the corrected access log, and forcing the connection through `127.0.0.1` specifically rather than the public IP) had not actually been run yet. The access-log test had, in fact, already been done earlier (Round 2, #18 area) with a clear result — the request does land in AE's own access log correctly. The loopback test was genuinely new.

| # | What was tested | Result | Conclusion |
|---|---|---|---|
| 34 | `curl --resolve ae.linknsmile.com:443:127.0.0.1 https://ae.linknsmile.com/api/products` — forces the connection to stay entirely on this VPS (loopback), ruling out any possibility of an external CDN/WAF/upstream proxy intercepting the request before it reaches this server at all | **Still returned India's full 69-product catalog** | **Definitive: rules out any external-to-this-VPS explanation.** The bug is 100% inside this server's own chain (nginx → OpenLiteSpeed → vhost → proxy → app). This directly motivated the specific check that finally found the root cause. |
| 35 | Checked whether **India's own `vhost.conf`** defines an extprocessor with the same name as AE's (`nextapp`) — a theory based on the idea that OpenLiteSpeed might scope extprocessor names **server-wide** rather than per-vhost | `grep -B 2 "extprocessor" /usr/local/lsws/conf/vhosts/linknsmile.com/vhost.conf` → **confirmed: India's vhost.conf also defines `extprocessor nextapp {...}`** | **ROOT CAUSE FOUND.** |

---

## ✅ RESOLVED — Root cause found and fixed

### The actual root cause
**OpenLiteSpeed's `extprocessor` names are scoped server-wide, not per-vhost.** Both `linknsmile.com`'s and `ae.linknsmile.com`'s `vhost.conf` files independently defined a proxy handler named `extprocessor nextapp { ... }` (AE's config was originally built by closely mirroring India's proven-working pattern, which is exactly how this collision got introduced). Because the name `nextapp` was not unique across the server, OpenLiteSpeed silently resolved AE's `context / { handler nextapp }` reference to **India's** extprocessor definition (`address 127.0.0.1:3004`) instead of AE's own (`address 127.0.0.1:3005`) — regardless of what AE's own `vhost.conf` said, and regardless of restarts, because the collision lived in how OpenLiteSpeed indexes extprocessor names globally, not in anything a per-vhost config edit alone could touch.

### Why this explains every single test result from the entire investigation
- **Editing AE's proxy `address`, even with a full restart and a verified-fresh PID, had zero effect** — because the live `nextapp` OpenLiteSpeed actually dispatched to was never AE's definition in the first place.
- **AE's own access log correctly showed the request landing there** — vhost/domain/SSL matching (`context` and `listener` resolution) was always correct; only the *extprocessor name lookup* was wrong.
- **Direct requests to `127.0.0.1:3005`** always correctly returned empty AE data — because that bypasses named-extprocessor resolution entirely and talks to the actual UAE app process directly.
- **The loopback test (`--resolve ...:127.0.0.1`) still showed India's data**, conclusively ruling out any external CDN/WAF theory and correctly pointing the investigation back inside this server, which is what led to checking India's own vhost.conf for a naming collision.
- **CyberPanel's own database, DNS, nginx's SNI passthrough, the `rewrite{}` block, the app code, and the MongoDB database were all correctly ruled out** — none of those layers are involved in extprocessor name resolution, so they could never have revealed this regardless of how thoroughly they were checked.

### The fix
Renamed AE's extprocessor to a server-wide-unique name and updated its `context /` handler reference to match:
```
context / {
  type                    proxy
  handler                 nextapp_ae      # was: nextapp
  addDefaultCharset       off
}
extprocessor nextapp_ae {                 # was: extprocessor nextapp
  type                    proxy
  address                 127.0.0.1:3005
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
```
Applied via `sed`, verified the resulting block looked correct, then `systemctl restart lsws` (India confirmed healthy immediately before and after).

**Verified fixed:** `curl https://ae.linknsmile.com/api/products?featured=true` now correctly returns `{"products":[],"pagination":{"total":0,"page":1,"limit":12,"pages":0}}` — AE's genuinely empty database, through the real public domain, for the first time all session.

### Follow-up recommended (not yet done)
- **India's own extprocessor should probably also be renamed** to something explicit like `nextapp_india` for symmetry/clarity, even though it's not strictly required for correctness now — leaving it as the generic `nextapp` name means any *future* third country deployment that copies this same vhost.conf pattern without knowing about this incident would silently reintroduce the exact same bug. Worth fixing proactively and documenting this naming requirement in `PROJECT_SOURCE_OF_TRUTH.md` §11 for any future country rollout.
- Verify the site renders correctly end-to-end in a real browser (not just the API endpoint) — check the homepage now shows genuinely empty/appropriate empty-state UI rather than product data, and that checkout/vendor pages behave correctly against the empty database.
- All previously-identified, still-open follow-ups remain open: rotate India's `CRON_SECRET` (exposed earlier in this investigation via a `crontab -l` paste), raise nginx's `worker_rlimit_nofile`, set up UAE-dedicated analytics IDs, get real Tap Payments credentials once a GCC phone number is available, and fix the harmless duplicate `idempotencyKey` Mongoose index warning.