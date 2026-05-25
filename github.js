const { analyzeDiffWithLLM } = require('./llm');
const { saveReviewHistory } = require('./data/store');

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

async function analyzePullRequest(octokit, owner, repo, pull_number) {
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

    const llmResponse = await analyzeDiffWithLLM(cleanedDiff);
    console.log('LLM review generated for', repoName, `PR #${pull_number}`);

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

    try {
      await saveReviewHistory({
        repoFullName: repoName,
        prNumber: pull_number,
        prTitle: `PR #${pull_number}`,
        reviewer: 'GitGuard AI',
        llmResponse,
        cleanedDiffSize: cleanedDiff.length,
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

module.exports = { analyzePullRequest, cleanRawDiff };