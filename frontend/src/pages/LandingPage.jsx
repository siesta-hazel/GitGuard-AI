import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Github, GitPullRequest, Lock, ShieldCheck, Sparkles } from 'lucide-react';
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

function LandingPage() {
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
          <Link to="/auth">Sign In</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-shell">
          <div className="hero-copy">
            <div className="hero-kicker">
              <Sparkles size={16} />
              <span>Commercial-grade pull request intelligence</span>
            </div>

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
              <div className="hero-note">Secure session flow, live review logging, and clean review delivery.</div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel__topline">
              <span className="panel-chip panel-chip--active">Live monitoring</span>
              <span className="panel-chip">Diff analysis</span>
            </div>

            <div className="hero-panel__content">
              <div className="command-card">
                <span className="command-label">Incoming webhook</span>
                <strong>pull_request.opened</strong>
                <p>Raw payload verification, diff retrieval, and AI analysis are orchestrated server-side.</p>
              </div>

              <div className="command-card command-card--accent">
                <span className="command-label">Review output</span>
                <strong>Markdown response</strong>
                <p>Readable guidance is written back to GitHub and persisted for audit-ready history.</p>
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
