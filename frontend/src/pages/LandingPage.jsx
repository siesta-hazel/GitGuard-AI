import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Github, GitPullRequest, Lock, Moon, ShieldCheck, Sun } from 'lucide-react';
import '../styles/landing.css';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Security-first analysis',
    copy: 'Every pull request is reviewed against risky code paths, leaking secrets, and unsafe changes.',
  },
  {
    icon: GitPullRequest,
    title: 'Operational PR visibility',
    copy: 'See webhook activity, review output, and repository policy status in one command surface.',
  },
  {
    icon: Lock,
    title: 'Secure by design',
    copy: 'Webhook verification, token-backed auth, and durable storage keep the stack production-ready.',
  },
];

function LandingPage({ theme, onToggleTheme }) {
  const [activePanel, setActivePanel] = useState('live');

  const panelContent = useMemo(() => {
    if (activePanel === 'diff') {
      return {
        first: {
          label: 'Diff analyzer',
          title: 'Structured patch parsing',
          body: 'File-level change summaries, risk markers, and semantic context are extracted before generating review output.',
        },
        second: {
          label: 'Quality gate',
          title: 'Actionable issue detection',
          body: 'Potential regressions, missing validation paths, and unsafe data handling patterns are highlighted for reviewers.',
        },
      };
    }

    return {
      first: {
        label: 'Incoming webhook',
        title: 'pull_request.opened',
        body: 'Raw payload verification, diff retrieval, and AI analysis are orchestrated server-side.',
      },
      second: {
        label: 'Review output',
        title: 'Markdown response',
        body: 'Readable guidance is written back to GitHub and persisted for audit-ready history.',
      },
    };
  }, [activePanel]);

  return (
    <div className="landing-page">
      <div className="landing-glow landing-glow--one" aria-hidden="true" />
      <div className="landing-glow landing-glow--two" aria-hidden="true" />

      <header className="landing-nav">
        <div className="landing-nav__brand">
          <Github size={24} color="#0FBF3E" />
          <span>GitGuard AI</span>
        </div>

        <nav className="landing-nav__links" aria-label="Primary">
          <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/auth">Sign In</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-shell">
          <div className="hero-copy">
            <h1>Secure code review automation with a premium operational interface.</h1>
            <p>
              GitGuard AI turns webhook traffic into fast, readable, and actionable review feedback.
              Built for teams that want a polished product surface without sacrificing backend rigor.
            </p>

            <div className="hero-actions">
              <Link to="/auth" className="hero-button">
                <span>Get Started</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel__topline">
              <button
                type="button"
                className={`panel-chip ${activePanel === 'live' ? 'panel-chip--active' : ''}`}
                onClick={() => setActivePanel('live')}
              >
                Live monitoring
              </button>
              <button
                type="button"
                className={`panel-chip ${activePanel === 'diff' ? 'panel-chip--active' : ''}`}
                onClick={() => setActivePanel('diff')}
              >
                Diff analysis
              </button>
            </div>

            <div className="hero-panel__content">
              <div className="command-card">
                <span className="command-label">{panelContent.first.label}</span>
                <strong>{panelContent.first.title}</strong>
                <p>{panelContent.first.body}</p>
              </div>

              <div className="command-card command-card--accent">
                <span className="command-label">{panelContent.second.label}</span>
                <strong>{panelContent.second.title}</strong>
                <p>{panelContent.second.body}</p>
              </div>
            </div>

            <div className="hero-mockup">
              <div className="hero-mockup__canvas">
                <pre className="code-diff">{"// file: src/components/Button.jsx\n--- a/src/components/Button.jsx\n+++ b/src/components/Button.jsx\n@@\n - export default function Button({ children }) {\n -   return <button className=\"btn\">{children}</button>;\n - }\n +export default function Button({ children, variant = 'primary' }) {\n +  return <button className={`btn btn--${variant}`}>{children}</button>;\n +}\n"}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-grid" aria-label="Product highlights">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <article className="feature-card" key={item.title}>
                <div className="feature-card__icon">
                  <Icon size={20} />
                </div>
                <h2>{item.title}</h2>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </section>
      </main>

      <footer className="landing-footer">Batch No. 15 | Zaalima Web Development Pvt. Ltd.</footer>
    </div>
  );
}

export default LandingPage;
