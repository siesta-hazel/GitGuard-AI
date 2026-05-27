const path = require('path');
require('dotenv').config();

// Validate required environment variables. In production, exit if any are missing.
function validateEnv() {
  const requiredBase = ['GITHUB_WEBHOOK_SECRET', 'GROQ_API_KEY', 'JWT_SECRET'];
  const missingBase = requiredBase.filter((k) => !process.env[k]);

  const hasAppAuth = process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY;
  const hasTokenAuth = !!process.env.GITHUB_ACCESS_TOKEN;

  const missingAuth = (!hasAppAuth && !hasTokenAuth) ? ['GITHUB_ACCESS_TOKEN (or GITHUB_APP_ID and GITHUB_PRIVATE_KEY)'] : [];
  const missing = [...missingBase, ...missingAuth];

  if (missing.length === 0) return;

  const message = `Missing required environment variables: ${missing.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    process.exit(1);
  }

  console.warn(message);
}
validateEnv();

const express = require('express');
const authRouter = require('./routes/auth');
const { createWebhookRouter } = require('./routes/webhook');
const reviewsRouter = require('./routes/reviews');

const app = express();

// Allow local frontend development ports to call API routes directly.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));

// Serve built React assets and other public files
app.use(express.static(path.join(__dirname, 'public/dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Decoupled Router Mounts
app.use('/api/auth', authRouter);
app.use('/webhook', createWebhookRouter());
app.use('/api', reviewsRouter);

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gitguard-ai',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    port: Number(process.env.PORT || 3000),
  });
});

// React SPA Wildcard Fallback Routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
    return next();
  }

  res.sendFile(path.join(__dirname, 'public/dist', 'index.html'), (err) => {
    if (err) {
      res.status(200).send('GitGuard AI backend running. Frontend assets not yet compiled in public/dist.');
    }
  });
});

const PORT = Number(process.env.PORT || 3000);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`GitGuard AI running on port ${port}`);
    console.log(`Webhook signature verification secret loaded: ${process.env.GITHUB_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is already in use, trying ${port + 1}...`);
      server.close(() => startServer(port + 1));
      return;
    }

    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

startServer(PORT);
