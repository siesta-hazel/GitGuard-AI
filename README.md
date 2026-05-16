# 🛡️ GitGuard AI – Automated Pull Request Sentinel

GitGuard AI is an internal tool that listens for GitHub pull request events, analyzes the code diff using **Groq LLM** (fast, cost-effective), and posts intelligent code reviews directly on the PR – catching bugs, security issues, and performance problems **before** they reach production.

---

## ✨ Features

- 🔍 **Automatic PR analysis** – triggered on `opened` or `synchronize` events.
- 🤖 **AI-powered reviews** using Groq’s Llama 3.3 70B model.
- 🐞 **Detects**:
  - Logical bugs (off-by-one, null pointers, race conditions)
  - Security vulnerabilities (SQL injection, XSS, hardcoded secrets, `eval()`)
  - Performance issues (O(n²) loops, memory leaks)
- 💡 **Suggests fixed code** – not just warnings, but corrected blocks.
- 📝 **Markdown-formatted comments** – clear, actionable, and GitHub-flavored.
- 🔒 **Secure webhook** – HMAC-SHA256 signature verification.
- 🧹 **Token-efficient diff cleaning** – only relevant lines sent to the LLM.

---

## 🧱 Tech Stack

| Component          | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Runtime            | Node.js (v18+)                                  |
| Web framework      | Express                                         |
| GitHub API client  | Octokit                                         |
| LLM provider       | Groq (`llama-3.3-70b-versatile`)               |
| Webhook security   | `crypto` (HMAC-SHA256)                          |
| Database (future)  | SQLite / PostgreSQL                             |
| Deployment         | Docker, Render, or any Node.js host             |

---

## 📁 Project Structure

```text
gitguard-ai/
├── server.js          # Main webhook listener & GitHub interactions
├── llm.js             # Groq prompt engineering & API call
├── db.js              # Database setup (week 4 – dashboard)
├── .env               # Environment variables (never commit)
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A GitHub repository (for testing)
- A Groq API key (free tier available)
- A GitHub Personal Access Token (with `repo` scope) or a GitHub App

### 1. Clone & Install

```bash
git clone https://github.com/your-username/gitguard-ai.git
cd gitguard-ai
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

### 3. Run Locally

```bash
node server.js
```

You should see:

```text
🚀 GitGuard AI running on port 3000
📋 Webhook secret loaded: YES
```

### 4. Expose to GitHub (for testing)

Use **ngrok** to create a public HTTPS tunnel:

```bash
ngrok http 3000
```

Copy the generated HTTPS URL.

---

## 🔧 GitHub Setup

### Webhook Configuration

1. Go to your repository → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**:
   ```text
   https://your-ngrok-url.ngrok.io/webhook
   ```
3. **Content type**: `application/json`
4. **Secret**: Must match `GITHUB_WEBHOOK_SECRET` in your `.env`
5. Under **Events**, choose:
   - **Let me select individual events**
   - Enable **Pull requests**
6. Click **Add webhook**

### Personal Access Token

Generate a classic GitHub token with the `repo` scope:

- GitHub → **Settings** → **Developer settings**
- **Personal access tokens** → **Tokens (classic)**

Paste the token into:

```env
GITHUB_ACCESS_TOKEN=your_token_here
```

## 🐳 Docker Deployment

Build and run using Docker Compose:

```bash
docker-compose up --build
```

The application will:

- Load environment variables from `.env`
- Persist SQLite data using the mounted `./data` volume
