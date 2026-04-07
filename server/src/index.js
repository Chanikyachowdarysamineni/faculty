/**
 * index.js — Faculty Work Load Management API Server
 *
 * Start:      node src/index.js
 * Dev mode:   npm run dev
 * Seed DB:    npm run seed
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// ── Import routes ──────────────────────────────────────────
const authRoutes        = require('./routes/auth');
const facultyRoutes     = require('./routes/faculty');
const coursesRoutes     = require('./routes/courses');
const submissionsRoutes = require('./routes/submissions');
const workloadsRoutes   = require('./routes/workloads');
const settingsRoutes    = require('./routes/settings');
const statsRoutes       = require('./routes/stats');
const allocationsRoutes = require('./routes/allocations');
const auditLogsRoutes   = require('./routes/auditLogs');

// ── DB (Mongoose) ────────────────────────────────────────────
const { connect } = require('./db');
const Setting     = require('./models/Setting');
const Workload    = require('./models/Workload');
const Course      = require('./models/Course');
const CourseAllocation = require('./models/CourseAllocation');
const AuditLog = require('./models/AuditLog');
const Counter = require('./models/Counter');
const PasswordResetToken = require('./models/PasswordResetToken');

const DEFAULT_SECTIONS = {
  I: Array.from({ length: 19 }, (_, i) => String(i + 1)),
  II: Array.from({ length: 22 }, (_, i) => String(i + 1)),
  III: Array.from({ length: 19 }, (_, i) => String(i + 1)),
  IV: Array.from({ length: 9 }, (_, i) => String(i + 1)),
  'M.Tech': ['1', '2'],
};

const normalizeCourseTypeKey = (courseType = '') => {
  const normalized = String(courseType || '').trim().toLowerCase();
  if (normalized === 'de' || normalized === 'department elective') return 'DE';
  if (normalized === 'mandatory') return 'MANDATORY';
  return 'OTHER';
};

const backfillWorkloadCourseTypeKeys = async () => {
  const docs = await Workload.find(
    {
      $or: [
        { courseTypeKey: { $exists: false } },
        { courseTypeKey: null },
        { courseTypeKey: '' },
      ],
    },
    { _id: 1, courseType: 1 }
  ).lean();

  if (!docs.length) return;

  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const courseTypeKey = normalizeCourseTypeKey(doc.courseType);
    try {
      const result = await Workload.updateOne(
        { _id: doc._id },
        { $set: { courseTypeKey } }
      );
      if (result.modifiedCount > 0) updated += 1;
    } catch (err) {
      // If this collides with the DE unique index, keep the row unchanged and continue.
      if (Number(err?.code) === 11000) {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }

  console.log(`ℹ️  Workload courseTypeKey backfill: updated=${updated}, skipped=${skipped}`);
};

// ── App ────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// ── Global middleware ──────────────────────────────────────
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const baselineAllowedOrigins = [
  'https://faculty-workload-management-cse-client.onrender.com',
  'https://faculty-workload-management.onrender.com',
  'https://wlm-client.onrender.com',
  'https://faculty-workload-management-1.onrender.com',
  // Always allow localhost for local development (all routes require JWT auth anyway)
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...baselineAllowedOrigins]));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.set('trust proxy', 1);

// ── Security Headers Middleware ────────────────────────────
app.use((req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Clickjacking protection (deny embedding in frames)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// ── Redirect HTTP to HTTPS in Production ───────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Rate Limiting ──────────────────────────────────────────
// General API limiter (all endpoints)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                  // 1000 requests per window
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/api/health';
  },
});

// Strict limiter for sensitive operations (workloads, faculty management)
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 50,                     // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have exceeded the rate limit for this operation. Please try again later.',
  },
});

// Apply general limiter to all API routes
app.use('/api/', apiLimiter);

// Apply strict limiter to sensitive endpoints (add more as needed)
app.use('/api/workloads', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return strictLimiter(req, res, next);
  }
  next();
});

app.use('/api/faculty', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return strictLimiter(req, res, next);
  }
  next();
});

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'WLM API is running',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/faculty',     facultyRoutes);
app.use('/api/courses',     coursesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/workloads',   workloadsRoutes);
app.use('/api/settings',    settingsRoutes);
app.use('/api/stats',       statsRoutes);
app.use('/api/allocations', allocationsRoutes);
app.use('/api/audit-logs',  auditLogsRoutes);

// ── 404 handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ───────────────────────────────────
app.use(errorHandler);

// ── Process-level crash guards ────────────────────────────
// Prevent unhandled rejections / exceptions from silently killing the process
// (which would drop all in-flight HTTP connections with ERR_CONNECTION_CLOSED)
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  // Give active requests ~2 s to complete before exiting
  setTimeout(() => process.exit(1), 2000).unref();
});

// ── Start — connect to MongoDB first, then listen ──────────
(async () => {
  await connect();

  const dropIndexSafe = async (model, indexName) => {
    try {
      await model.collection.dropIndex(indexName);
    } catch (dropErr) {
      if (!String(dropErr?.message || '').includes('index not found')) throw dropErr;
    }
  };

  const syncIndexesSafe = async (model) => {
    try {
      await model.syncIndexes();
    } catch (err) {
      const isIndexOptionsConflict = Number(err?.code) === 85;
      const errMsg = String(err?.message || '');

      if (isIndexOptionsConflict && model?.modelName === 'PasswordResetToken' && errMsg.includes('expiresAt_1')) {
        await dropIndexSafe(model, 'expiresAt_1');
        await model.syncIndexes();
        return;
      }

      // Old DE index (no facultyRole filter) conflicts with new Main-Faculty-only index.
      if (isIndexOptionsConflict && model?.modelName === 'Workload') {
        await dropIndexSafe(model, 'uniq_de_per_section_upto_third_year');
        await model.syncIndexes();
        return;
      }

      throw err;
    }
  };

  await syncIndexesSafe(Workload);
  await syncIndexesSafe(Course);
  await syncIndexesSafe(CourseAllocation);
  await syncIndexesSafe(Counter);
  await syncIndexesSafe(AuditLog);
  await syncIndexesSafe(PasswordResetToken);
  await backfillWorkloadCourseTypeKeys();

  // Ensure default settings exist
  await Setting.findOneAndUpdate(
    { key: 'form_enabled' },
    { $setOnInsert: { key: 'form_enabled', value: 'true' } },
    { upsert: true }
  );

  await Setting.findOneAndUpdate(
    { key: 'sections_config' },
    { $setOnInsert: { key: 'sections_config', value: JSON.stringify(DEFAULT_SECTIONS) } },
    { upsert: true }
  );

  const server = app.listen(PORT, () => {
    console.log(`\n✅  WLM Server running on http://localhost:${PORT}`);
    console.log(`   Auth:        POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   Faculty:     GET  http://localhost:${PORT}/api/faculty`);
    console.log(`   Courses:     GET  http://localhost:${PORT}/api/courses`);
    console.log(`   Submissions: GET  http://localhost:${PORT}/api/submissions`);
    console.log(`   Workloads:   GET  http://localhost:${PORT}/api/workloads`);
    console.log(`   Stats:       GET  http://localhost:${PORT}/api/stats\n`);
  });

  // Render's load balancer holds connections for 75 s+; Node defaults to 5 s,
  // which makes Render send requests on already-closed sockets → ERR_CONNECTION_CLOSED.
  // Setting these higher than Render's timeout prevents that race condition.
  server.keepAliveTimeout = 120000; // 120 s
  server.headersTimeout   = 125000; // must be > keepAliveTimeout

  // ── Graceful shutdown (Render sends SIGTERM before container recycle) ──────
  const gracefulShutdown = (signal) => {
    console.log(`\n⚠️  ${signal} received. Closing HTTP server…`);
    server.close(() => {
      console.log('✅  HTTP server closed.');
      process.exit(0);
    });
    // Force-exit after 15 s if connections don't drain
    setTimeout(() => {
      console.error('❌  Forced exit after timeout.');
      process.exit(1);
    }, 15000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
})();

module.exports = app;
