# 🛡️ GitGuard AI – Automated Pull Request Sentinel

GitGuard AI is an internal tool that listens for GitHub pull request events, analyzes code diffs using **Groq LLM** (fast, cost-effective), and posts intelligent code reviews directly on the PR – catching bugs, security issues, and performance problems **before** they reach production. The dashboard is protected by a **login page** with registration and token-based authentication.

---

## ✨ Features

* 🔍 **Automatic PR analysis** – triggered on `opened` or `synchronize` events.
* 🤖 **AI-powered reviews** using Groq’s Llama 3.3 70B model.
* 🐞 **Detects**:

  * Logical bugs (off-by-one, null pointers, race conditions)
  * Security vulnerabilities (SQL injection, XSS, hardcoded secrets, `eval()`)
  * Performance issues (O(n²) loops, memory leaks)
* 💡 **Suggests fixed code** – not just warnings, but corrected blocks.
* 📝 **Markdown-formatted comments** – clear, actionable, and GitHub-flavored.
* 🔒 **Secure webhook** – HMAC-SHA256 signature verification.
* 🧹 **Token-efficient diff cleaning** – only relevant lines sent to the LLM.
* 📊 **Premium dashboard** (React) with:

  * Light/dark mode toggle
  * Real-time webhook stream
  * Interactive diff viewer with inline AI comments
  * Repository policy controls (Strict Mode, Active/Inactive)
  * Review history with Markdown rendering
* 🔐 **Authentication** – login and registration pages, JWT session stored in `localStorage`.

---

## 🧱 Tech Stack

| Component         | Technology                                    |
| ----------------- | --------------------------------------------- |
| Runtime           | Node.js (v18+)                                |
| Web framework     | Express                                       |
| GitHub API client | Octokit                                       |
| LLM provider      | Groq (model: `llama-3.3-70b-versatile`)       |
| Webhook security  | `crypto` (HMAC-SHA256)                        |
| Database          | SQLite (review history, repo settings, users) |
| Frontend          | React + Vite                                  |
| Routing           | React Router                                  |
| Styling           | CSS custom properties (light/dark themes)     |
| Authentication    | JWT (session stored in localStorage)          |
| Deployment        | Docker, Render, or any Node.js host           |

---

## 📁 Project Structure

```text
GitGuard-AI/
├── backend/                (or root, depending on your setup)
│   ├── routes/
│   │   ├── auth.js          # login / register endpoints
│   │   ├── webhook.js       # GitHub webhook receiver
│   │   └── dashboard.js     # API for dashboard data
│   ├── data/
│   │   ├── store.js         # database operations (users, repos, reviews)
│   │   └── gitguard.db      # SQLite database
│   ├── server.js           # Express entry point
│   ├── llm.js              # Groq integration
│   ├── db.js               # Database helpers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/          LandingPage, Dashboard, AuthRouter
│   │   ├── components/     ProtectedRoute, metric cards, diff viewer
│   │   └── styles/         global.css, dashboard.css, landing.css
│   ├── public/
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+ and npm
* A GitHub repository (for testing)
* A Groq API key (free tier available)
* A GitHub Personal Access Token (with `repo` scope) or a GitHub App

### 1. Clone & Install

```bash
git clone https://github.com/siesta-hazel/GitGuard-AI.git
cd GitGuard-AI
```

### 2. Backend setup

```bash
cd backend   # or stay in root if backend files are at root
npm install
```

Create a `.env` file in the backend folder:

```env
PORT=3000
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxx
JWT_SECRET=your_jwt_secret_here
```

Run the backend:

```bash
node server.js
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev   # starts Vite dev server on http://localhost:5173
```

For production: `npm run build` and serve the `dist` folder via the backend.

### 4. Expose to GitHub (for webhooks)

Use **ngrok** to create a public HTTPS tunnel:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.dev`). This will be your webhook **Payload URL**.

---

## 🔧 GitHub Setup

### Webhook Configuration

1. Go to your repository → **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL**: `https://your-ngrok-url.ngrok-free.dev/webhook`
3. **Content type**: `application/json`
4. **Secret**: Must match `GITHUB_WEBHOOK_SECRET` in your `.env`.
5. **Events**: Select **"Let me select individual events"** → check **Pull requests**.
6. Click **Add webhook**.

### Personal Access Token

* Generate a classic token with **`repo`** scope (Settings → Developer settings → Personal access tokens → Tokens (classic)).
* Copy the token into `GITHUB_ACCESS_TOKEN` in your `.env`.

---

## 🔐 Authentication & Dashboard Access

The application has a **login page** and a **registration page**.

* **Login URL**: `http://localhost:5173/auth` (React dev server) or `http://localhost:3000/auth` (if backend serves the frontend)
* Create an account through the registration page.

After logging in, you are redirected to the dashboard (`/dashboard`). The session is stored as a JWT token in `localStorage` and automatically attached to API requests via the `Authorization: Bearer <token>` header.

### Dashboard Access

* React frontend (dev): `http://localhost:5173/dashboard`
* Backend-served (if you build and serve static files): `http://localhost:3000/dashboard`

The dashboard will show:

* Repository settings (add repo, toggle Strict Mode, Active/Inactive)
* Live webhook stream (recent pull request events)
* AI review details (Markdown summary, interactive diff with inline comments)

---

## 🧪 Testing the Bot

### Simple Buggy PR

Create a file `calculator.js` with:

```javascript
function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i <= arr.length; i++) {  // off-by-one
    sum += arr[i];
  }
  return sum;
}
```

Open a pull request. Within a few seconds, GitGuard AI will comment with the bug and a corrected loop.

### More Test Cases

See `TESTING.md` (or the examples below) for SQL injection, quadratic loops, hardcoded secrets, memory leaks, and edge cases (empty diff, binary files, multiple files).

---

## 🐳 Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build
```

The container uses the `.env` file and persists the SQLite database (for the future dashboard) in the `./data` volume.
