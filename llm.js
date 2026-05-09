const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeDiffWithLLM(diff, settings = {}) {
  const strictMode = settings.strict_mode || false;
  const ignoreLinter = settings.ignore_linter || false;

  let extra = '';
  if (strictMode) extra += ' Also check edge cases, null safety, race conditions.';
  if (ignoreLinter) extra += ' Ignore code style – focus on logic, security, performance.';

  const systemPrompt = `You are an expert code reviewer. Analyze the git diff for:
1. Bugs (logical errors, off-by-one, null pointers)
2. Security vulnerabilities (SQL injection, XSS, hardcoded secrets)
3. Performance issues (O(n²) loops, bad caching)

For each issue: quote the problematic lines, explain why it's wrong, and provide a corrected code block.

Output in GitHub Markdown. If no issues, say "No critical issues found."${extra}`;

  const userPrompt = `Analyze this diff:\n\`\`\`diff\n${diff}\n\`\`\``;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1500,
    });
    return completion.choices[0]?.message?.content || '❌ No response from Groq.';
  } catch (error) {
    console.error('Groq error:', error);
    return `❌ AI analysis failed: ${error.message}`;
  }
}

module.exports = { analyzeDiffWithLLM };