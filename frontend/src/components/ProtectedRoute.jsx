import React from 'react';
import { Navigate } from 'react-router-dom';

// Simple route guard: checks for a session token in localStorage
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('gitguard_session_token');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
