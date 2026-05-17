const { analyzeDiffWithLLM } = require('./llm');
const db = require('./db');

function cleanRawDiff(rawDiff) {
  return rawDiff
    .split('\n')
    .filter(line =>
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('new file mode ') ||
      line.startsWith('deleted file mode ') ||
      line.startsWith('old mode ') ||
      line.startsWith('new mode ') ||
      line.startsWith('similarity index ') ||
      line.startsWith('dissimilarity index ') ||
      line.startsWith('rename from ') ||
      line.startsWith('rename to ') ||
      line.startsWith('copy from ') ||
      line.startsWith('copy to ') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('@@') ||
      line.startsWith('+') ||
      line.startsWith('-')
    )
    .join('\n');
}

async function getRepoSettings(repoName) {
  return new Promise((resolve) => {
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
}

async function analyzePullRequest(octokit, owner, repo, pull_number, prTitle) {
  try {
    const repoName = `${owner}/${repo}`;
    console.log(`📥 Fetching diff for ${repoName}#${pull_number}`);

    // 1. Get PR diff
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

    // 2. Get repo settings from DB
    const settings = await getRepoSettings(repoName);

    if (!settings.active) {
      console.log(`⏸️ GitGuard is inactive for ${repoName}`);
      return;
    }

    // 3. Call LLM with settings
    const llmResponse = await analyzeDiffWithLLM(cleanedDiff, settings);
    console.log('🤖 LLM response:\n', llmResponse);

    // 4. Post comment
    const commentBody = `## 🤖 GitGuard AI (Groq)\n\n${llmResponse}\n\n---\n*Automated review by GitGuard AI*`;
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body: commentBody
    });

    // 5. Save to history
    db.run(
      `INSERT INTO review_history (repo_full_name, pr_number, pr_title, reviewer, llm_response)
       VALUES (?, ?, ?, ?, ?)`,
      [repoName, pull_number, prTitle, 'GitGuard AI', llmResponse],
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