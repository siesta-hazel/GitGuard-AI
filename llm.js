const Groq = require('groq-sdk');

let groqClient;

function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('Missing GROQ_API_KEY in environment variables');
    }

    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

function buildDiffReviewMessages(diff) {
  return [
    {
      role: 'system',
      content: 'You are GitGuard AI, an expert code reviewer. Strictly analyze the provided diff for logical bugs, security vulnerabilities such as SQL injection, hardcoded secrets, and XSS, or glaring performance flaws. Return actionable code fixes in GitHub-flavored Markdown. Be specific, concise, and practical.'
    },
    {
      role: 'user',
      content: `Analyze this diff:\n\`\`\`diff\n${diff}\n\`\`\``
    }
  ];
}

async function analyzeDiffWithLLM(diff) {
  try {
    const groq = getGroqClient();

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

module.exports = { analyzeDiffWithLLM, buildDiffReviewMessages, getGroqClient };