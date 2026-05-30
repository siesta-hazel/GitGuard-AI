const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const { analyzeDiffWithLLM } = require('./llm');
const { saveReviewHistory, updateReviewHistory, getRepoSettings } = require('./data/store');
const { withRetry } = require('./retry');

function shouldSkipFile(filePath) {
  if (!filePath) return false;
  
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  
  const lockfiles = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'composer.lock',
    'cargo.lock',
    'gemfile.lock',
    'poetry.lock',
    'mix.lock'
  ];
  
  const metadataExtensions = [
    '.meta',
    '.tsbuildinfo',
    '.lock',
    '.log',
    '.cache'
  ];
  
  const minifiedExtensions = [
    '.min.js',
    '.min.css',
    '.map',
    '.min.jsx',
    '.min.tsx'
  ];

  const fileName = normalized.split('/').pop();

  if (lockfiles.includes(fileName)) {
    return true;
  }
  
  if (metadataExtensions.some(ext => fileName.endsWith(ext))) {
    return true;
  }
  
  if (minifiedExtensions.some(ext => fileName.endsWith(ext))) {
    return true;
  }

  if (normalized.includes('/dist/') || normalized.startsWith('dist/') ||
      normalized.includes('/build/') || normalized.startsWith('build/') ||
      normalized.includes('/node_modules/') || normalized.startsWith('node_modules/') ||
      normalized.includes('/.next/') || normalized.startsWith('.next/') ||
      normalized.includes('/out/') || normalized.startsWith('out/')) {
    return true;
  }

  return false;
}

function cleanRawDiff(rawDiff) {
  let skipCurrentFile = false;
  let cleaned = rawDiff
    .split(/\r?\n/)
    .map(line => line.replace(/\r$/, ''))
    .filter(line => {
      if (line.startsWith('diff --git')) {
        let filePath = '';
        const match = line.match(/^diff --git a\/(.+?)\s+b\/(.+)$/);
        if (match) {
          filePath = match[2];
        } else {
          const index = line.indexOf(' b/');
          if (index !== -1) {
            filePath = line.substring(index + 3);
          }
        }
        skipCurrentFile = shouldSkipFile(filePath);
        return !skipCurrentFile;
      }
      
      if (skipCurrentFile) {
        return false;
      }

      if (line.startsWith('index ')) return true;
      if (line.startsWith('@@')) return true;
      if (line.startsWith('+++')) return true;
      if (line.startsWith('---')) return true;
      if (line.startsWith('+')) return true;
      if (line.startsWith('-')) return true;
      return false;
    })
    .join('\n');

  if (cleaned.length > 8000) {
    const truncated = cleaned.slice(0, 8000);
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > 0) {
      cleaned = truncated.substring(0, lastNewline) + '\n[Diff truncated by GitGuard AI to preserve context window limits]';
    } else {
      cleaned = truncated + '\n[Diff truncated by GitGuard AI to preserve context window limits]';
    }
  }

  return cleaned;
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

async function enqueuePullRequest(task) {
  const { owner, repo, pullNumber, userId } = task;
  const repoFullName = `${owner}/${repo}`;
  
  let reviewId = null;
  try {
    reviewId = await saveReviewHistory({
      repoFullName,
      prNumber: pullNumber,
      prTitle: `PR #${pullNumber}`,
      reviewer: 'GitGuard AI',
      llmResponse: 'Analysis pending in queue...',
      cleanedDiffSize: 0,
      rawDiff: '',
      userId,
      status: 'Pending'
    });
  } catch (err) {
    console.error('Failed to create pending review history:', err.message);
  }
  
  prQueue.push({ ...task, reviewId });
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
      const { installationId, owner, repo, pullNumber, userId, reviewId } = task;
      const repoFullName = `${owner}/${repo}`;
      console.log(`Processing queued PR review for: ${repoFullName}#${pullNumber}`);

      try {
        const settings = await getRepoSettings(repoFullName);
        if (!settings) {
          console.log(`Skipping analysis for unregistered repository: ${repoFullName}`);
          if (reviewId) {
            await updateReviewHistory(reviewId, {
              status: 'Failed',
              llmResponse: 'Error: Skipping analysis for unregistered repository.'
            });
          }
        } else if (!settings.active) {
          console.log(`Skipping analysis for inactive repository: ${repoFullName}`);
          if (reviewId) {
            await updateReviewHistory(reviewId, {
              status: 'Failed',
              llmResponse: 'Error: Skipping analysis for inactive repository.'
            });
          }
        } else {
          const finalUserId = settings.user_id || userId;
          const octokit = getInstallationOctokit(installationId);
          
          if (reviewId) {
            await updateReviewHistory(reviewId, {
              status: 'Analyzing',
              llmResponse: 'Analyzing pull request diff...'
            });
          }
          
          await analyzePullRequest(octokit, owner, repo, pullNumber, finalUserId, reviewId);
        }
      } catch (err) {
        console.error(`Failed to process queued pull request ${repoFullName}#${pullNumber}:`, err.message || err);
        if (reviewId) {
          try {
            await updateReviewHistory(reviewId, {
              status: 'Failed',
              llmResponse: `Error: ${err.message || err}`
            });
          } catch (dbErr) {
            console.error('Failed to update review status to Failed:', dbErr.message);
          }
        }
      }
    }

    isProcessingQueue = false;
    triggerQueueProcessing();
  }, 1000); // 1-second delay between sequential reviews to prevent hitting API secondary limits
}

async function analyzePullRequest(octokit, owner, repo, pull_number, userId = null, reviewId = null) {
  const repoName = `${owner}/${repo}`;

  try {
    console.log(`Fetching diff for ${repoName}#${pull_number}`);

    const response = await withRetry(() => octokit.pulls.get({
      owner,
      repo,
      pull_number,
      headers: {
        accept: 'application/vnd.github.v3.diff',
      },
    }));

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
      const errorMsg = `Error: AI analysis failed: ${llmError.message || llmError}`;
      try {
        if (reviewId) {
          await updateReviewHistory(reviewId, {
            llmResponse: errorMsg,
            cleanedDiffSize: cleanedDiff.length,
            rawDiff,
            status: 'Failed',
          });
        } else {
          await saveReviewHistory({
            repoFullName: repoName,
            prNumber: pull_number,
            prTitle: `PR #${pull_number}`,
            reviewer: 'GitGuard AI',
            llmResponse: errorMsg,
            cleanedDiffSize: cleanedDiff.length,
            rawDiff,
            userId,
            status: 'Failed',
          });
        }
      } catch (databaseError) {
        console.error(`Database write failure while saving failed review for ${repoName}#${pull_number}:`, databaseError.message || databaseError);
      }
      return null;
    }

    // Try posting the comment, handle failure gracefully without blocking
    try {
      await withRetry(() => octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: llmResponse,
      }));
    } catch (commentError) {
      const permissionMessage = commentError?.status === 403 || commentError?.status === 404
        ? 'GitHub token permission restriction or repository access issue'
        : 'Unexpected GitHub comment write failure';
      console.error(`${permissionMessage} while posting review for ${repoName}#${pull_number}:`, commentError.message || commentError);
    }

    // Try saving history, handle failure gracefully without blocking
    try {
      if (reviewId) {
        await updateReviewHistory(reviewId, {
          llmResponse,
          cleanedDiffSize: cleanedDiff.length,
          rawDiff,
          status: 'Completed',
        });
      } else {
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
      }
    } catch (databaseError) {
      const timeoutMessage = databaseError?.code === 'SQLITE_BUSY' || databaseError?.code === 'SQLITE_TIMEOUT'
        ? 'Database timeout while saving review history'
        : 'Database write failure while saving review history';
      console.error(`${timeoutMessage} for ${repoName}#${pull_number}:`, databaseError.message || databaseError);
    }

    return { rawDiff, cleanedDiff, llmResponse };
  } catch (error) {
    console.error(`Failed to analyze PR ${owner}/${repo}#${pull_number}:`, error.message || error);
    if (reviewId) {
      try {
        await updateReviewHistory(reviewId, {
          llmResponse: `Error: ${error.message || error}`,
          status: 'Failed',
        });
      } catch (dbErr) {
        console.error('Failed to update status on catch block:', dbErr.message);
      }
    }
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