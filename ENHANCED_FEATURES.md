# 🚀 Enhanced Features - Implementation Guide

These are production-ready utility modules that enhance your WLM system. They are **non-blocking** and can be integrated gradually.

---

## 1️⃣ Request Signing (`utils/requestSigning.js`) 

**Purpose**: Secure sensitive operations with HMAC-SHA256 signatures

**Quick Setup**:
```javascript
// In your sensitive route (e.g., DELETE faculty)
const { verifyRequestSignature } = require('../utils/requestSigning');

router.delete('/:id', 
  requireAuth,
  verifyRequestSignature(), // Add this middleware
  async (req, res) => {
    // Handle deletion
  }
);
```

**Frontend Usage**:
```javascript
import { signRequest } from '../utils/requestSigning';

// Sign critical requests
const signature = signRequest('DELETE', '/api/faculty/123', {});
fetch('/api/faculty/123', {
  method: 'DELETE',
  headers: {
    'X-Signature': signature,
  }
});
```

---

## 2️⃣ API Versioning (`utils/apiVersioning.js`)

**Purpose**: Support multiple API versions simultaneously for backward compatibility

**Quick Setup**:
```javascript
const { apiVersioning } = require('./utils/apiVersioning');

// Add to Express app
app.use(apiVersioning);

// Now check version in routes
router.get('/endpoint', (req, res) => {
  console.log('API Version:', req.apiVersion); // e.g., '1.0.0'
});
```

**Client Usage**:
```javascript
// Option 1: Accept header
headers: { 'Accept': 'application/vnd.wlm.v1+json' }

// Option 2: URL versioning
fetch('/api/v1/faculty')

// Option 3: Custom header
headers: { 'X-API-Version': '1.0.0' }
```

---

## 3️⃣ Caching Layer (`utils/cache.js`)

**Purpose**: Cache high-traffic data (faculties, courses, etc.)

**Quick Setup**:
```javascript
const { caching, invalidateCache } = require('../utils/cache');

// Cache GET requests for 5 minutes
router.get('/faculty', 
  caching(5 * 60 * 1000),
  async (req, res) => {
    // Faculty data is now cached
  }
);

// Invalidate cache when data changes
router.post('/faculty', async (req, res) => {
  // ... create faculty ...
  invalidateCache(['/api/faculty']); // Clear faculty cache
  res.json(result);
});
```

**Production**: Replace in-memory cache with Redis:
```bash
npm install redis
```

---

## 4️⃣ Two-Factor Authentication (`utils/twoFactorAuth.js`)

**Purpose**: Require 2FA for admin users on sensitive operations

**Quick Setup**:
```javascript
const { require2FA, create2FASession } = require('../utils/twoFactorAuth');

// Protect admin-only delete/modify operations
router.delete('/:id',
  requireAuth,
  require2FA, // Check 2FA
  async (req, res) => {
    // Operation protected by 2FA
  }
);
```

**Production**: Use TOTP library:
```bash
npm install speakeasy qrcode
```

---

## 5️⃣ Webhooks System (`utils/webhooks.js`)

**Purpose**: Enable real-time notifications to external services

**Quick Setup**:
```javascript
const { registerWebhook, triggerWebhook } = require('../utils/webhooks');

// Register external webhook
registerWebhook(
  'workload.created',
  'https://external-system.com/webhooks/workload',
  'your-webhook-secret'
);

// Trigger event when workload is created
router.post('/workload', async (req, res) => {
  const workload = await Workload.create(req.body);
  
  // Trigger webhook
  await triggerWebhook('workload.created', {
    id: workload._id,
    empId: workload.empId,
    courseId: workload.courseId,
  });

  res.json(workload);
});
```

---

## 📋 Integration Priority

### Phase 1 (Immediate) - Easy wins
1. ✅ Caching layer - minimal code changes
2. ✅ API versioning - light integration

### Phase 2 (Next Release) - Security
3. ✅ Request signing - for sensitive operations
4. ✅ 2FA for admins - optional but recommended

### Phase 3 (Future) - Notifications
5. ✅ Webhooks - when external integrations needed

---

## 🧪 Testing

```bash
# Test caching
curl http://localhost:5000/api/faculty?page=1
# Second request should return from cache (check X-Cache header)

# Test API versioning
curl -H "Accept: application/vnd.wlm.v1+json" http://localhost:5000/api/faculty

# Test webhooks
npm test -- webhooks.test.js
```

---

## 📚 Additional Resources

- **Request Signing**: [HMAC Documentation](https://nodejs.org/api/crypto.html#crypto_class_hmac)
- **API Versioning**: [Semantic Versioning](https://semver.org/)
- **Caching**: [Redis Docs](https://redis.io/documentation)
- **2FA**: [Speakeasy TOTP](https://www.npmjs.com/package/speakeasy)
- **Webhooks**: [Webhook Best Practices](https://www.zapier.com/blog/webhook/)

---

## ⚙️ Environment Variables

Add to `.env` for enhanced features:

```env
# Request Signing
REQUEST_SIGNING_SECRET=your_secret_key_here

# Caching (if using Redis)
REDIS_URL=redis://localhost:6379

# Webhooks
WEBHOOK_MAX_RETRIES=10
WEBHOOK_TIMEOUT=10000

# 2FA
TWO_FA_ENABLED=false
TWO_FA_WINDOW=1
```

---

**Status**: Ready to integrate into your deployment  
**Last Updated**: 2026-04-07
