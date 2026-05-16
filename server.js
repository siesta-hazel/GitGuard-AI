require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { analyzePullRequest } = require('./github');

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

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