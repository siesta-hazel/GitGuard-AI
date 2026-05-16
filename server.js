const db = require('./db');
const path = require('path');

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { analyzeDiffWithLLM } = require('./llm');   // We'll create this next


const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  console.log('📨 Webhook received:', { event, signature: signature ? 'present' : 'missing' });

  if (!verifySignature(req.rawBody, signature)) {
    console.error('❌ Signature verification failed');
    return res.status(401).send('Invalid signature');
  }

  const payload = req.body;
  console.log('✅ Signature valid. Action:', payload.action);

  if (event === 'pull_request' && (payload.action === 'opened' || payload.action === 'synchronize')) {
    console.log(`🔍 Processing PR #${payload.pull_request.number}`);
    processPR(payload).catch(err => console.error('PR processing error:', err));
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
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// ========== FULL PR PROCESSING ==========
async function processPR(payload) {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.pull_request.number;
  const repoName = `${owner}/${repo}`;

  console.log(`📥 Fetching diff for ${repoName}#${prNumber}`);

  // 1. Get PR diff
  const { data: diff } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' }
  });

  // 2. Clean diff
  const cleanedDiff = diff.split('\n')
    .filter(line => 
      line.startsWith('diff --git') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('+') ||
      line.startsWith('-')
    )
    .join('\n');

  // 3. Get repo settings from DB
  const settings = await new Promise((resolve) => {
  db.get('SELECT strict_mode, ignore_linter, active FROM repo_settings WHERE repo_full_name = ?', [repoName], (err, row) => {
    if (err || !row) {
      // No settings yet – insert a default row
      db.run(
        `INSERT INTO repo_settings (repo_full_name, strict_mode, ignore_linter, active)
         VALUES (?, 0, 0, 1)`,
        [repoName],
        (insertErr) => {
          if (insertErr) console.error('Failed to insert repo settings:', insertErr);
          resolve({ strict_mode: false, ignore_linter: false, active: true });
        }
      );
    } else {
      resolve(row);
    }
  });
});

  if (!settings.active) {
    console.log(`⏸️ GitGuard is inactive for ${repoName}`);
    return;
  }

  // 4. Call LLM with settings (ONLY ONE DECLARATION)
  const llmResponse = await analyzeDiffWithLLM(cleanedDiff, settings);

  // 5. Post comment
  const commentBody = `## 🤖 GitGuard AI (Groq)\n\n${llmResponse}\n\n---\n*Automated review by GitGuard AI*`;
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: commentBody
  });

  // 6. Save to history
  db.run(
    `INSERT INTO review_history (repo_full_name, pr_number, pr_title, reviewer, llm_response)
     VALUES (?, ?, ?, ?, ?)`,
    [repoName, prNumber, payload.pull_request.title, 'GitGuard AI', llmResponse],
    (err) => { if (err) console.error('Failed to save history:', err); }
  );

  console.log(`✅ Comment posted on PR #${prNumber}`);
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
    res.render('dashboard', { repos });
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
