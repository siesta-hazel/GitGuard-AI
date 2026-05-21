import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ArrowRight } from 'lucide-react';
import '../styles/landing.css';

function LandingPage() {
  const codeDiff = `- function analyzeCode() {
-   return null;
- }
+ function analyzeCode(pr) {
+   const analysis = performAIReview(pr);
+   return generateReport(analysis);
+ }`;

  return (
    <div className="landing-page">
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <Github size={24} color="#0FBF3E" />
            <span className="brand-title">GitGuard AI</span>
          </div>
          <nav className="navbar-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/" className="nav-link">Features</Link>
            <Link to="/" className="nav-link">Docs</Link>
            <Link to="/auth" className="nav-link sign-in">Sign In</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-headline">Intelligent PR Reviews, Instantly</h1>
          <p className="hero-subheadline">
            Real-time automated pull request analysis powered by AI. Catch issues before they ship.
          </p>
          
          <Link to="/auth" className="cta-button">
            <span>Get Started</span>
            <ArrowRight size={20} />
          </Link>

          <div className="code-diff-container">
            <div className="diff-header">
              <span className="diff-file">example.js</span>
            </div>
            <pre className="diff-display">
              <code>{codeDiff}</code>
            </pre>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p className="footer-text">Batch No. 15 | Zaalima Web Development Pvt. Ltd.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
