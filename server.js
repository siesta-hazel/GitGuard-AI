const db = require('./db');
const path = require('path');

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { analyzePullRequest } = require('./github');


const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.post('/webhook', async (req, res) => {
  const event = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];

  if (!event) {
    return res.status(400).send('Missing X-GitHub-Event header');
  }

  console.log('📨 Webhook received:', { event, signature: signature ? 'present' : 'missing' });

  if (!verifySignature(req.rawBody, signature)) {
    console.error('❌ Signature verification failed');
    return res.status(401).send('Invalid signature');
  }

  const payload = req.body;
  console.log('✅ Signature valid. Action:', payload.action);

  if (event === 'pull_request' && (payload.action === 'opened' || payload.action === 'synchronize')) {
    const owner = payload.repository?.owner?.login;
    const repo = payload.repository?.name;
    const pull_number = payload.pull_request?.number;

    if (!owner || !repo || !pull_number) {
      console.error('❌ Missing owner, repo, or pull_request.number in webhook payload');
      return res.status(400).send('Invalid pull request payload');
    }

    console.log(`🔍 Processing PR #${pull_number}`);
    analyzePullRequest(octokit, owner, repo, pull_number).catch(err => console.error('PR processing error:', err));
  } else {
    console.log('⏭️ Ignoring event:', event, payload.action);
  }

  res.status(200).send('OK');
});

function verifySignature(rawBody, signature) {
  if (!rawBody || typeof signature !== 'string' || signature.length === 0) return false;

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('⚠️ GITHUB_WEBHOOK_SECRET is not set in .env');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

  try {
    const expectedBuffer = Buffer.from(digest, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 GitGuard AI running on port ${PORT}`);
  console.log(`📋 Webhook secret loaded: ${process.env.GITHUB_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
});

// Dashboard home – list all repos with settings
app.get('/dashboard', (req, res) => {
  db.all('SELECT * FROM repo_settings ORDER BY repo_full_name', (err, repos) => {
    if (err) return res.status(500).send('Database error');

    db.all('SELECT * FROM review_history ORDER BY timestamp DESC LIMIT 8', (reviewErr, reviews) => {
      if (reviewErr) return res.status(500).send('Database error');

      const safeRepos = repos || [];
      const safeReviews = reviews || [];
      const reviewCounts = safeReviews.reduce((counts, review) => {
        const repoName = review.repo_full_name || 'Unknown repository';
        counts[repoName] = (counts[repoName] || 0) + 1;
        return counts;
      }, {});

      const metrics = {
        totalRepos: safeRepos.length,
        activeRepos: safeRepos.filter(repo => repo.active).length,
        strictRepos: safeRepos.filter(repo => repo.strict_mode).length,
        recentReviews: safeReviews.length,
      };

      const webhookFeed = safeReviews.map((review, index) => {
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
          excerpt: excerpt ? `${excerpt.slice(0, 150)}${excerpt.length > 150 ? '…' : ''}` : 'No review output stored yet.',
        };
      });

      const primaryReview = safeReviews[0]
        ? {
            repo_full_name: safeReviews[0].repo_full_name || 'Unknown repository',
            pr_number: safeReviews[0].pr_number || '—',
            pr_title: safeReviews[0].pr_title || 'Untitled review',
            reviewer: safeReviews[0].reviewer || 'GitGuard AI',
            timestamp: safeReviews[0].timestamp ? new Date(safeReviews[0].timestamp).toLocaleString() : 'Just now',
            llm_response: safeReviews[0].llm_response || 'No AI markdown was stored for this review yet.',
          }
        : null;

      const repoOverview = safeRepos.map(repo => ({
        ...repo,
        reviewCount: reviewCounts[repo.repo_full_name] || 0,
      }));

      res.render('dashboard', {
        metrics,
        webhookFeed,
        primaryReview,
        repoOverview,
      });
    });
  });
});

// Update settings for a repository
app.post('/dashboard/settings', express.urlencoded({ extended: true }), (req, res) => {
  const { repo_full_name, strict_mode, ignore_linter, active } = req.body;
  db.run(
    `INSERT OR REPLACE INTO repo_settings (repo_full_name, strict_mode, ignore_linter, active)
     VALUES (?, ?, ?, ?)`,
    [repo_full_name, strict_mode === 'on' ? 1 : 0, ignore_linter === 'on' ? 1 : 0, active === 'on' ? 1 : 0],
    (err) => {
      if (err) return res.status(500).send('Failed to update');
      res.redirect('/dashboard');
    }
  );
});

// History log – show all past reviews
app.get('/history', (req, res) => {
  db.all('SELECT * FROM review_history ORDER BY timestamp DESC LIMIT 100', (err, reviews) => {
    if (err) return res.status(500).send('Database error');
    res.render('history', { reviews });
  });
});
