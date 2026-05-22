import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ShieldCheck, Activity, GitPullRequest } from 'lucide-react';
import '../styles/dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-navbar">
        <div className="dashboard-navbar-container">
          <div className="dashboard-brand">
            <Github size={22} />
            <span>GitGuard AI</span>
          </div>
          <Link to="/" className="dashboard-link">Back to Home</Link>
        </div>
      </header>

      <main className="dashboard-main">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Your review intelligence is ready.</p>

        <section className="dashboard-cards">
          <article className="dashboard-card">
            <ShieldCheck size={22} />
            <h3>Security Summary</h3>
            <p>Critical findings and secure coding recommendations for recent commits.</p>
          </article>
          <article className="dashboard-card">
            <Activity size={22} />
            <h3>Review Velocity</h3>
            <p>Track analysis time and feedback completion across active repositories.</p>
          </article>
          <article className="dashboard-card">
            <GitPullRequest size={22} />
            <h3>Pull Request Health</h3>
            <p>Monitor risk score, quality signals, and merge readiness at a glance.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
