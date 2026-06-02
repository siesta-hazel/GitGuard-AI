const path = require('path');
require('dotenv').config();

const requiredKeys = [
  'GITHUB_WEBHOOK_SECRET',
  'GITHUB_ACCESS_TOKEN',
  'GROQ_API_KEY',
  'JWT_SECRET'
];

const missingKeys = requiredKeys.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missingKeys.length > 0) {
  const errorMessage = `CRITICAL CONFIGURATION ERROR: The following required environment variables are missing: ${missingKeys.join(', ')}. Startup aborted.`;
  console.error('================================================================');
  console.error(errorMessage);
  console.error('================================================================');
  throw new Error(errorMessage);
}

const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
};

module.exports = Object.freeze(config);
