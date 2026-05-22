import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import '../styles/auth.css';

function AuthRouter() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!loginData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(loginData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!loginData.password) {
      newErrors.password = 'Password is required';
    } else if (loginData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Login attempt:', loginData);
    navigate('/dashboard');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!registerData.name) {
      newErrors.name = 'Name is required';
    }

    if (!registerData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(registerData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!registerData.password) {
      newErrors.password = 'Password is required';
    } else if (registerData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Register attempt:', registerData);
    navigate('/dashboard');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setLoginData({ email: '', password: '' });
    setRegisterData({ name: '', email: '', password: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Github size={32} color="#0FBF3E" />
          <h1 className="auth-title">GitGuard AI</h1>
        </div>

        <div className="auth-form-wrapper">
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <h2 className="form-title">Sign In</h2>

              <div className="input-container">
                <label htmlFor="login-email" className="input-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  className={`input-field ${errors.email ? 'error' : ''}`}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="input-container">
                <label htmlFor="login-password" className="input-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  className={`input-field ${errors.password ? 'error' : ''}`}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <button type="submit" className="submit-button">Sign In</button>

              <p className="toggle-text">
                New to the sentinel?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="toggle-link"
                >
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <h2 className="form-title">Create Account</h2>

              <div className="input-container">
                <label htmlFor="register-name" className="input-label">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  className={`input-field ${errors.name ? 'error' : ''}`}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="input-container">
                <label htmlFor="register-email" className="input-label">Email</label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  className={`input-field ${errors.email ? 'error' : ''}`}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="input-container">
                <label htmlFor="register-password" className="input-label">Password</label>
                <input
                  id="register-password"
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  className={`input-field ${errors.password ? 'error' : ''}`}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <button type="submit" className="submit-button">Create Account</button>

              <p className="toggle-text">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="toggle-link"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthRouter;
