const path = require('path');

require('dotenv').config();
const express = require('express');
const { Octokit } = require('@octokit/rest');
const authRouter = require('./routes/auth');
const { createWebhookRouter } = require('./routes/webhook');
const {
  listRepoSettings,
  listReviewHistory,
  listReviewSnapshots,
  upsertRepoSettings,
} = require('./data/store');


const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/webhook', createWebhookRouter({ octokit }));

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
