const { analyzeDiffWithLLM } = require('./llm');
const db = require('./db');

function cleanRawDiff(rawDiff) {
  return rawDiff
    .split('\n')
    .filter(line => {
      if (line.startsWith('diff --git')) return true;
      if (line.startsWith('@@')) return true;
      if (line.startsWith('+++')) return true;
      if (line.startsWith('---')) return true;
      if (line.startsWith('+')) return true;
      return false;
    })
    .join('\n');
}

async function analyzePullRequest(octokit, owner, repo, pull_number) {
  try {
    const repoName = `${owner}/${repo}`;
    console.log(`📥 Fetching diff for ${repoName}#${pull_number}`);

    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
      headers: {
        accept: 'application/vnd.github.v3.diff'
      }
    });

    const rawDiff = typeof response.data === 'string' ? response.data : '';
    if (!rawDiff) {
      throw new Error('GitHub API did not return raw diff text');
    }

    const cleanedDiff = cleanRawDiff(rawDiff);
    console.log(`📄 Cleaned diff size: ${cleanedDiff.length} chars`);

    const llmResponse = await analyzeDiffWithLLM(cleanedDiff);
    console.log('🤖 LLM response:\n', llmResponse);

    try {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: llmResponse
      });
    } catch (commentError) {
      console.error('❌ Failed to post review comment to GitHub PR', commentError);
    }

    db.run(
      `INSERT INTO review_history (repo_full_name, pr_number, pr_title, reviewer, llm_response)
       VALUES (?, ?, ?, ?, ?)`,
      [repoName, pull_number, `PR #${pull_number}`, 'GitGuard AI', llmResponse],
      (err) => { if (err) console.error('Failed to save history:', err); }
    );

    console.log(`✅ Comment posted on PR #${pull_number}`);

    return { rawDiff, cleanedDiff, llmResponse };
  } catch (error) {
    console.error(`❌ Failed to analyze PR ${owner}/${repo}#${pull_number}:`, error);
    throw error;
  }
}

module.exports = { analyzePullRequest, cleanRawDiff };