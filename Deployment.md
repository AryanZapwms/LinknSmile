# 🚀 CyberPanel VPS Deployment Guide
### Next.js App (LinkNSmile) — linknsmile.com

---

## 📦 STEP 1 — Prepare ZIP on Local Machine

### Files to INCLUDE in ZIP
```
app/
components/
hooks/
lib/
public/
styles/
types/
package.json
package-lock.json
next.config.mjs
tsconfig.json
postcss.config.mjs
components.json
```

### Files to EXCLUDE from ZIP
```
❌ node_modules/       → reinstalled on server
❌ .next/              → rebuilt on server
❌ .env.local          → already on server (has secrets!)
❌ *.txt / *.md / *.docx  → docs only
❌ tsconfig.tsbuildinfo   → auto-generated
❌ .expo/              → wrong framework
❌ Dockerfile          → not needed for CyberPanel
❌ *.zip               → never zip inside zip
```

---

## 🔑 STEP 2 — Keep .env.local Safe on Server

> ⚠️ NEVER delete `.env.local` from the server.
> It contains your DB, API keys, NextAuth secret, Razorpay, Cloudinary, etc.

If you ever need to update it, edit it directly via SSH:
```bash
nano /home/linknsmile.com/.env.local
```
Press `Ctrl+X` → `Y` → `Enter` to save.

---

## 🗑️ STEP 3 — Clean Old Files on Server (via PuTTY)

```bash
# Navigate to site folder
cd /home/linknsmile.com

# Delete old build, modules, logs
rm -rf .next node_modules logs

# Verify only public_html and .env.local remain
ls -la
```

---

## 📤 STEP 4 — Upload & Extract ZIP

1. Open CyberPanel → **File Manager** → navigate to `/home/linknsmile.com/`
2. Click **Upload** → select your ZIP
3. Once uploaded, select the ZIP → click **Extract**
4. Verify files are there:
```bash
ls -la /home/linknsmile.com
```
You should see: `app/`, `components/`, `lib/`, `package.json`, `.env.local`, etc.

---

## ⚙️ STEP 5 — Install, Build & Start (via PuTTY)

```bash
cd /home/linknsmile.com

# Install dependencies (takes 1-3 mins)
npm install

# Build the app (takes 3-5 mins)
npm run build

# Kill anything using port 3004 (just in case)
fuser -k 3004/tcp

# Delete old PM2 instance and start fresh
pm2 delete linknsmile
pm2 start npm --name "linknsmile" -- start

# Save PM2 so it auto-restarts on server reboot
pm2 save
pm2 startup
```

---

## ✅ STEP 6 — Verify It's Running

```bash
# Check PM2 status (should show "online")
pm2 status

# Check live logs (should show "✓ Ready in Xms")
pm2 logs linknsmile --lines 30

# Confirm port 3004 is in use
lsof -i :3004
```

**Expected output in logs:**
```
✓ Starting...
✓ Ready in ~1000ms
```

---

## 🔧 USEFUL COMMANDS (Day-to-Day)

### PM2 Commands
```bash
pm2 status                          # Check all running apps
pm2 logs linknsmile --lines 30      # View recent logs
pm2 restart linknsmile              # Restart the app
pm2 stop linknsmile                 # Stop the app
pm2 delete linknsmile               # Remove from PM2
pm2 monit                           # Live CPU/RAM monitor
```

### Port Commands
```bash
lsof -i :3004                       # Check what's using port 3004
fuser -k 3004/tcp                   # Force kill port 3004
```

### File & Folder Commands
```bash
ls -la                              # List all files with details
rm -rf folder_name                  # Delete a folder
cd /home/linknsmile.com             # Navigate to site folder
nano .env.local                     # Edit env file
cat .env.local                      # View env file
```

### Disk & Server Health
```bash
df -h                               # Disk usage
free -m                             # RAM usage
top                                 # Live CPU/RAM (press Q to exit)
```

---

## 🔁 QUICK RE-DEPLOY CHECKLIST

Every time you update code, just do this:

```bash
# 1. Delete old node_modules and build
cd /home/linknsmile.com
rm -rf .next node_modules

# 2. Upload new ZIP via CyberPanel File Manager & Extract

# 3. Reinstall and rebuild
npm install
npm run build

# 4. Kill port and restart app
fuser -k 3004/tcp
pm2 restart linknsmile

# 5. Check logs
pm2 logs linknsmile --lines 20
```

---

## ❗ COMMON ERRORS & FIXES

| Error | Fix |
|---|---|
| `EADDRINUSE: port 3004 already in use` | Run `fuser -k 3004/tcp` then restart PM2 |
| `PM2 out-of-date` warning | Run `pm2 update` |
| App shows `online` but site not loading | Run `pm2 logs linknsmile` to check actual error |
| `File ecosystem.config.js not found` | Don't use `pm2 start` alone, use full command |
| Build fails with import errors | Check the error file path and fix the import locally, re-zip, re-deploy |
| Site loads but API broken | Check `.env.local` has correct `NEXTAUTH_URL` and DB URI |

---

## 📁 SERVER FOLDER STRUCTURE (Expected)

```
/home/linknsmile.com/
├── .env.local          ← 🔑 NEVER DELETE
├── .next/              ← auto-generated after build
├── app/
├── components/
├── hooks/
├── lib/
├── node_modules/       ← auto-generated after npm install
├── public/
├── public_html/        ← CyberPanel default (keep it)
├── styles/
├── types/
├── next.config.mjs
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
└── components.json
```

---

> 💡 **Tip:** Always check `pm2 logs` first when something goes wrong — it tells you exactly what the error is.

> 💡 **Tip:** Never include `node_modules` or `.next` in your ZIP — they are large, slow to upload, and always rebuilt fresh on the server anyway.