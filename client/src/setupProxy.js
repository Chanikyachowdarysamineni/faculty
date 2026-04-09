// CRA dev-server proxy — forwards /deva and /csefaculty/deva requests to the backend.
// This avoids CORS issues when running the React app locally against the
// deployed backend. Only active during `npm start` (development mode).

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // ─ Legacy route: /api → /deva ─────────────────────────
  // Kept for backwards compatibility
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: false,
      pathRewrite: {
        '^/api': '/deva'  // Rewrite /api/* to /deva/*
      }
    })
  );

  // ─ Production route: /csefaculty/deva → /deva ────────────
  // Used by production frontend at http://160.187.169.41
  app.use(
    '/csefaculty/deva',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/csefaculty/deva': '/deva'  // Strip /csefaculty/deva, forward /deva to backend
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log proxy requests in development
        console.log(`[Proxy] ${req.method} ${req.originalUrl} → ${proxyReq.path}`);
      }
    })
  );

  // ─ Direct /deva route ──────────────────────────────────
  // For testing and direct API calls
  app.use(
    '/deva',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      changeOrigin: true,
    })
  );
};

