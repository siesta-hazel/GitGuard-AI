import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ArrowRight, Shield, Zap, Eye } from 'lucide-react';
import '../styles/landing.css';

function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: 'Security Analysis',
      description: 'Detect vulnerabilities and security risks before they reach production'
    },
    {
      icon: Zap,
      title: 'Real-time Feedback',
      description: 'Instant AI-powered insights on code quality and best practices'
    },
    {
      icon: Eye,
      title: 'Code Review',
      description: 'Comprehensive analysis of performance, patterns, and potential issues'
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
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon">
                    <IconComponent size={32} color="#0FBF3E" />
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
