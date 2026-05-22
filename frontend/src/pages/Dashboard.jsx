import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, FileCode2, GitPullRequest, Github, ShieldCheck } from 'lucide-react';
import '../styles/dashboard.css';

const webhookStream = [
  {
    title: 'pull_request.opened',
    repo: 'acme/payments-service',
    detail: 'Signature verified, diff fetched, and queued for review analysis.',
  },
  {
    title: 'pull_request.synchronize',
    repo: 'northwind/web-console',
    detail: 'Incremental diff normalized and reprocessed for the latest commit set.',
  },
  {
    title: 'review.comment.posted',
    repo: 'orbital/platform-core',
    detail: 'Markdown review appended to the pull request conversation thread.',
  },
];

const reviewHistory = `# Latest review

## Critical observations
- Avoid sending raw webhook payload data into logs.
- Ensure token storage remains scoped to authenticated browser sessions.

## Recommendations
- Keep the webhook verifier length-safe and route-local.
- Preserve database writes in a separate error boundary from GitHub comment posting.
- Return structured JSON for auth flows so the frontend can recover cleanly.

## Status
- Analysis complete
- Comment posted
- Review history persisted
`;

function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-glow dashboard-glow--one" aria-hidden="true" />
      <div className="dashboard-glow dashboard-glow--two" aria-hidden="true" />

      <header className="dashboard-nav">
        <div className="dashboard-brand">
          <Github size={22} color="#0FBF3E" />
          <div>
            <strong>GitGuard AI</strong>
            <span>Operational review surface</span>
          </div>
        </div>

        <Link to="/" className="dashboard-home-link">
          Back to Home
          <ArrowRight size={16} />
        </Link>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">Control center</p>
            <h1>Live webhook monitoring with a dedicated review history console.</h1>
            <p>
              The left side watches incoming pull request events in real time while the right side renders AI review
              history in a scrollable monospaced pane tuned for dense markdown output.
            </p>
          </div>

          <div className="dashboard-statbar">
            <article>
              <ShieldCheck size={18} />
              <strong>Secure ingestion</strong>
              <span>HMAC verified webhook entrypoint</span>
            </article>
            <article>
              <Activity size={18} />
              <strong>Realtime visibility</strong>
              <span>Incoming PR events and responses</span>
            </article>
            <article>
              <GitPullRequest size={18} />
              <strong>Review depth</strong>
              <span>Policy-aware AI code analysis</span>
            </article>
          </div>
        </section>

        <section className="dashboard-split">
          <article className="dashboard-panel dashboard-panel--stream">
            <div className="dashboard-panel__header">
              <div>
                <p className="dashboard-panel__kicker">Incoming PR webhooks</p>
                <h2>Live monitor</h2>
              </div>
              <span>Streaming</span>
            </div>

            <div className="stream-list">
              {webhookStream.map((item) => (
                <div className="stream-item" key={item.title}>
                  <div className="stream-item__icon">
                    <GitPullRequest size={16} />
                  </div>
                  <div className="stream-item__body">
                    <strong>{item.title}</strong>
                    <span>{item.repo}</span>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel dashboard-panel--history">
            <div className="dashboard-panel__header">
              <div>
                <p className="dashboard-panel__kicker">AI review history</p>
                <h2>Markdown console</h2>
              </div>
              <span>Scrollable</span>
            </div>

            <div className="history-console">
              <div className="history-console__meta">
                <FileCode2 size={16} />
                <span>Courier New rendering for review output</span>
              </div>
              <pre>{reviewHistory}</pre>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
