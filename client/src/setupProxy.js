// CRA dev-server proxy — forwards /api requests to the production server.
// This avoids CORS issues when running the React app locally against the
// deployed backend. Only active during `npm start` (development mode).

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: false,
    })
  );
};
