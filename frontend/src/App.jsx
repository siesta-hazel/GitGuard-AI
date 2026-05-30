import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthRouter from './pages/AuthRouter';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gitguard_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gitguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const themeProps = useMemo(() => ({ theme, onToggleTheme: toggleTheme }), [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage {...themeProps} />} />
        <Route path="/auth" element={<AuthRouter {...themeProps} />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard {...themeProps} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
