import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Lock, Mail, User } from 'lucide-react';
import '../styles/auth.css';

const initialLoginData = { email: '', password: '' };
const initialRegisterData = { name: '', email: '', password: '' };

function AuthRouter() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState(initialLoginData);
  const [registerData, setRegisterData] = useState(initialRegisterData);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const toggleMode = () => {
    setIsLogin((current) => !current);
    setLoginData(initialLoginData);
    setRegisterData(initialRegisterData);
    setErrors({});
    setSubmitError('');
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  };

  const validatePayload = () => {
    const nextErrors = {};

    if (isLogin) {
      if (!loginData.email) {
        nextErrors.email = 'Email is required';
      } else if (!validateEmail(loginData.email)) {
        nextErrors.email = 'Enter a valid email address';
      }

      if (!loginData.password) {
        nextErrors.password = 'Password is required';
      } else if (loginData.password.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters';
      }
    } else {
      if (!registerData.name.trim()) {
        nextErrors.name = 'Name is required';
      }

      if (!registerData.email) {
        nextErrors.email = 'Email is required';
      } else if (!validateEmail(registerData.email)) {
        nextErrors.email = 'Enter a valid email address';
      }

      if (!registerData.password) {
        nextErrors.password = 'Password is required';
      } else if (registerData.password.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validatePayload();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: loginData.email.trim(), password: loginData.password }
        : {
            name: registerData.name.trim(),
            email: registerData.email.trim(),
            password: registerData.password,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.token) {
        localStorage.setItem('gitguard_session_token', data.token);
      }

      navigate('/dashboard');
    } catch (error) {
      setSubmitError(error.message || 'Unable to complete authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--one" aria-hidden="true" />
      <div className="auth-glow auth-glow--two" aria-hidden="true" />

      <div className="auth-shell">
        <div className="auth-brand">
          <Github size={32} color="#0FBF3E" />
          <div>
            <h1>GitGuard AI</h1>
            <p>Secure access for review operations</p>
          </div>
        </div>

        <section className="auth-card" aria-label="Authentication form">
          <div className="auth-card__header">
            <h2>{isLogin ? 'Sign in to continue' : 'Create your account'}</h2>
            <p>
              {isLogin
                ? 'Use your existing credentials to enter the command surface.'
                : 'Register a new operator account with a signed session token.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <label className="auth-field">
                <span>Name</span>
                <div className="auth-input-wrap">
                  <User size={16} />
                  <input
                    type="text"
                    name="name"
                    value={registerData.name}
                    onChange={handleRegisterChange}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </div>
                {errors.name && <small>{errors.name}</small>}
              </label>
            )}

            <label className="auth-field">
              <span>Email</span>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  name="email"
                  value={isLogin ? loginData.email : registerData.email}
                  onChange={isLogin ? handleLoginChange : handleRegisterChange}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <small>{errors.email}</small>}
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  name="password"
                  value={isLogin ? loginData.password : registerData.password}
                  onChange={isLogin ? handleLoginChange : handleRegisterChange}
                  placeholder="Minimum 6 characters"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
              {errors.password && <small>{errors.password}</small>}
            </label>

            {submitError && <div className="auth-banner">{submitError}</div>}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <div className="auth-switcher">
              {isLogin ? (
                <p>
                  New to the sentinel?{' '}
                  <button type="button" onClick={toggleMode}>
                    Create an account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button type="button" onClick={toggleMode}>
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AuthRouter;
