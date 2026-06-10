'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const callRoutes = require('./routes/call');

// ─────────────────────────────────────────────────────────────
// Express App Bootstrap
// ─────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());                          // Allow Android Retrofit requests
app.use(express.json());                  // Parse JSON body
app.use(express.urlencoded({ extended: true }));

// ── Request Logger ───────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.url}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────
app.use('/call', callRoutes);

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status   : 'ok',
    service  : 'Agora Backend',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🚀  Agora Backend running!');
  console.log(`📡  Listening on  : http://localhost:${PORT}`);
  console.log(`❤️   Health check  : GET  http://localhost:${PORT}/health`);
  console.log(`📞  Initiate call  : POST http://localhost:${PORT}/call`);
  console.log(`🔄  Update status  : PATCH http://localhost:${PORT}/call/:channelId/status`);
  console.log('');
});

module.exports = app;
