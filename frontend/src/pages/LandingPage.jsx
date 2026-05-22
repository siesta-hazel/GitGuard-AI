import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ArrowRight, Shield, Zap, Eye } from 'lucide-react';
import '../styles/landing.css';

function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: 'Security Analysis',
      description: 'Detect vulnerabilities and risky patterns before merge.'
    },
    {
      icon: Zap,
      title: 'Fast AI Reviews',
      description: 'Get instant, actionable review feedback for every pull request.'
    },
    {
      icon: Eye,
      title: 'Code Quality Visibility',
      description: 'Track maintainability, reliability, and standards in one view.'
    }
  ];

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
          <h1 className="hero-headline">GitGuard AI</h1>
          <p className="hero-subheadline">
            Real-time automated pull request analysis powered by AI. Catch issues before they ship.
          </p>
          
          <Link to="/auth" className="cta-button">
            <span>Get Started</span>
            <ArrowRight size={20} />
          </Link>

          <div className="features-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div className="feature-card" key={feature.title}>
                  <div className="feature-icon">
                    <Icon size={24} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              );
            })}
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
