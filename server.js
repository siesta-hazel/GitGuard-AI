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
    const pr_title = payload.pull_request?.title || 'Untitled PR';

    if (!owner || !repo || !pull_number) {
      console.error('❌ Missing owner, repo, or pull_request.number in webhook payload');
      return res.status(400).send('Invalid pull request payload');
    }

    console.log(`🔍 Processing PR #${pull_number}`);
    analyzePullRequest(octokit, owner, repo, pull_number, pr_title).catch(err => console.error('PR processing error:', err));
  } else {
    console.log('⏭️ Ignoring event:', event, payload.action);
  }

  res.status(200).send('OK');
});

function verifySignature(rawBody, signature) {
  if (!signature || !rawBody) return false;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('⚠️ GITHUB_WEBHOOK_SECRET is not set in .env');
    return false;
  }
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(digest);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 GitGuard AI running on port ${PORT}`);
  console.log(`📋 Webhook secret loaded: ${process.env.GITHUB_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
});

// Dashboard home – list all repos with settings
app.get('/dashboard', (req, res) => {
  // Get all repos with settings
  db.all('SELECT * FROM repo_settings ORDER BY repo_full_name', (err, repos) => {
    if (err) return res.status(500).send('Database error');
    
    // Get stats: total repos, total reviews, total issues (approx from llm_response)
    db.get(`SELECT 
              (SELECT COUNT(*) FROM repo_settings) as total_repos,
              (SELECT COUNT(*) FROM review_history) as total_reviews`,
      (statsErr, stats) => {
        if (statsErr) return res.status(500).send('Database error');
        
        // For each repo, get last review date
        const repoPromises = repos.map(repo => {
          return new Promise((resolve) => {
            db.get(
              `SELECT timestamp FROM review_history 
               WHERE repo_full_name = ? 
               ORDER BY timestamp DESC LIMIT 1`,
              [repo.repo_full_name],
              (err, row) => {
                resolve({
                  ...repo,
                  last_reviewed: row ? row.timestamp : null
                });
              }
            );
          });
        });
        
        Promise.all(repoPromises).then(reposWithLastReview => {
          res.render('dashboard', {
            repos: reposWithLastReview,
            stats: stats || { total_repos: 0, total_reviews: 0 }
          });
        });
      }
    );
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
