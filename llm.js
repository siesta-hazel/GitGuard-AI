const Groq = require('groq-sdk');
const config = require('./config');
const { withRetry } = require('./retry');

let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return groqClient;
}

function buildDiffReviewMessages(diff) {
  return [
    {
      role: 'system',
      content: 'You are GitGuard AI, an expert code reviewer. Analyze the provided diff strictly for logical bugs, structural flaws, and security oversights (such as SQL injection, hardcoded secrets, XSS, and high-risk performance vulnerabilities).\n\nFor EACH specific issue you identify, you MUST output a structured feedback block to allow inline display. Each block MUST use the following exact template:\n\n[FEEDBACK]\nFILE: <filepath>\nLINE: <exact text of the added line, starting with +>\nCOMMENT: <your concise, actionable review comment>\n[/FEEDBACK]\n\nAt the end of your response, you may write a general summary of the pull request under the heading "### Summary".'
    },
    {
      role: 'user',
      content: `Analyze this diff:\n\`\`\`diff\n${diff}\n\`\`\``
    }
  ];
}

async function analyzeDiffWithLLM(diff) {
  try {
    // Lazy-initialize Groq client inside call block using verified configuration
    const groq = getGroqClient();

    const completion = await withRetry(() => groq.chat.completions.create({
      messages: buildDiffReviewMessages(diff),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1500,
    }));

    return completion.choices[0]?.message?.content || 'No response was returned from Groq.';
  } catch (error) {
    console.error('Groq analysis failed:', error.message || error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzeDiffWithLLM,
  buildDiffReviewMessages,
  getGroqClient
};