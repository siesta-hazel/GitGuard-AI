import React from 'react';
import { Link } from 'react-router-dom';
import { Github, LogOut } from 'lucide-react';
import '../styles/dashboard.css';

function Dashboard() {
  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-navbar">
        <div className="dashboard-navbar-container">
          <div className="navbar-brand">
            <Github size={24} color="#0FBF3E" />
            <span className="brand-title">GitGuard AI</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome to GitGuard AI</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2 className="card-title">Recent Repositories</h2>
            <p className="card-content">Your recently analyzed repositories will appear here</p>
          </div>

          <div className="dashboard-card">
            <h2 className="card-title">PR Analysis</h2>
            <p className="card-content">Real-time pull request analysis and insights</p>
          </div>

          <div className="dashboard-card">
            <h2 className="card-title">Security Alerts</h2>
            <p className="card-content">Monitor security vulnerabilities detected in your code</p>
          </div>

          <div className="dashboard-card">
            <h2 className="card-title">Settings</h2>
            <p className="card-content">Configure your GitGuard AI preferences</p>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p className="footer-text">Batch No. 15 | Zaalima Web Development Pvt. Ltd.</p>
      </footer>
    </div>
  );
}

export default Dashboard;
