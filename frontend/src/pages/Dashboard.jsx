import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCode2, GitPullRequest, Github, Moon, Sun, LogOut, 
  Calendar, Layers, Shield, ToggleLeft, Activity, 
  Plus, ShieldCheck, Loader2
} from 'lucide-react';
import '../styles/dashboard.css';

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '';
}

async function fetchDashboardDataWithFallback() {
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
      const response = await fetch(`${baseUrl}/api/dashboard-data`, {
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

// Helper to parse LLM Response for inline feedbacks
function parseFeedback(llmResponse) {
  if (!llmResponse) return { inline: [], summary: '' };

  const inline = [];
  let summary = llmResponse;

  // Regular expression to match [FEEDBACK] FILE: ... LINE: ... COMMENT: ... [/FEEDBACK]
  const feedbackRegex = /\[FEEDBACK\]\s*FILE:\s*([^\n]+)\s*LINE:\s*([^\n]+)\s*COMMENT:\s*([\s\S]*?)\s*\[\/FEEDBACK\]/gi;
  
  let match;
  summary = llmResponse.replace(feedbackRegex, '');

  feedbackRegex.lastIndex = 0;
  while ((match = feedbackRegex.exec(llmResponse)) !== null) {
    inline.push({
      file: match[1].trim(),
      lineCode: match[2].trim(),
      comment: match[3].trim()
    });
  }

  summary = summary.replace(/\[FEEDBACK\]|\[\/FEEDBACK\]/gi, '').trim();
  return { inline, summary };
}

// Helper to parse raw git diff text into files and lines
function parseDiff(diffText) {
  if (!diffText) return [];

  const files = [];
  const lines = diffText.split('\n');
  let currentFile = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      const parts = line.split(' ');
      const rawName = parts[3] || parts[2] || '';
      const name = rawName.replace(/^b\//, '').replace(/^a\//, '');
      currentFile = {
        name: name || 'Unknown File',
        lines: [],
        rawLines: []
      };
      files.push(currentFile);
    } else if (currentFile) {
      currentFile.rawLines.push(line);
    }
  }

  files.forEach(file => {
    let lineNumOld = 0;
    let lineNumNew = 0;
    
    file.lines = file.rawLines.map((line, idx) => {
      let type = 'normal';
      if (line.startsWith('+') && !line.startsWith('+++')) type = 'addition';
      else if (line.startsWith('-') && !line.startsWith('---')) type = 'deletion';
      else if (line.startsWith('@@')) {
        type = 'hunk-header';
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          lineNumOld = parseInt(match[1], 10) - 1;
          lineNumNew = parseInt(match[2], 10) - 1;
        }
      }

      if (type === 'addition') {
        lineNumNew++;
        return { type, text: line, lineNumNew, id: `${file.name}-new-${lineNumNew}-${idx}` };
      } else if (type === 'deletion') {
        lineNumOld++;
        return { type, text: line, lineNumOld, id: `${file.name}-old-${lineNumOld}-${idx}` };
      } else if (type === 'hunk-header') {
        return { type, text: line, id: `${file.name}-header-${idx}` };
      } else {
        lineNumOld++;
        lineNumNew++;
        return { type, text: line, lineNumOld, lineNumNew, id: `${file.name}-normal-${lineNumOld}-${lineNumNew}-${idx}` };
      }
    });
  });

  return files;
}

const findFeedbackForLine = (fileName, lineText, inlineFeedbacks) => {
  if (!inlineFeedbacks || inlineFeedbacks.length === 0) return null;
  const cleanLineText = lineText.trim();
  // Don't match empty lines or diff controls
  if (!cleanLineText || cleanLineText === '+' || cleanLineText === '-') return null;

  return inlineFeedbacks.find(fb => {
    const fbFile = fb.file.toLowerCase();
    const targetFile = fileName.toLowerCase();
    const fileMatch = targetFile.endsWith(fbFile) || fbFile.endsWith(targetFile);
    if (!fileMatch) return false;

    const fbLine = fb.lineCode.trim();
    const fbLineStripped = fbLine.replace(/^[+-]/, '').trim();
    const cleanLineStripped = cleanLineText.replace(/^[+-]/, '').trim();

    return (
      cleanLineStripped === fbLineStripped ||
      cleanLineStripped.includes(fbLineStripped) ||
      fbLineStripped.includes(cleanLineStripped)
    );
  });
};

function Dashboard({ theme, onToggleTheme }) {
  const [reviews, setReviews] = useState([]);
  const [repos, setRepos] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRepos: 0,
    activeRepos: 0,
    strictRepos: 0,
    recentReviews: 0,
  });
  
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedDiffFile, setSelectedDiffFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const data = await fetchDashboardDataWithFallback();
        if (active) {
          setReviews(data.reviews || []);
          setRepos(data.repos || []);
          setMetrics(data.metrics || {
            totalRepos: 0,
            activeRepos: 0,
            strictRepos: 0,
            recentReviews: 0,
          });
          setIsProcessing(!!data.isProcessing);
          if (data.reviews && data.reviews.length > 0) {
            setSelectedReview(prevSelected => {
              if (prevSelected) {
                const updated = data.reviews.find(r => r.id === prevSelected.id);
                return updated || data.reviews[0];
              }
              return data.reviews[0];
            });
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          if (err.message === 'Session expired') {
            navigate('/auth');
          } else {
            setError(err.message || 'Failed to load dashboard data');
            setIsLoading(false);
          }
        }
      }
    };

    loadData();

    const interval = setInterval(async () => {
      try {
        const data = await fetchDashboardDataWithFallback();
        if (active) {
          setReviews(data.reviews || []);
          setRepos(data.repos || []);
          setMetrics(data.metrics || {
            totalRepos: 0,
            activeRepos: 0,
            strictRepos: 0,
            recentReviews: 0,
          });
          setIsProcessing(!!data.isProcessing);
          setSelectedReview(prevSelected => {
            if (prevSelected) {
              const updated = data.reviews.find(r => r.id === prevSelected.id);
              return updated || prevSelected;
            }
            return data.reviews && data.reviews.length > 0 ? data.reviews[0] : null;
          });
        }
      } catch (err) {
        console.error('Polling failed:', err);
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
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

  const handleToggleSetting = async (repoName, field, currentValue) => {
    const repo = repos.find(r => r.repo_full_name === repoName);
    if (!repo) return;

    const updatedRepo = {
      ...repo,
      [field]: currentValue ? 1 : 0
    };

    setRepos(prev => prev.map(r => r.repo_full_name === repoName ? updatedRepo : r));

    try {
      const token = localStorage.getItem('gitguard_session_token');
      const response = await fetch(`${resolveApiBaseUrl()}/api/repos/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_full_name: repoName,
          strict_mode: field === 'strict_mode' ? currentValue : repo.strict_mode,
          ignore_linter: field === 'ignore_linter' ? currentValue : repo.ignore_linter,
          active: field === 'active' ? currentValue : repo.active
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await fetchDashboardDataWithFallback();
      setMetrics(data.metrics || metrics);
    } catch (err) {
      console.error(err);
      setRepos(prev => prev.map(r => r.repo_full_name === repoName ? repo : r));
      alert('Failed to update repository settings');
    }
  };

  const handleAddRepo = async (e) => {
    e.preventDefault();
    if (!newRepoName.trim() || !newRepoName.includes('/')) {
      alert('Please enter a valid repository full name (e.g. owner/repo)');
      return;
    }

    setIsAddingRepo(true);
    try {
      const token = localStorage.getItem('gitguard_session_token');
      const response = await fetch(`${resolveApiBaseUrl()}/api/repos/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repo_full_name: newRepoName.trim(),
          strict_mode: false,
          ignore_linter: false,
          active: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add repository');
      }

      setNewRepoName('');
      const data = await fetchDashboardDataWithFallback();
      setRepos(data.repos || []);
      setMetrics(data.metrics || metrics);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add repository');
    } finally {
      setIsAddingRepo(false);
    }
  };

  const { inline: inlineFeedbacks, summary: parsedSummary } = selectedReview 
    ? parseFeedback(selectedReview.llm_response)
    : { inline: [], summary: '' };

  const diffFiles = selectedReview?.raw_diff ? parseDiff(selectedReview.raw_diff) : [];

  useEffect(() => {
    if (diffFiles.length > 0) {
      setSelectedDiffFile(diffFiles[0]);
    } else {
      setSelectedDiffFile(null);
    }
  }, [selectedReview]);

  return (
    <div className="dashboard-page">
      {isProcessing && (
        <div className="processing-loading-overlay">
          <div className="processing-loading-overlay__content">
            <Loader2 size={36} color="#0FBF3E" className="spinning-loader" />
            <p>Analyzing Pull Request Diff via GitGuard AI</p>
          </div>
        </div>
      )}
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
              <div className="metric-tile__header">
                <strong>Stored Reviews</strong>
                <Activity size={18} color="#0FBF3E" />
              </div>
              <span className="metric-value">{metrics.recentReviews}</span>
              <p className="metric-desc">Total analyzed pull request summaries</p>
            </div>
            <div className="metric-tile">
              <div className="metric-tile__header">
                <strong>Tracked Repos</strong>
                <Github size={18} color="#0FBF3E" />
              </div>
              <span className="metric-value">{metrics.totalRepos}</span>
              <p className="metric-desc">Configured codebase integrations</p>
            </div>
            <div className="metric-tile">
              <div className="metric-tile__header">
                <strong>Active Repos</strong>
                <ToggleLeft size={18} color="#0FBF3E" />
              </div>
              <span className="metric-value">{metrics.activeRepos}</span>
              <p className="metric-desc">Ingesting webhook signal events</p>
            </div>
            <div className="metric-tile">
              <div className="metric-tile__header">
                <strong>Strict Mode</strong>
                <Shield size={18} color="#0FBF3E" />
              </div>
              <span className="metric-value">{metrics.strictRepos}</span>
              <p className="metric-desc">Codebases under strict review checks</p>
            </div>
          </div>
        </section>

        {/* Repository Management Panel */}
        <section className="dashboard-hero" style={{ padding: '1.5rem', borderRadius: '24px' }}>
          <div className="repo-management-container" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p className="dashboard-kicker" style={{ margin: 0 }}>Codebase Controls</p>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0' }}>Repository Configurations</h2>
              </div>
              <form onSubmit={handleAddRepo} style={{ display: 'flex', gap: '0.5rem', minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="owner/repository"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  disabled={isAddingRepo}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.9rem',
                    borderRadius: '12px',
                    border: '1px solid var(--surface-border)',
                    background: 'var(--surface-strong)',
                    color: 'var(--app-fg)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={isAddingRepo}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '12px',
                    background: 'var(--github-green)',
                    color: '#000000',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {repos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--surface-border)', borderRadius: '16px', color: 'var(--muted-text)' }}>
                No repositories configured. Use the field above to add your first repository.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {repos.map((repo) => (
                  <div key={repo.repo_full_name} style={{
                    padding: '1.2rem',
                    borderRadius: '16px',
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--surface-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--app-fg)', wordBreak: 'break-all' }}>{repo.repo_full_name}</span>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: repo.active ? 'rgba(15, 191, 62, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: repo.active ? 'var(--github-green)' : '#ef4444'
                        }}>
                          {repo.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                        Configure custom operational policies.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gap: '0.6rem', borderTop: '1px solid var(--surface-border)', paddingTop: '0.8rem' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--muted-text)' }}>Active (Webhook Ingestion)</span>
                        <input
                          type="checkbox"
                          checked={!!repo.active}
                          onChange={(e) => handleToggleSetting(repo.repo_full_name, 'active', e.target.checked)}
                          style={{ accentColor: 'var(--github-green)', width: '16px', height: '16px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--muted-text)' }}>Strict review checks</span>
                        <input
                          type="checkbox"
                          checked={!!repo.strict_mode}
                          onChange={(e) => handleToggleSetting(repo.repo_full_name, 'strict_mode', e.target.checked)}
                          style={{ accentColor: 'var(--github-green)', width: '16px', height: '16px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--muted-text)' }}>Ignore linter errors</span>
                        <input
                          type="checkbox"
                          checked={!!repo.ignore_linter}
                          onChange={(e) => handleToggleSetting(repo.repo_full_name, 'ignore_linter', e.target.checked)}
                          style={{ accentColor: 'var(--github-green)', width: '16px', height: '16px' }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  <div className="dashboard-empty-state__icon-wrap">
                    <ShieldCheck size={48} color="#24292E" />
                  </div>
                  <h3 className="dashboard-empty-state__title">System Active</h3>
                  <p className="dashboard-empty-state__subtitle">Awaiting incoming pull request triggers</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <button
                    type="button"
                    key={review.id}
                    className={`stream-item ${selectedReview && selectedReview.id === review.id ? 'stream-item--active' : ''}`}
                    onClick={() => {
                      setSelectedReview(review);
                      setActiveTab('summary');
                    }}
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
            <div className="dashboard-panel__header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dashboard-panel__kicker">Operational console</p>
                  <h2>Review Details</h2>
                </div>
                {selectedReview && (
                  <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--surface-strong)', padding: '0.2rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('summary')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        background: activeTab === 'summary' ? 'rgba(15, 191, 62, 0.15)' : 'transparent',
                        color: activeTab === 'summary' ? 'var(--github-green)' : 'var(--muted-text)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('diff')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        background: activeTab === 'diff' ? 'rgba(15, 191, 62, 0.15)' : 'transparent',
                        color: activeTab === 'diff' ? 'var(--github-green)' : 'var(--muted-text)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Interactive Diff
                    </button>
                  </div>
                )}
              </div>

              {selectedReview && (
                <div className="review-meta-details" style={{ margin: 0, padding: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem', borderRadius: '12px' }}>
                  <div className="detail-field">
                    <span className="detail-label">Repository</span>
                    <span className="detail-value" style={{ fontSize: '0.8rem' }}>{selectedReview.repo_full_name}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">PR</span>
                    <span className="detail-value" style={{ fontSize: '0.8rem' }}>#{selectedReview.pr_number}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Diff Size</span>
                    <span className="detail-value" style={{ fontSize: '0.8rem' }}>{formatSize(selectedReview.cleaned_diff_size)}</span>
                  </div>
                </div>
              )}
            </div>

            {selectedReview ? (
              <div className="history-console" style={{ height: '100%', minHeight: '38rem', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'summary' ? (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-text)', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                      <FileCode2 size={16} />
                      <span>AI Review Summary</span>
                    </div>
                    <pre className="monospace-markdown-surface" style={{ maxHeight: 'none', overflowY: 'visible' }}>{parsedSummary || 'No summary text available.'}</pre>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    height: '100%',
                    flex: 1,
                    border: '1px solid var(--surface-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'var(--surface-strong)'
                  }}>
                    {/* Left Pane: Files List */}
                    <div style={{
                      width: '200px',
                      flexShrink: 0,
                      borderRight: '1px solid var(--surface-border)',
                      overflowY: 'auto',
                      padding: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      background: 'rgba(0, 0, 0, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                        Files Changed
                      </div>
                      {diffFiles.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-text)', padding: '0.5rem 0' }}>No diff data</span>
                      ) : (
                        diffFiles.map(file => {
                          const fileCommentCount = inlineFeedbacks.filter(fb => {
                            const fbFile = fb.file.toLowerCase();
                            const targetFile = file.name.toLowerCase();
                            return targetFile.endsWith(fbFile) || fbFile.endsWith(targetFile);
                          }).length;

                          return (
                            <button
                              type="button"
                              key={file.name}
                              onClick={() => setSelectedDiffFile(file)}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.6rem',
                                borderRadius: '8px',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: selectedDiffFile?.name === file.name ? 'rgba(15, 191, 62, 0.12)' : 'transparent',
                                color: selectedDiffFile?.name === file.name ? 'var(--github-green)' : 'var(--app-fg)',
                                border: '1px solid ' + (selectedDiffFile?.name === file.name ? 'rgba(15, 191, 62, 0.25)' : 'transparent'),
                                outline: 'none'
                              }}
                            >
                              <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                fontFamily: 'Courier New',
                                fontWeight: selectedDiffFile?.name === file.name ? 700 : 400
                              }}>
                                {file.name.split('/').pop()}
                              </span>
                              {fileCommentCount > 0 && (
                                <span style={{
                                  background: 'var(--github-green)',
                                  color: '#000000',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  borderRadius: '999px',
                                  padding: '0.05rem 0.35rem',
                                  minWidth: '16px',
                                  textAlign: 'center'
                                }}>
                                  {fileCommentCount}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Right Pane: Diff View */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'auto',
                      padding: '0.8rem',
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: '0.85rem',
                      background: 'rgba(0, 0, 0, 0.1)'
                    }}>
                      {selectedDiffFile ? (
                        <div style={{ display: 'grid', gap: '1px' }}>
                          <div style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--surface-border)', color: 'var(--muted-text)', fontSize: '0.75rem', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <FileCode2 size={14} />
                            <span>{selectedDiffFile.name}</span>
                          </div>
                          {selectedDiffFile.lines.map((line) => {
                            let lineBg = 'transparent';
                            let textColor = 'var(--app-fg)';

                            if (line.type === 'addition') {
                              lineBg = 'rgba(15, 191, 62, 0.12)';
                              textColor = 'var(--github-green)';
                            } else if (line.type === 'deletion') {
                              lineBg = 'rgba(239, 68, 68, 0.12)';
                              textColor = '#ef4444';
                            } else if (line.type === 'hunk-header') {
                              lineBg = 'rgba(36, 41, 46, 0.4)';
                              textColor = 'var(--muted-text)';
                            }

                            const fb = findFeedbackForLine(selectedDiffFile.name, line.text, inlineFeedbacks);

                            return (
                              <div key={line.id} style={{ display: 'grid', gap: '2px' }}>
                                <div style={{
                                  display: 'flex',
                                  background: lineBg,
                                  color: textColor,
                                  minHeight: '20px',
                                  paddingRight: '0.5rem',
                                  borderRadius: '4px'
                                }}>
                                  <div style={{
                                    width: '35px',
                                    textAlign: 'right',
                                    paddingRight: '0.4rem',
                                    color: 'var(--muted-text)',
                                    opacity: 0.5,
                                    userSelect: 'none',
                                    borderRight: '1px solid var(--surface-border)',
                                    fontSize: '0.75rem'
                                  }}>
                                    {line.lineNumOld || ''}
                                  </div>
                                  <div style={{
                                    width: '35px',
                                    textAlign: 'right',
                                    paddingRight: '0.4rem',
                                    color: 'var(--muted-text)',
                                    opacity: 0.5,
                                    userSelect: 'none',
                                    borderRight: '1px solid var(--surface-border)',
                                    fontSize: '0.75rem'
                                  }}>
                                    {line.lineNumNew || ''}
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    paddingLeft: '0.5rem',
                                    whiteSpace: 'pre',
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    overflowX: 'visible'
                                  }}>
                                    {line.text}
                                  </pre>
                                </div>

                                {fb && (
                                  <div style={{
                                    background: 'rgba(36, 41, 46, 0.85)',
                                    borderLeft: '4px solid var(--github-green)',
                                    borderRadius: '0 8px 8px 0',
                                    padding: '0.8rem',
                                    margin: '0.4rem 0.5rem 0.4rem 75px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                                    fontFamily: "'Inter', sans-serif",
                                    color: 'var(--app-fg)'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--github-green)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                                      <ShieldCheck size={14} />
                                      <span>GitGuard AI Analysis</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: '1.45' }}>
                                      {fb.comment}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-text)' }}>
                          Select a file on the left to inspect code changes.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="history-console-empty">
                <span>Select a review log to display details.</span>
              </div>
            )}
          </article>
        </section>
      </main>

      <footer className="corporate-footer" style={{
        width: 'min(1200px, calc(100% - 2rem))',
        margin: '2.5rem auto 0',
        textAlign: 'center',
        padding: '1.5rem 0',
        color: 'var(--muted-text)',
        fontSize: '0.85rem',
        borderTop: '1px solid var(--surface-border)'
      }}>
        Batch No. 15 | Zaalima Web Development Pvt. Ltd.
      </footer>
    </div>
  );
}

export default Dashboard;

