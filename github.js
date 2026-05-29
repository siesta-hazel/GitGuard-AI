const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const { analyzeDiffWithLLM } = require('./llm');
const { saveReviewHistory, getRepoSettings } = require('./data/store');

function cleanRawDiff(rawDiff) {
  return rawDiff
    .split(/\r?\n/)
    .map(line => line.replace(/\r$/, ''))
    .filter(line => {
      if (line.startsWith('diff --git')) return true;
      if (line.startsWith('index ')) return true;
      if (line.startsWith('@@')) return true;
      if (line.startsWith('+++')) return true;
      if (line.startsWith('---')) return true;
      if (line.startsWith('+')) return true;
      if (line.startsWith('-')) return true;
      return false;
    })
    .join('\n');
}

function getInstallationOctokit(installationId) {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  if (token) {
    return new Octokit({
      auth: token,
    });
  }

  const appId = process.env.GITHUB_APP_ID;
  let privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('Missing GITHUB_ACCESS_TOKEN or GITHUB_APP_ID/GITHUB_PRIVATE_KEY in environment variables');
  }

  // Handle base64 encoded private keys (common in cloud environments)
  if (!privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
    } catch (e) {
      // Ignore conversion if it is already raw
    }
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });
}

// In-memory queue to process pull request analysis sequentially
const prQueue = [];
let isProcessingQueue = false;
let isQueuePaused = false;

function pauseQueue() {
  isQueuePaused = true;
  console.log('Webhook processing queue has been paused.');
}

function waitForActiveAnalyses() {
  return new Promise((resolve) => {
    if (!isProcessingQueue) {
      resolve();
      return;
    }

    const interval = setInterval(() => {
      if (!isProcessingQueue) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

function enqueuePullRequest(task) {
  prQueue.push(task);
  triggerQueueProcessing();
}

function triggerQueueProcessing() {
  if (isQueuePaused || isProcessingQueue || prQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  setTimeout(async () => {
    if (isQueuePaused) {
      isProcessingQueue = false;
      return;
    }

    const task = prQueue.shift();
    if (task) {
      const { installationId, owner, repo, pullNumber, userId } = task;
      const repoFullName = `${owner}/${repo}`;
      console.log(`Processing queued PR review for: ${repoFullName}#${pullNumber}`);

      try {
        const settings = await getRepoSettings(repoFullName);
        if (!settings) {
          console.log(`Skipping analysis for unregistered repository: ${repoFullName}`);
        } else if (!settings.active) {
          console.log(`Skipping analysis for inactive repository: ${repoFullName}`);
        } else {
          const finalUserId = settings.user_id || userId;
          const octokit = getInstallationOctokit(installationId);
          await analyzePullRequest(octokit, owner, repo, pullNumber, finalUserId);
        }
      } catch (err) {
        console.error(`Failed to process queued pull request ${repoFullName}#${pullNumber}:`, err.message || err);
      }
    }

    isProcessingQueue = false;
    triggerQueueProcessing();
  }, 1000); // 1-second delay between sequential reviews to prevent hitting API secondary limits
}

async function analyzePullRequest(octokit, owner, repo, pull_number, userId = null) {
  const repoName = `${owner}/${repo}`;

  try {
    console.log(`Fetching diff for ${repoName}#${pull_number}`);

    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
      headers: {
        accept: 'application/vnd.github.v3.diff',
      },
    });

    const rawDiff = typeof response.data === 'string' ? response.data : '';
    if (!rawDiff.trim()) {
      throw new Error('GitHub API did not return raw diff text');
    }

    const cleanedDiff = cleanRawDiff(rawDiff);
    console.log(`Cleaned diff size: ${cleanedDiff.length} characters`);

    let llmResponse;
    try {
      llmResponse = await analyzeDiffWithLLM(cleanedDiff);
      console.log(`LLM review generated for ${repoName} PR #${pull_number}`);
    } catch (llmError) {
      console.error(`LLM analysis failed for ${repoName} PR #${pull_number}:`, llmError.message || llmError);
      try {
        await saveReviewHistory({
          repoFullName: repoName,
          prNumber: pull_number,
          prTitle: `PR #${pull_number}`,
          reviewer: 'GitGuard AI',
          llmResponse: `Error: AI analysis failed: ${llmError.message || llmError}`,
          cleanedDiffSize: cleanedDiff.length,
          rawDiff,
          userId,
          status: 'Failed',
        });
      } catch (databaseError) {
        console.error(`Database write failure while saving failed review for ${repoName}#${pull_number}:`, databaseError.message || databaseError);
      }
      return null;
    }

    // Try posting the comment, handle failure gracefully without blocking
    try {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: llmResponse,
      });
    } catch (commentError) {
      const permissionMessage = commentError?.status === 403 || commentError?.status === 404
        ? 'GitHub token permission restriction or repository access issue'
        : 'Unexpected GitHub comment write failure';
      console.error(`${permissionMessage} while posting review for ${repoName}#${pull_number}:`, commentError.message || commentError);
    }

    // Try saving history, handle failure gracefully without blocking
    try {
      await saveReviewHistory({
        repoFullName: repoName,
        prNumber: pull_number,
        prTitle: `PR #${pull_number}`,
        reviewer: 'GitGuard AI',
        llmResponse,
        cleanedDiffSize: cleanedDiff.length,
        rawDiff,
        userId,
        status: 'Completed',
      });
    } catch (databaseError) {
      const timeoutMessage = databaseError?.code === 'SQLITE_BUSY' || databaseError?.code === 'SQLITE_TIMEOUT'
        ? 'Database timeout while saving review history'
        : 'Database write failure while saving review history';
      console.error(`${timeoutMessage} for ${repoName}#${pull_number}:`, databaseError.message || databaseError);
    }

    return { rawDiff, cleanedDiff, llmResponse };
  } catch (error) {
    console.error(`Failed to analyze PR ${owner}/${repo}#${pull_number}:`, error.message || error);
    return null;
  }
}

function isQueueProcessing() {
  return isProcessingQueue || prQueue.length > 0;
}

module.exports = {
  analyzePullRequest,
  cleanRawDiff,
  getInstallationOctokit,
  enqueuePullRequest,
  pauseQueue,
  waitForActiveAnalyses,
  isQueueProcessing,
};