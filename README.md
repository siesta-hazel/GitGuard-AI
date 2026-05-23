# GitGuard AI - Automated Pull Request Sentinel

GitGuard AI is a full-stack pull request review assistant that analyzes GitHub diffs, posts AI-generated review comments, and stores review history for later inspection.

## Core Features

- Automatic PR analysis on `opened` and `synchronize` events.
- Groq-powered review generation using `llama-3.3-70b-versatile`.
- Length-safe HMAC verification for webhook requests.
- Auth endpoints for registration and login with signed session tokens.
- React landing, auth, and dashboard surfaces with a glassmorphism design system.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in real values for the required variables:
	- `GITHUB_ACCESS_TOKEN`
	- `GITHUB_WEBHOOK_SECRET`
	- `GROQ_API_KEY`
	- `JWT_SECRET`
	(Optionally set `PORT`.) `.env` is already listed in `.gitignore` to avoid leaking secrets.
3. Run the backend with `npm start`.
4. Run the frontend with `npm run frontend`.

## API Endpoints

- `POST /webhook`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /health`
- `GET /dashboard`
- `GET /history`

## Scripts

- `npm start`
- `npm run frontend`
- `npm run build`
