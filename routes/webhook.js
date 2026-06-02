const express = require('express');
const crypto = require('crypto');
const { enqueuePullRequest } = require('../github');
const { getRepoSettings } = require('../data/store');
const config = require('../config');

function verifySignature(rawBody, signature) {
  if (!rawBody || !signature || typeof signature !== 'string') {
    return false;
  }

  const secret = config.GITHUB_WEBHOOK_SECRET;
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

function createWebhookRouter() {
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
      const installationId = payload.installation?.id;

      if (!owner || !repo || !pullNumber) {
        console.error('Webhook payload missing repository or pull request metadata');
        return res.status(400).send('Invalid pull request payload');
      }

      const hasAppAuth = !!(process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY);
      if (!installationId && hasAppAuth) {
        console.error('Webhook payload missing installation context for GitHub App');
        return res.status(400).send('Missing installation context');
      }

      const repoFullName = `${owner}/${repo}`;
      try {
        const settings = await getRepoSettings(repoFullName);
        if (!settings) {
          console.log(`Skipping review for unregistered repository: ${repoFullName}`);
          return res.status(200).send('Repository is not registered');
        }

        if (!settings.active) {
          console.log(`Skipping review for inactive repository: ${repoFullName}`);
          return res.status(200).send('Repository is inactive');
        }

        // Queue the pull request analysis sequentially
        enqueuePullRequest({
          installationId,
          owner,
          repo,
          pullNumber,
          userId: settings.user_id,
        });

        console.log(`Enqueued pull request analysis for ${repoFullName}#${pullNumber}`);
      } catch (err) {
        console.error('Error handling webhook pull request event:', err.message || err);
      }
    }

    return res.status(200).send('OK');
  });

  return router;
}

module.exports = { createWebhookRouter, verifySignature };