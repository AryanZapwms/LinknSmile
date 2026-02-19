# Production File Serving Fix - README

## Problem Summary

When deploying Next.js to production on CyberPanel, images uploaded to the `/public` folder were not accessible and returned **404 errors**. This happened because:

1. Next.js in production mode doesn't serve files from `/public` that are added after the build
2. Uploaded files (like product images, blog images, etc.) were being saved to `/public/uploads`, `/public/arrivals`, etc., but couldn't be accessed via URLs
3. Files worked perfectly in local development but failed in production

## Solution Overview

We created a **universal API route handler** that dynamically serves files from all subdirectories in the `/public` folder, and configured URL rewrites to route requests through this handler.

---

## Files Changed

### 1. Created: `/app/api/[...path]/route.ts`

**Purpose:** This is a catch-all API route that dynamically reads and serves files from the `/public` folder.

**Location:** `app/api/[...path]/route.ts`

**What it does:**
- Catches ALL requests to `/api/*` 
- Decodes URL-encoded characters (handles spaces and special characters in filenames)
- Searches for the requested file in multiple `/public` subfolders:
  - `/public/uploads`
  - `/public/arrivals`
  - `/public/blogs`
  - `/public/carousel`
  - `/public/fonts`
  - `/public/shop-by-concern`
  - `/public` (root)
- Returns the file with proper Content-Type headers
- Returns 404 if file not found

**Key Features:**
```typescript
// Decodes URLs like "green%200.jpg" → "green 0.jpg"
const filePath = params.path.map(segment => decodeURIComponent(segment)).join('/');

// Checks multiple folders in order
const possiblePaths = [
  path.join(process.cwd(), 'public', 'uploads', filePath),
  path.join(process.cwd(), 'public', 'arrivals', filePath),
  // ... etc
];

// Returns proper MIME types
const contentTypes = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  // ... etc
};
```

---

### 2. Modified: `/next.config.mjs`

**Purpose:** Configure Next.js to rewrite public file requests to our API route handler.

**Changes Made:**

Added `async rewrites()` function with rules for each public subfolder:

```javascript
async rewrites() {
  return [
    {
      source: '/uploads/:path*',
      destination: '/api/uploads/:path*',
    },
    {
      source: '/arrivals/:path*',
      destination: '/api/arrivals/:path*',
    },
    {
      source: '/blogs/:path*',
      destination: '/api/blogs/:path*',
    },
    {
      source: '/carousel/:path*',
      destination: '/api/carousel/:path*',
    },
    {
      source: '/fonts/:path*',
      destination: '/api/fonts/:path*',
    },
    {
      source: '/shop-by-concern/:path*',
      destination: '/api/shop-by-concern/:path*',
    },
  ];
}
```

**What these rewrites do:**
- When a user requests `/arrivals/image.jpg`, Next.js internally rewrites it to `/api/arrivals/image.jpg`
- The `[...path]` route handler catches this request
- The handler searches for the file in `/public/arrivals/image.jpg`
- The file is served dynamically

**Other changes:**
- Added `domains` config for Next.js Image optimization:
  ```javascript
  images: {
    unoptimized: true,
    domains: ['instapeels.com', 'care.instapeels.com'],
  }
  ```

---

## How It Works

### Request Flow:

1. **User/App requests:** `https://instapeels.com/arrivals/1762922077120-image.jpg`

2. **Next.js rewrite rule triggers:**
   - Matches `/arrivals/:path*`
   - Internally rewrites to `/api/arrivals/1762922077120-image.jpg`

3. **API route handler (`[...path]/route.ts`) receives:**
   - `params.path = ['arrivals', '1762922077120-image.jpg']`

4. **Handler processes:**
   - Decodes the filename (handles spaces, special chars)
   - Checks if file exists in `/public/arrivals/1762922077120-image.jpg`
   - Reads the file from filesystem
   - Returns it with proper `Content-Type: image/jpeg` header

5. **Browser receives:** The image file with proper headers

---

## Deployment Steps

### On Production Server (CyberPanel):

```bash
# 1. Navigate to project directory
cd /home/instapeels.com/public_html

# 2. Create the API route folder
mkdir -p app/api/\[...path\]

# 3. Create the route handler file
nano app/api/\[...path\]/route.ts
# (Paste the route.ts code)

# 4. Update next.config.mjs
nano next.config.mjs
# (Add the rewrites configuration)

# 5. Rebuild the application
npm run build

# 6. Restart PM2
pm2 restart instapeels-next-app

# 7. Check logs for any errors
pm2 logs instapeels-next-app --lines 50
```

---

## Testing

### Verify files exist:
```bash
ls -la /home/instapeels.com/public_html/public/arrivals/
ls -la /home/instapeels.com/public_html/public/uploads/
```

### Test file access:
```bash
# Test via curl
curl -I https://instapeels.com/uploads/[filename].jpg
curl -I https://instapeels.com/arrivals/[filename].jpg

# Should return: HTTP/1.1 200 OK
```

### Check debug logs:
```bash
pm2 logs instapeels-next-app --lines 30
```

You should see output like:
```
========== FILE REQUEST DEBUG ==========
Requested file path: 1762922077120-image.jpg
Checking: /home/instapeels.com/public_html/public/uploads/1762922077120-image.jpg
Checking: /home/instapeels.com/public_html/public/arrivals/1762922077120-image.jpg
✓ Found file at: /home/instapeels.com/public_html/public/arrivals/1762922077120-image.jpg
========================================
```

---

## Important Notes

### 1. File Upload API
Make sure your upload API saves files to the correct location:
```typescript
const uploadsDir = path.join(process.cwd(), 'public', folder);
// Example: /home/instapeels.com/public_html/public/uploads/
```

### 2. File Permissions
Ensure proper permissions:
```bash
chmod 755 /home/instapeels.com/public_html/public/arrivals
chmod 644 /home/instapeels.com/public_html/public/arrivals/*
```

### 3. Adding New Folders
To add a new public subfolder:

1. Add the folder to `possiblePaths` in `/app/api/[...path]/route.ts`:
   ```typescript
   path.join(process.cwd(), 'public', 'new-folder', filePath),
   ```

2. Add rewrite rule in `next.config.mjs`:
   ```javascript
   {
     source: '/new-folder/:path*',
     destination: '/api/new-folder/:path*',
   }
   ```

3. Rebuild and restart

### 4. URL Encoding
The handler automatically handles URL-encoded filenames:
- `green%200.jpg` → `green 0.jpg`
- `my%20image.png` → `my image.png`

However, it's best practice to avoid spaces in filenames. Update your upload API:
```typescript
const filename = `${timestamp}-${random}-${file.name.replace(/\s+/g, '-')}`;
```

---

## Troubleshooting

### Images still showing 404:
1. Check file exists: `ls -la /home/instapeels.com/public_html/public/[folder]/`
2. Check PM2 logs: `pm2 logs instapeels-next-app`
3. Verify route file exists: `ls -la app/api/\[...path\]/route.ts`
4. Ensure rebuild completed: `npm run build`

### Build errors:
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### PM2 not restarting:
```bash
pm2 delete instapeels-next-app
pm2 start npm --name "instapeels-next-app" -- start
```

---

## Why This Was Needed

### Development vs Production Behavior:

**Development (`npm run dev`):**
- Next.js serves `/public` files directly
- New files are immediately accessible
- Hot reload handles file changes

**Production (`npm run build && npm start`):**
- Next.js pre-builds static files during build time
- Only files present during build are included in the static manifest
- Files added after build are not served automatically
- **Solution:** Dynamic API route serves files on-demand

---

## Summary

This fix enables dynamic file serving in production by:
1. ✅ Creating a universal API route handler (`[...path]/route.ts`)
2. ✅ Configuring URL rewrites in `next.config.mjs`
3. ✅ Handling URL encoding and multiple folder locations
4. ✅ Returning proper Content-Type headers

**Result:** All uploaded files in `/public` subfolders are now accessible in production! 🎉

---

## Maintained By
- **Date Fixed:** November 12, 2025
- **Issue:** Production 404 errors for uploaded images
- **Hosting:** CyberPanel VPS
- **Solution:** Dynamic file serving via API routes