require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { analyzeDiffWithLLM } = require('./llm');   // We'll create this next

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

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

  console.log(`📥 Fetching diff for ${owner}/${repo}#${prNumber}`);

  // 1. Get PR diff
  const { data: diff } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' }
  });

  // 2. Clean diff (reduce token usage)
  const cleanedDiff = diff.split('\n')
    .filter(line => 
      line.startsWith('diff --git') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('+') ||
      line.startsWith('-')
    )
    .join('\n');

  console.log(`📄 Diff size: ${cleanedDiff.length} chars`);

  // 3. Call Groq (via llm.js)
  const llmResponse = await analyzeDiffWithLLM(cleanedDiff, { strict_mode: false });

  console.log(`🤖 LLM response length: ${llmResponse.length} chars`);

  // 4. Post comment to PR
  const commentBody = `## 🤖 GitGuard AI (Groq)\n\n${llmResponse}\n\n---\n*Automated review by GitGuard AI*`;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: commentBody
  });

  console.log(`✅ Comment posted on PR #${prNumber}`);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 GitGuard AI running on port ${PORT}`);
  console.log(`📋 Webhook secret loaded: ${process.env.GITHUB_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
});