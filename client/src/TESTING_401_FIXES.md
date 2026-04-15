# Testing 401 Error Fixes

## Quick Test (30 seconds)

### Step 1: Clear Session and Login
```bash
# Option A: Full browser refresh
F5 or Ctrl+R

# Option B: Clear storage
# In DevTools Console:
localStorage.clear()
location.reload()
```

### Step 2: Login again
1. Go to login page
2. Enter credentials
3. Should now successfully login WITHOUT 401 errors

### Step 3: Verify in Browser Console
```javascript
// DevTools Console:
localStorage.getItem('wlm_token')
// Should return JWT token string (looks like: eyJhbGc...)

// Check if empty:
!localStorage.getItem('wlm_token') ? 'EMPTY TOKEN' : 'TOKEN OK'
```

## Detailed Verification

### Test 1: Authentication Storage
```javascript
// In DevTools Console after login:
{ 
  token: localStorage.getItem('wlm_token'),
  user: JSON.parse(localStorage.getItem('wlm_user'))
}

// Expected output:
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // Long string
  user: {
    id: "189",
    name: "Admin User",
    role: "admin",
    ...
  }
}
```

### Test 2: Run Diagnostics
```javascript
// In DevTools Console:
import { logAuthDiagnostics } from './utils/authDiagnostics'
logAuthDiagnostics()

// Expected console output:
// ✓ Token present: true
// ✓ Token length: 300+ (not 0)
// ✓ User present: true
// ✓ User ID: 189 (or your ID)
// ✓ User role: admin (or faculty)
```

### Test 3: API Request Monitoring
```javascript
// 1. Open DevTools Network tab (F12 → Network)
// 2. Filter for "deva" or "/deva/"
// 3. Perform any action that triggers an API call
// 4. Click on request in Network tab
// 5. Go to "Headers" tab
// 6. Look for "Request Headers"
// 7. Verify: Authorization: Bearer eyJ...

// Expected:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

// If you see "Authorization: Bearer" (empty), token is not being sent
// If no Authorization header at all, headers aren't being added
```

### Test 4: Console Error Monitoring
```
// While using the app, look for these in Console:
❌ [Dashboard] No token in localStorage  → User not authenticated
❌ No valid token available             → Token is empty
❌ 401 Unauthorized                     → Server rejected request

✓ No auth errors in console = Success!
```

## Common Issues & Solutions

### Issue 1: Still Seeing 401 Errors
**Diagnosis:**
```javascript
// Check what's being sent:
import { getAuthHeaderForDebug } from './utils/authDiagnostics'
getAuthHeaderForDebug()
// If returns "Bearer [EMPTY]", that's the problem
```

**Solution:**
- Clear localStorage and login again
- Check browser cache isn't interfering
- Verify backend server is running on port 5000

### Issue 2: Token is Empty After Login
**Check:**
1. Did login succeed? (page should redirect to dashboard)
2. Is backend returning token in response?

**Debug:**
```javascript
// Monitor login response:
// Open DevTools Network tab
// Go to Login page
// Submit login form
// Find POST /deva/auth/login in Network tab
// Click it, then Response tab
// Look for: "data": { "token": "...", "user": {...} }

// If token is missing, backend needs fixing
```

### Issue 3: Token Expires During Session
**Expected behavior:**
- Session timeout after 30 minutes of inactivity
- Yellow warning should appear with countdown
- Click "Stay Logged In" to extend session

**Check:**
```javascript
// In console after getting warning:
localStorage.getItem('wlm_token')
// Token should still be there if you click "Stay Logged In"
```

## Things to Look For

### Network Tab (DevTools → Network)
- ✓ All `/deva/` requests have `Authorization` header
- ✓ Request status shows 200, not 401
- ✓ Response shows `"success": true`
- ✓ Response includes expected data

### Console Tab (DevTools → Console)
- ✓ No red error messages with "401"
- ✓ No warnings about missing tokens
- ✓ No "Cannot read properties of undefined"

### Application Tab (DevTools → Application)
- ✓ `Storage` → `Local Storage` shows:
  - `wlm_token` with a long JWT string (not empty)
  - `wlm_user` with valid JSON user object

## Automated Test Commands

```javascript
// Copy and paste this into Console to run a full diagnostic:

(function() {
  console.group('FULL AUTH DIAGNOSTIC');
  
  // 1. Token check
  const token = localStorage.getItem('wlm_token');
  console.log('✓ Token present:', !!token);
  console.log('✓ Token length:', token?.length || 0);
  console.log('✓ Token sample:', token ? token.substring(0, 50) + '...' : '[EMPTY]');
  
  // 2. User check
  const user = JSON.parse(localStorage.getItem('wlm_user') || '{}');
  console.log('✓ User present:', !!user.id);
  console.log('✓ User ID:', user.id);
  console.log('✓ User role:', user.role);
  
  // 3. Auth header check
  const header = `Bearer ${token || '[EMPTY]'}`;
  console.log('✓ Authorization header:', header.substring(0, 100) + '...');
  console.log('✓ Header valid:', token?.length > 100 ? 'YES' : 'NO - EMPTY TOKEN');
  
  // 4. Status summary
  const isValid = token && token.length > 100 && user.id;
  console.log('\n📊 STATUS:', isValid ? '✅ READY - All auth looks good!' : '⚠️ NEEDS LOGIN - Token or user missing');
  
  console.groupEnd();
})();
```

## If Everything Looks Good But Still Getting Errors

### Backend Verification Needed

1. **Is backend running?**
   ```bash
   # Terminal should show server listening on port 5000
   ```

2. **Check backend logs:**
   ```bash
   # Look for any auth validation errors
   # Check if JWT secret or algorithm mismatches
   ```

3. **Verify JWT validation:**
   ```bash
   # In backend auth middleware:
   # - Secret key matches what was used to sign token
   # - Algorithm is correct (usually HS256)
   # - Token hasn't expired
   ```

## Success Indicators

You'll know it's working when:
- ✅ Login succeeds without page refresh needed
- ✅ Dashboard loads without 401 errors
- ✅ API requests show in Network tab with 200 status
- ✅ All console warnings are gone
- ✅ localStorage shows valid token and user
- ✅ Diagnostics show "Token present: true"

## Need More Help?

Run this command and share the output:
```javascript
import { checkAuthStatus } from './utils/authDiagnostics'
console.log(JSON.stringify(checkAuthStatus(), null, 2))
```

---

**Happy Testing! 🚀**
