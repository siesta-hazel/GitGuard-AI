const { analyzeDiffWithLLM } = require('./llm');

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

async function analyzePullRequest(octokit, owner, repo, pull_number) {
  try {
    console.log(`📥 Fetching diff for ${owner}/${repo}#${pull_number}`);

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

    return { rawDiff, cleanedDiff, llmResponse };
  } catch (error) {
    console.error(`❌ Failed to analyze PR ${owner}/${repo}#${pull_number}:`, error);
    throw error;
  }
}

module.exports = { analyzePullRequest, cleanRawDiff };