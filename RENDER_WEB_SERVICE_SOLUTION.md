# Render Frontend Deployment - Web Service Solution

## Problem

The static site service on Render was serving CSS/JS files with incorrect MIME types:
- ❌ CSS served as `text/plain` instead of `text/css`
- ❌ JavaScript served as `text/plain` instead of `application/javascript`
- ❌ Browser refused to load due to strict MIME type checking
- ❌ 404 errors on static assets

## Root Cause

Render's static site hosting service (`type: static`) doesn't properly support custom headers for MIME types. The `headers` configuration approach doesn't work for static sites.

## Solution

**Convert frontend from Static Service to Web Service** running Node.js with Express.

### What's New

#### 1. Express Server (`client/server.js`)
- Serves the React build directory with Express
- **Explicitly sets MIME types** for all file types
- Implements proper caching headers:
  - Static assets: `max-age=31536000, immutable` (1 year)
  - index.html: `max-age=0, must-revalidate` (no cache)
- Compression middleware for faster delivery
- SPA routing: all non-file routes serve `index.html`

#### 2. Updated `client/package.json`
```json
"dependencies": {
  "compression": "^1.7.4",  // ← NEW: For response compression
  ...
}
"scripts": {
  "start": "react-scripts start",      // Dev mode (unchanged)
  "server": "node server.js",          // ← NEW: Production server
  "build": "react-scripts build",      // Build (unchanged)
  "build:start": "npm run build && npm run server",  // ← NEW: Combined
  ...
}
```

#### 3. Updated `render.yaml`
```yaml
- type: web                             # Changed from: static
  name: wlm-client
  env: node                             # Changed from: static
  rootDir: client
  buildCommand: npm ci && npm run build  # Build React app
  startCommand: npm run server          # ← NEW: Start Express server
  envVars:
    - key: NODE_ENV
      value: production
    - key: PORT
      value: 3000
    - key: REACT_APP_API_URL
      value: https://faculty-workload-management-cse.onrender.com
```

---

## How This Fixes the MIME Type Issue

### Before (Static Service ❌)
```
Render Static Service
    ↓ (doesn't apply headers correctly)
    ↓
CSS served as text/plain
JS served as text/plain
Browser rejects them ❌
```

### After (Web Service with Express ✅)
```
Express Server runs on port 3000
    ↓ (setHeaders middleware)
    ↓
CSS explicitly set to text/css
JS explicitly set to application/javascript
Browser accepts them ✓
```

---

## MIME Types Now Properly Served

| File Type | MIME Type |
|-----------|-----------|
| `.css` | `text/css; charset=utf-8` |
| `.js` | `application/javascript; charset=utf-8` |
| `.json` | `application/json; charset=utf-8` |
| `.png` | `image/png` |
| `.jpg/.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.svg` | `image/svg+xml` |
| `.webp` | `image/webp` |
| `.woff2` | `font/woff2` |
| `.woff` | `font/woff` |
| `.ttf` | `font/ttf` |

---

## Deployment Steps on Render

### Step 1: Verify Local Build
```bash
cd client
npm install compression  # If not already installed
npm run build
npm run server
# Open http://localhost:3000/csefaculty/
```

### Step 2: Sync Changes to GitHub
```bash
git add .
git commit -m "fix: Convert frontend to Web Service for proper MIME types"
git push origin main
```

### Step 3: Update Render Service

1. Go to https://dashboard.render.com
2. Find the `wlm-client` service
3. Click **Settings**
4. Scroll to **Environment** section
   - If `NODE_ENV` doesn't exist, add it with value `production`
   - If `PORT` doesn't exist, add it with value `3000`
5. Return to service overview
6. Click **Manual Deploy** → **Clear build cache and deploy**

### Step 4: Wait for Deployment
- Build should take 3-5 minutes
- Check build logs for any errors
- Once complete, service will be live

### Step 5: Verify in Browser

Open: `https://faculty-workload-management-cse-client.onrender.com/csefaculty/`

**Check in DevTools (F12) → Network tab:**

✅ CSS file `main.*.css`:
- Status: **200**
- Content-Type: **text/css; charset=utf-8**
- Content loads properly

✅ JS file `main.*.js`:
- Status: **200**
- Content-Type: **application/javascript; charset=utf-8**
- Script executes

✅ App loads correctly:
- No console errors
- React app displays
- Navigation works

---

## Performance Improvements

This setup also includes:

1. **Compression Middleware**
   - Reduces CSS/JS file sizes by ~60-70%
   - Faster delivery to browser

2. **Optimized Caching**
   - Static assets cached forever (1 year)
   - `index.html` not cached (always fetches latest build)
   - Reduces load time on repeat visits

3. **Proper Error Handling**
   - 500 error page with JSON response
   - Server logs errors for debugging

---

## Troubleshooting

### Still seeing 404?
- Check Render build logs
- Ensure `npm run build` creates `client/build/` directory
- Verify `startCommand` is set to `npm run server`

### Still getting text/plain MIME type?
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Check Network tab - should show correct Content-Type
- If still wrong, check `client/server.js` line with `setHeaders`

### Server won't start?
- Check that `compression` is in dependencies
- Verify `client/server.js` exists
- Check Render logs for specific error message
- Try `npm run build:start` locally

### API calls failing?
- Verify `REACT_APP_API_URL` is HTTPS
- Check CORS headers on backend
- Verify backend Node version compatibility

---

## Files Changed

| File | Change |
|------|--------|
| `client/server.js` | ✨ NEW - Express server with proper MIME types |
| `client/package.json` | Added `compression` dependency, new scripts |
| `render.yaml` | Changed frontend from `static` to `web` service |

---

## Technical Details

### Why Static Service Failed
- Render's static service is optimized for simple file serving
- Custom headers only work for certain configurations
- Cannot execute Node.js code in static service

### Why Web Service Works
- Runs full Node.js environment
- Can execute `server.js` with Express.js
- Full control over HTTP headers and status codes
- Can implement custom middleware (compression, caching, etc.)

### Performance Impact
- ✅ Slightly higher CPU usage (Node process)
- ✅ Better response times (compression, caching)
- ✅ No increase in bandwidth (actually decrease due to compression)
- ✅ Render's free tier can handle this easily

---

## Next Steps

1. ✅ Commit and push changes
2. ✅ Deploy on Render via Manual Deploy
3. ✅ Verify in browser with DevTools
4. ✅ Test navigation and API calls
5. ✅ Monitor Render logs for any issues

Once this is live, the MIME type errors should be completely resolved! 🎉
