# Developer Reference

## Environment

- Node.js backend with Express and EJS.
- React frontend with Vite and React Router.
- SQLite persistence.
- Groq for review generation.

## Required Variables

- `GITHUB_ACCESS_TOKEN`
- `GITHUB_WEBHOOK_SECRET`
- `GROQ_API_KEY`
- `JWT_SECRET`

## Commands

- `npm install`
- `npm start`
- `npm run frontend`
- `npm run build`

## Performance Targets

| Metric | Target | Status |
| --- | --- | --- |
| First Paint | Under 1 second | Verified |
| Time to Interactive | Under 2 seconds | Verified |
| LCP | Under 2.5 seconds | Verified |
| Dev HMR | Under 100 ms | Verified |
