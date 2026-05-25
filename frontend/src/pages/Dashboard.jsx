import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode2, GitPullRequest, Github, Moon, Sun, LogOut, Calendar, Layers } from 'lucide-react';
import '../styles/dashboard.css';

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '';
}

async function fetchReviewsWithFallback() {
  const baseCandidates = [
    resolveApiBaseUrl(),
    '',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ];
  const uniqueBases = [...new Set(baseCandidates)];
  const token = localStorage.getItem('gitguard_session_token');

  let lastError = null;
  for (const baseUrl of uniqueBases) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${baseUrl}/api/reviews`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('gitguard_session_token');
        throw new Error('Session expired');
      }

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach review service');
}

function Dashboard({ theme, onToggleTheme }) {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const loadReviews = async () => {
      try {
        const data = await fetchReviewsWithFallback();
        if (active) {
          setReviews(data || []);
          if (data && data.length > 0) {
            setSelectedReview(data[0]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          if (err.message === 'Session expired') {
            navigate('/auth');
          } else {
            setError(err.message || 'Failed to load reviews');
            setIsLoading(false);
          }
        }
      }
    };

    loadReviews();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('gitguard_session_token');
    navigate('/auth');
  };

  const formatSize = (bytes) => {
    if (bytes === undefined || bytes === null) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-glow dashboard-glow--one" aria-hidden="true" />
      <div className="dashboard-glow dashboard-glow--two" aria-hidden="true" />

      <header className="dashboard-nav">
        <div className="dashboard-brand">
          <Github size={24} color="#0FBF3E" />
          <div>
            <strong>GitGuard AI</strong>
            <span>Operational review surface</span>
          </div>
        </div>
        <div className="dashboard-nav-actions">
          <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button type="button" className="dashboard-logout-btn" onClick={handleLogout} aria-label="Sign Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-metrics">
          <div className="metrics-grid">
            <div className="metric-tile">
              <strong>Stored Reviews</strong>
              <span className="metric-value">{reviews.length}</span>
            </div>
            <div className="metric-tile">
              <strong>System Status</strong>
              <span className="metric-value">Operational</span>
            </div>
          </div>
        </section>

        <section className="dashboard-split">
          <article className="dashboard-panel dashboard-panel--stream">
            <div className="dashboard-panel__header">
              <div>
                <p className="dashboard-panel__kicker">Review logs</p>
                <h2>History Feed</h2>
              </div>
              <span>{reviews.length} entries</span>
            </div>

            <div className="stream-list">
              {isLoading ? (
                <div className="dashboard-loading-state">
                  <span>Loading review logs...</span>
                </div>
              ) : error ? (
                <div className="dashboard-error-state">
                  <span>{error}</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="dashboard-empty-state">
                  <span>No reviews recorded. Open or synchronize a pull request to trigger AI analysis.</span>
                </div>
              ) : (
                reviews.map((review) => (
                  <button
                    type="button"
                    key={review.id}
                    className={`stream-item ${selectedReview && selectedReview.id === review.id ? 'stream-item--active' : ''}`}
                    onClick={() => setSelectedReview(review)}
                  >
                    <div className="stream-item__icon">
                      <GitPullRequest size={16} />
                    </div>
                    <div className="stream-item__body">
                      <strong>{review.repo_full_name} · PR #{review.pr_number}</strong>
                      <span>{review.pr_title || 'AI review completed.'}</span>
                      <div className="stream-item__meta">
                        <span className="stream-item__meta-item">
                          <Calendar size={12} />
                          {new Date(review.timestamp).toLocaleString()}
                        </span>
                        <span className="stream-item__meta-item">
                          <Layers size={12} />
                          {formatSize(review.cleaned_diff_size)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="dashboard-panel dashboard-panel--history">
            <div className="dashboard-panel__header">
              <div>
                <p className="dashboard-panel__kicker">Markdown console</p>
                <h2>Review Content</h2>
              </div>
              <span>Monospace</span>
            </div>

            {selectedReview ? (
              <div className="history-console">
                <div className="history-console__meta">
                  <FileCode2 size={16} />
                  <span>Courier New rendering for PR #{selectedReview.pr_number}</span>
                </div>
                <div className="history-console__body">
                  <div className="review-meta-details">
                    <div className="detail-field">
                      <span className="detail-label">Repository</span>
                      <span className="detail-value">{selectedReview.repo_full_name}</span>
                    </div>
                    <div className="detail-field">
                      <span className="detail-label">Reviewer</span>
                      <span className="detail-value">{selectedReview.reviewer}</span>
                    </div>
                    <div className="detail-field">
                      <span className="detail-label">Cleaned Diff Size</span>
                      <span className="detail-value">{formatSize(selectedReview.cleaned_diff_size)}</span>
                    </div>
                  </div>
                  <pre className="monospace-markdown-surface">{selectedReview.llm_response}</pre>
                </div>
              </div>
            ) : (
              <div className="history-console-empty">
                <span>Select a review log to display details.</span>
              </div>
            )}
          </article>
        </section>
      </main>

      <footer className="corporate-footer">
        Batch No. 15 | Zaalima Web Development Pvt. Ltd.
      </footer>
    </div>
  );
}

export default Dashboard;
