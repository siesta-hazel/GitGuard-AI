const Groq = require('groq-sdk');

function buildDiffReviewMessages(diff) {
  return [
    {
      role: 'system',
      content: 'You are GitGuard AI, an expert code reviewer.'
    },
    {
      role: 'user',
      content: [
        'Analyze the following Git Diff changes for critical bugs, security vulnerabilities (like leaked keys or SQL injection), or glaring performance flaws.',
        'Provide clear feedback and present your suggested fixes using GitHub-flavored Markdown code blocks.',
        '',
        '```diff',
        diff,
        '```'
      ].join('\n')
    }
  ];
}

async function analyzeDiffWithLLM(diff) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables');
  }

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      messages: buildDiffReviewMessages(diff),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1500,
    });
    return completion.choices[0]?.message?.content || '❌ No response from Groq.';
  } catch (error) {
    console.error('Groq error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

module.exports = { analyzeDiffWithLLM, buildDiffReviewMessages };