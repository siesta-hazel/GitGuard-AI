const express = require('express');
const crypto = require('crypto');
const { analyzePullRequest } = require('../github');

function verifySignature(rawBody, signature) {
  if (!rawBody || !signature || typeof signature !== 'string') {
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook secret is not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function createWebhookRouter({ octokit }) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];

    if (!event) {
      return res.status(400).send('Missing X-GitHub-Event header');
    }

    if (!verifySignature(req.rawBody, signature)) {
      console.error('Webhook signature verification failed');
      return res.status(401).send('Invalid signature');
    }

    const payload = req.body || {};
    const action = payload.action;

    if (event === 'pull_request' && (action === 'opened' || action === 'synchronize')) {
      const owner = payload.repository?.owner?.login;
      const repo = payload.repository?.name;
      const pullNumber = payload.pull_request?.number;

      if (!owner || !repo || !pullNumber) {
        console.error('Webhook payload missing repository or pull request metadata');
        return res.status(400).send('Invalid pull request payload');
      }

      void analyzePullRequest(octokit, owner, repo, pullNumber);
    }

    return res.status(200).send('OK');
  });

  return router;
}

module.exports = { createWebhookRouter, verifySignature };