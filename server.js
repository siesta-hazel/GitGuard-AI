const path = require('path');

require('dotenv').config();

// Validate required environment variables. In production, exit if any are missing.
function validateEnv(required = []) {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length === 0) return;

  const message = `Missing required environment variables: ${missing.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    console.error(message);
    process.exit(1);
  }

  console.warn(message);
}

validateEnv(['GITHUB_WEBHOOK_SECRET', 'GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY', 'GROQ_API_KEY', 'JWT_SECRET']);
const express = require('express');
const authRouter = require('./routes/auth');
const { createWebhookRouter } = require('./routes/webhook');
const {
  listRepoSettings,
  listReviewHistory,
  listReviewSnapshots,
  upsertRepoSettings,
} = require('./data/store');


const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

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

app.use('/api/auth', authRouter);
app.use('/webhook', createWebhookRouter());

const jwt = require('jsonwebtoken');
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-local-jwt-secret');
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

app.get('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.sub ? parseInt(req.user.sub, 10) : null;
    const reviews = await listReviewHistory(100, userId);
    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch review history:', error);
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
});

app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.sub ? parseInt(req.user.sub, 10) : null;
    const [repos, reviews] = await Promise.all([
      listRepoSettings(userId),
      listReviewHistory(100, userId),
    ]);
    const metrics = {
      totalRepos: repos.length,
      activeRepos: repos.filter(repo => repo.active).length,
      strictRepos: repos.filter(repo => repo.strict_mode).length,
      recentReviews: reviews.length,
    };
    res.json({ metrics, reviews, repos });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.post('/api/repos/settings', authenticateToken, async (req, res) => {
  try {
    const { repo_full_name, strict_mode, ignore_linter, active } = req.body;
    const userId = req.user?.sub ? parseInt(req.user.sub, 10) : null;
    
    if (!repo_full_name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    await upsertRepoSettings({
      repoFullName: repo_full_name,
      strictMode: !!strict_mode,
      ignoreLinter: !!ignore_linter,
      active: active !== false,
      userId,
    });

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to update repository settings:', error);
    res.status(500).json({ error: 'Failed to update repository settings' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gitguard-ai',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    port: Number(process.env.PORT || 3000),
  });
});

const PORT = Number(process.env.PORT || 3000);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`GitGuard AI running on port ${port}`);
    console.log(`Webhook secret loaded: ${process.env.GITHUB_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
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

app.get('/dashboard', async (req, res) => {
  try {
    const [repos, reviews] = await Promise.all([
      listRepoSettings(),
      listReviewSnapshots(8),
    ]);

    const reviewCounts = reviews.reduce((counts, review) => {
      const repoName = review.repo_full_name || 'Unknown repository';
      counts[repoName] = (counts[repoName] || 0) + 1;
      return counts;
    }, {});

    const metrics = {
      totalRepos: repos.length,
      activeRepos: repos.filter(repo => repo.active).length,
      strictRepos: repos.filter(repo => repo.strict_mode).length,
      recentReviews: reviews.length,
    };

    const webhookFeed = reviews.map((review, index) => {
      const repoName = review.repo_full_name || 'Unknown repository';
      const timestamp = review.timestamp ? new Date(review.timestamp) : null;
      const excerpt = (review.llm_response || '').replace(/\s+/g, ' ').trim();

      return {
        initials: repoName
          .split('/')
          .filter(Boolean)
          .map(part => part.charAt(0))
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'GH',
        title: `${repoName} · PR #${review.pr_number || '—'}`,
        summary: review.pr_title || 'AI review completed for the latest pull request.',
        detail: index === 0 ? 'Latest webhook captured and queued for analysis.' : 'Previously processed webhook replayed for monitoring.',
        time: timestamp ? timestamp.toLocaleString() : 'Just now',
        severity: index === 0 ? 'Live' : 'Archived',
        excerpt: excerpt ? `${excerpt.slice(0, 150)}${excerpt.length > 150 ? '...' : ''}` : 'No review output stored yet.',
      };
    });

    const primaryReview = reviews[0]
      ? {
          repo_full_name: reviews[0].repo_full_name || 'Unknown repository',
          pr_number: reviews[0].pr_number || '—',
          pr_title: reviews[0].pr_title || 'Untitled review',
          reviewer: reviews[0].reviewer || 'GitGuard AI',
          timestamp: reviews[0].timestamp ? new Date(reviews[0].timestamp).toLocaleString() : 'Just now',
          llm_response: reviews[0].llm_response || 'No AI markdown was stored for this review yet.',
        }
      : null;

    const repoOverview = repos.map(repo => ({
      ...repo,
      reviewCount: reviewCounts[repo.repo_full_name] || 0,
    }));

    res.render('dashboard', {
      metrics,
      webhookFeed,
      primaryReview,
      repoOverview,
    });
  } catch (error) {
    console.error('Failed to render dashboard:', error);
    res.status(500).send('Database error');
  }
});

// Update settings for a repository
app.post('/dashboard/settings', async (req, res) => {
  try {
    const { repo_full_name, strict_mode, ignore_linter, active } = req.body;
    await upsertRepoSettings({
      repoFullName: repo_full_name,
      strictMode: strict_mode === 'on',
      ignoreLinter: ignore_linter === 'on',
      active: active === 'on',
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Failed to update repository settings:', error);
    res.status(500).send('Failed to update');
  }
});

// History log – show all past reviews
app.get('/history', async (req, res) => {
  try {
    const reviews = await listReviewHistory(100);
    res.render('history', { reviews });
  } catch (error) {
    console.error('Failed to render review history:', error);
    res.status(500).send('Database error');
  }
});
