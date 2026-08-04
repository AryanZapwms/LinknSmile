# Deployment (CI/CD)

> This replaces the old manual ZIP-upload process. That process deployed
> files directly into `/home/linknsmile.com`, which now needs to be a
> `current` **symlink**, not a real folder — don't follow any older
> instructions you may have for this app, they will break the new setup.

Automated, zero-downtime deploys to the production VPS via GitHub
Actions, using a releases + symlink pattern.

## How it works

```
/home/linknsmile.com/
├── current -> releases/20260804153000/     (symlink; this is what PM2 actually runs)
├── releases/
│   ├── 20260804120000/                     (kept for rollback)
│   ├── 20260804153000/                     (live)
│   └── ...                                  (last 5 kept, older ones pruned automatically)
└── shared/
    ├── .env                                 (persists across every release, never wiped)
    └── logs/                                 (PM2 logs + health-check logs, persists across releases)
```

1. Push to `main`.
2. The existing **CI** workflow (`.github/workflows/ci.yml`) runs lint/typecheck/build.
3. Only if CI succeeds, **Deploy** (`.github/workflows/deploy.yml`) SSHes into
   the VPS and runs `scripts/deploy/deploy.sh`, which:
   - clones the exact commit CI just validated into a new
     `releases/<timestamp>/` folder (the live release is never touched
     during this)
   - symlinks `shared/.env` and `shared/logs` into it
   - runs `npm ci && npm run build` inside that new folder
   - boots the new build on a temporary port (3999) and polls
     `/api/health` until it returns 200 — **if this fails, the deploy
     stops here and `current` is never touched**
   - only then atomically repoints `current` to the new release
   - runs `pm2 startOrReload ecosystem.config.js` — PM2 is configured in
     **cluster mode with 2 instances**, so `reload` restarts workers one
     at a time and there's always at least one serving traffic
   - re-checks `/api/health` on the real port to confirm the live process
     came back up correctly
   - deletes releases beyond the last 5

Deploys are serialized twice over: GitHub Actions won't run `Deploy` and
`Rollback` concurrently (same `concurrency` group in both workflow files),
and `scripts/deploy/deploy.sh` / `rollback.sh` additionally take a `flock`
on `/home/linknsmile.com/.deploy.lock` on the server itself.

## Rolling back

Actions tab → **Rollback** → **Run workflow**. Leave `target_release`
blank to go back to the release immediately before whatever's live, or
enter a specific `releases/` timestamp to jump to that one.

This does **not** check out any code or run a build — it re-validates the
target release's *existing* build with the same health check, then flips
the symlink and reloads PM2. Takes seconds.

## Checking what's currently live

```bash
ssh -p 55005 root@103.191.132.47
readlink -f /home/linknsmile.com/current
```

The output is the release timestamp currently serving traffic. Compare
against that release's own git history to see exactly which commit it is:

```bash
git -C /home/linknsmile.com/current log -1
```

## Reading health-check logs after a failed deploy

Every health check (deploy or rollback) writes its temporary instance's
full stdout/stderr to `shared/logs/`, and `deploy.sh`/`rollback.sh` also
print the last 50 lines directly in the GitHub Actions run log:

```bash
ls -lt /home/linknsmile.com/shared/logs/health-check-*.log | head
cat /home/linknsmile.com/shared/logs/health-check-<release>.log
```

Live PM2 logs (once a release is actually running) are at
`shared/logs/out.log` and `shared/logs/error.log`, or via
`pm2 logs linknsmile`.

If a deploy fails at the health-check step, **the live site is
unaffected** — `current` was never touched. If it somehow fails *after*
the symlink switch (the final "confirming the live process" step in
`deploy.sh`), run the Rollback workflow immediately.

---

## One-time initial server setup

Run this once before the first automated deploy. Everything after this
is handled by the `Deploy` workflow.

```bash
ssh -p 55005 root@103.191.132.47

# 1. Folder structure
mkdir -p /home/linknsmile.com/releases
mkdir -p /home/linknsmile.com/shared/logs

# 2. Persistent production env file — this is the ONLY place production
#    secrets live outside GitHub Secrets. It is never touched by any
#    deploy or rollback; each release just symlinks to it as .env.local.
nano /home/linknsmile.com/shared/.env
```

Populate `shared/.env` with the same keys currently in the app's
`.env.local` (see `.env.example` for the full list), with production
values — at minimum:

```
MONGODB_URI=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://linknsmile.com
NEXT_PUBLIC_SITE_URL=https://linknsmile.com
NODE_ENV=production
GMAIL_EMAIL=...
GMAIL_APP_PASSWORD=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_URL=...
MIGRATION_SECRET=...
CRON_SECRET=...
```

> Use **live** Razorpay keys here if this deploy is meant to take real
> payments — the `.env.local` used for local dev has test keys. This is
> also a good moment to set `CRON_SECRET` if it isn't set anywhere yet:
> without it, the `/api/cron/*` routes currently run with no auth check
> at all.

```bash
# 3. A dedicated SSH keypair for GitHub Actions (don't reuse your own).
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/gh_actions_deploy -N ""
cat ~/.ssh/gh_actions_deploy.pub >> ~/.ssh/authorized_keys

# Print the private key — you'll paste this into a GitHub Secret below,
# then you can clear it from your terminal history.
cat ~/.ssh/gh_actions_deploy
```

That's it — no manual `pm2 start`, no manual first build. The first push
to `main` (once the GitHub Secrets below are set) will clone, build,
health-check, and start PM2 for the first time automatically via
`pm2 startOrReload`.

## GitHub Secrets to add

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `SSH_HOST` | `103.191.132.47` |
| `SSH_USERNAME` | `root` |
| `SSH_PORT` | `55005` |
| `SSH_PRIVATE_KEY` | the private key printed by `cat ~/.ssh/gh_actions_deploy` above (the whole thing, including the `-----BEGIN...-----` / `-----END...-----` lines) |

These four are the **only** secrets the CI/CD pipeline itself needs —
they grant GitHub Actions SSH access to run the deploy/rollback scripts.
The application's own secrets (`MONGODB_URI`, Razorpay keys, etc.) live
only in `shared/.env` on the server and are never seen by GitHub Actions
during a deploy.

Separately, the existing `.github/workflows/ci.yml` already expects its
own copies of `MONGODB_URI`, `NEXTAUTH_SECRET`, etc. as GitHub Secrets —
those are unrelated to deploy, used only so the CI build step can compile
successfully in the ephemeral GitHub runner. Leave those as they are.

The server path (`/home/linknsmile.com`), Node bin path
(`/root/.nvm/versions/node/v20.20.2/bin`), and port (`3004`) are not
secrets — they're hardcoded in `.github/workflows/deploy.yml` and
`rollback.yml`. Change them there (via a normal PR) if the server layout
or Node version ever changes.

## Known tradeoffs / things to revisit later

- **Node version is hardcoded** to the nvm path for v20.20.2 in both
  workflow files. If you upgrade Node on the server, update
  `NODE_BIN_DIR` in both `deploy.yml` and `rollback.yml` in the same PR.
- **PM2 cluster mode, 2 instances**, chosen for genuine zero-downtime
  `reload` (a rolling restart with no dropped requests) rather than fork
  mode's brief restart gap. The VPS has 6 cores; 2 instances leaves
  headroom for anything else running on the box via CyberPanel. Bump
  `instances` in `ecosystem.config.js` if this app gets dedicated
  capacity later.
- Two small in-memory stores in the app code (`lib/rate-limit.ts`'s
  rate limiter, and the 2-minute product-list cache in
  `app/api/products/route.ts`) become per-worker instead of global under
  cluster mode. Not a correctness issue — worst case a rate limit or
  cache is very slightly less effective — but worth knowing if you ever
  see rate-limit behavior that seems looser than the configured limit.
- The repo is public, so the server clones over plain HTTPS with no
  credentials. If the repo ever goes private, the server will need its
  own deploy key (`ssh-keygen` on the VPS, add the public half as a
  read-only Deploy Key in GitHub repo settings, switch the clone URL in
  `deploy.yml` to the `git@github.com:...` SSH form) — that key lives
  only on the server, never as a GitHub secret.
